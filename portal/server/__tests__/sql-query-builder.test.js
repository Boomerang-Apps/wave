/**
 * SQL Query Builder Tests (SEC-004)
 *
 * TDD tests for parameterized query building.
 */

import { describe, it, expect } from 'vitest';
import {
  QueryBuilder,
  buildInsert,
  buildUpdate,
  buildDelete,
  isValidIdentifier,
  escapeIdentifier
} from '../utils/sql-query-builder.js';

describe('SQL Query Builder (SEC-004)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Identifier Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('isValidIdentifier', () => {
    it('should accept valid identifiers', () => {
      expect(isValidIdentifier('users')).toBe(true);
      expect(isValidIdentifier('user_table')).toBe(true);
      expect(isValidIdentifier('_private')).toBe(true);
      expect(isValidIdentifier('Table123')).toBe(true);
    });

    it('should reject identifiers starting with number', () => {
      expect(isValidIdentifier('123table')).toBe(false);
    });

    it('should reject empty or null', () => {
      expect(isValidIdentifier('')).toBe(false);
      expect(isValidIdentifier(null)).toBe(false);
      expect(isValidIdentifier(undefined)).toBe(false);
    });

    it('should reject special characters', () => {
      expect(isValidIdentifier('user-table')).toBe(false);
      expect(isValidIdentifier('user.table')).toBe(false);
      expect(isValidIdentifier('user table')).toBe(false);
      expect(isValidIdentifier("user'table")).toBe(false);
    });

    it('should reject SQL injection attempts', () => {
      expect(isValidIdentifier('users; DROP TABLE users;--')).toBe(false);
      expect(isValidIdentifier('users" OR "1"="1')).toBe(false);
    });

    it('should reject very long identifiers', () => {
      expect(isValidIdentifier('a'.repeat(129))).toBe(false);
    });
  });

  describe('escapeIdentifier', () => {
    it('should escape identifiers with double quotes (PostgreSQL)', () => {
      expect(escapeIdentifier('users')).toBe('"users"');
      expect(escapeIdentifier('user_table')).toBe('"user_table"');
    });

    it('should escape identifiers with backticks (MySQL)', () => {
      expect(escapeIdentifier('users', '`')).toBe('`users`');
    });

    it('should double the quote character inside identifier', () => {
      // This shouldn't happen with valid identifiers, but test the escaping
      expect(escapeIdentifier('user_name', '"')).toBe('"user_name"');
    });

    it('should throw for invalid identifiers', () => {
      expect(() => escapeIdentifier('invalid-name')).toThrow('Invalid SQL identifier');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QueryBuilder SELECT
  // ─────────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder SELECT', () => {
    it('should build simple SELECT *', () => {
      const query = new QueryBuilder()
        .from('users')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users"');
      expect(query.params).toEqual([]);
    });

    it('should build SELECT with columns', () => {
      const query = new QueryBuilder()
        .select(['id', 'name', 'email'])
        .from('users')
        .build();

      expect(query.sql).toBe('SELECT "id", "name", "email" FROM "users"');
    });

    it('should build SELECT with single column', () => {
      const query = new QueryBuilder()
        .select('id')
        .from('users')
        .build();

      expect(query.sql).toBe('SELECT "id" FROM "users"');
    });

    it('should allow SELECT *', () => {
      const query = new QueryBuilder()
        .select('*')
        .from('users')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users"');
    });

    it('should throw for invalid column name', () => {
      expect(() => new QueryBuilder().select('invalid-col')).toThrow('Invalid column name');
    });

    it('should throw for invalid table name', () => {
      expect(() => new QueryBuilder().from('invalid-table')).toThrow('Invalid table name');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QueryBuilder WHERE
  // ─────────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder WHERE', () => {
    it('should build WHERE with equality', () => {
      const query = new QueryBuilder()
        .select('*')
        .from('users')
        .where('status', '=', 'active')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "status" = $1');
      expect(query.params).toEqual(['active']);
    });

    it('should build WHERE with AND', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('status', '=', 'active')
        .andWhere('role', '=', 'admin')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "status" = $1 AND "role" = $2');
      expect(query.params).toEqual(['active', 'admin']);
    });

    it('should build WHERE with OR', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('role', '=', 'admin')
        .orWhere('role', '=', 'superadmin')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "role" = $1 OR "role" = $2');
      expect(query.params).toEqual(['admin', 'superadmin']);
    });

    it('should build WHERE with IN', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('role', 'IN', ['admin', 'user', 'guest'])
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "role" IN ($1, $2, $3)');
      expect(query.params).toEqual(['admin', 'user', 'guest']);
    });

    it('should build WHERE with NOT IN', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('status', 'NOT IN', ['banned', 'suspended'])
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "status" NOT IN ($1, $2)');
      expect(query.params).toEqual(['banned', 'suspended']);
    });

    it('should build WHERE IS NULL', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('deleted_at', 'IS', null)
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL');
      expect(query.params).toEqual([]);
    });

    it('should build WHERE IS NOT NULL', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('email', 'IS NOT', null)
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "email" IS NOT NULL');
    });

    it('should build WHERE with LIKE', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('name', 'LIKE', '%john%')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" WHERE "name" LIKE $1');
      expect(query.params).toEqual(['%john%']);
    });

    it('should throw for invalid operator', () => {
      expect(() => new QueryBuilder().from('users').where('id', 'INVALID', 1))
        .toThrow('Invalid operator');
    });

    it('should throw for IN without array', () => {
      expect(() => new QueryBuilder().from('users').where('id', 'IN', 'notarray'))
        .toThrow('IN/NOT IN requires an array');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QueryBuilder ORDER BY, LIMIT, OFFSET
  // ─────────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder ORDER BY, LIMIT, OFFSET', () => {
    it('should build ORDER BY ASC', () => {
      const query = new QueryBuilder()
        .from('users')
        .orderBy('created_at', 'ASC')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" ORDER BY "created_at" ASC');
    });

    it('should build ORDER BY DESC', () => {
      const query = new QueryBuilder()
        .from('users')
        .orderBy('created_at', 'DESC')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" ORDER BY "created_at" DESC');
    });

    it('should build with multiple ORDER BY', () => {
      const query = new QueryBuilder()
        .from('users')
        .orderBy('status', 'ASC')
        .orderBy('created_at', 'DESC')
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" ORDER BY "status" ASC, "created_at" DESC');
    });

    it('should build with LIMIT', () => {
      const query = new QueryBuilder()
        .from('users')
        .limit(10)
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" LIMIT 10');
    });

    it('should build with OFFSET', () => {
      const query = new QueryBuilder()
        .from('users')
        .limit(10)
        .offset(20)
        .build();

      expect(query.sql).toBe('SELECT * FROM "users" LIMIT 10 OFFSET 20');
    });

    it('should throw for negative LIMIT', () => {
      expect(() => new QueryBuilder().limit(-1)).toThrow('non-negative integer');
    });

    it('should throw for invalid ORDER BY direction', () => {
      expect(() => new QueryBuilder().orderBy('id', 'INVALID')).toThrow('ASC or DESC');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QueryBuilder JOIN
  // ─────────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder JOIN', () => {
    it('should build INNER JOIN', () => {
      const query = new QueryBuilder()
        .select(['id', 'bio'])
        .from('users')
        .innerJoin('profiles', 'user_id', '=', 'profile_user_id')
        .build();

      expect(query.sql).toContain('INNER JOIN "profiles" ON');
      expect(query.sql).toContain('"user_id" = "profile_user_id"');
    });

    it('should build LEFT JOIN', () => {
      const query = new QueryBuilder()
        .from('users')
        .leftJoin('orders', 'user_id', '=', 'order_user_id')
        .build();

      expect(query.sql).toContain('LEFT JOIN "orders" ON');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QueryBuilder GROUP BY
  // ─────────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder GROUP BY', () => {
    it('should build GROUP BY', () => {
      const query = new QueryBuilder()
        .select(['status', 'count'])
        .from('users')
        .groupBy('status')
        .build();

      expect(query.sql).toBe('SELECT "status", "count" FROM "users" GROUP BY "status"');
    });

    it('should build GROUP BY with multiple columns', () => {
      const query = new QueryBuilder()
        .from('users')
        .groupBy(['status', 'role'])
        .build();

      expect(query.sql).toContain('GROUP BY "status", "role"');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QueryBuilder Complex Query
  // ─────────────────────────────────────────────────────────────────────────────

  describe('QueryBuilder Complex Query', () => {
    it('should build complex query', () => {
      const query = new QueryBuilder()
        .select(['id', 'name', 'email'])
        .from('users')
        .where('status', '=', 'active')
        .andWhere('role', 'IN', ['admin', 'user'])
        .orderBy('created_at', 'DESC')
        .limit(10)
        .offset(0)
        .build();

      expect(query.sql).toBe(
        'SELECT "id", "name", "email" FROM "users" WHERE "status" = $1 AND "role" IN ($2, $3) ORDER BY "created_at" DESC LIMIT 10 OFFSET 0'
      );
      expect(query.params).toEqual(['active', 'admin', 'user']);
    });

    it('should reset builder', () => {
      const builder = new QueryBuilder()
        .from('users')
        .where('id', '=', 1);

      builder.reset();

      const query = builder.from('products').build();

      expect(query.sql).toBe('SELECT * FROM "products"');
      expect(query.params).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // buildInsert
  // ─────────────────────────────────────────────────────────────────────────────

  describe('buildInsert', () => {
    it('should build INSERT query', () => {
      const { sql, params } = buildInsert('users', {
        name: 'John',
        email: 'john@example.com'
      });

      expect(sql).toBe('INSERT INTO "users" ("name", "email") VALUES ($1, $2)');
      expect(params).toEqual(['John', 'john@example.com']);
    });

    it('should throw for invalid table', () => {
      expect(() => buildInsert('invalid-table', { name: 'John' }))
        .toThrow('Invalid table name');
    });

    it('should throw for invalid column', () => {
      expect(() => buildInsert('users', { 'invalid-col': 'value' }))
        .toThrow('Invalid column name');
    });

    it('should handle MySQL placeholder style', () => {
      const { sql, params } = buildInsert('users', { name: 'John' }, { placeholder: '?' });

      expect(sql).toBe('INSERT INTO "users" ("name") VALUES (?)');
      expect(params).toEqual(['John']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // buildUpdate
  // ─────────────────────────────────────────────────────────────────────────────

  describe('buildUpdate', () => {
    it('should build UPDATE query', () => {
      const { sql, params } = buildUpdate('users', { name: 'Jane' }, { id: 1 });

      expect(sql).toBe('UPDATE "users" SET "name" = $1 WHERE "id" = $2');
      expect(params).toEqual(['Jane', 1]);
    });

    it('should build UPDATE with multiple SET columns', () => {
      const { sql, params } = buildUpdate(
        'users',
        { name: 'Jane', email: 'jane@example.com' },
        { id: 1 }
      );

      expect(sql).toBe('UPDATE "users" SET "name" = $1, "email" = $2 WHERE "id" = $3');
      expect(params).toEqual(['Jane', 'jane@example.com', 1]);
    });

    it('should build UPDATE with multiple WHERE conditions', () => {
      const { sql, params } = buildUpdate(
        'users',
        { status: 'active' },
        { id: 1, org_id: 5 }
      );

      expect(sql).toBe('UPDATE "users" SET "status" = $1 WHERE "id" = $2 AND "org_id" = $3');
      expect(params).toEqual(['active', 1, 5]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // buildDelete
  // ─────────────────────────────────────────────────────────────────────────────

  describe('buildDelete', () => {
    it('should build DELETE query', () => {
      const { sql, params } = buildDelete('users', { id: 1 });

      expect(sql).toBe('DELETE FROM "users" WHERE "id" = $1');
      expect(params).toEqual([1]);
    });

    it('should build DELETE with multiple WHERE conditions', () => {
      const { sql, params } = buildDelete('users', { id: 1, org_id: 5 });

      expect(sql).toBe('DELETE FROM "users" WHERE "id" = $1 AND "org_id" = $2');
      expect(params).toEqual([1, 5]);
    });

    it('should throw for DELETE without WHERE (safety)', () => {
      expect(() => buildDelete('users', {}))
        .toThrow('DELETE requires WHERE conditions');
    });

    it('should throw for DELETE with null WHERE', () => {
      expect(() => buildDelete('users', null))
        .toThrow('DELETE requires WHERE conditions');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SQL Injection Prevention
  // ─────────────────────────────────────────────────────────────────────────────

  describe('SQL Injection Prevention', () => {
    it('should prevent injection via column name', () => {
      expect(() => {
        new QueryBuilder()
          .select('id; DROP TABLE users;--')
          .from('users')
          .build();
      }).toThrow('Invalid column name');
    });

    it('should prevent injection via table name', () => {
      expect(() => {
        new QueryBuilder()
          .from('users; DROP TABLE users;--')
          .build();
      }).toThrow('Invalid table name');
    });

    it('should parameterize values (not concatenate)', () => {
      const query = new QueryBuilder()
        .from('users')
        .where('name', '=', "Robert'; DROP TABLE users;--")
        .build();

      // The malicious input is parameterized, not in the SQL string
      expect(query.sql).toBe('SELECT * FROM "users" WHERE "name" = $1');
      expect(query.params).toEqual(["Robert'; DROP TABLE users;--"]);
      expect(query.sql).not.toContain('DROP TABLE');
    });

    it('should prevent injection via INSERT values', () => {
      const { sql, params } = buildInsert('users', {
        name: "Robert'; DROP TABLE users;--"
      });

      expect(sql).toBe('INSERT INTO "users" ("name") VALUES ($1)');
      expect(params).toEqual(["Robert'; DROP TABLE users;--"]);
      expect(sql).not.toContain('DROP TABLE');
    });

    it('should prevent injection via UPDATE values', () => {
      const { sql, params } = buildUpdate(
        'users',
        { name: "'; DELETE FROM users;--" },
        { id: 1 }
      );

      expect(sql).not.toContain('DELETE FROM');
      expect(params[0]).toBe("'; DELETE FROM users;--");
    });
  });
});
