import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store for analysis steps (for step-by-step progress)
const analysisSteps = new Map();

// Utility: Check if file/directory exists
function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// Utility: Read JSON file safely
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Utility: Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Utility: List directory contents
function listDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

// Utility: Get file stats
function getStats(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

// Streaming analysis endpoint with step-by-step progress
app.post('/api/analyze-stream', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath || !exists(projectPath)) {
    return res.status(400).json({ error: 'Invalid project path' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendStep = (step, status, detail, proof = null) => {
    res.write(`data: ${JSON.stringify({ step, status, detail, proof, timestamp: new Date().toISOString() })}\n\n`);
  };

  try {
    const report = {
      timestamp: new Date().toISOString(),
      project_path: projectPath,
      analysis_proof: [],
      steps_completed: [],
    };

    // Step 1: Scanning directory structure
    sendStep(1, 'running', 'Scanning directory structure...');
    await sleep(800);
    const rootFiles = listDir(projectPath);

    // Generate detailed file tree
    const fileTree = generateFileTree(projectPath, 0, 3); // depth of 3
    const proof1 = `📁 Project Structure (${rootFiles.length} items in root):\n\n${fileTree}`;

    report.analysis_proof.push({ step: 1, action: 'Directory scan', proof: proof1 });
    report.file_structure = analyzeFileStructure(projectPath);
    report.file_structure.tree = fileTree;
    sendStep(1, 'complete', `Directory scanned: ${rootFiles.length} items found`, proof1);
    report.steps_completed.push('file_structure');

    // Step 2: Reading CLAUDE.md
    sendStep(2, 'running', 'Reading CLAUDE.md protocol file...');
    await sleep(800);
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    let proof2 = 'CLAUDE.md not found';
    if (exists(claudeMdPath)) {
      const content = readFile(claudeMdPath);
      const firstLines = content.split('\n').slice(0, 5).join('\n');
      proof2 = `Read ${content.length} bytes. First lines:\n${firstLines}`;
      report.claude_md = analyzeCLAUDEMD(projectPath);
    }
    report.analysis_proof.push({ step: 2, action: 'Read CLAUDE.md', proof: proof2 });
    sendStep(2, 'complete', 'CLAUDE.md analyzed', proof2);
    report.steps_completed.push('claude_md');

    // Step 3: Finding AI PRD document
    sendStep(3, 'running', 'Searching for AI PRD document...');
    await sleep(800);
    report.ai_prd = analyzeAIPRD(projectPath);
    let proof3 = 'No AI PRD found';
    if (report.ai_prd.prd_location) {
      const prdPath = path.join(projectPath, report.ai_prd.prd_location);
      const content = readFile(prdPath);
      if (content) {
        const firstLines = content.split('\n').slice(0, 8).join('\n');
        proof3 = `Found: ${report.ai_prd.prd_location} (${report.ai_prd.prd_size} bytes)\nFirst lines:\n${firstLines}`;
      }
    }
    report.analysis_proof.push({ step: 3, action: 'Find AI PRD', proof: proof3 });
    sendStep(3, 'complete', report.ai_prd.prd_location ? `Found: ${report.ai_prd.prd_location}` : 'AI PRD not found', proof3);
    report.steps_completed.push('ai_prd');

    // Step 4: Analyzing story files
    sendStep(4, 'running', 'Reading story JSON files...');
    await sleep(800);
    report.ai_stories = analyzeStories(projectPath);
    let proof4 = `Found ${report.ai_stories.stories_found} stories`;
    if (report.ai_stories.story_details && report.ai_stories.story_details.length > 0) {
      const storyIds = report.ai_stories.story_details.map(s => s.id).join(', ');
      proof4 += `\nStory IDs: ${storyIds}`;
      // Read first story as proof
      const firstStory = report.ai_stories.story_details[0];
      if (firstStory) {
        proof4 += `\n\nFirst story (${firstStory.id}):\n  Title: ${firstStory.title}\n  Agent: ${firstStory.agent}\n  Acceptance Criteria: ${firstStory.acceptance_criteria_count} items`;
      }
    }
    report.analysis_proof.push({ step: 4, action: 'Read stories', proof: proof4 });
    sendStep(4, 'complete', `${report.ai_stories.stories_found} stories found`, proof4);
    report.steps_completed.push('ai_stories');

    // Step 5: Scanning HTML prototypes
    sendStep(5, 'running', 'Scanning HTML prototype files...');
    await sleep(800);
    report.html_prototype = analyzeHTMLPrototypes(projectPath);
    let proof5 = `Found ${report.html_prototype.total_prototypes} HTML prototypes`;
    if (report.html_prototype.files_found.length > 0) {
      proof5 += `\nFiles: ${report.html_prototype.files_found.join(', ')}`;
    }
    report.analysis_proof.push({ step: 5, action: 'Scan prototypes', proof: proof5 });
    sendStep(5, 'complete', `${report.html_prototype.total_prototypes} prototypes found`, proof5);
    report.steps_completed.push('html_prototype');

    // Step 6: Checking WAVE configuration
    sendStep(6, 'running', 'Checking WAVE configuration...');
    await sleep(800);
    report.wave_config = analyzeWaveConfig(projectPath);
    const proof6 = report.wave_config.findings.join('\n');
    report.analysis_proof.push({ step: 6, action: 'Check config', proof: proof6 });
    sendStep(6, 'complete', 'Configuration checked', proof6);
    report.steps_completed.push('wave_config');

    // Step 7: Generating gap analysis
    sendStep(7, 'running', 'Generating gap analysis...');
    await sleep(800);
    report.gap_analysis = generateGapAnalysis(report);
    report.improvement_plan = generateImprovementPlan(report);
    report.summary = {
      total_issues:
        (report.file_structure?.issues?.length || 0) +
        (report.ai_prd?.issues?.length || 0) +
        (report.ai_stories?.issues?.length || 0) +
        (report.html_prototype?.issues?.length || 0) +
        (report.claude_md?.issues?.length || 0),
      total_gaps: report.gap_analysis.gaps.length,
      readiness_score: calculateReadinessScore(report),
    };
    sendStep(7, 'complete', `${report.gap_analysis.gaps.length} gaps identified`, `Readiness Score: ${report.summary.readiness_score}%`);
    report.steps_completed.push('gap_analysis');

    // Step 8: Generating markdown report
    sendStep(8, 'running', 'Generating markdown report...');
    await sleep(800);
    const mdReport = generateMarkdownReport(report, projectPath);
    const reportsDir = path.join(projectPath, '.claude', 'reports');

    // Create reports directory if it doesn't exist
    if (!exists(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFileName = `gap-analysis-${new Date().toISOString().split('T')[0]}.md`;
    const reportPath = path.join(reportsDir, reportFileName);
    fs.writeFileSync(reportPath, mdReport);

    report.report_file = reportPath;
    report.report_content = mdReport;
    sendStep(8, 'complete', `Report saved: ${reportPath}`, `Report saved to: ${reportPath}`);
    report.steps_completed.push('report_generated');

    // Send final complete event
    sendStep('done', 'complete', 'Analysis complete!', null);
    res.write(`data: ${JSON.stringify({ type: 'result', report })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Analysis error:', error);
    sendStep('error', 'failed', error.message);
    res.end();
  }
});

// Generate markdown report
function generateMarkdownReport(report, projectPath) {
  const timestamp = new Date().toISOString();
  const projectName = path.basename(projectPath);

  let md = `# Gap Analysis Report - ${projectName}

**Generated:** ${timestamp}
**Project Path:** ${projectPath}
**Readiness Score:** ${report.summary.readiness_score}%

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Issues | ${report.summary.total_issues} |
| Total Gaps | ${report.summary.total_gaps} |
| Readiness Score | ${report.summary.readiness_score}% |

---

## Analysis Proof

The following files were actually read during this analysis:

`;

  report.analysis_proof.forEach((proof, idx) => {
    md += `### Step ${idx + 1}: ${proof.action}

\`\`\`
${proof.proof}
\`\`\`

`;
  });

  md += `---

## File Structure Analysis

**Status:** ${report.file_structure?.status || 'N/A'}

### Findings
${(report.file_structure?.findings || []).map(f => `- ${f}`).join('\n')}

### Issues
${(report.file_structure?.issues || []).map(i => `- ❌ ${i}`).join('\n') || '- ✅ No issues found'}

---

## AI PRD Document

**Status:** ${report.ai_prd?.status || 'N/A'}
**Location:** ${report.ai_prd?.prd_location || 'Not found'}
**Size:** ${report.ai_prd?.prd_size ? `${(report.ai_prd.prd_size / 1024).toFixed(1)} KB` : 'N/A'}

### Findings
${(report.ai_prd?.findings || []).map(f => `- ${f}`).join('\n')}

### Issues
${(report.ai_prd?.issues || []).map(i => `- ❌ ${i}`).join('\n') || '- ✅ No issues found'}

---

## AI Stories

**Status:** ${report.ai_stories?.status || 'N/A'}
**Stories Found:** ${report.ai_stories?.stories_found || 0}

### Stories by Wave
${Object.entries(report.ai_stories?.stories_by_wave || {}).map(([wave, count]) => `- ${wave}: ${count} stories`).join('\n')}

### Story Details
| ID | Title | Agent | Priority | Story Points |
|----|-------|-------|----------|--------------|
${(report.ai_stories?.story_details || []).map(s => `| ${s.id} | ${s.title} | ${s.agent} | ${s.priority || 'N/A'} | ${s.story_points || 'N/A'} |`).join('\n')}

### Issues
${(report.ai_stories?.issues || []).map(i => `- ❌ ${i}`).join('\n') || '- ✅ No issues found'}

---

## HTML Prototypes

**Status:** ${report.html_prototype?.status || 'N/A'}
**Total Prototypes:** ${report.html_prototype?.total_prototypes || 0}

### Files Found
${(report.html_prototype?.files_found || []).map(f => `- ${f}`).join('\n') || '- None found'}

---

## Identified Gaps

| Priority | Category | Description | Action Required |
|----------|----------|-------------|-----------------|
${(report.gap_analysis?.gaps || []).map(g => `| ${g.priority.toUpperCase()} | ${g.category} | ${g.description} | ${g.action} |`).join('\n')}

---

## Step-by-Step Improvement Plan

${(report.improvement_plan || []).map(step => `### Step ${step.step}: ${step.title}

**Status:** ${step.status === 'completed' ? '✅ Completed' : '⏳ Pending'}

${step.description}

`).join('')}

---

## Next Steps

1. **Address High Priority Gaps First**
   - Focus on items marked as HIGH priority in the gaps table

2. **Create Missing Directories**
   - Run: \`mkdir -p ${projectPath}/.claude/locks\`

3. **Populate Empty Waves**
   - Add story JSON files to wave2/ and wave3/

4. **Re-run Analysis**
   - After making changes, run analysis again to verify improvements

---

*Report generated by WAVE Portal Analysis Server*
`;

  return md;
}

// Generate file tree structure - ACCURATE to actual directory
function generateFileTree(dirPath, currentDepth = 0, maxDepth = 3, prefix = '') {
  if (currentDepth > maxDepth) return '';

  const items = listDir(dirPath);
  let tree = '';

  // Only filter out .git and node_modules - show EVERYTHING else including hidden files
  const filteredItems = items.filter(item => {
    // Skip only these directories that are too large/noisy
    if (item === 'node_modules' || item === '.git' || item === '.next' || item === '__pycache__') return false;
    return true;
  }).sort((a, b) => {
    // Directories first, then files
    const aIsDir = getStats(path.join(dirPath, a))?.isDirectory() || false;
    const bIsDir = getStats(path.join(dirPath, b))?.isDirectory() || false;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  filteredItems.forEach((item, index) => {
    const itemPath = path.join(dirPath, item);
    const stats = getStats(itemPath);
    const isLast = index === filteredItems.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    if (stats?.isDirectory()) {
      tree += `${prefix}${connector}📁 ${item}/\n`;
      if (currentDepth < maxDepth) {
        tree += generateFileTree(itemPath, currentDepth + 1, maxDepth, prefix + childPrefix);
      }
    } else {
      const size = stats ? `(${formatSize(stats.size)})` : '';
      const icon = getFileIcon(item);
      tree += `${prefix}${connector}${icon} ${item} ${size}\n`;
    }
  });

  return tree;
}

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get file icon based on extension
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const icons = {
    'md': '📄',
    'json': '📋',
    'js': '📜',
    'ts': '📜',
    'tsx': '⚛️',
    'jsx': '⚛️',
    'html': '🌐',
    'css': '🎨',
    'env': '🔐',
    'sh': '⚙️',
    'yaml': '📝',
    'yml': '📝',
  };
  return icons[ext] || '📄';
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!exists(projectPath)) {
    return res.status(404).json({ error: `Project path not found: ${projectPath}` });
  }

  console.log(`\n🔍 Analyzing project: ${projectPath}`);
  const startTime = Date.now();

  const report = {
    timestamp: new Date().toISOString(),
    project_path: projectPath,
    summary: {
      total_issues: 0,
      total_gaps: 0,
      readiness_score: 0,
    },
    file_structure: analyzeFileStructure(projectPath),
    ai_prd: analyzeAIPRD(projectPath),
    ai_stories: analyzeStories(projectPath),
    html_prototype: analyzeHTMLPrototypes(projectPath),
    claude_md: analyzeCLAUDEMD(projectPath),
    wave_config: analyzeWaveConfig(projectPath),
    gap_analysis: { gaps: [] },
    improvement_plan: [],
  };

  // Calculate totals
  report.summary.total_issues =
    report.file_structure.issues.length +
    report.ai_prd.issues.length +
    report.ai_stories.issues.length +
    report.html_prototype.issues.length +
    report.claude_md.issues.length;

  // Generate gap analysis
  report.gap_analysis = generateGapAnalysis(report);
  report.summary.total_gaps = report.gap_analysis.gaps.length;

  // Generate improvement plan
  report.improvement_plan = generateImprovementPlan(report);

  // Calculate readiness score
  report.summary.readiness_score = calculateReadinessScore(report);

  const duration = Date.now() - startTime;
  console.log(`✅ Analysis complete in ${duration}ms`);

  res.json(report);
});

// Analyze file structure
function analyzeFileStructure(projectPath) {
  const result = {
    status: 'pass',
    findings: [],
    issues: [],
    directories: {},
  };

  // Check root files
  const rootFiles = listDir(projectPath);
  result.findings.push(`Project root: ${projectPath}`);
  result.findings.push(`Root contains ${rootFiles.length} items`);

  // Check key directories
  const keyDirs = ['.claude', 'stories', 'worktrees', 'src', 'footprint-app'];
  keyDirs.forEach(dir => {
    const dirPath = path.join(projectPath, dir);
    if (exists(dirPath)) {
      const contents = listDir(dirPath);
      result.directories[dir] = contents;
      result.findings.push(`✓ ${dir}/ exists (${contents.length} items)`);
    } else {
      result.issues.push(`Missing directory: ${dir}/`);
    }
  });

  // Check key files
  const keyFiles = ['CLAUDE.md', 'package.json', 'tsconfig.json', '.env'];
  keyFiles.forEach(file => {
    const filePath = path.join(projectPath, file);
    // Also check in footprint-app/footprint for nested projects
    const altPath = path.join(projectPath, 'footprint-app', 'footprint', file);

    if (exists(filePath)) {
      const stats = getStats(filePath);
      result.findings.push(`✓ ${file} exists (${stats.size} bytes)`);
    } else if (exists(altPath)) {
      const stats = getStats(altPath);
      result.findings.push(`✓ ${file} exists in footprint-app/footprint/ (${stats.size} bytes)`);
    } else {
      if (file !== '.env') { // .env is expected to be missing or private
        result.issues.push(`Missing file: ${file}`);
      }
    }
  });

  // Check .claude structure
  const claudeDir = path.join(projectPath, '.claude');
  if (exists(claudeDir)) {
    const claudeContents = listDir(claudeDir);

    // Check for hooks
    if (claudeContents.includes('hooks')) {
      const hooks = listDir(path.join(claudeDir, 'hooks'));
      result.findings.push(`✓ .claude/hooks/ has ${hooks.length} hook scripts`);
    } else {
      result.issues.push('Missing .claude/hooks/ directory');
    }

    // Check for locks directory
    if (!claudeContents.includes('locks')) {
      result.issues.push('Missing .claude/locks/ directory (required for phase-gate validation)');
    } else {
      result.findings.push('✓ .claude/locks/ exists');
    }

    // Check for settings
    if (claudeContents.includes('settings.json')) {
      result.findings.push('✓ .claude/settings.json exists');
    }
  }

  // Check stories structure
  const storiesDir = path.join(projectPath, 'stories');
  if (exists(storiesDir)) {
    const waves = listDir(storiesDir).filter(d => d.startsWith('wave'));
    waves.forEach(wave => {
      const wavePath = path.join(storiesDir, wave);
      const stories = listDir(wavePath).filter(f => f.endsWith('.json'));
      if (stories.length > 0) {
        result.findings.push(`✓ ${wave}/ contains ${stories.length} stories`);
      } else {
        result.issues.push(`${wave}/ directory is empty (no story JSON files)`);
      }
    });
  }

  result.status = result.issues.length === 0 ? 'pass' :
                  result.issues.length <= 2 ? 'warn' : 'fail';

  return result;
}

// Analyze AI PRD
function analyzeAIPRD(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    prd_location: null,
    prd_size: 0,
  };

  // Search locations for AI PRD
  const searchLocations = [
    'AI-PRD.md',
    'ai-prd/AI-PRD.md',
    '.claude/ai-prd/AI-PRD.md',
    'FOOTPRINT-AI-PRD-UPDATED.md',
    'footprint-app/footprint-docs/Footprint-AI-PRD-v3.md',
  ];

  for (const loc of searchLocations) {
    const filePath = path.join(projectPath, loc);
    if (exists(filePath)) {
      const stats = getStats(filePath);
      const content = readFile(filePath);

      result.prd_location = loc;
      result.prd_size = stats.size;
      result.status = 'pass';
      result.findings.push(`✓ AI PRD found at: ${loc}`);
      result.findings.push(`✓ PRD size: ${(stats.size / 1024).toFixed(1)} KB`);

      // Analyze content
      if (content) {
        const lines = content.split('\n').length;
        result.findings.push(`✓ PRD has ${lines} lines`);

        // Check for key sections
        if (content.includes('## Executive Summary') || content.includes('# Executive Summary')) {
          result.findings.push('✓ Has Executive Summary section');
        }
        if (content.includes('Epic') || content.includes('epic')) {
          const epicMatches = content.match(/Epic \d+/gi) || [];
          result.findings.push(`✓ Contains ${epicMatches.length} Epics`);
        }
        if (content.includes('Story Points') || content.includes('story points')) {
          result.findings.push('✓ Contains story point estimates');
        }
        if (content.includes('Implementation Status')) {
          result.findings.push('✓ Has Implementation Status tracking');
        }
      }
      break;
    } else {
      result.findings.push(`Searched: ${loc} - not found`);
    }
  }

  if (!result.prd_location) {
    result.issues.push('No AI PRD document found');
    result.issues.push('Create ai-prd/AI-PRD.md with product vision and requirements');
  }

  return result;
}

// Analyze Stories
function analyzeStories(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    stories_found: 0,
    stories_by_wave: {},
    story_details: [],
  };

  const storiesDir = path.join(projectPath, 'stories');

  if (!exists(storiesDir)) {
    result.issues.push('No stories/ directory found');
    result.issues.push('Create stories/wave1/ with JSON story files');
    return result;
  }

  const waves = listDir(storiesDir).filter(d => d.startsWith('wave'));
  result.findings.push(`Found ${waves.length} wave directories`);

  let totalStories = 0;
  let totalStoryPoints = 0;

  waves.forEach(wave => {
    const wavePath = path.join(storiesDir, wave);
    const storyFiles = listDir(wavePath).filter(f => f.endsWith('.json'));

    result.stories_by_wave[wave] = storyFiles.length;

    if (storyFiles.length === 0) {
      result.issues.push(`${wave}/ is empty - no stories defined`);
    } else {
      result.findings.push(`✓ ${wave}/: ${storyFiles.length} stories`);

      // Analyze each story
      storyFiles.forEach(file => {
        const storyPath = path.join(wavePath, file);
        const story = readJSON(storyPath);

        if (story) {
          totalStories++;
          totalStoryPoints += story.story_points || 0;

          result.story_details.push({
            id: story.id,
            title: story.title,
            agent: story.agent,
            priority: story.priority,
            status: story.status,
            story_points: story.story_points,
            acceptance_criteria_count: story.acceptance_criteria?.length || 0,
          });

          // Validate story structure
          if (!story.id) result.issues.push(`Story ${file} missing 'id' field`);
          if (!story.acceptance_criteria || story.acceptance_criteria.length === 0) {
            result.issues.push(`Story ${story.id || file} has no acceptance criteria`);
          }
        } else {
          result.issues.push(`Failed to parse ${wave}/${file} as JSON`);
        }
      });
    }
  });

  result.stories_found = totalStories;
  result.findings.push(`Total: ${totalStories} stories, ${totalStoryPoints} story points`);

  if (totalStories === 0) {
    result.status = 'fail';
    result.issues.push('No valid story files found');
  } else if (result.issues.length > 0) {
    result.status = 'warn';
  } else {
    result.status = 'pass';
  }

  return result;
}

// Analyze HTML Prototypes
function analyzeHTMLPrototypes(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    files_found: [],
    total_prototypes: 0,
  };

  // Search locations for HTML prototypes
  const searchLocations = [
    'design',
    'design_mockups',
    'mockups',
    'prototypes',
    'footprint-app/design_mockups',
  ];

  let foundDir = null;

  for (const loc of searchLocations) {
    const dirPath = path.join(projectPath, loc);
    if (exists(dirPath)) {
      const files = listDir(dirPath).filter(f => f.endsWith('.html'));
      if (files.length > 0) {
        foundDir = loc;
        result.files_found = files;
        result.total_prototypes = files.length;
        result.findings.push(`✓ Found ${files.length} HTML prototypes in ${loc}/`);

        // Analyze each prototype
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = getStats(filePath);
          result.findings.push(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        });

        break;
      }
    }
  }

  if (!foundDir) {
    result.issues.push('No HTML prototype files found');
    result.issues.push('Create design mockups in design/ or prototypes/ directory');
  } else {
    result.status = result.total_prototypes >= 5 ? 'pass' : 'warn';
  }

  return result;
}

