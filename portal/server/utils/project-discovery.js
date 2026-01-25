/**
 * Project Discovery Utility
 *
 * Scans a project folder and extracts:
 * - Project name and description
 * - Vision statement
 * - Documentation files (PRD, Architecture, User Stories, README)
 * - Design mockups (HTML files)
 * - Tech stack info
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * @typedef {Object} ProjectMetadata
 * @property {string} name - Project name
 * @property {string} tagline - Short tagline/description
 * @property {string} vision - Vision statement
 * @property {string} description - Longer description
 * @property {DocumentationFile[]} documentation - List of documentation files
 * @property {MockupFile[]} mockups - List of mockup files
 * @property {string[]} techStack - Detected technologies
 */

/**
 * @typedef {Object} DocumentationFile
 * @property {string} title - Display title
 * @property {string} filename - File name
 * @property {string} path - Full path to file
 * @property {string} type - Type: 'prd' | 'architecture' | 'user-stories' | 'readme' | 'other'
 * @property {string} icon - Icon name for UI
 */

/**
 * @typedef {Object} MockupFile
 * @property {string} name - Screen name (derived from filename)
 * @property {string} filename - File name
 * @property {string} path - Full path to file
 * @property {number} order - Sort order (from numeric prefix)
 */

// Common documentation file patterns
const DOC_PATTERNS = {
  prd: [/prd/i, /product.?requirements?/i, /requirements?.?doc/i],
  architecture: [/architect/i, /system.?design/i, /tech.?spec/i],
  userStories: [/user.?stor/i, /stories/i, /epics?/i],
  readme: [/readme/i],
  claude: [/claude\.md/i],
  quickstart: [/quickstart/i, /getting.?started/i],
  setup: [/setup/i, /install/i],
};

// Icon mapping for doc types
const DOC_ICONS = {
  prd: 'FileText',
  architecture: 'Building2',
  userStories: 'Users',
  readme: 'BookOpen',
  claude: 'Bot',
  quickstart: 'Rocket',
  setup: 'Settings',
  other: 'File',
};

/**
 * Discover project metadata from a folder path
 * @param {string} projectPath - Path to the project root
 * @returns {Promise<ProjectMetadata>}
 */
export async function discoverProject(projectPath) {
  const metadata = {
    name: '',
    tagline: '',
    vision: '',
    description: '',
    documentation: [],
    mockups: [],
    techStack: [],
  };

  try {
    // 1. Get project name from various sources
    metadata.name = await discoverProjectName(projectPath);

    // 2. Find and parse README for vision/description
    const readmeData = await extractReadmeInfo(projectPath);
    metadata.vision = readmeData.vision;
    metadata.description = readmeData.description;
    metadata.tagline = readmeData.tagline;

    // 3. Discover documentation files
    metadata.documentation = await discoverDocumentation(projectPath);

    // 4. Discover mockup files
    metadata.mockups = await discoverMockups(projectPath);

    // 5. Detect tech stack
    metadata.techStack = await detectTechStack(projectPath);

    return metadata;
  } catch (error) {
    console.error('Error discovering project:', error);
    throw error;
  }
}

/**
 * Discover project name from package.json, folder name, or other sources
 */
async function discoverProjectName(projectPath) {
  // Try package.json first
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    if (packageJson.name && !packageJson.name.startsWith('@')) {
      return formatProjectName(packageJson.name);
    }
  } catch {}

  // Try nested app folder package.json
  const entries = await fs.readdir(projectPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const nestedPackage = path.join(projectPath, entry.name, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(nestedPackage, 'utf-8'));
        if (packageJson.name && !packageJson.name.startsWith('@')) {
          return formatProjectName(packageJson.name);
        }
      } catch {}
    }
  }

  // Fall back to folder name
  return formatProjectName(path.basename(projectPath));
}

/**
 * Format project name for display
 */
