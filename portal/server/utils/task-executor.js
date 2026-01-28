/**
 * Task Executor
 *
 * Handles execution of one-click tasks from the Checklist Results Page.
 * Provides endpoints for creating files, generating content, and installing tools.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// File Templates
// ============================================================================

const TEMPLATES = {
  'CLAUDE.md': `# CLAUDE.md - AI Agent Guidelines

## Project Context
This project uses WAVE Console for AI-assisted development.

## Agent Instructions
- Follow the PRD requirements strictly
- Reference design mockups when implementing UI
- Use TypeScript for all new code
- Follow existing code patterns and conventions

## Project Structure
\`\`\`
/docs           - Project documentation
/design_mockups - HTML prototypes
/src            - Source code
/tests          - Test files
\`\`\`

## Key Files
- docs/PRD.md - Product Requirements Document
- docs/ARCHITECTURE.md - System architecture

## Coding Standards
- Use TypeScript strict mode
- Follow ESLint configuration
- Write tests for new features
- Document complex logic with comments

## Safety Guidelines
- Never expose API keys in code
- Validate all user inputs
- Follow security best practices
`,

  'README.md': `# Project Name

## Overview
Brief description of the project.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
\`\`\`bash
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

## Project Structure
\`\`\`
/docs           - Documentation
/design_mockups - UI prototypes
/src            - Source code
\`\`\`

## Documentation
- [PRD](docs/PRD.md) - Product Requirements
- [Architecture](docs/ARCHITECTURE.md) - System Design

## License
MIT
`,

  'PRD.md': `# Product Requirements Document (PRD)

## Overview

### Product Vision
[Describe the product vision and goals]

### Target Users
[Define the target user personas]

## Features

### Core Features
1. **Feature 1**
   - Description
   - Acceptance Criteria

2. **Feature 2**
   - Description
   - Acceptance Criteria

## Technical Requirements

### Technology Stack
- Frontend: [e.g., React, Next.js]
- Backend: [e.g., Node.js, Express]
- Database: [e.g., Supabase, PostgreSQL]

### Performance Requirements
- Page load time: < 2 seconds
- API response time: < 500ms

## Success Metrics
- [Define KPIs and success metrics]

## Timeline
- Phase 1: [Description]
- Phase 2: [Description]
`,

  'mockup-template.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screen Name - Mockup</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-2xl font-bold">Screen Name</h1>
      <p class="text-gray-400">Description of this screen</p>
    </header>

    <main>
      <!-- Add your mockup content here -->
      <div class="bg-gray-800 rounded-lg p-6">
        <p>Content placeholder</p>
      </div>
    </main>
  </div>
</body>
</html>
`,

  '.env.example': `# Environment Variables
# Copy this file to .env and fill in the values

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Keys
ANTHROPIC_API_KEY=your-anthropic-key

# App Configuration
VITE_APP_NAME=Your App Name
VITE_APP_URL=http://localhost:5173

# Optional Services
# SLACK_WEBHOOK_URL=
# VERCEL_TOKEN=
`
};

// ============================================================================
// Task Executors
// ============================================================================

/**
 * Create a folder in the project
 */