// Analyze CLAUDE.md
function analyzeCLAUDEMD(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    has_claude_md: false,
  };

  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  if (!exists(claudeMdPath)) {
    result.issues.push('CLAUDE.md not found in project root');
    result.issues.push('Create CLAUDE.md with WAVE protocol definitions');
    return result;
  }

  const content = readFile(claudeMdPath);
  const stats = getStats(claudeMdPath);

  result.has_claude_md = true;
  result.status = 'pass';
  result.findings.push(`✓ CLAUDE.md exists (${(stats.size / 1024).toFixed(1)} KB)`);

  if (content) {
    // Check for key sections
    const sections = {
      'Agent Roles': /agent.?roles/i,
      'Gate System': /gate.?system/i,
      'Signal File': /signal.?file/i,
      'Safety Rules': /safety.?rules/i,
      'Technology Stack': /technology.?stack/i,
    };

    Object.entries(sections).forEach(([name, pattern]) => {
      if (pattern.test(content)) {
        result.findings.push(`✓ Has ${name} section`);
      } else {
        result.issues.push(`Missing section: ${name}`);
      }
    });

    // Count safety markers
    const safetyMarkers = (content.match(/(NEVER|CRITICAL|FORBIDDEN|DO NOT)/gi) || []).length;
    result.findings.push(`✓ Contains ${safetyMarkers} safety markers`);

    if (safetyMarkers < 10) {
      result.issues.push(`Only ${safetyMarkers} safety markers (recommend 20+)`);
    }
  }

  if (result.issues.length > 2) {
    result.status = 'warn';
  }

  return result;
}

