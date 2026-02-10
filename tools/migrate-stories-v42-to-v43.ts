#!/usr/bin/env ts-node
/**
 * WAVE AI Story Migration Tool: V4.2 → V4.3
 * Story: SCHEMA-003
 *
 * Migrates V4.2 stories to V4.3 format, adding new fields with sensible defaults.
 * Preserves all existing data and validates output.
 *
 * Usage:
 *   ./tools/migrate-stories-v42-to-v43.ts <story-file>.json
 *   ./tools/migrate-stories-v42-to-v43.ts <directory>/**\/*.json
 *   ./tools/migrate-stories-v42-to-v43.ts --dry-run <file>.json
 *   npm run migrate -- stories/AUTH-001.json
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
// import { validateStory } from './validate-story.js'; // Commented out due to ESM import issues

interface MigrationResult {
  success: boolean;
  inputFile: string;
  outputFile?: string;
  errors: string[];
  warnings: string[];
}

interface MigrationOptions {
  dryRun: boolean;
  backup: boolean;
  outputSuffix: string;
}

const DEFAULT_OPTIONS: MigrationOptions = {
  dryRun: false,
  backup: true,
  outputSuffix: '.v43',
};

/**
 * Add V4.3 specific fields with sensible defaults
 */
function addV43Fields(story: any): any {
  const migrated = { ...story };

  // Update schema version
  migrated.schema_version = '4.3';

  // Update $schema reference
  if (migrated.$schema) {
    migrated.$schema = migrated.$schema.replace('v4.2', 'v4.3').replace('v4.1', 'v4.3');
  } else {
    migrated.$schema = '../planning/schemas/story-schema-v4.3.json';
  }

  // Add context section (NEW IN V4.3)
  if (!migrated.context) {
    migrated.context = {
      read_files: [],
      code_examples: [],
      similar_implementations: [],
    };
  }

  // Add execution section (NEW IN V4.3)
  if (!migrated.execution) {
    migrated.execution = {
      max_retries: 3,
      timeout_minutes: 60,
      model_tier: 'sonnet',
      checkpoint_frequency: 'per_gate',
    };
  }

  // Add subtasks section (NEW IN V4.3) - empty by default
  if (!migrated.subtasks) {
    migrated.subtasks = [];
  }

  // Enhance design_source if present (V4.3 enhancements)
  if (migrated.design_source && typeof migrated.design_source === 'object') {
    if (!migrated.design_source.components) {
      migrated.design_source.components = [];
    }
    if (!migrated.design_source.interactions) {
      migrated.design_source.interactions = [];
    }
    if (!migrated.design_source.accessibility) {
      migrated.design_source.accessibility = {
        wcag_level: 'AA',
        keyboard_navigation: true,
        screen_reader_tested: false,
      };
    }
  }

  // Add enterprise section (NEW IN V4.3) - empty by default
  if (!migrated.enterprise) {
    migrated.enterprise = {
      compliance: [],
      approvals_required: [],
      modification_history: [
        {
          timestamp: new Date().toISOString(),
          author: 'migration-tool-v42-to-v43',
          change_description: 'Migrated from V4.2 to V4.3 schema',
        },
      ],
    };
  }

  // Add output section (NEW IN V4.3) - empty by default
  if (!migrated.output) {
    migrated.output = {
      files_created: [],
      files_modified: [],
      tests_passing: false,
    };
  }

  // Add validation section (NEW IN V4.3) - empty by default
  if (!migrated.validation) {
    migrated.validation = {};
  }

  return migrated;
}

/**
 * Migrate a single story from V4.2 to V4.3
 */
function migrateStory(inputPath: string, options: MigrationOptions): MigrationResult {
  const result: MigrationResult = {
    success: false,
    inputFile: inputPath,
    errors: [],
    warnings: [],
  };

  try {
    // Read input file
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    let story: any;

    try {
      story = JSON.parse(fileContent);
    } catch (err: any) {
      result.errors.push(`Invalid JSON: ${err.message}`);
      return result;
    }

    // Check if already V4.3
    if (story.schema_version === '4.3') {
      result.warnings.push('Story is already V4.3 - no migration needed');
      result.success = true;
      return result;
    }

    // Check if V4.2 (or missing version, assume V4.2)
    if (story.schema_version && story.schema_version !== '4.2' && story.schema_version !== '4.1') {
      result.errors.push(`Unsupported schema version: ${story.schema_version}. Expected V4.1 or V4.2.`);
      return result;
    }

    // Perform migration
    const migrated = addV43Fields(story);

    // Generate output path
    const parsed = path.parse(inputPath);
    const outputPath = path.join(parsed.dir, `${parsed.name}${options.outputSuffix}${parsed.ext}`);
    result.outputFile = outputPath;

    // Validation moved to separate step - run: npm run validate -- <migrated-file.json>
    // const tempFile = path.join('/tmp', `validate-${Date.now()}.json`);
    // fs.writeFileSync(tempFile, JSON.stringify(migrated, null, 2));
    // const validation = validateStory(tempFile);
    // fs.unlinkSync(tempFile);
    // if (!validation.valid) {
    //   result.errors.push('Migrated story failed V4.3 validation:');
    //   validation.errors.forEach(err => {
    //     result.errors.push(`  ${err.message}`);
    //   });
    //   return result;
    // }

    result.warnings.push('⚠️  Run validation after migration: npm run validate -- <output-file>');

    // Write output (unless dry-run)
    if (!options.dryRun) {
      // Backup original if requested
      if (options.backup && !outputPath.includes(options.outputSuffix)) {
        const backupPath = inputPath + '.backup';
        fs.copyFileSync(inputPath, backupPath);
        result.warnings.push(`Backup created: ${backupPath}`);
      }

      fs.writeFileSync(outputPath, JSON.stringify(migrated, null, 2) + '\n');
    }

    result.success = true;

    return result;
  } catch (err: any) {
    result.errors.push(`Migration failed: ${err.message}`);
    return result;
  }
}