async function createFolder(projectPath, folderPath) {
  const fullPath = path.join(projectPath, folderPath);

  try {
    await fs.mkdir(fullPath, { recursive: true });
    return {
      success: true,
      message: `Created folder: ${folderPath}`,
      path: fullPath
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create folder: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Create a file from template
 */
async function createFileFromTemplate(projectPath, template, customPath = null) {
  const templateContent = TEMPLATES[template];
  if (!templateContent) {
    return {
      success: false,
      message: `Unknown template: ${template}`,
      error: 'Template not found'
    };
  }

  // Determine file path
  let filePath;
  if (customPath) {
    filePath = path.join(projectPath, customPath);
  } else if (template === 'PRD.md' || template === 'CLAUDE.md' || template === 'ARCHITECTURE.md') {
    filePath = path.join(projectPath, 'docs', template);
  } else if (template === 'README.md') {
    filePath = path.join(projectPath, template);
  } else if (template === 'mockup-template.html') {
    filePath = path.join(projectPath, 'design_mockups', 'new-screen.html');
  } else if (template === '.env.example') {
    filePath = path.join(projectPath, template);
  } else {
    filePath = path.join(projectPath, template);
  }

  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Check if file exists
    try {
      await fs.access(filePath);
      return {
        success: false,
        message: `File already exists: ${path.relative(projectPath, filePath)}`,
        error: 'File exists'
      };
    } catch {
      // File doesn't exist, proceed
    }

    // Write file
    await fs.writeFile(filePath, templateContent, 'utf-8');
    return {
      success: true,
      message: `Created file: ${path.relative(projectPath, filePath)}`,
      path: filePath
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create file: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Generate .env file based on detected tech stack
 */
async function generateEnvFile(projectPath, techStack = []) {
  let envContent = '# Environment Variables\n# Generated by WAVE Console\n\n';

  // Base variables
  envContent += '# App Configuration\n';
  envContent += 'NODE_ENV=development\n';
  envContent += 'VITE_APP_NAME=My App\n';
  envContent += 'VITE_APP_URL=http://localhost:5173\n\n';

  // Tech-specific variables
  if (techStack.includes('Supabase') || techStack.includes('supabase')) {
    envContent += '# Supabase\n';
    envContent += 'VITE_SUPABASE_URL=\n';
    envContent += 'VITE_SUPABASE_ANON_KEY=\n';
    envContent += '# SUPABASE_SERVICE_ROLE_KEY=\n\n';
  }

  if (techStack.includes('Next.js') || techStack.includes('React')) {
    envContent += '# API Keys\n';
    envContent += 'ANTHROPIC_API_KEY=\n';
    envContent += '# OPENAI_API_KEY=\n\n';
  }

  if (techStack.includes('Vercel')) {
    envContent += '# Vercel\n';
    envContent += '# VERCEL_TOKEN=\n';
    envContent += '# VERCEL_PROJECT_ID=\n\n';
  }

  // Add common optional services
  envContent += '# Optional Services\n';
  envContent += '# SLACK_WEBHOOK_URL=\n';
  envContent += '# LANGCHAIN_TRACING_V2=true\n';
  envContent += '# LANGCHAIN_API_KEY=\n';

  const envPath = path.join(projectPath, '.env');
  const envExamplePath = path.join(projectPath, '.env.example');

  try {
    // Create .env.example (always safe to create)
    await fs.writeFile(envExamplePath, envContent, 'utf-8');

    // Check if .env exists
    let envExists = false;
    try {
      await fs.access(envPath);
      envExists = true;
    } catch {
      // .env doesn't exist
    }

    if (!envExists) {
      await fs.writeFile(envPath, envContent, 'utf-8');
    }

    return {
      success: true,
      message: envExists
        ? 'Created .env.example (existing .env preserved)'
        : 'Created .env and .env.example',
      files: envExists ? [envExamplePath] : [envPath, envExamplePath]
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate .env: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Check if Docker is available
 */
async function checkDockerAvailable() {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Docker (provides instructions/commands)
 */
async function installDocker(projectPath) {
  const dockerAvailable = await checkDockerAvailable();

  if (dockerAvailable) {
    // Create docker-compose.yml if not exists
    const composeContent = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
`;

    const dockerfilePath = path.join(projectPath, 'Dockerfile');
    const composePath = path.join(projectPath, 'docker-compose.yml');

    try {
      // Check if files exist
      let dockerfileExists = false;
      let composeExists = false;

      try {
        await fs.access(dockerfilePath);
        dockerfileExists = true;
      } catch {}

      try {
        await fs.access(composePath);
        composeExists = true;
      } catch {}

      const created = [];

      if (!composeExists) {
        await fs.writeFile(composePath, composeContent, 'utf-8');
        created.push('docker-compose.yml');
      }

      return {
        success: true,
        message: created.length > 0
          ? `Docker is ready! Created: ${created.join(', ')}`
          : 'Docker is ready! Configuration files already exist.',
        dockerAvailable: true,
        files: created
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create Docker files: ${error.message}`,
        error: error.message
      };
    }
  } else {
    return {
      success: false,
      message: 'Docker not found. Please install Docker Desktop first.',
      dockerAvailable: false,
      instructions: [
        '1. Download Docker Desktop from https://docker.com/products/docker-desktop',
        '2. Install and start Docker Desktop',
        '3. Run this task again to set up Docker configuration'
      ]
    };
  }
}

/**
 * Install safety scripts
 */
async function installSafetyScripts(projectPath) {
  const scriptsDir = path.join(projectPath, 'scripts', 'safety');

  try {
    await fs.mkdir(scriptsDir, { recursive: true });

    // Create pre-commit hook
    const preCommitContent = `#!/bin/bash
# WAVE Safety Pre-Commit Hook

echo "Running WAVE safety checks..."

# Check for sensitive data
if grep -r "ANTHROPIC_API_KEY=" --include="*.ts" --include="*.tsx" --include="*.js" .; then
  echo "ERROR: API key found in source code!"
  exit 1
fi

# Check for hardcoded secrets
if grep -rE "(password|secret|token)\\s*=\\s*['\"][^'\"]+['\"]" --include="*.ts" --include="*.tsx" .; then
  echo "WARNING: Potential hardcoded secrets found"
fi

echo "Safety checks passed!"
exit 0
`;

    // Create validation script
    const validationContent = `#!/bin/bash
# WAVE Validation Script

echo "Running WAVE validation..."

# Check TypeScript
if [ -f "tsconfig.json" ]; then
  echo "Checking TypeScript..."
  npx tsc --noEmit
fi

# Check ESLint
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
  echo "Running ESLint..."
  npx eslint . --ext .ts,.tsx
fi

echo "Validation complete!"
`;

    await fs.writeFile(path.join(scriptsDir, 'pre-commit.sh'), preCommitContent, 'utf-8');
    await fs.writeFile(path.join(scriptsDir, 'validate.sh'), validationContent, 'utf-8');

    // Make scripts executable on Unix
    try {
      await execAsync(`chmod +x ${path.join(scriptsDir, '*.sh')}`);
    } catch {
      // Ignore chmod errors on Windows
    }

    return {
      success: true,
      message: 'Safety scripts installed',
      files: [
        'scripts/safety/pre-commit.sh',
        'scripts/safety/validate.sh'
      ],
      instructions: [
        'To enable pre-commit hooks:',
        'cp scripts/safety/pre-commit.sh .git/hooks/pre-commit'
      ]
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to install safety scripts: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Install RLM (Rate Limiting & Moderation) configuration
 */
async function installRLM(projectPath) {
  const rlmConfig = {
    version: '1.0',
    rateLimit: {
      enabled: true,
      maxRequestsPerMinute: 60,
      maxTokensPerMinute: 100000,
      maxCostPerHour: 10.00
    },
    moderation: {
      enabled: true,
      blockList: [],
      contentFiltering: true
    },
    budget: {
      enabled: true,
      maxDailySpend: 50.00,
      alertThreshold: 0.8
    }
  };

  const configPath = path.join(projectPath, 'config', 'rlm.json');

  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(rlmConfig, null, 2), 'utf-8');

    return {
      success: true,
      message: 'RLM configuration installed',
      file: 'config/rlm.json',
      config: rlmConfig
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to install RLM: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Create mockup template
 */
async function createMockupTemplate(projectPath) {
  const mockupsDir = path.join(projectPath, 'design_mockups');

  try {
    await fs.mkdir(mockupsDir, { recursive: true });

    const templatePath = path.join(mockupsDir, '01-new-screen.html');
    await fs.writeFile(templatePath, TEMPLATES['mockup-template.html'], 'utf-8');

    return {
      success: true,
      message: 'Mockup template created',
      file: 'design_mockups/01-new-screen.html'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create mockup template: ${error.message}`,
      error: error.message
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  createFolder,
  createFileFromTemplate,
  generateEnvFile,
  installDocker,
  installSafetyScripts,
  installRLM,
  createMockupTemplate,
  checkDockerAvailable,
  TEMPLATES
};
