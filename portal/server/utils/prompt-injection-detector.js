// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INJECTION DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════
// Runtime detection of prompt injection attempts in agent outputs
// Based on OWASP LLM01 guidelines and AutoGuard research (arXiv:2511.13725)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prompt Injection Detector
 *
 * Detects various types of prompt injection attacks:
 * - Jailbreak patterns (DAN, STAN, Developer Mode)
 * - Instruction override attempts
 * - Role-playing exploits
 * - Encoding bypass attempts (base64, hex, rot13)
 * - Context manipulation
 * - Goal hijacking
 *
 * Sources:
 * - OWASP Top 10 LLM 2025: https://owasp.org/www-project-top-10-for-large-language-model-applications/
 * - AutoGuard (arXiv:2511.13725): https://arxiv.org/abs/2511.13725
 * - NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
 */

// Injection pattern categories with severity levels
const INJECTION_PATTERNS = {
  // Category 1: Jailbreak Attempts (CRITICAL)
  jailbreak: {
    severity: 'critical',
    patterns: [
      // DAN (Do Anything Now) variants
      /\bDAN\b.*mode/i,
      /do\s+anything\s+now/i,
      /\bDANN?\b.*\bmode\b/i,

      // STAN variants
      /\bSTAN\b.*mode/i,
      /strive\s+to\s+avoid\s+norms/i,

      // Developer/Debug mode
      /developer\s+mode\s+(?:is\s+)?(?:now\s+)?(enabled|on|active)/i,
      /debug\s+mode\s+(?:is\s+)?(?:now\s+)?(enabled|on|active)/i,
      /maintenance\s+mode\s*(?:is\s+)?(?:now\s+)?(?:enabled|on|active)?/i,

      // Jailbreak keywords
      /\bjailbreak(ed|ing)?\b/i,
      /bypass\s+(all\s+)?restrictions/i,
      /ignore\s+(all\s+)?(previous\s+)?(your\s+)?instructions/i,
      /disregard\s+(all\s+)?(previous\s+)?(your\s+)?instructions/i,
      /forget\s+(all\s+)?(previous\s+)?(your\s+)?instructions/i,

      // Persona switching
      /you\s+are\s+now\s+(?!going\s+to)/i,
      /pretend\s+you\s+are\s+(a\s+)?different/i,
      /act\s+as\s+if\s+you\s+have\s+no\s+restrictions/i,
    ]
  },

  // Category 2: Instruction Override (HIGH)
  instructionOverride: {
    severity: 'high',
    patterns: [
      // Direct override attempts
      /new\s+instructions?\s*:/i,
      /updated?\s+instructions?\s*:/i,
      /override\s+instructions?\s*:/i,
      /system\s+prompt\s*:/i,
      /\[system\]/i,
      /\[INST\]/i,

      // Context manipulation
      /ignore\s+(?:the\s+)?(?:above|previous|prior)/i,
      /disregard\s+(?:the\s+)?(?:above|previous|prior)/i,
      /the\s+(?:above|previous)\s+(?:instructions?|text)\s+(?:is|are|was|were)\s+(?:fake|test|wrong)/i,

      // Authority claims
      /i\s+am\s+(?:your\s+)?(?:admin|administrator|root|superuser)/i,
      /admin\s+override/i,
      /emergency\s+override/i,
      /authorized\s+to\s+bypass/i,
    ]
  },

  // Category 3: Role-Playing Exploits (HIGH)
  rolePlayExploit: {
    severity: 'high',
    patterns: [
      // Hypothetical framing
      /hypothetically/i,
      /hypothetical\s+scenario/i,
      /for\s+(?:educational|research|academic)\s+purposes/i,
      /this\s+is\s+(?:just\s+)?(?:a\s+)?(?:fictional|hypothetical|theoretical)/i,

      // Character/persona requests
      /roleplay\s+as\s+(?:a\s+)?(?:hacker|attacker|malicious)/i,
      /pretend\s+(?:to\s+be|you(?:'re|\s+are))\s+(?:a\s+|an\s+)?(?:hacker|attacker)/i,
      /act\s+(?:like|as)\s+(?:a\s+|an\s+)?(?:criminal|hacker|attacker)/i,

      // Story framing
      /write\s+(?:a\s+)?(?:story|fiction)\s+(?:about|where)/i,
      /creative\s+writing\s+exercise/i,
    ]
  },

  // Category 4: Encoding Bypass (MEDIUM)
  encodingBypass: {
    severity: 'medium',
    patterns: [
      // Base64 indicators
      /base64\s*(?:decode|decrypt|encoded?)/i,
      /decode\s+(?:this|the\s+following)\s*:/i,

      // Hex encoding
      /\\x[0-9a-fA-F]{2}/,
      /0x[0-9a-fA-F]+/,

      // Unicode escape
      /\\u[0-9a-fA-F]{4}/,

      // ROT13/Caesar cipher
      /rot13/i,
      /caesar\s+cipher/i,

      // Leetspeak indicators (excessive)
      /[1!][gG][nN][0oO][rR][3eE]/,  // "ignore" in leetspeak
    ]
  },

  // Category 5: Goal Hijacking (HIGH)
  goalHijacking: {
    severity: 'high',
    patterns: [
      // Output manipulation
      /instead\s+(?:of\s+)?(?:doing\s+)?(?:that|what\s+I\s+asked)/i,
      /(?:actually|really)\s+(?:I\s+)?(?:want|need)\s+you\s+to/i,
      /forget\s+(?:about\s+)?(?:the\s+)?(?:previous|original)\s+(?:task|request)/i,

      // Priority override
      /(?:this\s+is\s+)?(?:more\s+)?important\s*:/i,
      /prioritize\s+(?:this|the\s+following)/i,
      /urgent\s*:\s*(?:ignore|skip|bypass)/i,

      // Task switching
      /new\s+(?:primary\s+)?(?:task|objective|goal)\s*:/i,
      /change\s+(?:of\s+)?(?:plans?|objectives?)/i,
    ]
  },

  // Category 6: Context Injection (MEDIUM)
  contextInjection: {
    severity: 'medium',
    patterns: [
      // Hidden instructions
      /<!--.*(?:instruction|command|execute).*-->/is,
      /\/\*.*(?:instruction|command|execute).*\*\//is,

      // Markdown/formatting exploits
      /```(?:system|instruction|hidden)/i,
      /\[hidden\]/i,
      /\[invisible\]/i,

      // Delimiter manipulation
      /={10,}/,  // Long delimiter lines
      /#{10,}/,  // Long hash lines
      /-{10,}/,  // Long dash lines (might be legitimate, but flag for review)
    ]
  },

  // Category 7: Data Exfiltration Attempts (CRITICAL)
  dataExfiltration: {
    severity: 'critical',
    patterns: [
      // Secret extraction
      /(?:show|reveal|display|print|output)\s+(?:me\s+)?(?:the\s+)?(?:your\s+)?(?:system\s+)?prompt/i,
      /what\s+(?:is|are)\s+your\s+(?:instructions?|rules?|guidelines?)\??/i,
      /repeat\s+(?:your\s+)?(?:initial|original|system)\s+(?:instructions?|prompt)/i,
      /your\s+(?:initial|original|system)\s+(?:instructions?|prompt)/i,

      // Environment extraction
      /(?:print|show|reveal|echo)\s+(?:all\s+)?environment\s+variables/i,
      /(?:list|show)\s+(?:all\s+)?(?:api\s+)?keys/i,
      /(?:what|show)\s+(?:is|are)\s+(?:the\s+)?credentials/i,
    ]
  },

  // Category 8: Privilege Escalation (CRITICAL)
  privilegeEscalation: {
    severity: 'critical',
    patterns: [
      // Sudo/root attempts
      /sudo\s+/i,
      /as\s+root/i,
      /with\s+(?:admin|administrator|root)\s+(?:privileges?|permissions?|rights?)/i,

      // Permission bypass
      /bypass\s+(?:the\s+)?(?:permission|auth|authentication)/i,
      /(?:disable|turn\s+off)\s+(?:the\s+)?(?:safety|security|restrictions?)/i,
      /unrestricted\s+(?:access|mode)/i,
    ]
  }
};

/**
 * PromptInjectionDetector class
 * Analyzes text for potential prompt injection attempts
 */
class PromptInjectionDetector {
  constructor(options = {}) {
    this.patterns = options.patterns || INJECTION_PATTERNS;
    this.strictMode = options.strictMode ?? true;
    this.logDetections = options.logDetections ?? true;
    this.customPatterns = new Map();
  }

  /**
   * Analyze text for injection patterns
   * @param {string} text - Text to analyze
   * @returns {Object} Analysis result
   */
  analyze(text) {
    if (!text || typeof text !== 'string') {
      return {
        safe: true,
        detections: [],
        severity: null,
        score: 0
      };
    }

    const detections = [];
    let maxSeverity = null;
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    // Check each pattern category
    for (const [category, config] of Object.entries(this.patterns)) {
      for (const pattern of config.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          detections.push({
            category,
            severity: config.severity,
            pattern: pattern.toString(),
            match: matches[0],
            index: matches.index
          });

          // Track max severity
          if (!maxSeverity || severityOrder[config.severity] > severityOrder[maxSeverity]) {
            maxSeverity = config.severity;
          }
        }
      }
    }

    // Check custom patterns
    for (const [name, config] of this.customPatterns) {
      const matches = text.match(config.pattern);
      if (matches) {
        detections.push({
          category: `custom:${name}`,
          severity: config.severity,
          pattern: config.pattern.toString(),
          match: matches[0],
          index: matches.index
        });

        if (!maxSeverity || severityOrder[config.severity] > severityOrder[maxSeverity]) {
          maxSeverity = config.severity;
        }
      }
    }

    // Calculate risk score (0-100)
    const score = this._calculateScore(detections);

    const result = {
      safe: detections.length === 0,
      detections,
      severity: maxSeverity,
      score,
      timestamp: new Date().toISOString()
    };

    if (this.logDetections && detections.length > 0) {
      this._logDetection(result);
    }

    return result;
  }

  /**
   * Quick check if text is safe (no injection detected)
   * @param {string} text - Text to check
   * @returns {boolean} True if safe
   */
  isSafe(text) {
    return this.analyze(text).safe;
  }

  /**
   * Check if text contains critical injection
   * @param {string} text - Text to check
   * @returns {boolean} True if critical injection found
   */
  hasCriticalInjection(text) {
    const result = this.analyze(text);
    return result.severity === 'critical';
  }

  /**
   * Analyze agent signal for injection
   * @param {Object} signal - Signal object to analyze
   * @returns {Object} Analysis result
   */
  analyzeSignal(signal) {
    if (!signal || typeof signal !== 'object') {
      return { safe: true, detections: [], severity: null, score: 0 };
    }

    const textsToAnalyze = [];

    // Extract text fields from signal
    const extractText = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          textsToAnalyze.push({ path: `${path}${key}`, text: value });
        } else if (typeof value === 'object' && value !== null) {
          extractText(value, `${path}${key}.`);
        }
      }
    };

    extractText(signal);

    // Analyze all text fields
    const allDetections = [];
    let maxSeverity = null;
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    for (const { path, text } of textsToAnalyze) {
      const result = this.analyze(text);
      if (!result.safe) {
        for (const detection of result.detections) {
          allDetections.push({
            ...detection,
            field: path
          });
        }
        if (!maxSeverity || severityOrder[result.severity] > severityOrder[maxSeverity]) {
          maxSeverity = result.severity;
        }
      }
    }

    return {
      safe: allDetections.length === 0,
      detections: allDetections,
      severity: maxSeverity,
      score: this._calculateScore(allDetections),
      fieldsAnalyzed: textsToAnalyze.length
    };
  }

  /**
   * Add custom pattern
   * @param {string} name - Pattern name
   * @param {RegExp} pattern - Regex pattern
   * @param {string} severity - Severity level
   */
  addPattern(name, pattern, severity = 'medium') {
    this.customPatterns.set(name, { pattern, severity });
  }

  /**
   * Remove custom pattern
   * @param {string} name - Pattern name
   */
  removePattern(name) {
    this.customPatterns.delete(name);
  }

  /**
   * Get all pattern names
   * @returns {string[]} Pattern names
   */
  getPatternNames() {
    const builtIn = Object.keys(this.patterns);
    const custom = Array.from(this.customPatterns.keys()).map(k => `custom:${k}`);
    return [...builtIn, ...custom];
  }

  /**
   * Get statistics
   * @returns {Object} Pattern statistics
   */
  getStats() {
    let totalPatterns = 0;
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const config of Object.values(this.patterns)) {
      totalPatterns += config.patterns.length;
      bySeverity[config.severity] += config.patterns.length;
    }

    for (const config of this.customPatterns.values()) {
      totalPatterns++;
      bySeverity[config.severity]++;
    }

    return {
      totalPatterns,
      categories: Object.keys(this.patterns).length + this.customPatterns.size,
      bySeverity
    };
  }

  /**
   * Calculate risk score based on detections
   * @private
   */
  _calculateScore(detections) {
    if (detections.length === 0) return 0;

    const severityWeights = { critical: 40, high: 25, medium: 15, low: 5 };
    let score = 0;

    for (const detection of detections) {
      score += severityWeights[detection.severity] || 10;
    }

    return Math.min(100, score);
  }

  /**
   * Log detection for audit
   * @private
   */
  _logDetection(result) {
    console.warn('[INJECTION DETECTED]', {
      severity: result.severity,
      score: result.score,
      detections: result.detections.length,
      timestamp: result.timestamp
    });
  }
}

// Singleton instance
const promptInjectionDetector = new PromptInjectionDetector();

// Export
export { PromptInjectionDetector, promptInjectionDetector, INJECTION_PATTERNS };
