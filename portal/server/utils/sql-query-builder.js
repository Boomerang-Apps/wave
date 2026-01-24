/**
 * SQL Query Builder (SEC-004)
 *
 * Provides parameterized query building to prevent SQL injection.
 * Enforces use of placeholders instead of string concatenation.
 *
 * Sources:
 * - https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
 * - https://snyk.io/blog/preventing-sql-injection-attacks-node-js/
 */

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIFIER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

// Valid SQL identifier pattern (table names, column names)
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Reserved SQL keywords that should be escaped
const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'insert', 'update', 'delete', 'drop', 'create',
  'table', 'index', 'alter', 'and', 'or', 'not', 'in', 'like', 'between',
  'join', 'inner', 'outer', 'left', 'right', 'on', 'as', 'order', 'by',
  'group', 'having', 'limit', 'offset', 'union', 'all', 'distinct', 'null',
  'true', 'false', 'case', 'when', 'then', 'else', 'end', 'exists'
]);

/**
 * Validate a SQL identifier (table/column name)
 * @param {string} identifier - Identifier to validate
 * @returns {boolean}
 */
export function isValidIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') return false;
  if (identifier.length > 128) return false;
  return VALID_IDENTIFIER.test(identifier);
}

/**
 * Escape a SQL identifier (table/column name)
 * Only use for dynamic table/column names that have been validated
 * @param {string} identifier - Identifier to escape
 * @param {string} [quote='"'] - Quote character ('"' for PostgreSQL, '`' for MySQL)
 * @returns {string}
 */
