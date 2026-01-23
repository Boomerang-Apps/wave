// ═══════════════════════════════════════════════════════════════════════════════
// SECRET REDACTOR - OWASP-COMPLIANT SENSITIVE DATA MASKING
// ═══════════════════════════════════════════════════════════════════════════════
// Validated: OWASP Secrets Management Cheat Sheet
// https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
//
// Validated: OWASP MCP Top 10 2025 - Token Mismanagement and Secret Exposure
// https://owasp.org/www-project-mcp-top-10/2025/MCP01-2025-Token-Mismanagement-and-Secret-Exposure
//
// Patterns validated against: Yelp detect-secrets (OWASP recommended tool)
// https://github.com/Yelp/detect-secrets
//
// OWASP Core Principle: "Secrets should never be logged. Implement encryption
// or masking approaches."
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SecretRedactor - OWASP-compliant sensitive data masking
 * Prevents secrets from leaking into logs, Slack messages, and audit trails.
 */
export class SecretRedactor {
  constructor(options = {}) {
    this.redactedPlaceholder = options.placeholder || '[REDACTED]';
    this.preserveLength = options.preserveLength || false;

    // VALIDATED: Patterns from Yelp detect-secrets (OWASP recommended tool)
    this.patterns = [
      // ─────────────────────────────────────────────────────────────────────────
      // AI/LLM API Keys
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9\-_]{40,}/g },
      { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48,}/g },
      { name: 'OpenAI Org ID', pattern: /org-[a-zA-Z0-9]{24}/g },
      { name: 'Hugging Face Token', pattern: /hf_[a-zA-Z0-9]{34}/g },
      { name: 'Cohere API Key', pattern: /co-[a-zA-Z0-9]{40}/g },

      // ─────────────────────────────────────────────────────────────────────────
      // Cloud Provider Keys
      // ─────────────────────────────────────────────────────────────────────────
      // AWS - VALIDATED: detect-secrets patterns
      { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
      { name: 'AWS Secret Key', pattern: /(?<=aws_secret_access_key["\s:=]+)[a-zA-Z0-9+\/]{40}/gi },
      { name: 'AWS Session Token', pattern: /(?<=aws_session_token["\s:=]+)[a-zA-Z0-9+\/=]+/gi },

      // Google Cloud
      { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/g },
      { name: 'GCP Service Account', pattern: /"type"\s*:\s*"service_account"/g },

      // Azure
      { name: 'Azure Storage Key', pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+/g },

      // ─────────────────────────────────────────────────────────────────────────
      // Slack Tokens
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'Slack Bot Token', pattern: /xoxb-[a-zA-Z0-9\-]+/g },
      { name: 'Slack User Token', pattern: /xoxp-[a-zA-Z0-9\-]+/g },
      { name: 'Slack App Token', pattern: /xoxa-[a-zA-Z0-9\-]+/g },
      { name: 'Slack Webhook', pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/g },

      // ─────────────────────────────────────────────────────────────────────────
      // Database URLs
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'PostgreSQL URL', pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi },
      { name: 'MongoDB URL', pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s"']+/gi },
      { name: 'MySQL URL', pattern: /mysql:\/\/[^:]+:[^@]+@[^\s"']+/gi },
      { name: 'Redis URL', pattern: /redis:\/\/[^:]+:[^@]+@[^\s"']+/gi },

      // ─────────────────────────────────────────────────────────────────────────
      // Git & Repository
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'GitHub Token', pattern: /gh[ps]_[a-zA-Z0-9]{36}/g },
      { name: 'GitHub OAuth', pattern: /gho_[a-zA-Z0-9]{36}/g },
      { name: 'GitLab Token', pattern: /glpat-[a-zA-Z0-9\-_]{20,}/g },
      { name: 'Bitbucket Token', pattern: /bitbucket_[a-zA-Z0-9]{32}/g },

      // ─────────────────────────────────────────────────────────────────────────
      // Authentication Tokens
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9\-_.~+\/]+=*/gi },
      { name: 'Basic Auth', pattern: /Basic\s+[a-zA-Z0-9+\/]+=*/gi },
      { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g },

      // Supabase (JWT format)
      { name: 'Supabase Key', pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },

      // ─────────────────────────────────────────────────────────────────────────
      // Private Keys & Certificates
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'Private Key', pattern: /-----BEGIN[A-Z ]+PRIVATE KEY-----[\s\S]*?-----END[A-Z ]+PRIVATE KEY-----/g },
      { name: 'RSA Private Key', pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g },
      { name: 'SSH Private Key', pattern: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g },
      { name: 'PGP Private Key', pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----/g },

      // ─────────────────────────────────────────────────────────────────────────
      // Generic Patterns
      // ─────────────────────────────────────────────────────────────────────────
      // Password fields in various formats
      { name: 'Password JSON', pattern: /"password"\s*:\s*"[^"]+"/gi },
      { name: 'Password Env', pattern: /(?:PASSWORD|PASSWD|PWD)=[^\s\n]+/gi },
      { name: 'Password YAML', pattern: /password:\s*[^\s\n]+/gi },

      // API Key patterns
      { name: 'API Key JSON', pattern: /"api[_-]?key"\s*:\s*"[^"]+"/gi },
      { name: 'API Key Env', pattern: /API[_-]?KEY=[^\s\n]+/gi },

      // Secret patterns
      { name: 'Secret JSON', pattern: /"secret"\s*:\s*"[^"]+"/gi },
      { name: 'Secret Env', pattern: /SECRET=[^\s\n]+/gi },

      // Token patterns
      { name: 'Token JSON', pattern: /"(?:access_)?token"\s*:\s*"[^"]+"/gi },
      { name: 'Token Env', pattern: /(?:ACCESS_)?TOKEN=[^\s\n]+/gi },

      // ─────────────────────────────────────────────────────────────────────────
      // Third-party Services
      // ─────────────────────────────────────────────────────────────────────────
      { name: 'Stripe Key', pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g },
      { name: 'Stripe Publishable', pattern: /pk_(?:live|test)_[a-zA-Z0-9]{24,}/g },
      { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}/g },
      { name: 'Twilio Auth Token', pattern: /(?<=TWILIO_AUTH_TOKEN[=:\s]+)[a-f0-9]{32}/gi },
      { name: 'Mailchimp API Key', pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g },
      { name: 'NPM Token', pattern: /npm_[a-zA-Z0-9]{36}/g },
      { name: 'Vercel Token', pattern: /[a-zA-Z0-9]{24}(?=.*vercel)/gi },
    ];

    // Sensitive key names (keys that should have their values fully redacted)
    this.sensitiveKeyPatterns = [
      /password/i, /passwd/i, /pwd/i,
      /secret/i, /private/i,
      /token/i, /bearer/i,
      /api[_-]?key/i, /apikey/i,
      /credential/i, /auth/i,
      /access[_-]?key/i,
      /client[_-]?secret/i,
      /private[_-]?key/i,
      /encryption[_-]?key/i,
      /signing[_-]?key/i
    ];
  }

  /**
   * Redact secrets from a string
   * @param {string} input - String to redact
   * @returns {string} Redacted string
   */
  redactString(input) {
    if (typeof input !== 'string') return input;
    if (!input) return input;

    let result = input;
    let redactionsApplied = 0;

    for (const { name, pattern } of this.patterns) {
      const matches = result.match(pattern);
      if (matches) {
        redactionsApplied += matches.length;
        result = result.replace(pattern, this.redactedPlaceholder);
      }
    }

    return result;
  }

  /**
   * Check if key name suggests sensitive data
   * @param {string} key - Key name to check
   * @returns {boolean} Whether key is sensitive
   */
  isSensitiveKey(key) {
    if (!key || typeof key !== 'string') return false;
    return this.sensitiveKeyPatterns.some(pattern => pattern.test(key));
  }

  /**
   * Recursively redact secrets from an object
   * @param {*} obj - Object to redact
   * @param {number} depth - Current recursion depth
   * @returns {*} Redacted object
   */
  redactObject(obj, depth = 0) {
    // Prevent infinite recursion
    if (depth > 20) return '[MAX_DEPTH_EXCEEDED]';

    // Handle null/undefined
    if (obj === null || obj === undefined) return obj;

    // Handle strings
    if (typeof obj === 'string') {
      return this.redactString(obj);
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item, depth + 1));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        // Fully redact sensitive keys
        if (this.isSensitiveKey(key)) {
          result[key] = this.redactedPlaceholder;
        } else {
          result[key] = this.redactObject(value, depth + 1);
        }
      }
      return result;
    }

    // Return primitives as-is
    return obj;
  }

  /**
   * Redact Slack payload before sending
   * @param {Object} payload - Slack message payload
   * @returns {Object} Redacted payload
   */
  redactSlackPayload(payload) {
    return this.redactObject(payload);
  }

  /**
   * Redact for audit logging
   * @param {*} data - Data to redact
   * @returns {*} Redacted data safe for logging
   */
  redactForAudit(data) {
    return this.redactObject(data);
  }

  /**
   * Check if a string contains secrets
   * @param {string} input - String to check
   * @returns {Object} Detection result
   */
  detectSecrets(input) {
    if (typeof input !== 'string') {
      return { hasSecrets: false, detected: [] };
    }

    const detected = [];

    for (const { name, pattern } of this.patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      const matches = input.match(pattern);
      if (matches) {
        detected.push({
          type: name,
          count: matches.length
        });
      }
    }

    return {
      hasSecrets: detected.length > 0,
      detected
    };
  }

  /**
   * Add a custom pattern
   * @param {string} name - Pattern name
   * @param {RegExp} pattern - Regular expression pattern
   */
  addPattern(name, pattern) {
    this.patterns.push({ name, pattern });
  }

  /**
   * Get list of pattern names
   * @returns {string[]} Pattern names
   */
  getPatternNames() {
    return this.patterns.map(p => p.name);
  }
}

// Export singleton instance
export const secretRedactor = new SecretRedactor();

export default SecretRedactor;