// Analyze Wave Config
function analyzeWaveConfig(projectPath) {
  const result = {
    status: 'pending',
    findings: [],
    issues: [],
  };

  // Check for wave config
  const configLocations = [
    '.claude/wave-config.json',
    '.claude/settings.json',
    '.claude/settings.local.json',
  ];

  configLocations.forEach(loc => {
    const filePath = path.join(projectPath, loc);
    if (exists(filePath)) {
      const config = readJSON(filePath);
      if (config) {
        result.findings.push(`✓ ${loc} exists`);
        if (config.hooks) result.findings.push('  - Has hook configurations');
        if (config.permissions) result.findings.push('  - Has permission rules');
        if (config.wave) result.findings.push(`  - Current wave: ${config.wave}`);
      }
    }
  });

  // Check for signal files
  const claudeDir = path.join(projectPath, '.claude');
  if (exists(claudeDir)) {
    const files = listDir(claudeDir);
    const signals = files.filter(f => f.startsWith('signal-'));
    if (signals.length > 0) {
      result.findings.push(`✓ Found ${signals.length} signal files`);
      result.status = 'pass';
    } else {
      result.issues.push('No signal files found (signals are created during wave execution)');
    }
  }

  return result;
}

// Generate gap analysis
function generateGapAnalysis(report) {
  const gaps = [];

  // PRD gaps
  if (report.ai_prd.status === 'fail') {
    gaps.push({
      category: 'Documentation',
      description: 'AI PRD document missing',
      priority: 'high',
      action: 'Create ai-prd/AI-PRD.md with product vision and requirements',
    });
  }

  // Stories gaps
  if (report.ai_stories.stories_found === 0) {
    gaps.push({
      category: 'Stories',
      description: 'No AI Stories defined',
      priority: 'high',
      action: 'Create stories in stories/wave1/*.json',
    });
  } else {
    // Check for empty waves
    Object.entries(report.ai_stories.stories_by_wave).forEach(([wave, count]) => {
      if (count === 0) {
        gaps.push({
          category: 'Stories',
          description: `${wave} directory is empty`,
          priority: 'medium',
          action: `Add story JSON files to stories/${wave}/`,
        });
      }
    });
  }

  // HTML prototype gaps
  if (report.html_prototype.total_prototypes === 0) {
    gaps.push({
      category: 'Design',
      description: 'No HTML prototypes found',
      priority: 'medium',
      action: 'Create HTML mockups in design/ or prototypes/ directory',
    });
  }

  // Structure gaps
  report.file_structure.issues.forEach(issue => {
    if (issue.includes('locks')) {
      gaps.push({
        category: 'Structure',
        description: 'Missing locks directory',
        priority: 'high',
        action: 'Create .claude/locks/ for phase-gate validation',
      });
    } else if (issue.includes('empty')) {
      gaps.push({
        category: 'Structure',
        description: issue,
        priority: 'medium',
        action: 'Populate with required files',
      });
    }
  });

  // CLAUDE.md gaps
  if (!report.claude_md.has_claude_md) {
    gaps.push({
      category: 'Configuration',
      description: 'CLAUDE.md protocol not defined',
      priority: 'high',
      action: 'Create CLAUDE.md with WAVE protocol definitions',
    });
  }

  return { gaps };
}

