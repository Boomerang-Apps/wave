/**
 * TDD Tests for Input Validation Middleware (GAP-003)
 *
 * Tests cover:
 * - Schema validation (types, lengths, enums, patterns)
 * - Strict mode (reject unexpected fields)
 * - Nested object validation
 * - Array validation
 * - Query parameter validation
 * - Path parameter validation
 * - Security patterns (injection, XSS, path traversal)
 *
 * RED Phase: All tests should fail initially
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These imports will fail until we create the modules
import {
  validateSchema,
  createValidator,
  ValidationError,
  VALIDATION_ERRORS
} from '../middleware/validation.js';

import {
  schemas,
  getSchemaForEndpoint,
  budgetSchema,
  gateOverrideSchema,
  agentStartSchema,
  auditLogSchema,
  slackNotifySchema,
  rateLimitConfigSchema
} from '../middleware/schemas.js';

describe('Input Validation Middleware (GAP-003)', () => {

  // ============================================
  // UNIT TESTS - validateSchema Function
  // ============================================

  describe('validateSchema - Required Fields', () => {
    const schema = {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' }
      }
    };

    it('should pass when all required fields are present', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required field is missing', () => {
      const data = { name: 'John' };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          code: VALIDATION_ERRORS.REQUIRED
        })
      );
    });

    it('should fail when multiple required fields are missing', () => {
      const data = {};
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should fail when required field is null', () => {
      const data = { name: 'John', email: null };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('email');
    });

    it('should fail when required field is undefined', () => {
      const data = { name: 'John', email: undefined };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - Type Validation (String)', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    };

    it('should pass for valid string', () => {
      const result = validateSchema({ name: 'John' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for number when string expected', () => {
      const result = validateSchema({ name: 123 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INVALID_TYPE);
      expect(result.errors[0].expected).toBe('string');
      expect(result.errors[0].received).toBe('number');
    });

    it('should fail for boolean when string expected', () => {
      const result = validateSchema({ name: true }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INVALID_TYPE);
    });

    it('should fail for array when string expected', () => {
      const result = validateSchema({ name: ['John'] }, schema);
      expect(result.valid).toBe(false);
    });

    it('should fail for object when string expected', () => {
      const result = validateSchema({ name: { first: 'John' } }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - Type Validation (Number)', () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'number' },
        count: { type: 'integer' }
      }
    };

    it('should pass for valid number', () => {
      const result = validateSchema({ age: 25.5 }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for integer', () => {
      const result = validateSchema({ count: 10 }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for string when number expected', () => {
      const result = validateSchema({ age: '25' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INVALID_TYPE);
    });

    it('should fail for float when integer expected', () => {
      const result = validateSchema({ count: 10.5 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INVALID_TYPE);
    });

    it('should fail for NaN', () => {
      const result = validateSchema({ age: NaN }, schema);
      expect(result.valid).toBe(false);
    });

    it('should fail for Infinity', () => {
      const result = validateSchema({ age: Infinity }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - Type Validation (Boolean)', () => {
    const schema = {
      type: 'object',
      properties: {
        active: { type: 'boolean' }
      }
    };

    it('should pass for true', () => {
      const result = validateSchema({ active: true }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for false', () => {
      const result = validateSchema({ active: false }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for string "true"', () => {
      const result = validateSchema({ active: 'true' }, schema);
      expect(result.valid).toBe(false);
    });

    it('should fail for number 1', () => {
      const result = validateSchema({ active: 1 }, schema);
      expect(result.valid).toBe(false);
    });

    it('should fail for number 0', () => {
      const result = validateSchema({ active: 0 }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - Type Validation (Array)', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: { type: 'array' }
      }
    };

    it('should pass for valid array', () => {
      const result = validateSchema({ tags: ['a', 'b'] }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for empty array', () => {
      const result = validateSchema({ tags: [] }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for string when array expected', () => {
      const result = validateSchema({ tags: 'a,b' }, schema);
      expect(result.valid).toBe(false);
    });

    it('should fail for object when array expected', () => {
      const result = validateSchema({ tags: { 0: 'a' } }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - Type Validation (Object)', () => {
    const schema = {
      type: 'object',
      properties: {
        metadata: { type: 'object' }
      }
    };

    it('should pass for valid object', () => {
      const result = validateSchema({ metadata: { key: 'value' } }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for empty object', () => {
      const result = validateSchema({ metadata: {} }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for array when object expected', () => {
      const result = validateSchema({ metadata: [] }, schema);
      expect(result.valid).toBe(false);
    });

    it('should fail for string when object expected', () => {
      const result = validateSchema({ metadata: '{}' }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - String Length Validation', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 50 },
        code: { type: 'string', minLength: 5, maxLength: 5 }
      }
    };

    it('should pass for string within length limits', () => {
      const result = validateSchema({ name: 'John' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for exact min length', () => {
      const result = validateSchema({ name: 'Jo' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for exact max length', () => {
      const result = validateSchema({ name: 'A'.repeat(50) }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for string below min length', () => {
      const result = validateSchema({ name: 'J' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MIN_LENGTH);
      expect(result.errors[0].minLength).toBe(2);
    });

    it('should fail for string above max length', () => {
      const result = validateSchema({ name: 'A'.repeat(51) }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MAX_LENGTH);
      expect(result.errors[0].maxLength).toBe(50);
    });

    it('should fail for empty string when minLength > 0', () => {
      const result = validateSchema({ name: '' }, schema);
      expect(result.valid).toBe(false);
    });

    it('should validate exact length constraint', () => {
      const result = validateSchema({ code: '12345' }, schema);
      expect(result.valid).toBe(true);

      const resultShort = validateSchema({ code: '1234' }, schema);
      expect(resultShort.valid).toBe(false);

      const resultLong = validateSchema({ code: '123456' }, schema);
      expect(resultLong.valid).toBe(false);
    });
  });

  describe('validateSchema - Number Range Validation', () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'number', minimum: 0, maximum: 150 },
        score: { type: 'number', minimum: 0, exclusiveMaximum: 100 },
        count: { type: 'integer', exclusiveMinimum: 0 }
      }
    };

    it('should pass for number within range', () => {
      const result = validateSchema({ age: 25 }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for minimum value', () => {
      const result = validateSchema({ age: 0 }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for maximum value', () => {
      const result = validateSchema({ age: 150 }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for number below minimum', () => {
      const result = validateSchema({ age: -1 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MINIMUM);
    });

    it('should fail for number above maximum', () => {
      const result = validateSchema({ age: 151 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MAXIMUM);
    });

    it('should fail for exclusiveMaximum (boundary)', () => {
      const result = validateSchema({ score: 100 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.EXCLUSIVE_MAXIMUM);
    });

    it('should pass just below exclusiveMaximum', () => {
      const result = validateSchema({ score: 99.99 }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for exclusiveMinimum (boundary)', () => {
      const result = validateSchema({ count: 0 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.EXCLUSIVE_MINIMUM);
    });
  });

  describe('validateSchema - Enum Validation', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'active', 'completed'] },
        priority: { type: 'number', enum: [1, 2, 3] }
      }
    };

    it('should pass for valid enum value', () => {
      const result = validateSchema({ status: 'active' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should pass for all valid enum values', () => {
      ['pending', 'active', 'completed'].forEach(status => {
        const result = validateSchema({ status }, schema);
        expect(result.valid).toBe(true);
      });
    });

    it('should fail for invalid enum value', () => {
      const result = validateSchema({ status: 'invalid' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.ENUM);
      expect(result.errors[0].allowed).toEqual(['pending', 'active', 'completed']);
    });

    it('should fail for case mismatch', () => {
      const result = validateSchema({ status: 'Active' }, schema);
      expect(result.valid).toBe(false);
    });

    it('should validate numeric enums', () => {
      const result = validateSchema({ priority: 2 }, schema);
      expect(result.valid).toBe(true);

      const resultInvalid = validateSchema({ priority: 4 }, schema);
      expect(resultInvalid.valid).toBe(false);
    });
  });

  describe('validateSchema - Pattern Validation (Regex)', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        uuid: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
        storyId: { type: 'string', pattern: '^[A-Z]+-\\d+$' }
      }
    };

    it('should pass for valid email pattern', () => {
      const result = validateSchema({ email: 'test@example.com' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid email pattern', () => {
      const result = validateSchema({ email: 'invalid-email' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.PATTERN);
    });

    it('should pass for valid UUID', () => {
      const result = validateSchema({ uuid: '550e8400-e29b-41d4-a716-446655440000' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid UUID', () => {
      const result = validateSchema({ uuid: 'not-a-uuid' }, schema);
      expect(result.valid).toBe(false);
    });

    it('should pass for valid story ID format', () => {
      const result = validateSchema({ storyId: 'GAP-003' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for lowercase story ID', () => {
      const result = validateSchema({ storyId: 'gap-003' }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSchema - Strict Mode (Reject Unexpected Fields)', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' }
      },
      additionalProperties: false
    };

    it('should pass with only expected fields', () => {
      const result = validateSchema({ name: 'John', email: 'john@example.com' }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail with unexpected field', () => {
      const data = { name: 'John', email: 'john@example.com', extra: 'field' };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.ADDITIONAL_PROPERTY);
      expect(result.errors[0].field).toBe('extra');
    });

    it('should fail with multiple unexpected fields', () => {
      const data = { name: 'John', foo: 'bar', baz: 123 };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.filter(e => e.code === VALIDATION_ERRORS.ADDITIONAL_PROPERTY)).toHaveLength(2);
    });

    it('should allow additional properties when not strict', () => {
      const nonStrictSchema = {
        type: 'object',
        properties: { name: { type: 'string' } }
        // additionalProperties defaults to true
      };
      const result = validateSchema({ name: 'John', extra: 'field' }, nonStrictSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSchema - Nested Object Validation', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                zip: { type: 'string', pattern: '^\\d{5}$' }
              }
            }
          }
        }
      }
    };

    it('should pass for valid nested object', () => {
      const data = {
        user: {
          name: 'John',
          address: { city: 'NYC', zip: '10001' }
        }
      };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for missing required nested field', () => {
      const data = { user: { address: { city: 'NYC' } } };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('user.name');
    });

    it('should fail for invalid deeply nested field', () => {
      const data = {
        user: {
          name: 'John',
          address: { city: 'NYC', zip: 'invalid' }
        }
      };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('user.address.zip');
    });

    it('should validate type of nested object', () => {
      const data = { user: 'not an object' };
      const result = validateSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INVALID_TYPE);
    });
  });

  describe('validateSchema - Array Validation', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          maxItems: 10
        },
        scores: {
          type: 'array',
          items: { type: 'number', minimum: 0, maximum: 100 }
        },
        uniqueTags: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true
        }
      }
    };

    it('should pass for valid array items', () => {
      const result = validateSchema({ tags: ['a', 'b', 'c'] }, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid array item type', () => {
      const result = validateSchema({ tags: ['a', 123, 'c'] }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('tags[1]');
    });

    it('should fail for array item violating constraint', () => {
      const result = validateSchema({ tags: ['a', '', 'c'] }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('tags[1]');
    });

    it('should fail for array below minItems', () => {
      const result = validateSchema({ tags: [] }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MIN_ITEMS);
    });

    it('should fail for array above maxItems', () => {
      const result = validateSchema({ tags: Array(11).fill('tag') }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MAX_ITEMS);
    });

    it('should validate numeric array items', () => {
      const result = validateSchema({ scores: [50, 75, 100] }, schema);
      expect(result.valid).toBe(true);

      const resultInvalid = validateSchema({ scores: [50, 150] }, schema);
      expect(resultInvalid.valid).toBe(false);
    });

    it('should fail for duplicate items when uniqueItems is true', () => {
      const result = validateSchema({ uniqueTags: ['a', 'b', 'a'] }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.UNIQUE_ITEMS);
    });

    it('should pass for unique items', () => {
      const result = validateSchema({ uniqueTags: ['a', 'b', 'c'] }, schema);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - Endpoint Schemas
  // ============================================

  describe('Budget Schema', () => {
    it('should validate valid budget creation', () => {
      const data = {
        projectPath: '/path/to/project',
        config: {
          totalBudget: 10.00,
          perAgentBudget: 2.00,
          perStoryBudget: 1.00
        }
      };
      const result = validateSchema(data, budgetSchema);
      expect(result.valid).toBe(true);
    });

    it('should require projectPath', () => {
      const data = { config: { totalBudget: 10.00 } };
      const result = validateSchema(data, budgetSchema);
      expect(result.valid).toBe(false);
    });

    it('should accept projectPath only', () => {
      const data = { projectPath: '/path' };
      const result = validateSchema(data, budgetSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Gate Override Schema', () => {
    it('should validate valid gate override', () => {
      const data = {
        gateNumber: 3,
        action: 'override',
        reason: 'Tests passing, ready for review',
        actor_id: 'user@example.com'
      };
      const result = validateSchema(data, gateOverrideSchema);
      expect(result.valid).toBe(true);
    });

    it('should require reason with minimum length', () => {
      const data = {
        gateNumber: 3,
        reason: 'ok'
      };
      const result = validateSchema(data, gateOverrideSchema);
      expect(result.valid).toBe(false);
    });

    it('should validate gate numbers are within range', () => {
      const data = {
        gateNumber: 10,
        reason: 'Valid reason here for testing'
      };
      const result = validateSchema(data, gateOverrideSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Agent Start Schema', () => {
    it('should validate valid agent start', () => {
      const data = {
        storyId: 'GAP-003',
        projectPath: '/path/to/project',
        config: {}
      };
      const result = validateSchema(data, agentStartSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate storyId pattern', () => {
      const data = {
        storyId: 'invalid_id',
        projectPath: '/path/to/project'
      };
      const result = validateSchema(data, agentStartSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Audit Log Schema', () => {
    it('should validate valid audit log entry', () => {
      const data = {
        action: 'Story started',
        storyId: 'GAP-003',
        agent: 'be-dev-1',
        details: { gate: 2 }
      };
      const result = validateSchema(data, auditLogSchema);
      expect(result.valid).toBe(true);
    });

    it('should require action field', () => {
      const data = {
        storyId: 'GAP-003'
      };
      const result = validateSchema(data, auditLogSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Slack Notify Schema', () => {
    it('should validate valid slack notification', () => {
      const data = {
        type: 'story_complete',
        data: { storyId: 'GAP-003', message: 'Story completed' }
      };
      const result = validateSchema(data, slackNotifySchema);
      expect(result.valid).toBe(true);
    });

    it('should require type field', () => {
      const data = {
        data: { message: 'Test message' }
      };
      const result = validateSchema(data, slackNotifySchema);
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // MIDDLEWARE TESTS - createValidator
  // ============================================

  describe('createValidator Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        body: {},
        query: {},
        params: {}
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      next = vi.fn();
    });

    it('should call next() for valid body', () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } }
      };
      const validator = createValidator(schema);
      req.body = { name: 'John' };

      validator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid body', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } }
      };
      const validator = createValidator(schema);
      req.body = {};

      validator(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'validation_error',
          message: expect.any(String),
          details: expect.any(Array)
        })
      );
    });

    it('should validate query parameters', () => {
      const schema = {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100 }
        }
      };
      const validator = createValidator(schema, { source: 'query' });
      req.query = { limit: 50 };

      validator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should coerce query param types when configured', () => {
      const schema = {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          active: { type: 'boolean' }
        }
      };
      const validator = createValidator(schema, { source: 'query', coerce: true });
      req.query = { limit: '50', active: 'true' };

      validator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.limit).toBe(50);
      expect(req.query.active).toBe(true);
    });

    it('should validate path parameters', () => {
      const schema = {
        type: 'object',
        properties: {
          agentType: { type: 'string', enum: ['fe-dev', 'be-dev', 'qa'] }
        }
      };
      const validator = createValidator(schema, { source: 'params' });
      req.params = { agentType: 'fe-dev' };

      validator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid path parameter', () => {
      const schema = {
        type: 'object',
        properties: {
          agentType: { type: 'string', enum: ['fe-dev', 'be-dev', 'qa'] }
        }
      };
      const validator = createValidator(schema, { source: 'params' });
      req.params = { agentType: 'invalid-agent' };

      validator(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should include field name in error response', () => {
      const schema = {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string' } }
      };
      const validator = createValidator(schema);
      req.body = {};

      validator(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.details[0].field).toBe('email');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security - SQL Injection Prevention', () => {
    const schema = {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 100 }
      }
    };

    it('should reject common SQL injection patterns', () => {
      const injectionPatterns = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "1; SELECT * FROM users",
        "UNION SELECT password FROM users",
        "' OR 1=1 --"
      ];

      injectionPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    // GAP-014: SQL injection bypass patterns that must be detected
    it('should detect SQL comment-based bypass patterns', () => {
      const bypassPatterns = [
        "UNION/**/SELECT password FROM users",
        "1/**/OR/**/1=1",
        "admin'/**/--",
        "SELECT/**/*/**/FROM/**/users"
      ];

      bypassPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    it('should detect case variation bypass patterns', () => {
      const bypassPatterns = [
        "UnIoN SeLeCt password",
        "sElEcT * fRoM users",
        "DrOp TaBlE users"
      ];

      bypassPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    it('should detect hex/char encoding bypass patterns', () => {
      const bypassPatterns = [
        "1 OR 0x31=0x31",
        "CHAR(83)+CHAR(69)+CHAR(76)",
        "0x53454C454354" // SELECT in hex
      ];

      bypassPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    it('should detect stacked query bypass patterns', () => {
      const bypassPatterns = [
        "1;EXEC xp_cmdshell",
        "1; WAITFOR DELAY",
        "1;DECLARE @x"
      ];

      bypassPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    it('should detect boolean-based blind injection patterns', () => {
      const bypassPatterns = [
        "1 AND 1=1",
        "1 AND 'a'='a'",
        "1 OR 'x'='x'",
        "1' AND '1'='1"
      ];

      bypassPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    it('should detect time-based blind injection patterns', () => {
      const bypassPatterns = [
        "1; WAITFOR DELAY '0:0:5'",
        "BENCHMARK(10000000,SHA1('x'))",
        "SLEEP(5)",
        "pg_sleep(5)"
      ];

      bypassPatterns.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.INJECTION_DETECTED);
      });
    });

    it('should allow safe strings that contain SQL-like words', () => {
      const safeStrings = [
        "John selected the best option",
        "Please drop by the office",
        "Union of workers united",
        "Insert your name here",
        "I want to delete my account (contact support)"
      ];

      safeStrings.forEach(pattern => {
        const result = validateSchema({ query: pattern }, schema, { detectInjection: true });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Security - XSS Prevention', () => {
    const schema = {
      type: 'object',
      properties: {
        content: { type: 'string', maxLength: 1000 }
      }
    };

    it('should detect XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)',
        '<svg onload="alert(1)">',
        '"><script>alert(1)</script>'
      ];

      xssPatterns.forEach(pattern => {
        const result = validateSchema({ content: pattern }, schema, { detectXSS: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.XSS_DETECTED);
      });
    });
  });

  describe('Security - Path Traversal Prevention', () => {
    const schema = {
      type: 'object',
      properties: {
        filepath: { type: 'string' }
      }
    };

    it('should detect path traversal patterns', () => {
      const traversalPatterns = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/etc/passwd',
        '....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f'
      ];

      traversalPatterns.forEach(pattern => {
        const result = validateSchema({ filepath: pattern }, schema, { detectPathTraversal: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(VALIDATION_ERRORS.PATH_TRAVERSAL_DETECTED);
      });
    });
  });

  describe('Security - Oversized Array Prevention', () => {
    const schema = {
      type: 'object',
      properties: {
        items: { type: 'array', maxItems: 1000 }
      }
    };

    it('should reject oversized arrays', () => {
      const largeArray = Array(10001).fill('item');
      const result = validateSchema({ items: largeArray }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MAX_ITEMS);
    });

    it('should reject deeply nested arrays', () => {
      // Create deeply nested structure
      let nested = ['value'];
      for (let i = 0; i < 20; i++) {
        nested = [nested];
      }

      const schemaWithNested = {
        type: 'object',
        properties: {
          data: { type: 'array' }
        }
      };

      const result = validateSchema({ data: nested }, schemaWithNested, { maxDepth: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(VALIDATION_ERRORS.MAX_DEPTH_EXCEEDED);
    });
  });

  // ============================================
  // SCHEMA LOOKUP TESTS
  // ============================================

  describe('getSchemaForEndpoint', () => {
    it('should return schema for POST /api/budgets', () => {
      const schema = getSchemaForEndpoint('POST', '/api/budgets');
      expect(schema).toBeDefined();
      expect(schema.properties).toHaveProperty('projectPath');
    });

    it('should return schema for POST /api/gate-override', () => {
      const schema = getSchemaForEndpoint('POST', '/api/gate-override');
      expect(schema).toBeDefined();
      expect(schema.properties).toHaveProperty('gateNumber');
    });

    it('should return schema for POST /api/agents/:agentType/start', () => {
      const schema = getSchemaForEndpoint('POST', '/api/agents/:agentType/start');
      expect(schema).toBeDefined();
    });

    it('should return null for unregistered endpoint', () => {
      const schema = getSchemaForEndpoint('POST', '/api/unknown');
      expect(schema).toBeNull();
    });

    it('should return query schema for GET endpoints', () => {
      const schema = getSchemaForEndpoint('GET', '/api/audit-log', 'query');
      expect(schema).toBeDefined();
    });
  });

  // ============================================
  // VALIDATION ERROR CLASS
  // ============================================

  describe('ValidationError Class', () => {
    it('should create error with field and message', () => {
      const error = new ValidationError('email', VALIDATION_ERRORS.REQUIRED, 'Email is required');
      expect(error.field).toBe('email');
      expect(error.code).toBe(VALIDATION_ERRORS.REQUIRED);
      expect(error.message).toBe('Email is required');
    });

    it('should serialize to JSON', () => {
      const error = new ValidationError('age', VALIDATION_ERRORS.MINIMUM, 'Must be at least 0', { minimum: 0, received: -1 });
      const json = error.toJSON();
      expect(json).toEqual({
        field: 'age',
        code: VALIDATION_ERRORS.MINIMUM,
        message: 'Must be at least 0',
        minimum: 0,
        received: -1
      });
    });
  });
});