function formatProjectName(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Extract vision and description from README files
 */
async function extractReadmeInfo(projectPath) {
  const result = {
    vision: '',
    description: '',
    tagline: '',
  };

  // Look for README in root and common subdirectories
  const searchPaths = [
    projectPath,
    path.join(projectPath, 'docs'),
    path.join(projectPath, 'documentation'),
  ];

  // Also search in project subdirectories (like footprint/footprint/)
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.includes('node_modules')) {
        searchPaths.push(path.join(projectPath, entry.name));
      }
    }
  } catch {}

  for (const searchPath of searchPaths) {
    try {
      const files = await fs.readdir(searchPath);
      const readmeFile = files.find(f => /^readme/i.test(f));

      if (readmeFile) {
        const content = await fs.readFile(path.join(searchPath, readmeFile), 'utf-8');

        // Extract tagline (usually first line after title or a subtitle)
        const taglineMatch = content.match(/^#+\s*.+\n+(?:>\s*)?([^\n#]+)/m);
        if (taglineMatch) {
          result.tagline = taglineMatch[1].replace(/[*_`]/g, '').trim();
        }

        // Extract vision (look for Vision section or quoted statement)
        const visionPatterns = [
          /vision[:\s]*["']?([^"'\n]+)["']?/i,
          /["']([^"']{20,150})["']/,  // Quoted statement
          />\s*["']?([^"'\n]{20,150})["']?/m,  // Blockquote
        ];

        for (const pattern of visionPatterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            result.vision = match[1].trim();
            break;
          }
        }

        // Extract description (first paragraph or overview section)
        const descPatterns = [
          /(?:description|overview|about)[:\s]*\n+([^\n#]+)/i,
          /^#+\s*.+\n+(?:>\s*[^\n]+\n+)?([^\n#]{50,500})/m,
        ];

        for (const pattern of descPatterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            result.description = match[1].replace(/[*_`]/g, '').trim();
            break;
          }
        }

        if (result.vision || result.description) break;
      }
    } catch {}
  }

  // Also check for PRD files for vision/description
  if (!result.vision) {
    try {
      const prdInfo = await extractPrdInfo(projectPath);
      result.vision = result.vision || prdInfo.vision;
      result.tagline = result.tagline || prdInfo.tagline;
    } catch {}
  }

  return result;
}

/**
 * Extract info from PRD documents
 */
async function extractPrdInfo(projectPath) {
  const result = { vision: '', tagline: '' };

  const docsPath = path.join(projectPath, 'docs');
  const footprintDocsPath = path.join(projectPath, 'footprint-docs');

  const searchPaths = [projectPath, docsPath, footprintDocsPath];

  for (const searchPath of searchPaths) {
    try {
      const files = await fs.readdir(searchPath);
      const prdFile = files.find(f => /prd/i.test(f) && f.endsWith('.md'));

      if (prdFile) {
        const content = await fs.readFile(path.join(searchPath, prdFile), 'utf-8');

        // Look for vision statement
        const visionMatch = content.match(/vision[:\s]*["']?([^"'\n]+)["']?/i);
        if (visionMatch) {
          result.vision = visionMatch[1].trim();
        }

        // Look for tagline/subtitle
        const taglineMatch = content.match(/(?:tagline|subtitle)[:\s]*["']?([^"'\n]+)["']?/i);
        if (taglineMatch) {
          result.tagline = taglineMatch[1].trim();
        }
      }
    } catch {}
  }

  return result;
}

/**
 * Discover documentation files in the project
 */
async function discoverDocumentation(projectPath) {
  const docs = [];

  // Search in these directories
  const searchDirs = [
    { path: projectPath, prefix: '' },
    { path: path.join(projectPath, 'docs'), prefix: 'docs/' },
    { path: path.join(projectPath, 'documentation'), prefix: 'documentation/' },
    { path: path.join(projectPath, 'footprint-docs'), prefix: 'footprint-docs/' },
  ];

  // Also check subdirectories that might contain docs
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.includes('docs')) {
        searchDirs.push({
          path: path.join(projectPath, entry.name),
          prefix: `${entry.name}/`,
        });
      }
    }
  } catch {}

  for (const { path: searchPath, prefix } of searchDirs) {
    try {
      const files = await fs.readdir(searchPath);

      for (const file of files) {
        const filePath = path.join(searchPath, file);
        const stat = await fs.stat(filePath);

        if (!stat.isFile()) continue;

        // Only include markdown and common doc formats
        const ext = path.extname(file).toLowerCase();
        if (!['.md', '.mdx', '.txt', '.docx', '.pdf'].includes(ext)) continue;

        // Determine doc type
        const docType = categorizeDocument(file);

        docs.push({
          title: formatDocTitle(file),
          filename: file,
          path: filePath,
          relativePath: prefix + file,
          type: docType,
          icon: DOC_ICONS[docType] || DOC_ICONS.other,
        });
      }
    } catch {}
  }

  // Sort: PRD first, then architecture, then user stories, then others
  const typeOrder = ['prd', 'architecture', 'userStories', 'readme', 'claude', 'quickstart', 'setup', 'other'];
  docs.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));

  return docs;
}