// Generate improvement plan
function generateImprovementPlan(report) {
  const plan = [];
  let step = 1;

  // Priority 1: PRD
  if (report.ai_prd.status === 'fail') {
    plan.push({
      step: step++,
      title: 'Create AI PRD Document',
      description: 'Write product requirements in ai-prd/AI-PRD.md with goals, features, and success metrics',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'AI PRD Document',
      description: `PRD found at ${report.ai_prd.prd_location}`,
      status: 'completed',
    });
  }

  // Priority 2: Stories
  if (report.ai_stories.stories_found === 0) {
    plan.push({
      step: step++,
      title: 'Define AI Stories',
      description: 'Break down PRD into actionable stories with acceptance criteria in stories/wave1/*.json',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'AI Stories',
      description: `${report.ai_stories.stories_found} stories defined across ${Object.keys(report.ai_stories.stories_by_wave).length} waves`,
      status: report.ai_stories.issues.length === 0 ? 'completed' : 'partial',
    });
  }

  // Priority 3: HTML Prototypes
  if (report.html_prototype.total_prototypes === 0) {
    plan.push({
      step: step++,
      title: 'Create HTML Prototypes',
      description: 'Design UI mockups as HTML files to guide frontend development',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'HTML Prototypes',
      description: `${report.html_prototype.total_prototypes} prototypes found`,
      status: 'completed',
    });
  }

  // Priority 4: WAVE Config
  if (!report.claude_md.has_claude_md) {
    plan.push({
      step: step++,
      title: 'Create CLAUDE.md',
      description: 'Define WAVE protocol with agent roles, gate system, and safety rules',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'WAVE Protocol',
      description: 'CLAUDE.md defines agent protocol',
      status: 'completed',
    });
  }

  // Priority 5: Directory structure
  const structureIssues = report.file_structure.issues.filter(i => i.includes('Missing'));
  if (structureIssues.length > 0) {
    plan.push({
      step: step++,
      title: 'Fix Directory Structure',
      description: `Create missing directories: ${structureIssues.map(i => i.replace('Missing directory: ', '')).join(', ')}`,
      status: 'pending',
    });
  }

  // Priority 6: Run Pre-Flight
  plan.push({
    step: step++,
    title: 'Run Pre-Flight Check',
    description: 'Validate all checklist items pass before starting WAVE automation',
    status: 'pending',
  });

  return plan;
}