export function escapeIdentifier(identifier, quote = '"') {
  if (!isValidIdentifier(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  // Double the quote character to escape it
  const escaped = identifier.replace(new RegExp(quote, 'g'), quote + quote);
  return `${quote}${escaped}${quote}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETERIZED QUERY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QueryBuilder - builds parameterized SQL queries
 *
 * @example
 * const query = new QueryBuilder()
 *   .select(['id', 'name', 'email'])
 *   .from('users')
 *   .where('status', '=', 'active')
 *   .andWhere('role', 'IN', ['admin', 'user'])
 *   .orderBy('created_at', 'DESC')
 *   .limit(10)
 *   .build();
 *
 * // query.sql = 'SELECT "id", "name", "email" FROM "users" WHERE "status" = $1 AND "role" IN ($2, $3) ORDER BY "created_at" DESC LIMIT 10'
 * // query.params = ['active', 'admin', 'user']
 */
export class QueryBuilder {
  constructor(options = {}) {
    this._quote = options.quote || '"'; // PostgreSQL default
    this._placeholder = options.placeholder || '$'; // PostgreSQL style
    this._reset();
  }

  _reset() {
    this._selectColumns = [];
    this._fromTable = null;
    this._joins = [];
    this._whereConditions = [];
    this._orderByColumns = [];
    this._groupByColumns = [];
    this._limitValue = null;
    this._offsetValue = null;
    this._params = [];
  }

  /**
   * Get next placeholder
   * @private
   */
  _nextPlaceholder() {
    this._params.push(undefined); // Reserve spot
    if (this._placeholder === '$') {
      return `$${this._params.length}`;
    } else if (this._placeholder === '?') {
      return '?';
    }
    return `$${this._params.length}`;
  }

  /**
   * Add parameter and return placeholder
   * @private
   */
  _addParam(value) {
    this._params.push(value);
    if (this._placeholder === '$') {
      return `$${this._params.length}`;
    }
    return '?';
  }

  /**
   * SELECT columns
   * @param {string|string[]} columns - Column names
   * @returns {QueryBuilder}
   */
  select(columns) {
    const cols = Array.isArray(columns) ? columns : [columns];
    for (const col of cols) {
      if (col === '*') {
        this._selectColumns.push('*');
      } else if (!isValidIdentifier(col)) {
        throw new Error(`Invalid column name: ${col}`);
      } else {
        this._selectColumns.push(escapeIdentifier(col, this._quote));
      }
    }
    return this;
  }

  /**
   * FROM table
   * @param {string} table - Table name
   * @returns {QueryBuilder}
   */
  from(table) {
    if (!isValidIdentifier(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    this._fromTable = escapeIdentifier(table, this._quote);
    return this;
  }

  /**
   * JOIN clause
   * @param {string} type - Join type (INNER, LEFT, RIGHT, etc.)
   * @param {string} table - Table to join
   * @param {string} leftCol - Left column
   * @param {string} op - Operator
   * @param {string} rightCol - Right column
   * @returns {QueryBuilder}
   */
  join(type, table, leftCol, op, rightCol) {
    if (!isValidIdentifier(table)) throw new Error(`Invalid table: ${table}`);
    if (!isValidIdentifier(leftCol)) throw new Error(`Invalid column: ${leftCol}`);
    if (!isValidIdentifier(rightCol)) throw new Error(`Invalid column: ${rightCol}`);
    if (!['=', '<', '>', '<=', '>=', '<>'].includes(op)) {
      throw new Error(`Invalid operator: ${op}`);
    }

    this._joins.push({
      type: type.toUpperCase(),
      table: escapeIdentifier(table, this._quote),
      condition: `${escapeIdentifier(leftCol, this._quote)} ${op} ${escapeIdentifier(rightCol, this._quote)}`
    });
    return this;
  }

  /**
   * INNER JOIN
   */
  innerJoin(table, leftCol, op, rightCol) {
    return this.join('INNER', table, leftCol, op, rightCol);
  }

  /**
   * LEFT JOIN
   */
  leftJoin(table, leftCol, op, rightCol) {
    return this.join('LEFT', table, leftCol, op, rightCol);
  }

  /**
   * WHERE condition
   * @param {string} column - Column name
   * @param {string} op - Operator
   * @param {*} value - Value (will be parameterized)
   * @returns {QueryBuilder}
   */
  where(column, op, value) {
    return this._addCondition('AND', column, op, value, this._whereConditions.length === 0);
  }

  /**
   * AND WHERE condition
   */
  andWhere(column, op, value) {
    return this._addCondition('AND', column, op, value, false);
  }

  /**
   * OR WHERE condition
   */
  orWhere(column, op, value) {
    return this._addCondition('OR', column, op, value, false);
  }

  /**
   * Add WHERE condition
   * @private
   */
  _addCondition(logic, column, op, value, isFirst) {
    if (!isValidIdentifier(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }

    const validOps = ['=', '<', '>', '<=', '>=', '<>', '!=', 'LIKE', 'ILIKE', 'IN', 'NOT IN', 'IS', 'IS NOT'];
    const upperOp = op.toUpperCase();
    if (!validOps.includes(upperOp)) {
      throw new Error(`Invalid operator: ${op}`);
    }

    const escapedCol = escapeIdentifier(column, this._quote);
    let condition;

    if (upperOp === 'IN' || upperOp === 'NOT IN') {
      if (!Array.isArray(value)) {
        throw new Error('IN/NOT IN requires an array value');
      }
      const placeholders = value.map(v => this._addParam(v));
      condition = `${escapedCol} ${upperOp} (${placeholders.join(', ')})`;
    } else if (upperOp === 'IS' || upperOp === 'IS NOT') {
      if (value !== null && value !== 'NULL') {
        throw new Error('IS/IS NOT can only be used with NULL');
      }
      condition = `${escapedCol} ${upperOp} NULL`;
    } else {
      const placeholder = this._addParam(value);
      condition = `${escapedCol} ${upperOp} ${placeholder}`;
    }

    this._whereConditions.push({
      logic: isFirst ? '' : logic,
      condition
    });

    return this;
  }

  /**
   * ORDER BY
   * @param {string} column - Column name
   * @param {string} [direction='ASC'] - ASC or DESC
   * @returns {QueryBuilder}
   */
  orderBy(column, direction = 'ASC') {
    if (!isValidIdentifier(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    const dir = direction.toUpperCase();
    if (dir !== 'ASC' && dir !== 'DESC') {
      throw new Error('Direction must be ASC or DESC');
    }
    this._orderByColumns.push(`${escapeIdentifier(column, this._quote)} ${dir}`);
    return this;
  }

  /**
   * GROUP BY
   * @param {string|string[]} columns - Column names
   * @returns {QueryBuilder}
   */
  groupBy(columns) {
    const cols = Array.isArray(columns) ? columns : [columns];
    for (const col of cols) {
      if (!isValidIdentifier(col)) {
        throw new Error(`Invalid column name: ${col}`);
      }
      this._groupByColumns.push(escapeIdentifier(col, this._quote));
    }
    return this;
  }

  /**
   * LIMIT
   * @param {number} limit - Limit value
   * @returns {QueryBuilder}
   */
  limit(limit) {
    const num = parseInt(limit, 10);
    if (isNaN(num) || num < 0) {
      throw new Error('Limit must be a non-negative integer');
    }
    this._limitValue = num;
    return this;
  }

  /**
   * OFFSET
   * @param {number} offset - Offset value
   * @returns {QueryBuilder}
   */
  offset(offset) {
    const num = parseInt(offset, 10);
    if (isNaN(num) || num < 0) {
      throw new Error('Offset must be a non-negative integer');
    }
    this._offsetValue = num;
    return this;
  }

  /**
   * Build the query
   * @returns {{ sql: string, params: any[] }}
   */
  build() {
    const parts = [];

    // SELECT
    if (this._selectColumns.length > 0) {
      parts.push(`SELECT ${this._selectColumns.join(', ')}`);
    } else {
      parts.push('SELECT *');
    }

    // FROM
    if (this._fromTable) {
      parts.push(`FROM ${this._fromTable}`);
    }

    // JOINs
    for (const join of this._joins) {
      parts.push(`${join.type} JOIN ${join.table} ON ${join.condition}`);
    }

    // WHERE
    if (this._whereConditions.length > 0) {
      const whereStr = this._whereConditions
        .map((w, i) => i === 0 ? w.condition : `${w.logic} ${w.condition}`)
        .join(' ');
      parts.push(`WHERE ${whereStr}`);
    }

    // GROUP BY
    if (this._groupByColumns.length > 0) {
      parts.push(`GROUP BY ${this._groupByColumns.join(', ')}`);
    }

    // ORDER BY
    if (this._orderByColumns.length > 0) {
      parts.push(`ORDER BY ${this._orderByColumns.join(', ')}`);
    }

    // LIMIT
    if (this._limitValue !== null) {
      parts.push(`LIMIT ${this._limitValue}`);
    }

    // OFFSET
    if (this._offsetValue !== null) {
      parts.push(`OFFSET ${this._offsetValue}`);
    }

    return {
      sql: parts.join(' '),
      params: this._params
    };
  }

  /**
   * Reset the builder for reuse
   * @returns {QueryBuilder}
   */
  reset() {
    this._reset();
    return this;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build INSERT query with parameterized values
 *
 * @param {string} table - Table name
 * @param {Object} data - Object with column: value pairs
 * @param {Object} [options] - Options
 * @returns {{ sql: string, params: any[] }}
 *
 * @example
 * const { sql, params } = buildInsert('users', { name: 'John', email: 'john@example.com' });
 * // sql = 'INSERT INTO "users" ("name", "email") VALUES ($1, $2)'
 * // params = ['John', 'john@example.com']
 */
export function buildInsert(table, data, options = {}) {
  const quote = options.quote || '"';
  const placeholder = options.placeholder || '$';

  if (!isValidIdentifier(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  const columns = [];
  const placeholders = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (!isValidIdentifier(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    columns.push(escapeIdentifier(column, quote));
    params.push(value);
    if (placeholder === '$') {
      placeholders.push(`$${params.length}`);
    } else {
      placeholders.push('?');
    }
  }

  const sql = `INSERT INTO ${escapeIdentifier(table, quote)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

  return { sql, params };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build UPDATE query with parameterized values
 *
 * @param {string} table - Table name
 * @param {Object} data - Object with column: value pairs to update
 * @param {Object} where - Where conditions as { column: value }
 * @param {Object} [options] - Options
 * @returns {{ sql: string, params: any[] }}
 *
 * @example
 * const { sql, params } = buildUpdate('users', { name: 'Jane' }, { id: 1 });
 * // sql = 'UPDATE "users" SET "name" = $1 WHERE "id" = $2'
 * // params = ['Jane', 1]
 */
export function buildUpdate(table, data, where, options = {}) {
  const quote = options.quote || '"';
  const placeholder = options.placeholder || '$';

  if (!isValidIdentifier(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  const setParts = [];
  const whereParts = [];
  const params = [];

  // SET clause
  for (const [column, value] of Object.entries(data)) {
    if (!isValidIdentifier(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    params.push(value);
    const ph = placeholder === '$' ? `$${params.length}` : '?';
    setParts.push(`${escapeIdentifier(column, quote)} = ${ph}`);
  }

  // WHERE clause
  for (const [column, value] of Object.entries(where)) {
    if (!isValidIdentifier(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    params.push(value);
    const ph = placeholder === '$' ? `$${params.length}` : '?';
    whereParts.push(`${escapeIdentifier(column, quote)} = ${ph}`);
  }

  let sql = `UPDATE ${escapeIdentifier(table, quote)} SET ${setParts.join(', ')}`;
  if (whereParts.length > 0) {
    sql += ` WHERE ${whereParts.join(' AND ')}`;
  }

  return { sql, params };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build DELETE query with parameterized values
 *
 * @param {string} table - Table name
 * @param {Object} where - Where conditions as { column: value }
 * @param {Object} [options] - Options
 * @returns {{ sql: string, params: any[] }}
 *
 * @example
 * const { sql, params } = buildDelete('users', { id: 1 });
 * // sql = 'DELETE FROM "users" WHERE "id" = $1'
 * // params = [1]
 */
export function buildDelete(table, where, options = {}) {
  const quote = options.quote || '"';
  const placeholder = options.placeholder || '$';

  if (!isValidIdentifier(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  if (!where || Object.keys(where).length === 0) {
    throw new Error('DELETE requires WHERE conditions for safety');
  }

  const whereParts = [];
  const params = [];

  for (const [column, value] of Object.entries(where)) {
    if (!isValidIdentifier(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    params.push(value);
    const ph = placeholder === '$' ? `$${params.length}` : '?';
    whereParts.push(`${escapeIdentifier(column, quote)} = ${ph}`);
  }

  const sql = `DELETE FROM ${escapeIdentifier(table, quote)} WHERE ${whereParts.join(' AND ')}`;

  return { sql, params };
}

export default {
  QueryBuilder,
  buildInsert,
  buildUpdate,
  buildDelete,
  isValidIdentifier,
  escapeIdentifier
};
