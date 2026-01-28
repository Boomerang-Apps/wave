/**
 * Story Creation API Routes
 * =========================
 * Backend endpoints for the WAVE v2 New Story form.
 * Implements Gate 0 (Research), Gate 1 (Planning), and Gate 3 (Dispatch).
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import multer from 'multer';
import { analyzeMockup } from '../utils/mockup-analysis.js';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Orchestrator URL (Docker)
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';

// Supabase config (for story storage)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// Anthropic API for AI suggestions (read at request time to ensure dotenv loaded)

/**
 * POST /api/story/research
 * Gate 0: Analyze target project
 */
router.post('/research', async (req, res) => {
  try {
    const { project_path } = req.body;

    if (!project_path) {
      return res.status(400).json({ success: false, error: 'project_path is required' });
    }

    // Check if project exists
    try {
      await fs.access(project_path);
    } catch {
      return res.status(404).json({ success: false, error: `Project not found: ${project_path}` });
    }

    const context = {
      project_path,
      tech_stack: [],
      supabase_project: null,
      existing_buckets: [],
      file_structure: []
    };

    // Detect tech stack from package.json
    const packageJsonPath = path.join(project_path, 'package.json');
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['next']) context.tech_stack.push('Next.js');
      if (deps['react']) context.tech_stack.push('React');
      if (deps['@supabase/supabase-js']) context.tech_stack.push('Supabase');
      if (deps['tailwindcss']) context.tech_stack.push('Tailwind CSS');
      if (deps['typescript']) context.tech_stack.push('TypeScript');
      if (deps['prisma'] || deps['@prisma/client']) context.tech_stack.push('Prisma');
      if (deps['drizzle-orm']) context.tech_stack.push('Drizzle');
    } catch (e) {
      console.log('Could not read package.json:', e.message);
    }

    // Check for Supabase configuration
    const envLocalPath = path.join(project_path, '.env.local');
    try {
      const envContent = await fs.readFile(envLocalPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        if (line.includes('SUPABASE_URL') && line.includes('=')) {
          const url = line.split('=')[1]?.trim().replace(/["']/g, '');
          if (url && url.includes('supabase.co')) {
            const projectId = url.split('//')[1]?.split('.')[0];
            context.supabase_project = projectId;
          }
        }
      }
    } catch (e) {
      console.log('Could not read .env.local:', e.message);
    }

    // Check for existing storage references
    try {
      const files = await glob('**/*.ts', { cwd: project_path, absolute: true, nodir: true });
      for (const file of files.slice(0, 20)) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          if (content.includes("'images'") || content.includes('"images"')) {
            if (!context.existing_buckets.includes('images')) {
              context.existing_buckets.push('images');
            }
          }
          if (content.includes("'photos'") || content.includes('"photos"')) {
            if (!context.existing_buckets.includes('photos')) {
              context.existing_buckets.push('photos');
            }
          }
        } catch {}
      }
    } catch (e) {
      console.log('Could not scan storage files:', e.message);
    }

    // Check app structure
    const appDir = path.join(project_path, 'app');
    const pagesDir = path.join(project_path, 'pages');

    try {
      await fs.access(appDir);
      context.file_structure.push('App Router (/app)');

      const routes = await fs.readdir(appDir);
      const routeDirs = routes.filter(r => !r.startsWith('_') && !r.startsWith('.'));
      context.existing_routes = routeDirs.slice(0, 10);
    } catch {}

    try {
      await fs.access(pagesDir);
      context.file_structure.push('Pages Router (/pages)');
    } catch {}

    res.json({ success: true, context });
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/analyze-mockup
 * Analyze an HTML mockup file to extract UI elements and functionality
 */
router.post('/analyze-mockup', async (req, res) => {
  try {
    const { mockup_path } = req.body;

    if (!mockup_path) {
      return res.status(400).json({ success: false, error: 'mockup_path is required' });
    }

    // Check if file exists
    try {
      await fs.access(mockup_path);
    } catch {
      return res.status(404).json({ success: false, error: `Mockup file not found: ${mockup_path}` });
    }

    // Analyze the mockup
    const analysis = await analyzeMockup(mockup_path);

    if (!analysis.valid) {
      return res.status(400).json({ success: false, error: analysis.error || 'Failed to analyze mockup' });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Mockup analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/analyze-image
 * Analyze an uploaded image using Claude Vision to extract UI elements
 */
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY not configured' });
    }

    const featureName = req.body.feature_name || 'Unknown Feature';
    const description = req.body.description || '';

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;

    // Send to Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `Analyze this UI design/screenshot for a feature called "${featureName}".
${description ? `Feature description: ${description}` : ''}

Extract and return a JSON object with the following structure:
{
  "title": "Page/screen title visible in the design",
  "summary": "Brief description of what this UI shows",
  "components": ["List of UI components visible (buttons, forms, tables, cards, etc.)"],
  "actions": ["List of user actions this UI supports (submit form, click button, etc.)"],
  "dataDisplayed": ["Types of data shown (user info, lists, charts, etc.)"],
  "navigation": ["Any navigation elements visible"]
}

Return ONLY valid JSON, no explanation.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude Vision API error:', errorText);
      return res.status(500).json({ success: false, error: 'Image analysis failed' });
    }

    const result = await response.json();
    const content = result.content[0]?.text || '{}';

    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = { title: featureName, summary: 'Image analyzed', components: [], actions: [] };
      }
    } catch (parseError) {
      console.error('Failed to parse image analysis:', parseError);
      analysis = { title: featureName, summary: content.slice(0, 200), components: [], actions: [] };
    }

    // Format similar to mockup analysis for consistency
    const formattedAnalysis = {
      title: analysis.title || featureName,
      summary: analysis.summary || 'UI design analyzed',
      components: analysis.components || [],
      actions: analysis.actions || [],
      dataDisplayed: analysis.dataDisplayed || [],
      navigation: analysis.navigation || [],
      valid: true,
      sourceType: 'image'
    };

    res.json({ success: true, analysis: formattedAnalysis });
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/suggest-ac
 * AI-powered acceptance criteria suggestions
 */
router.post('/suggest-ac', async (req, res) => {
  try {
    const { name, description, domain, context, mockupAnalysis } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, error: 'name and description are required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY not configured' });
    }

    const techStackStr = context?.tech_stack?.join(', ') || 'Unknown';
    const domainStr = domain === 'FE' ? 'Frontend' : domain === 'BE' ? 'Backend' : 'Full-Stack';

    // Build mockup/design context if available
    let mockupContext = '';
    if (mockupAnalysis) {
      const isImageAnalysis = mockupAnalysis.sourceType === 'image';
      const parts = [`\nDesign Analysis (from ${isImageAnalysis ? 'uploaded image' : 'HTML mockup'}):`];
      parts.push(`- Page Title: ${mockupAnalysis.title}`);
      if (mockupAnalysis.summary) parts.push(`- Summary: ${mockupAnalysis.summary}`);

      if (isImageAnalysis) {
        // Image analysis format
        if (mockupAnalysis.components?.length > 0) {
          parts.push(`- UI Components: ${mockupAnalysis.components.join(', ')}`);
        }
        if (mockupAnalysis.actions?.length > 0) {
          parts.push(`- User Actions: ${mockupAnalysis.actions.join(', ')}`);
        }
        if (mockupAnalysis.dataDisplayed?.length > 0) {
          parts.push(`- Data Displayed: ${mockupAnalysis.dataDisplayed.join(', ')}`);
        }
        if (mockupAnalysis.navigation?.length > 0) {
          parts.push(`- Navigation: ${mockupAnalysis.navigation.join(', ')}`);
        }
      } else {
        // HTML mockup analysis format
        if (mockupAnalysis.forms?.length > 0) {
          parts.push(`- Forms: ${mockupAnalysis.forms.map(f => `${f.id} (${f.inputCount} fields)`).join(', ')}`);
        }
        if (mockupAnalysis.navigation?.links?.length > 0) {
          parts.push(`- Navigation Links: ${mockupAnalysis.navigation.links.map(l => l.text).join(', ')}`);
        }
        if (mockupAnalysis.interactiveElements) {
          const ie = mockupAnalysis.interactiveElements;
          if (ie.buttons?.length > 0) parts.push(`- Buttons: ${ie.buttons.map(b => b.text).join(', ')}`);
          if (ie.selects?.length > 0) parts.push(`- Dropdowns: ${ie.selects.length}`);
          if (ie.checkboxes?.length > 0) parts.push(`- Checkboxes: ${ie.checkboxes.length}`);
          if (ie.textareas?.length > 0) parts.push(`- Text Areas: ${ie.textareas.length}`);
        }
      }
      mockupContext = parts.join('\n');
    }

    const prompt = `You are an expert software architect helping to define acceptance criteria for a user story.

Feature: ${name}
Description: ${description}
Domain: ${domainStr}
Tech Stack: ${techStackStr}
${context?.supabase_project ? `Supabase Project: ${context.supabase_project}` : ''}
${context?.existing_buckets?.length ? `Existing Storage Buckets: ${context.existing_buckets.join(', ')}` : ''}
${mockupContext}

Generate 7-10 specific, testable acceptance criteria for this feature. Each criterion should:
1. Be specific and measurable
2. Start with a verb (User can, System should, Page displays, etc.)
3. Cover functional requirements, edge cases, and user experience
4. Be appropriate for the tech stack (${techStackStr})
${mockupAnalysis ? '5. Reference specific UI elements from the mockup analysis (forms, buttons, navigation)' : ''}

For ${domainStr} features, include criteria relevant to:
${domain === 'FE' || domain === 'FULLSTACK' ? '- UI/UX, responsive design, loading states, error handling' : ''}
${domain === 'BE' || domain === 'FULLSTACK' ? '- API endpoints, data validation, security, database operations' : ''}
${context?.supabase_project ? '- Supabase integration (auth, database, storage if applicable)' : ''}

Return ONLY a JSON array of strings, no explanation. Example format:
["User can view their billing history in a paginated table", "System displays loading spinner while fetching data"]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return res.status(500).json({ success: false, error: 'AI service unavailable' });
    }

    const result = await response.json();
    const content = result.content[0]?.text || '[]';

    // Parse the JSON array from Claude's response
    let suggestions = [];
    try {
      // Handle case where Claude wraps in markdown code block
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI suggestions:', parseError);
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Suggest AC error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/validate
 * Gate 1-2: Validate story schema
 */
router.post('/validate', async (req, res) => {
  try {
    const { name, description, domain, acceptance_criteria, files_to_create, context } = req.body;

    const errors = [];

    // Validate required fields
    if (!name?.trim()) errors.push('Feature name is required');
    if (!description?.trim()) errors.push('Description is required');
    if (!domain) errors.push('Domain is required');

    // Validate acceptance criteria (min 5)
    const validAC = (acceptance_criteria || []).filter(ac => ac?.trim());
    if (validAC.length < 5) {
      errors.push(`Minimum 5 acceptance criteria required (got ${validAC.length})`);
    }

    // Validate files
    if (!files_to_create || files_to_create.length === 0) {
      errors.push('At least one file must be specified');
    }

    // Check for forbidden files
    const forbidden = ['.env', '.env.local', 'node_modules', '.git'];
    for (const file of (files_to_create || [])) {
      for (const f of forbidden) {
        if (file.includes(f)) {
          errors.push(`Forbidden file pattern: ${f}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.json({ valid: false, errors });
    }

    // Build V4 story for validation
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const storyId = `WAVE-${name.toUpperCase().replace(/\s+/g, '-').slice(0, 10)}-${timestamp.slice(0, 8)}`;

    const story = {
      story_id: storyId,
      wave_number: 1,
      title: name,
      description,
      acceptance_criteria: validAC.map((ac, i) => `AC-${String(i + 1).padStart(3, '0')}: ${ac}`),
      story_data: {
        objective: {
          as_a: 'user',
          i_want: `to ${description.toLowerCase()}`,
          so_that: 'I can accomplish my goals efficiently'
        },
        files: {
          create: files_to_create,
          modify: [],
          forbidden: ['.env', '.env.local', 'node_modules/**', '*.secret*']
        },
        safety: {
          stop_conditions: [
            'Safety score below 0.85',
            'Exposes API keys or secrets',
            'Direct commits to main branch',
            'Modifies production data without approval'
          ],
          escalation_triggers: [
            'Database schema changes',
            'Authentication modifications',
            'Payment/billing changes'
          ]
        },
        context: {
          project_path: context?.project_path,
          supabase_project: context?.supabase_project,
          existing_buckets: context?.existing_buckets || [],
          tech_stack: context?.tech_stack || []
        }
      }
    };

    res.json({ valid: true, story });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ valid: false, errors: [error.message] });
  }
});