// Calculate readiness score
function calculateReadinessScore(report) {
  let score = 0;
  let maxScore = 100;

  // PRD (25 points)
  if (report.ai_prd.status === 'pass') score += 25;
  else if (report.ai_prd.status === 'warn') score += 15;

  // Stories (25 points)
  if (report.ai_stories.status === 'pass') score += 25;
  else if (report.ai_stories.status === 'warn') score += 15;
  else if (report.ai_stories.stories_found > 0) score += 10;

  // HTML Prototypes (15 points)
  if (report.html_prototype.status === 'pass') score += 15;
  else if (report.html_prototype.total_prototypes > 0) score += 10;

  // CLAUDE.md (20 points)
  if (report.claude_md.status === 'pass') score += 20;
  else if (report.claude_md.has_claude_md) score += 10;

  // File Structure (15 points)
  if (report.file_structure.status === 'pass') score += 15;
  else if (report.file_structure.status === 'warn') score += 10;
  else score += 5;

  return Math.round(score);
}

// Sync stories from JSON files to response (for client to sync to Supabase)
app.post('/api/sync-stories', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!exists(projectPath)) {
    return res.status(404).json({ error: 'Project path does not exist' });
  }

  try {
    const storiesDir = path.join(projectPath, 'stories');
    const stories = [];

    if (!exists(storiesDir)) {
      return res.json({ stories: [], message: 'No stories directory found' });
    }

    const waves = listDir(storiesDir).filter(d => d.startsWith('wave'));

    waves.forEach(wave => {
      const waveNumber = parseInt(wave.replace('wave', '')) || 1;
      const wavePath = path.join(storiesDir, wave);
      const storyFiles = listDir(wavePath).filter(f => f.endsWith('.json'));

      storyFiles.forEach(file => {
        const storyPath = path.join(wavePath, file);
        const story = readJSON(storyPath);

        if (story && story.id) {
          stories.push({
            story_id: story.id,
            wave_number: story.wave || waveNumber,
            title: story.title || 'Untitled',
            status: story.status || 'pending',
            gate: story.gate || 0,
            agent_type: story.agent || null,
            // Include full story data for reference
            metadata: {
              priority: story.priority,
              story_points: story.story_points,
              description: story.description,
              acceptance_criteria: story.acceptance_criteria,
              domain: story.domain,
              dependencies: story.dependencies,
              files_to_modify: story.files_to_modify,
              files_to_create: story.files_to_create,
            }
          });
        }
      });
    });

    res.json({
      stories,
      count: stories.length,
      message: `Found ${stories.length} stories to sync`
    });
  } catch (error) {
    console.error('Sync stories error:', error);
    res.status(500).json({ error: 'Failed to read stories', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 WAVE Portal Analysis Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/analyze - Analyze a project`);
  console.log(`   POST /api/sync-stories - Sync stories from JSON to database`);
  console.log(`   GET /api/health - Health check\n`);
});