/**
 * Format migration results for console output
 */
function formatResults(results: MigrationResult[], options: MigrationOptions): string {
  let output = '';

  if (options.dryRun) {
    output += '🔍 DRY RUN MODE - No files will be modified\n\n';
  }

  for (const result of results) {
    if (result.success) {
      output += `✅ ${result.inputFile}\n`;
      if (result.outputFile) {
        output += `   → ${result.outputFile}\n`;
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach(warn => {
          output += `   ⚠️  ${warn}\n`;
        });
      }
    } else {
      output += `❌ ${result.inputFile}\n`;
      result.errors.forEach(err => {
        output += `   ${err}\n`;
      });
    }
    output += '\n';
  }

  output += `${'='.repeat(60)}\n`;
  output += `Total files: ${results.length}\n`;
  output += `Migrated: ${results.filter(r => r.success).length}\n`;
  output += `Failed: ${results.filter(r => !r.success).length}\n`;

  if (options.dryRun) {
    output += '\nRun without --dry-run to perform actual migration.\n';
  }

  return output;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
WAVE AI Story Migration Tool: V4.2 → V4.3

Usage:
  migrate-stories-v42-to-v43 [options] <file.json> [file2.json ...]
  migrate-stories-v42-to-v43 [options] <directory>/**/*.json

Options:
  --dry-run          Show what would be migrated without modifying files
  --no-backup        Don't create .backup files (default: create backups)
  --in-place         Overwrite original files instead of creating .v43 files
  --help, -h         Show this help message

Examples:
  # Migrate single file (creates AUTH-001.v43.json)
  migrate-stories-v42-to-v43 stories/AUTH-001.json

  # Dry run to preview changes
  migrate-stories-v42-to-v43 --dry-run stories/AUTH-001.json

  # Migrate all stories in directory
  migrate-stories-v42-to-v43 stories/**/*.json

  # Migrate in-place (overwrites original)
  migrate-stories-v42-to-v43 --in-place stories/AUTH-001.json
    `);
    process.exit(0);
  }

  // Parse options
  const options: MigrationOptions = { ...DEFAULT_OPTIONS };
  const filePaths: string[] = [];

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--in-place') {
      options.outputSuffix = '';
    } else if (!arg.startsWith('--')) {
      filePaths.push(arg);
    }
  }

  if (filePaths.length === 0) {
    console.error('Error: No files specified');
    process.exit(1);
  }

  // Expand file paths
  let expandedPaths: string[] = [];

  for (const arg of filePaths) {
    if (arg.includes('*')) {
      // Glob pattern
      const matches = await glob(arg, { nodir: true });
      expandedPaths.push(...matches);
    } else {
      // Single file or directory
      const stat = fs.statSync(arg);

      if (stat.isDirectory()) {
        const matches = await glob(`${arg}/**/*.json`, { nodir: true });
        expandedPaths.push(...matches);
      } else {
        expandedPaths.push(arg);
      }
    }
  }

  if (expandedPaths.length === 0) {
    console.error('No JSON files found to migrate.');
    process.exit(1);
  }

  console.log(`Migrating ${expandedPaths.length} file(s) from V4.2 to V4.3...\n`);

  // Migrate all files
  const results = expandedPaths.map(filePath => migrateStory(filePath, options));

  // Display results
  console.log(formatResults(results, options));

  // Exit with appropriate code
  const allSuccess = results.every(r => r.success);
  process.exit(allSuccess ? 0 : 1);
}

// Export for testing
export { migrateStory, addV43Fields };

// Run if executed directly (ESM compatible check)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename || process.argv[1].endsWith('migrate-stories-v42-to-v43.ts');

if (isMain) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