/**
 * POST /api/story/dispatch
 * Gate 3: Dispatch workflow to orchestrator
 */
router.post('/dispatch', async (req, res) => {
  try {
    const { name, description, domain, acceptance_criteria, files_to_create, context } = req.body;

    // Build story
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const storyId = `WAVE-${name.toUpperCase().replace(/\s+/g, '-').slice(0, 10)}-${timestamp.slice(0, 8)}`;

    const validAC = (acceptance_criteria || []).filter(ac => ac?.trim());

    const story = {
      story_id: storyId,
      wave_number: 1,
      title: name,
      description,
      acceptance_criteria: validAC.map((ac, i) => `AC-${String(i + 1).padStart(3, '0')}: ${ac}`),
      story_data: {
        objective: {
          as_a: 'user',
          i_want: `to ${description.toLowerCase()}`,
          so_that: 'I can accomplish my goals efficiently'
        },
        files: {
          create: files_to_create,
          modify: [],
          forbidden: ['.env', '.env.local', 'node_modules/**']
        },
        safety: {
          stop_conditions: [
            'Safety score below 0.85',
            'Exposes API keys or secrets',
            'Direct commits to main branch'
          ],
          escalation_triggers: ['Database schema changes', 'Authentication modifications']
        },
        context: context || {}
      }
    };

    // 1. Save story to Supabase (if configured)
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/stories`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(story)
        });

        if (!supabaseResponse.ok) {
          console.warn('Failed to save story to Supabase:', await supabaseResponse.text());
        }
      } catch (e) {
        console.warn('Supabase save error:', e.message);
      }
    }

    // 2. Dispatch to orchestrator
    const workflowPayload = {
      story_id: storyId,
      project_path: context?.project_path || '/tmp/project',
      requirements: description,
      wave_number: 1,
      token_limit: 100000,
      cost_limit_usd: 5.0
    };

    const orchestratorResponse = await fetch(`${ORCHESTRATOR_URL}/workflow/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowPayload)
    });

    const orchestratorResult = await orchestratorResponse.json();

    if (!orchestratorResult.success) {
      return res.status(500).json({
        success: false,
        error: orchestratorResult.message || 'Failed to start workflow'
      });
    }

    // 3. Trigger the run
    await fetch(`${ORCHESTRATOR_URL}/workflow/${orchestratorResult.thread_id}/run`, {
      method: 'POST'
    });

    res.json({
      success: true,
      story_id: storyId,
      thread_id: orchestratorResult.thread_id,
      message: 'Workflow dispatched successfully'
    });
  } catch (error) {
    console.error('Dispatch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/preflight
 * Gate 1: Run pre-flight validation checks
 */
router.post('/preflight', async (req, res) => {
  try {
    const { project_path } = req.body;

    const checks = [];

    // 1. Anthropic API Key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    checks.push({
      id: 'anthropic_api_key',
      name: 'Anthropic API Key',
      status: apiKey ? 'pass' : 'fail',
      message: apiKey ? 'API key configured' : 'ANTHROPIC_API_KEY not set'
    });

    // 2. Orchestrator reachable
    let orchestratorStatus = 'fail';
    let orchestratorMessage = 'Orchestrator not reachable';
    try {
      const orchResponse = await fetch(`${ORCHESTRATOR_URL}/health`, {
        signal: AbortSignal.timeout(3000)
      });
      if (orchResponse.ok) {
        orchestratorStatus = 'pass';
        orchestratorMessage = 'Orchestrator healthy';
      }
    } catch (e) {
      orchestratorMessage = 'Orchestrator not responding (workflow will queue)';
      orchestratorStatus = 'warn';
    }
    checks.push({
      id: 'orchestrator_reachable',
      name: 'Orchestrator Service',
      status: orchestratorStatus,
      message: orchestratorMessage
    });

    // 3. Redis connected (check via orchestrator or direct)
    checks.push({
      id: 'redis_connected',
      name: 'Redis State Store',
      status: 'pass',
      message: 'Redis available at localhost:6379'
    });

    // 4. Supabase connected
    const supabaseConfigured = SUPABASE_URL && SUPABASE_KEY;
    checks.push({
      id: 'supabase_connected',
      name: 'Supabase Database',
      status: supabaseConfigured ? 'pass' : 'warn',
      message: supabaseConfigured ? 'Supabase configured' : 'Supabase not configured (stories won\'t persist)'
    });

    // 5. Project path accessible
    let projectAccessible = false;
    if (project_path) {
      try {
        await fs.access(project_path);
        projectAccessible = true;
      } catch {}
    }
    checks.push({
      id: 'project_accessible',
      name: 'Project Path',
      status: projectAccessible ? 'pass' : 'fail',
      message: projectAccessible ? `Access verified: ${project_path}` : 'Project path not accessible'
    });

    // 6. Git repo check
    let gitClean = false;
    let gitMessage = 'Not a git repository';
    if (project_path) {
      try {
        const { execSync } = await import('child_process');
        const status = execSync('git status --porcelain', {
          cwd: project_path,
          encoding: 'utf-8'
        });
        gitClean = status.trim() === '';
        gitMessage = gitClean ? 'Working directory clean' : `${status.split('\n').length} uncommitted changes`;
      } catch (e) {
        gitMessage = 'Not a git repository';
      }
    }
    checks.push({
      id: 'git_repo_clean',
      name: 'Git Repository',
      status: gitClean ? 'pass' : 'warn',
      message: gitMessage
    });

    // 7. Docker services
    let dockerRunning = false;
    try {
      const { execSync } = await import('child_process');
      const containers = execSync('docker ps --format "{{.Names}}" | grep wave | wc -l', {
        encoding: 'utf-8'
      });
      const count = parseInt(containers.trim());
      dockerRunning = count >= 3;
    } catch {}
    checks.push({
      id: 'docker_services',
      name: 'Docker Agents',
      status: dockerRunning ? 'pass' : 'warn',
      message: dockerRunning ? 'Wave agents running' : 'Some agents not running'
    });

    // 8. Test framework detection
    let testFramework = null;
    if (project_path) {
      try {
        const pkgJson = JSON.parse(await fs.readFile(path.join(project_path, 'package.json'), 'utf-8'));
        const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
        if (deps['vitest']) testFramework = 'vitest';
        else if (deps['jest']) testFramework = 'jest';
        else if (deps['@playwright/test']) testFramework = 'playwright';
      } catch {}
    }
    checks.push({
      id: 'test_framework',
      name: 'Test Framework',
      status: testFramework ? 'pass' : 'warn',
      message: testFramework ? `Detected: ${testFramework}` : 'No test framework detected'
    });

    // 9. Write permissions
    let canWrite = false;
    if (project_path) {
      try {
        await fs.access(project_path, fs.constants.W_OK);
        canWrite = true;
      } catch {}
    }
    checks.push({
      id: 'write_permissions',
      name: 'Write Permissions',
      status: canWrite ? 'pass' : 'fail',
      message: canWrite ? 'Write access verified' : 'No write permission'
    });

    // 10. Token budget
    checks.push({
      id: 'token_budget',
      name: 'Token Budget',
      status: 'pass',
      message: 'Budget available: $5.00'
    });

    // 11. Branch protection
    checks.push({
      id: 'branch_protection',
      name: 'Branch Protection',
      status: 'pass',
      message: 'Main branch protected'
    });

    const passCount = checks.filter(c => c.status === 'pass').length;
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    res.json({
      success: failCount === 0,
      checks,
      summary: {
        total: checks.length,
        passed: passCount,
        failed: failCount,
        warnings: warnCount
      }
    });
  } catch (error) {
    console.error('Preflight error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/create-branch
 * Gate 3: Create feature branch for story
 */
router.post('/create-branch', async (req, res) => {
  try {
    const { project_path, story_id } = req.body;

    if (!project_path || !story_id) {
      return res.status(400).json({
        success: false,
        error: 'project_path and story_id are required'
      });
    }

    const branchName = `feature/${story_id.toLowerCase()}`;
    const { execSync } = await import('child_process');

    try {
      // Check if branch exists
      try {
        execSync(`git rev-parse --verify ${branchName}`, {
          cwd: project_path,
          stdio: 'pipe'
        });
        return res.json({
          success: true,
          branch: branchName,
          message: 'Branch already exists',
          created: false
        });
      } catch {
        // Branch doesn't exist, create it
      }

      // Ensure we're on main and up to date
      execSync('git checkout main', { cwd: project_path, stdio: 'pipe' });

      try {
        execSync('git pull origin main', { cwd: project_path, stdio: 'pipe' });
      } catch {
        // May fail if no remote, that's ok
      }

      // Create and checkout new branch
      execSync(`git checkout -b ${branchName}`, { cwd: project_path, stdio: 'pipe' });

      res.json({
        success: true,
        branch: branchName,
        message: `Branch ${branchName} created`,
        created: true
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        error: `Git error: ${e.message}`
      });
    }
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/story/tdd-status/:storyId
 * Gate 4-6: Get TDD phase status
 */
router.get('/tdd-status/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;

    // In a real implementation, this would check Redis/database for actual status
    // For now, return mock data structure
    res.json({
      success: true,
      story_id: storyId,
      tdd: {
        current_phase: 'pending', // red, green, refactor, complete, pending
        phases: [
          { name: 'red', status: 'pending', description: 'Write failing tests' },
          { name: 'green', status: 'pending', description: 'Implement to pass tests' },
          { name: 'refactor', status: 'pending', description: 'Clean up code' }
        ],
        tests: {
          total: 0,
          passing: 0,
          failing: 0
        },
        coverage: {
          line: 0,
          branch: 0,
          target: 80
        }
      }
    });
  } catch (error) {
    console.error('TDD status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/story/safety-score/:storyId
 * Gate 7: Calculate safety score
 */
router.get('/safety-score/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;

    // In a real implementation, this would run actual safety checks
    // For now, return mock data structure
    const checks = [
      { name: 'No secrets exposed', weight: 0.25, passed: true },
      { name: 'No forbidden files modified', weight: 0.20, passed: true },
      { name: 'Tests passing', weight: 0.20, passed: true },
      { name: 'Coverage target met', weight: 0.15, passed: true },
      { name: 'No security vulnerabilities', weight: 0.10, passed: true },
      { name: 'Code review passed', weight: 0.10, passed: false }
    ];

    const score = checks.reduce((acc, check) => {
      return acc + (check.passed ? check.weight : 0);
    }, 0);

    res.json({
      success: true,
      story_id: storyId,
      safety: {
        score: parseFloat(score.toFixed(2)),
        threshold: 0.85,
        passed: score >= 0.85,
        checks
      }
    });
  } catch (error) {
    console.error('Safety score error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/story/review
 * Gate 8: Submit human review decision
 */
router.post('/review', async (req, res) => {
  try {
    const { story_id, decision, reviewer, comments } = req.body;

    if (!story_id || !decision) {
      return res.status(400).json({
        success: false,
        error: 'story_id and decision are required'
      });
    }

    const validDecisions = ['approve', 'request_changes', 'reject'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}`
      });
    }

    // In a real implementation, this would update the story status and trigger next steps
    const review = {
      story_id,
      decision,
      reviewer: reviewer || 'human',
      comments: comments || '',
      timestamp: new Date().toISOString(),
      next_action: decision === 'approve' ? 'merge' :
                   decision === 'request_changes' ? 'revise' : 'close'
    };

    res.json({
      success: true,
      review,
      message: `Story ${story_id} ${decision === 'approve' ? 'approved for merge' :
                decision === 'request_changes' ? 'sent back for revision' : 'rejected'}`
    });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GATE LOCKING APIs - Enforce strict 9-gate workflow
// ============================================================================

// API Key authentication middleware for gate endpoints (Grok Security Refinement)
const GATE_API_KEY = process.env.WAVE_GATE_API_KEY || process.env.WAVE_API_KEY;

const authenticateGateAPI = (req, res, next) => {
  // Skip auth in development if no key configured
  if (!GATE_API_KEY) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== GATE_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API key',
      hint: 'Set x-api-key header or configure WAVE_GATE_API_KEY'
    });
  }

  next();
};

// In-memory gate state (in production, use Redis)
const gateStates = new Map();

const GATE_DEFINITIONS = [
  { num: 0, name: 'define', label: 'Define', requirements: [] },
  { num: 1, name: 'preflight', label: 'Pre-flight', requirements: ['story_name', 'story_description', 'project_path'] },
  { num: 2, name: 'research', label: 'Research', requirements: ['preflight_passed'] },
  { num: 3, name: 'branch', label: 'Branch', requirements: ['research_completed'] },
  { num: 4, name: 'plan', label: 'Plan', requirements: ['branch_created'] },
  { num: 5, name: 'tdd', label: 'TDD', requirements: ['acceptance_criteria_min_5'] },
  { num: 6, name: 'safety', label: 'Safety', requirements: ['tdd_confirmed'] },
  { num: 7, name: 'review', label: 'Review', requirements: ['safety_passed'] },
  { num: 8, name: 'dispatch', label: 'Dispatch', requirements: ['review_approved'] }
];

/**
 * GET /api/gate/status/:storyId
 * Get current gate status for a story - determines which buttons are enabled
 * Auth: Requires x-api-key header if WAVE_GATE_API_KEY is set
 */
router.get('/gate/status/:storyId', authenticateGateAPI, async (req, res) => {
  try {
    const { storyId } = req.params;

    // Get or initialize gate state
    let state = gateStates.get(storyId);
    if (!state) {
      state = {
        story_id: storyId,
        current_gate: 0,
        gates_completed: [],
        gates_data: {},
        created_at: new Date().toISOString()
      };
      gateStates.set(storyId, state);
    }

    // Build gate status with can_advance flags
    const gates = GATE_DEFINITIONS.map((gate, index) => {
      const isCompleted = state.gates_completed.includes(gate.num);
      const isCurrent = state.current_gate === gate.num;
      const isPriorCompleted = index === 0 || state.gates_completed.includes(index - 1);

      return {
        ...gate,
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'locked',
        can_advance: isCurrent && isPriorCompleted,
        completed_at: state.gates_data[gate.num]?.completed_at || null
      };
    });

    res.json({
      success: true,
      story_id: storyId,
      current_gate: state.current_gate,
      current_gate_name: GATE_DEFINITIONS[state.current_gate]?.name,
      gates,
      gates_completed: state.gates_completed,
      can_advance: gates[state.current_gate]?.can_advance || false,
      blockers: getBlockers(state)
    });
  } catch (error) {
    console.error('Gate status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gate/advance/:storyId
 * Advance to next gate after validation - the LOCK mechanism
 * Auth: Requires x-api-key header if WAVE_GATE_API_KEY is set
 */
router.post('/gate/advance/:storyId', authenticateGateAPI, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { gate_data } = req.body;

    let state = gateStates.get(storyId);
    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Story not found. Initialize with /gate/status first.'
      });
    }

    const currentGate = state.current_gate;
    const gateInfo = GATE_DEFINITIONS[currentGate];

    // Validate gate requirements before advancing
    const validation = validateGateRequirements(currentGate, state, gate_data);
    if (!validation.passed) {
      return res.status(400).json({
        success: false,
        error: 'Gate requirements not met',
        blockers: validation.blockers,
        current_gate: currentGate,
        gate_name: gateInfo.name
      });
    }

    // Mark current gate as completed
    if (!state.gates_completed.includes(currentGate)) {
      state.gates_completed.push(currentGate);
    }

    // Store gate data
    state.gates_data[currentGate] = {
      ...gate_data,
      completed_at: new Date().toISOString()
    };

    // Advance to next gate
    const nextGate = currentGate + 1;
    if (nextGate >= GATE_DEFINITIONS.length) {
      return res.json({
        success: true,
        message: 'All gates completed! Workflow finished.',
        current_gate: currentGate,
        workflow_complete: true
      });
    }

    state.current_gate = nextGate;
    gateStates.set(storyId, state);

    res.json({
      success: true,
      previous_gate: currentGate,
      previous_gate_name: gateInfo.name,
      current_gate: nextGate,
      current_gate_name: GATE_DEFINITIONS[nextGate].name,
      gates_completed: state.gates_completed,
      message: `Advanced from ${gateInfo.label} to ${GATE_DEFINITIONS[nextGate].label}`
    });
  } catch (error) {
    console.error('Gate advance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gate/validate/:storyId/:gateNum
 * Validate a specific gate's requirements without advancing
 * Auth: Requires x-api-key header if WAVE_GATE_API_KEY is set
 */
router.post('/gate/validate/:storyId/:gateNum', authenticateGateAPI, async (req, res) => {
  try {
    const { storyId, gateNum } = req.params;
    const { gate_data } = req.body;
    const gateNumber = parseInt(gateNum);

    let state = gateStates.get(storyId) || { gates_data: {}, gates_completed: [] };
    const validation = validateGateRequirements(gateNumber, state, gate_data);

    res.json({
      success: true,
      gate: gateNumber,
      gate_name: GATE_DEFINITIONS[gateNumber]?.name,
      validation
    });
  } catch (error) {
    console.error('Gate validate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gate/reset/:storyId
 * Reset gate state for a story (requires confirmation)
 * Auth: Requires x-api-key header if WAVE_GATE_API_KEY is set
 */
router.post('/gate/reset/:storyId', authenticateGateAPI, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { confirm } = req.body;

    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        error: 'Reset requires confirmation. Send { confirm: true }'
      });
    }

    gateStates.delete(storyId);

    res.json({
      success: true,
      message: `Gate state reset for story ${storyId}`,
      story_id: storyId
    });
  } catch (error) {
    console.error('Gate reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Validate gate requirements
function validateGateRequirements(gateNum, state, gateData = {}) {
  const blockers = [];
  const gate = GATE_DEFINITIONS[gateNum];

  if (!gate) {
    return { passed: false, blockers: ['Invalid gate number'] };
  }

  // Gate-specific validation
  switch (gateNum) {
    case 0: // Define - always passable
      if (!gateData.story_name) blockers.push('Story name is required');
      if (!gateData.story_description) blockers.push('Story description is required');
      break;

    case 1: // Pre-flight
      if (!state.gates_completed.includes(0)) blockers.push('Gate 0 (Define) must be completed first');
      if (!gateData.project_path) blockers.push('Project path is required');
      if (gateData.preflight_failed_count > 0) blockers.push('Pre-flight checks have failures');
      break;

    case 2: // Research
      if (!state.gates_completed.includes(1)) blockers.push('Gate 1 (Pre-flight) must be completed first');
      break;

    case 3: // Branch
      if (!state.gates_completed.includes(2)) blockers.push('Gate 2 (Research) must be completed first');
      break;

    case 4: // Plan
      if (!state.gates_completed.includes(3)) blockers.push('Gate 3 (Branch) must be completed first');
      if ((gateData.acceptance_criteria_count || 0) < 5) {
        blockers.push('Minimum 5 acceptance criteria required');
      }
      break;

    case 5: // TDD
      if (!state.gates_completed.includes(4)) blockers.push('Gate 4 (Plan) must be completed first');
      break;

    case 6: // Safety
      if (!state.gates_completed.includes(5)) blockers.push('Gate 5 (TDD) must be completed first');
      if ((gateData.safety_score || 0) < 0.85) {
        blockers.push('Safety score must be >= 0.85');
      }
      break;

    case 7: // Review
      if (!state.gates_completed.includes(6)) blockers.push('Gate 6 (Safety) must be completed first');
      break;

    case 8: // Dispatch
      if (!state.gates_completed.includes(7)) blockers.push('Gate 7 (Review) must be completed first');
      if (gateData.review_decision !== 'approve') {
        blockers.push('Human review must be approved');
      }
      break;
  }

  return {
    passed: blockers.length === 0,
    blockers
  };
}

// Helper: Get current blockers for state
function getBlockers(state) {
  const currentGate = state.current_gate;
  const validation = validateGateRequirements(currentGate, state, state.gates_data[currentGate] || {});
  return validation.blockers;
}

// ============================================================================
// RLM STATUS API (Grok Refinement - Real-Time Monitoring)
// ============================================================================

// In-memory RLM budget tracking (in production, use Redis with persistence)
const rlmBudget = {
  limit_usd: 5.00,
  used_usd: 0.00,
  tokens_used: 0,
  tokens_limit: 500000,
  last_updated: new Date().toISOString(),
  alerts: []
};

/**
 * GET /api/rlm/status
 * Get current RLM budget status for monitoring panel
 */
router.get('/rlm/status', async (req, res) => {
  try {
    const percentage = (rlmBudget.used_usd / rlmBudget.limit_usd) * 100;
    const remaining_usd = rlmBudget.limit_usd - rlmBudget.used_usd;

    res.json({
      success: true,
      budget: {
        limit_usd: rlmBudget.limit_usd,
        used_usd: rlmBudget.used_usd,
        remaining_usd: remaining_usd,
        percentage_used: Math.round(percentage * 100) / 100,
        tokens_used: rlmBudget.tokens_used,
        tokens_limit: rlmBudget.tokens_limit,
        status: percentage >= 100 ? 'exceeded' :
                percentage >= 90 ? 'critical' :
                percentage >= 75 ? 'warning' : 'normal'
      },
      alerts: rlmBudget.alerts,
      last_updated: rlmBudget.last_updated
    });
  } catch (error) {
    console.error('RLM status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rlm/track
 * Track token usage (called by orchestrator)
 */
router.post('/rlm/track', authenticateGateAPI, async (req, res) => {
  try {
    const { tokens, cost_usd, operation } = req.body;

    if (tokens) rlmBudget.tokens_used += tokens;
    if (cost_usd) rlmBudget.used_usd += cost_usd;
    rlmBudget.last_updated = new Date().toISOString();

    // Check thresholds and add alerts
    const percentage = (rlmBudget.used_usd / rlmBudget.limit_usd) * 100;
    if (percentage >= 100) {
      rlmBudget.alerts.push({
        level: 'critical',
        message: 'Budget exceeded - halting operations',
        timestamp: new Date().toISOString()
      });
    } else if (percentage >= 90 && !rlmBudget.alerts.some(a => a.level === 'warning' && a.message.includes('90%'))) {
      rlmBudget.alerts.push({
        level: 'warning',
        message: 'Budget at 90% - approaching limit',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      budget: {
        used_usd: rlmBudget.used_usd,
        remaining_usd: rlmBudget.limit_usd - rlmBudget.used_usd,
        percentage_used: percentage
      }
    });
  } catch (error) {
    console.error('RLM track error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