/**
 * Categorize a document file by its name
 */
function categorizeDocument(filename) {
  const lower = filename.toLowerCase();

  for (const [type, patterns] of Object.entries(DOC_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return type;
      }
    }
  }

  return 'other';
}

/**
 * Format document title for display
 */
function formatDocTitle(filename) {
  return filename
    .replace(/\.(md|mdx|txt|docx|pdf)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Discover mockup files in design_mockups folder
 */
async function discoverMockups(projectPath) {
  const mockups = [];

  const mockupsPath = path.join(projectPath, 'design_mockups');

  try {
    const files = await fs.readdir(mockupsPath);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.html', '.htm'].includes(ext)) continue;

      const filePath = path.join(mockupsPath, file);
      const stat = await fs.stat(filePath);

      if (!stat.isFile()) continue;

      // Extract order from numeric prefix (e.g., "01-upload.html" -> 1)
      const orderMatch = file.match(/^(\d+)/);
      const order = orderMatch ? parseInt(orderMatch[1], 10) : 999;

      // Extract screen name
      const name = formatMockupName(file);

      mockups.push({
        name,
        filename: file,
        path: filePath,
        order,
      });
    }

    // Sort by order
    mockups.sort((a, b) => a.order - b.order);

  } catch (error) {
    // design_mockups folder might not exist
    console.log('No design_mockups folder found');
  }

  return mockups;
}

/**
 * Format mockup filename to display name
 */
function formatMockupName(filename) {
  return filename
    .replace(/\.(html|htm)$/i, '')
    .replace(/^\d+-/, '')  // Remove numeric prefix
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Detect tech stack from project files
 */
async function detectTechStack(projectPath) {
  const techStack = [];

  // Check for common tech indicators
  const indicators = [
    { file: 'package.json', tech: 'Node.js' },
    { file: 'next.config.js', tech: 'Next.js' },
    { file: 'next.config.mjs', tech: 'Next.js' },
    { file: 'next.config.ts', tech: 'Next.js' },
    { file: 'vite.config.ts', tech: 'Vite' },
    { file: 'vite.config.js', tech: 'Vite' },
    { file: 'tsconfig.json', tech: 'TypeScript' },
    { file: 'tailwind.config.js', tech: 'Tailwind CSS' },
    { file: 'tailwind.config.ts', tech: 'Tailwind CSS' },
    { file: 'prisma/schema.prisma', tech: 'Prisma' },
    { file: '.env.local', tech: 'Environment Config' },
    { file: 'docker-compose.yml', tech: 'Docker' },
    { file: 'Dockerfile', tech: 'Docker' },
  ];

  // Check root and nested directories
  const searchPaths = [projectPath];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        searchPaths.push(path.join(projectPath, entry.name));
      }
    }
  } catch {}

  for (const searchPath of searchPaths) {
    for (const { file, tech } of indicators) {
      if (techStack.includes(tech)) continue;

      try {
        await fs.access(path.join(searchPath, file));
        techStack.push(tech);
      } catch {}
    }
  }

  // Check package.json for React, Vue, etc.
  for (const searchPath of searchPaths) {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(searchPath, 'package.json'), 'utf-8')
      );
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.react && !techStack.includes('React')) techStack.push('React');
      if (deps.vue && !techStack.includes('Vue')) techStack.push('Vue');
      if (deps['@supabase/supabase-js'] && !techStack.includes('Supabase')) techStack.push('Supabase');
      if (deps.zustand && !techStack.includes('Zustand')) techStack.push('Zustand');
    } catch {}
  }

  return techStack;
}

export default {
  discoverProject,
  discoverProjectName,
  discoverDocumentation,
  discoverMockups,
  detectTechStack,
};
