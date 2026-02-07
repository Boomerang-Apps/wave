#!/usr/bin/env ts-node
/**
 * WAVE AI Story Schema Validator
 * Story: SCHEMA-004
 *
 * Validates AI Stories against V4.1, V4.2, or V4.3 schemas.
 * Auto-detects schema version, provides clear error messages with line numbers,
 * and suggests fixes for common errors.
 *
 * Usage:
 *   ./tools/validate-story.ts <story-file>.json
 *   ./tools/validate-story.ts <directory>/**\/*.json
 *   npm run validate-story -- stories/AUTH-001.json
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Schema version to file path mapping
const SCHEMA_FILES: Record<string, string> = {
  '4.1': 'planning/schemas/story-schema-v4.1.json',
  '4.2': 'planning/schemas/story-schema-v4.2.json',
  '4.3': 'planning/schemas/story-schema-v4.3.json',
};

// Common error suggestions
const ERROR_SUGGESTIONS: Record<string, string> = {
  'must be string': 'Ensure the field contains a string value, not a number or boolean.',
  'must be integer': 'Use a whole number (e.g., 5), not a decimal or string.',
  'must be array': 'Use square brackets [] to define an array.',
  'must be object': 'Use curly braces {} to define an object.',
  'must have required property': 'Add the missing required field to your story.',
  'must match pattern': 'Check the field format matches the required pattern.',
  'must match format "uri"': 'Provide a valid URL starting with http:// or https://.',
  'must match format "date-time"': 'Use ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ',
  'must be equal to one of the allowed values': 'Use one of the enum values listed in the schema.',
  'must NOT have additional properties': 'Remove extra fields not defined in the schema.',
};

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  filePath: string;
}

interface ValidationError {
  message: string;
  dataPath: string;
  line?: number;
  suggestion?: string;
}

/**
 * Detect schema version from story file
 */
function detectSchemaVersion(story: any): string {
  if (story.schema_version) {
    return story.schema_version;
  }

  // Fallback: detect by fields
  if (story.context || story.execution || story.subtasks || story.enterprise) {
    return '4.3';
  }

  if (story.design_source) {
    return '4.2';
  }

  return '4.1';
}

/**
 * Load schema file
 */
function loadSchema(version: string): any {
  const schemaPath = SCHEMA_FILES[version];

  if (!schemaPath) {
    throw new Error(`Unknown schema version: ${version}. Supported: ${Object.keys(SCHEMA_FILES).join(', ')}`);
  }

  const fullPath = path.join(process.cwd(), schemaPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Schema file not found: ${fullPath}`);
  }

  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

/**
 * Get line number for a JSON path in the file
 */
function getLineNumber(fileContent: string, dataPath: string): number | undefined {
  const lines = fileContent.split('\n');
  const pathSegments = dataPath.replace(/^\//, '').split('/');

  if (pathSegments.length === 0 || pathSegments[0] === '') {
    return undefined;
  }

  // Simple heuristic: find the line containing the field name
  const searchField = pathSegments[pathSegments.length - 1];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${searchField}"`)) {
      return i + 1; // Lines are 1-indexed
    }
  }

  return undefined;
}

/**
 * Get suggestion for common errors
 */
function getSuggestion(errorMessage: string): string | undefined {
  for (const [pattern, suggestion] of Object.entries(ERROR_SUGGESTIONS)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return suggestion;
    }
  }
  return undefined;
}

/**
 * Validate a single story file
 */
function validateStory(filePath: string): ValidationResult {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let story: any;

  try {
    story = JSON.parse(fileContent);
  } catch (err: any) {
    return {
      valid: false,
      errors: [{
        message: `Invalid JSON: ${err.message}`,
        dataPath: '',
      }],
      filePath,
    };
  }

  const version = detectSchemaVersion(story);
  const schema = loadSchema(version);

  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
  });

  // Add format validators (uri, date-time, etc.)
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(story);

  const errors: ValidationError[] = [];

  if (!valid && validate.errors) {
    for (const error of validate.errors) {
      const dataPath = error.instancePath || error.dataPath || '/';
      const message = error.message || 'Unknown error';
      const fullMessage = `${dataPath}: ${message}`;

      errors.push({
        message: fullMessage,
        dataPath,
        line: getLineNumber(fileContent, dataPath),
        suggestion: getSuggestion(message),
      });
    }
  }

  return {
    valid,
    errors,
    filePath,
  };
}

/**
 * Format validation results for console output
 */
function formatResults(results: ValidationResult[]): string {
  let output = '';
  let totalErrors = 0;

  for (const result of results) {
    if (result.valid) {
      output += `✅ ${result.filePath}: VALID\n`;
    } else {
      totalErrors += result.errors.length;
      output += `❌ ${result.filePath}: INVALID\n`;

      for (const error of result.errors) {
        const lineInfo = error.line ? ` (line ${error.line})` : '';
        output += `   ${error.message}${lineInfo}\n`;

        if (error.suggestion) {
          output += `   💡 Suggestion: ${error.suggestion}\n`;
        }
      }

      output += '\n';
    }
  }

  output += `\n${'='.repeat(60)}\n`;
  output += `Total files: ${results.length}\n`;
  output += `Passed: ${results.filter(r => r.valid).length}\n`;
  output += `Failed: ${results.filter(r => !r.valid).length}\n`;
  output += `Total errors: ${totalErrors}\n`;

  return output;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: validate-story <file.json> [file2.json ...]');
    console.error('       validate-story <directory>/**/*.json');
    process.exit(1);
  }

  let filePaths: string[] = [];

  for (const arg of args) {
    if (arg.includes('*')) {
      // Glob pattern
      const matches = await glob(arg, { nodir: true });
      filePaths.push(...matches);
    } else {
      // Single file or directory
      const stat = fs.statSync(arg);

      if (stat.isDirectory()) {
        const matches = await glob(`${arg}/**/*.json`, { nodir: true });
        filePaths.push(...matches);
      } else {
        filePaths.push(arg);
      }
    }
  }

  if (filePaths.length === 0) {
    console.error('No JSON files found to validate.');
    process.exit(1);
  }

  console.log(`Validating ${filePaths.length} file(s)...\n`);

  const results = filePaths.map(filePath => validateStory(filePath));

  console.log(formatResults(results));

  const allValid = results.every(r => r.valid);
  process.exit(allValid ? 0 : 1);
}

// Export for testing
export { validateStory, detectSchemaVersion, loadSchema, getSuggestion, getLineNumber };

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
