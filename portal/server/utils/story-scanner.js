/**
 * Story Scanner Utility (GAP-007)
 *
 * Scans story files for prompt injection patterns before agent processing.
 * Uses the existing PromptInjectionDetector to identify malicious content
 * in story fields like acceptance_criteria, description, objective, and
 * implementation_hints.
 *
 * Based on:
 * - OWASP LLM01:2025 Prompt Injection
 * - Anthropic Prompt Injection Guidelines
 * - AutoGuard Research (arXiv:2511.13725)
 *
 * @see https://owasp.org/www-project-top-10-for-large-language-model-applications/
 */

import fs from 'fs';
import path from 'path';
import { PromptInjectionDetector } from './prompt-injection-detector.js';

// Error codes for story scanning
export const STORY_SCANNER_ERRORS = {
  INVALID_STORY: 'invalid_story',
  FILE_NOT_FOUND: 'file_not_found',
  INVALID_JSON: 'invalid_json',
  INJECTION_DETECTED: 'injection_detected',
  DIRECTORY_NOT_FOUND: 'directory_not_found'
};

// Fields to scan in story objects
const SCANNABLE_FIELDS = [
  'description',
  'objective',
  'title'
];

// Array fields that need special handling
const ARRAY_FIELDS = [
  { field: 'acceptance_criteria', textKey: 'description' },
  { field: 'implementation_hints', textKey: null } // Array of strings
];

// Create detector instance
const detector = new PromptInjectionDetector({ logDetections: false });

/**
 * Scan a story object for injection patterns
 *
 * @param {Object} story - Story object to scan
 * @returns {Object} Scan result { safe, storyId, detections, score, error }
 */
export function scanStory(story) {
  // Validate input
  if (!story || typeof story !== 'object') {
    return {
      safe: false,
      storyId: null,
      detections: [],
      score: 0,
      error: STORY_SCANNER_ERRORS.INVALID_STORY
    };
  }

  const storyId = story.id || 'unknown';
  const detections = [];
  let totalScore = 0;

  // Scan simple string fields
  for (const field of SCANNABLE_FIELDS) {
    if (story[field] && typeof story[field] === 'string') {
      const result = detector.analyze(story[field]);
      if (!result.safe) {
        for (const detection of result.detections) {
          detections.push({
            ...detection,
            field: field
          });
        }
        totalScore += result.score;
      }
    }
  }

  // Scan array fields
  for (const { field, textKey } of ARRAY_FIELDS) {
    if (Array.isArray(story[field])) {
      story[field].forEach((item, index) => {
        let textToScan;
        if (textKey && typeof item === 'object') {
          textToScan = item[textKey];
        } else if (typeof item === 'string') {
          textToScan = item;
        }

        if (textToScan) {
          const result = detector.analyze(textToScan);
          if (!result.safe) {
            for (const detection of result.detections) {
              detections.push({
                ...detection,
                field: `${field}[${index}]`
              });
            }
            totalScore += result.score;
          }
        }
      });
    }
  }

  // Cap score at 100
  const score = Math.min(100, totalScore);

  return {
    safe: detections.length === 0,
    storyId,
    detections,
    score
  };
}

/**
 * Scan a story from a file path
 *
 * @param {string} filePath - Path to story JSON file
 * @returns {Object} Scan result { safe, filePath, storyId, detections, score, error }
 */
export function scanStoryFile(filePath) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      safe: false,
      filePath,
      storyId: null,
      detections: [],
      score: 0,
      error: STORY_SCANNER_ERRORS.FILE_NOT_FOUND
    };
  }

  // Read and parse file
  let story;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    story = JSON.parse(content);
  } catch (e) {
    return {
      safe: false,
      filePath,
      storyId: null,
      detections: [],
      score: 0,
      error: STORY_SCANNER_ERRORS.INVALID_JSON
    };
  }

  // Scan the story
  const result = scanStory(story);

  return {
    ...result,
    filePath
  };
}

/**
 * Scan all stories in a directory
 *
 * @param {string} directoryPath - Path to directory containing story files
 * @returns {Object} Scan result { totalScanned, passed, failed, details, error }
 */
export function scanStories(directoryPath) {
  // Check if directory exists
  if (!fs.existsSync(directoryPath)) {
    return {
      totalScanned: 0,
      passed: 0,
      failed: 0,
      details: [],
      error: STORY_SCANNER_ERRORS.DIRECTORY_NOT_FOUND
    };
  }

  // Get all JSON files
  const files = fs.readdirSync(directoryPath)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(directoryPath, file));

  const details = [];
  let passed = 0;
  let failed = 0;

  for (const filePath of files) {
    const result = scanStoryFile(filePath);
    details.push(result);

    if (result.safe) {
      passed++;
    } else {
      failed++;
    }
  }

  return {
    totalScanned: files.length,
    passed,
    failed,
    details
  };
}

/**
 * Get the injection score from a scan result
 *
 * @param {Object} result - Scan result from scanStory
 * @returns {number} Injection score (0-100)
 */
export function getInjectionScore(result) {
  if (!result || typeof result.score !== 'number') {
    return 0;
  }
  return result.score;
}

/**
 * Determine if a story should be flagged for human review
 *
 * @param {Object} result - Scan result from scanStory
 * @param {number} threshold - Score threshold (default: 50)
 * @returns {boolean} True if story should be flagged
 */
export function flagForReview(result, threshold = 50) {
  if (!result) {
    return false;
  }

  // Always flag if any injection detected (safe approach)
  if (!result.safe) {
    return true;
  }

  // Check score against threshold for edge cases
  return result.score >= threshold;
}

/**
 * Create Express middleware for story scanning
 *
 * @param {Object} options - Middleware options
 * @param {boolean} options.addResultToRequest - Add scan result to request object
 * @param {Function} options.onInjection - Callback when injection detected
 * @returns {Function} Express middleware
 */
export function createStoryScannerMiddleware(options = {}) {
  const {
    addResultToRequest = false,
    onInjection = null
  } = options;

  return (req, res, next) => {
    const story = req.body?.story;

    if (!story) {
      return next();
    }

    const result = scanStory(story);

    // Add result to request if configured
    if (addResultToRequest) {
      req.storyScanResult = result;
    }

    // If injection detected
    if (!result.safe) {
      // Call callback if provided
      if (onInjection && typeof onInjection === 'function') {
        onInjection(result);
      }

      return res.status(400).json({
        error: STORY_SCANNER_ERRORS.INJECTION_DETECTED,
        message: 'Potential prompt injection detected in story',
        storyId: result.storyId,
        detections: result.detections.map(d => ({
          field: d.field,
          category: d.category,
          severity: d.severity
        }))
      });
    }

    next();
  };
}

export default {
  scanStory,
  scanStoryFile,
  scanStories,
  getInjectionScore,
  flagForReview,
  createStoryScannerMiddleware,
  STORY_SCANNER_ERRORS
};
