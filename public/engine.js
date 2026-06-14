/**
 * SQLVis Engine — In-Browser SQL Parser & Executor
 * Supports: SELECT, WHERE, JOIN, GROUP BY, HAVING, ORDER BY, LIMIT, DISTINCT,
 *           INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE,
 *           UNION, UNION ALL, Subqueries, CTEs, Window Functions, Views
 */

'use strict';

// ─────────────────────────────────────────────
// TOKENIZER
// ─────────────────────────────────────────────
class SQLTokenizer {
  constructor(sql) {
    this.sql = sql;
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    const sql = this.sql;
    let pos = 0;
    const tokens = [];

    while (pos < sql.length) {
      // Skip whitespace
      if (/\s/.test(sql[pos])) { pos++; continue; }

      // Line comment
      if (sql.startsWith('--', pos)) {
        let end = sql.indexOf('\n', pos);
        if (end === -1) end = sql.length;
        tokens.push({ type: 'COMMENT', value: sql.slice(pos, end) });
        pos = end;
        continue;
      }

      // Block comment
      if (sql.startsWith('/*', pos)) {
        let end = sql.indexOf('*/', pos + 2);
        if (end === -1) end = sql.length; else end += 2;
        tokens.push({ type: 'COMMENT', value: sql.slice(pos, end) });
        pos = end;
        continue;
      }

      // String literal
      if (sql[pos] === "'" || sql[pos] === '"' || sql[pos] === '`') {
        const quote = sql[pos];
        let end = pos + 1;
        while (end < sql.length && sql[end] !== quote) {
          if (sql[end] === '\\') end++;
          end++;
        }
        end++;
        const raw = sql.slice(pos, end);
        tokens.push({ type: 'STRING', value: raw.slice(1, -1), raw });
        pos = end;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(sql[pos]) || (sql[pos] === '.' && /[0-9]/.test(sql[pos+1]||''))) {
        let end = pos;
        while (end < sql.length && /[0-9.]/.test(sql[end])) end++;
        tokens.push({ type: 'NUMBER', value: parseFloat(sql.slice(pos, end)) });
        pos = end;
        continue;
      }

      // Identifiers & keywords
      if (/[a-zA-Z_$]/.test(sql[pos])) {
        let end = pos;
        while (end < sql.length && /[a-zA-Z0-9_$]/.test(sql[end])) end++;
        const word = sql.slice(pos, end);
        const upper = word.toUpperCase();
        const keywords = new Set([
          'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL',
          'ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','DISTINCT',
          'JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','ON','USING',
          'INSERT','INTO','VALUES','UPDATE','SET','DELETE',
          'CREATE','TABLE','ALTER','DROP','ADD','COLUMN','RENAME','TO',
          'VIEW','AS','WITH','RECURSIVE',
          'UNION','ALL','INTERSECT','EXCEPT',
          'OVER','PARTITION','ROW_NUMBER','RANK','DENSE_RANK','NTILE',
          'LEAD','LAG','FIRST_VALUE','LAST_VALUE','ROWS','RANGE','BETWEEN',
          'UNBOUNDED','PRECEDING','FOLLOWING','CURRENT','ROW',
          'COUNT','SUM','AVG','MIN','MAX','COALESCE','IFNULL','NULLIF','CAST',
          'CASE','WHEN','THEN','ELSE','END',
          'TRUE','FALSE','LIKE','BETWEEN','EXISTS','ANY','SOME','ALL',
          'PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','CHECK','DEFAULT',
          'CONSTRAINT','INDEX','ON','IF','NOT','EXISTS','AUTO_INCREMENT',
          'AUTOINCREMENT','INTEGER','INT','TEXT','VARCHAR','CHAR','REAL','FLOAT',
          'DOUBLE','BOOLEAN','BOOL','DATE','DATETIME','TIMESTAMP','BLOB','NUMERIC',
          'SERIAL','BIGINT','SMALLINT','ASC','DESC','NATURAL','STRAIGHT','SELF',
          'RUNNING','TOTAL', 'CONCAT', 'LENGTH', 'SUBSTR', 'UPPER', 'LOWER',
          'REPLACE', 'TRIM', 'ABS', 'ROUND', 'FLOOR', 'CEIL', 'MOD', 'POWER',
          'NOW', 'DATE', 'STRFTIME', 'IIF', 'NVL'
        ]);
        tokens.push({ type: keywords.has(upper) ? 'KEYWORD' : 'IDENT', value: word, upper });
        pos = end;
        continue;
      }

      // Operators & punctuation
      const two = sql.slice(pos, pos+2);
      const threeChar = sql.slice(pos, pos+3);
      const ops3 = ['<=>'];
      const ops2 = ['<>', '!=', '<=', '>=', '||', '::', '**', '->', '>>'];
      if (ops3.includes(threeChar)) { tokens.push({ type: 'OP', value: threeChar }); pos += 3; continue; }
      if (ops2.includes(two)) { tokens.push({ type: 'OP', value: two }); pos += 2; continue; }

      const ch = sql[pos];
      if (',;()[]{}=<>+-*/%|^&!.~'.includes(ch)) {
        tokens.push({ type: ch === ',' ? 'COMMA' : ch === ';' ? 'SEMI' : ch === '(' ? 'LPAREN' : ch === ')' ? 'RPAREN' : 'OP', value: ch });
        pos++;
        continue;
      }

      // Unknown
      tokens.push({ type: 'UNKNOWN', value: sql[pos] });
      pos++;
    }

    return tokens.filter(t => t.type !== 'COMMENT');
  }
}

// ─────────────────────────────────────────────
// DATABASE (in-memory)
// ─────────────────────────────────────────────
class InMemoryDB {
  constructor() {
    this.tables = {};
    this.views = {};
    this.indexes = {};
    this._idCounters = {};
  }

  clone() {
    const db = new InMemoryDB();
    for (const [name, table] of Object.entries(this.tables)) {
      db.tables[name] = {
        name: table.name,
        columns: table.columns.map(c => ({...c})),
        rows: table.rows.map(r => ({...r}))
      };
    }
    db.views = { ...this.views };
    return db;
  }

  createTable(name, columns) {
    if (this.tables[name]) throw new Error(`Table '${name}' already exists`);
    this.tables[name.toLowerCase()] = {
      name: name.toLowerCase(),
      columns: columns.map(c => ({
        name: c.name.toLowerCase(),
        type: c.type || 'TEXT',
        primaryKey: c.primaryKey || false,
        notNull: c.notNull || false,
        unique: c.unique || false,
        defaultValue: c.defaultValue !== undefined ? c.defaultValue : null,
        autoIncrement: c.autoIncrement || false,
        foreignKey: c.foreignKey || null
      })),
      rows: []
    };
    this._idCounters[name.toLowerCase()] = 0;
  }

  dropTable(name) {
    const lname = name.toLowerCase();
    if (!this.tables[lname]) throw new Error(`Table '${name}' does not exist`);
    delete this.tables[lname];
  }

  getTable(name) {
    const lname = name.toLowerCase();
    const t = this.tables[lname];
    if (!t) {
      // Check views
      if (this.views[lname]) return this.views[lname];
      throw new Error(`Table '${name}' does not exist`);
    }
    return t;
  }

  insert(tableName, values) {
    const table = this.getTable(tableName);
    const row = {};
    // Handle auto-increment
    for (const col of table.columns) {
      if (col.autoIncrement) {
        this._idCounters[tableName.toLowerCase()] = (this._idCounters[tableName.toLowerCase()] || 0) + 1;
        row[col.name] = this._idCounters[tableName.toLowerCase()];
      } else if (values[col.name] !== undefined) {
        row[col.name] = values[col.name];
      } else if (col.defaultValue !== null) {
        row[col.name] = col.defaultValue;
      } else {
        row[col.name] = null;
      }
    }
    row._id = Date.now() + Math.random();
    table.rows.push(row);
    return row;
  }

  update(tableName, updates, predicate) {
    const table = this.getTable(tableName);
    const affected = [];
    for (const row of table.rows) {
      if (!predicate || predicate(row)) {
        const before = {...row};
        Object.assign(row, updates);
        affected.push({ before, after: {...row} });
      }
    }
    return affected;
  }

  delete(tableName, predicate) {
    const table = this.getTable(tableName);
    const before = table.rows.length;
    const deleted = [];
    table.rows = table.rows.filter(r => {
      if (!predicate || predicate(r)) {
        deleted.push({...r});
        return false;
      }
      return true;
    });
    return deleted;
  }

  tableNames() {
    return Object.keys(this.tables);
  }
}

// ─────────────────────────────────────────────
// EXPRESSION EVALUATOR
// ─────────────────────────────────────────────
class ExprEvaluator {
  constructor(db, row, context = {}) {
    this.db = db;
    this.row = row;
    this.context = context;
  }

  eval(expr) {
    if (expr === null || expr === undefined) return null;
    if (typeof expr !== 'object') return expr;

    switch (expr.type) {
      case 'number': return expr.value;
      case 'string': return expr.value;
      case 'boolean': return expr.value;
      case 'null': return null;
      case 'star': return '*';

      case 'column': {
        const name = expr.name.toLowerCase();
        const table = expr.table ? expr.table.toLowerCase() : null;
        // Search row
        for (const key of Object.keys(this.row)) {
          if (key.startsWith('_')) continue;
          const parts = key.split('.');
          const colName = parts[parts.length - 1];
          if (colName === name && (!table || parts[0] === table)) return this.row[key];
          if (key === name) return this.row[key];
        }
        // Check aggregated context
        if (this.context[name] !== undefined) return this.context[name];
        if (name === '*') return '*';
        return null;
      }

      case 'alias': return this.eval(expr.expr);

      case 'binary': {
        const l = this.eval(expr.left);
        const r = this.eval(expr.right);
        return this.applyBinary(expr.op, l, r);
      }

      case 'unary': {
        const v = this.eval(expr.expr);
        if (expr.op === '-') return -v;
        if (expr.op === 'NOT' || expr.op === '!') return !v;
        return v;
      }

      case 'function': return this.evalFunction(expr);

      case 'case': {
        for (const when of expr.whens) {
          const cond = expr.operand
            ? this.applyBinary('=', this.eval(expr.operand), this.eval(when.cond))
            : this.eval(when.cond);
          if (cond) return this.eval(when.result);
        }
        return expr.elseExpr ? this.eval(expr.elseExpr) : null;
      }

      case 'in': {
        const val = this.eval(expr.expr);
        const list = expr.list.map(e => this.eval(e));
        const found = list.includes(val);
        return expr.not ? !found : found;
      }

      case 'between': {
        const val = this.eval(expr.expr);
        const low = this.eval(expr.low);
        const high = this.eval(expr.high);
        const inRange = val >= low && val <= high;
        return expr.not ? !inRange : inRange;
      }

      case 'like': {
        const val = String(this.eval(expr.expr) || '');
        const pattern = String(this.eval(expr.pattern) || '');
        const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
        const match = new RegExp('^' + regexStr + '$', 'i').test(val);
        return expr.not ? !match : match;
      }

      case 'is_null': {
        const val = this.eval(expr.expr);
        const isNull = val === null || val === undefined;
        return expr.not ? !isNull : isNull;
      }

      case 'subquery': {
        const engine = new SQLEngine(this.db);
        const result = engine.execute(expr.query);
        if (expr.existsCheck) return result.rows.length > 0;
        if (result.rows.length === 0) return null;
        const firstKey = Object.keys(result.rows[0]).find(k => !k.startsWith('_'));
        return result.rows[0][firstKey];
      }

      case 'exists': {
        const engine = new SQLEngine(this.db);
        const result = engine.execute(expr.query);
        return result.rows.length > 0;
      }

      default: return null;
    }
  }

  applyBinary(op, l, r) {
    switch (op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/': return r === 0 ? null : l / r;
      case '%': return l % r;
      case '=': return l == r;
      case '!=': case '<>': return l != r;
      case '<': return l < r;
      case '>': return l > r;
      case '<=': return l <= r;
      case '>=': return l >= r;
      case 'AND': return !!l && !!r;
      case 'OR': return !!l || !!r;
      case 'LIKE': {
        const val = String(l || '');
        const pattern = String(r || '');
        const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
        return new RegExp('^' + regexStr + '$', 'i').test(val);
      }
      case '||': return String(l ?? '') + String(r ?? '');
      default: return null;
    }
  }

  evalFunction(expr) {
    const name = expr.name.toUpperCase();
    const args = expr.args;

    switch (name) {
      case 'COUNT': {
        if (this.context._aggregating) {
          const rows = this.context._rows || [];
          if (args[0] && args[0].type === 'star') return rows.length;
          return rows.filter(r => {
            const ev = new ExprEvaluator(this.db, r, {});
            return ev.eval(args[0]) !== null;
          }).length;
        }
        return this.context['COUNT'] ?? null;
      }
      case 'SUM': {
        if (this.context._aggregating) {
          const rows = this.context._rows || [];
          return rows.reduce((s, r) => {
            const ev = new ExprEvaluator(this.db, r, {});
            const v = ev.eval(args[0]);
            return s + (v ?? 0);
          }, 0);
        }
        return this.context['SUM'] ?? null;
      }
      case 'AVG': {
        if (this.context._aggregating) {
          const rows = this.context._rows || [];
          const vals = rows.map(r => { const ev = new ExprEvaluator(this.db, r, {}); return ev.eval(args[0]); }).filter(v => v !== null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }
        return this.context['AVG'] ?? null;
      }
      case 'MIN': {
        if (this.context._aggregating) {
          const rows = this.context._rows || [];
          const vals = rows.map(r => { const ev = new ExprEvaluator(this.db, r, {}); return ev.eval(args[0]); }).filter(v => v !== null);
          return vals.length ? Math.min(...vals) : null;
        }
        return this.context['MIN'] ?? null;
      }
      case 'MAX': {
        if (this.context._aggregating) {
          const rows = this.context._rows || [];
          const vals = rows.map(r => { const ev = new ExprEvaluator(this.db, r, {}); return ev.eval(args[0]); }).filter(v => v !== null);
          return vals.length ? Math.max(...vals) : null;
        }
        return this.context['MAX'] ?? null;
      }
      case 'COALESCE': case 'IFNULL': case 'NVL': {
        for (const a of args) {
          const v = this.eval(a);
          if (v !== null && v !== undefined) return v;
        }
        return null;
      }
      case 'NULLIF': {
        const v1 = this.eval(args[0]), v2 = this.eval(args[1]);
        return v1 == v2 ? null : v1;
      }
      case 'LENGTH': case 'LEN': return String(this.eval(args[0]) ?? '').length;
      case 'UPPER': return String(this.eval(args[0]) ?? '').toUpperCase();
      case 'LOWER': return String(this.eval(args[0]) ?? '').toLowerCase();
      case 'TRIM': return String(this.eval(args[0]) ?? '').trim();
      case 'SUBSTR': case 'SUBSTRING': {
        const str = String(this.eval(args[0]) ?? '');
        const start = (this.eval(args[1]) || 1) - 1;
        const len = args[2] !== undefined ? this.eval(args[2]) : undefined;
        return len !== undefined ? str.substr(start, len) : str.substr(start);
      }
      case 'REPLACE': return String(this.eval(args[0]) ?? '').split(String(this.eval(args[1]) ?? '')).join(String(this.eval(args[2]) ?? ''));
      case 'CONCAT': return args.map(a => this.eval(a) ?? '').join('');
      case 'ABS': return Math.abs(this.eval(args[0]) ?? 0);
      case 'ROUND': return Math.round(this.eval(args[0]) ?? 0);
      case 'FLOOR': return Math.floor(this.eval(args[0]) ?? 0);
      case 'CEIL': case 'CEILING': return Math.ceil(this.eval(args[0]) ?? 0);
      case 'MOD': return (this.eval(args[0]) ?? 0) % (this.eval(args[1]) ?? 1);
      case 'POWER': case 'POW': return Math.pow(this.eval(args[0]) ?? 0, this.eval(args[1]) ?? 1);
      case 'SQRT': return Math.sqrt(this.eval(args[0]) ?? 0);
      case 'NOW': return new Date().toISOString();
      case 'CAST': return this.eval(args[0]);
      case 'IIF': case 'IF': {
        const cond = this.eval(args[0]);
        return cond ? this.eval(args[1]) : this.eval(args[2]);
      }
      default: return null;
    }
  }
}

// ─────────────────────────────────────────────
// SQL PARSER
// ─────────────────────────────────────────────
class SQLParser {
  constructor(sql) {
    this.tokens = new SQLTokenizer(sql).tokenize();
    this.pos = 0;
  }

  peek(offset = 0) { return this.tokens[this.pos + offset]; }
  consume() { return this.tokens[this.pos++]; }
  consumeIf(type, value) {
    const t = this.peek();
    if (!t) return null;
    if (type && t.type !== type) return null;
    if (value) {
      const tUpper = t.upper || (typeof t.value === 'string' ? t.value.toUpperCase() : '');
      if (tUpper !== value.toUpperCase()) return null;
    }
    return this.consume();
  }
  expect(type, value) {
    const t = this.consumeIf(type, value);
    if (!t) {
      const cur = this.peek();
      throw new Error(`Expected ${value || type} but got '${cur ? cur.value : 'EOF'}'`);
    }
    return t;
  }
  isKeyword(value, offset = 0) {
    const t = this.peek(offset);
    if (!t) return false;
    return (t.type === 'KEYWORD' || t.type === 'IDENT') && (t.upper || t.value.toUpperCase()) === value.toUpperCase();
  }

  parse() {
    // Parse multiple statements
    const stmts = [];
    while (this.pos < this.tokens.length) {
      if (this.peek()?.type === 'SEMI') { this.consume(); continue; }
      stmts.push(this.parseStatement());
      this.consumeIf('SEMI');
    }
    return stmts.length === 1 ? stmts[0] : { type: 'MULTI', statements: stmts };
  }

  parseStatement() {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of input');
    const upper = t.upper || (typeof t.value === 'string' ? t.value.toUpperCase() : '');

    if (upper === 'WITH') return this.parseCTE();
    if (upper === 'SELECT') return this.parseSelect();
    if (upper === 'INSERT') return this.parseInsert();
    if (upper === 'UPDATE') return this.parseUpdate();
    if (upper === 'DELETE') return this.parseDelete();
    if (upper === 'CREATE') return this.parseCreate();
    if (upper === 'ALTER') return this.parseAlter();
    if (upper === 'DROP') return this.parseDrop();
    if (upper === 'EXPLAIN') { this.consume(); return { ...this.parseStatement(), explain: true }; }

    throw new Error(`Unknown statement: ${t.value}`);
  }

  parseCTE() {
    this.expect('KEYWORD', 'WITH');
    const recursive = this.consumeIf('KEYWORD', 'RECURSIVE');
    const ctes = [];
    do {
      const name = this.consume().value;
      this.expect('LPAREN');
      const query = this.parseSelect();
      this.expect('RPAREN');
      ctes.push({ name, query });
    } while (this.consumeIf('COMMA'));
    const main = this.parseSelect();
    return { type: 'CTE', recursive: !!recursive, ctes, main };
  }

  parseSelect() {
    this.expect('KEYWORD', 'SELECT');
    const distinct = !!this.consumeIf('KEYWORD', 'DISTINCT');
    const columns = this.parseSelectList();
    let from = null, joins = [], where = null, groupBy = [], having = null, orderBy = [], limit = null, offset = null;

    if (this.isKeyword('FROM')) {
      this.consume();
      from = this.parseTableRef();
      joins = this.parseJoins();
    }
    if (this.isKeyword('WHERE')) { this.consume(); where = this.parseExpr(); }
    if (this.isKeyword('GROUP')) {
      this.consume();
      this.expect('KEYWORD', 'BY');
      groupBy = this.parseExprList();
    }
    if (this.isKeyword('HAVING')) { this.consume(); having = this.parseExpr(); }
    if (this.isKeyword('ORDER')) {
      this.consume();
      this.expect('KEYWORD', 'BY');
      orderBy = this.parseOrderList();
    }
    if (this.isKeyword('LIMIT')) {
      this.consume();
      limit = this.parseExpr();
      if (this.consumeIf('KEYWORD', 'OFFSET') || this.consumeIf('COMMA')) offset = this.parseExpr();
    }
    if (this.isKeyword('OFFSET')) { this.consume(); offset = this.parseExpr(); }

    let node = { type: 'SELECT', distinct, columns, from, joins, where, groupBy, having, orderBy, limit, offset };

    // UNION / INTERSECT / EXCEPT
    while (this.isKeyword('UNION') || this.isKeyword('INTERSECT') || this.isKeyword('EXCEPT')) {
      const op = this.consume().value.toUpperCase();
      const all = !!this.consumeIf('KEYWORD', 'ALL');
      const right = this.parseSelect();
      node = { type: 'SET_OP', op: all ? op + ' ALL' : op, left: node, right };
    }

    return node;
  }

  parseSelectList() {
    const cols = [];
    do {
      if (this.peek()?.value === '*') { this.consume(); cols.push({ type: 'star' }); }
      else {
        let expr = this.parseExpr();
        let alias = null;
        if (this.isKeyword('AS')) { this.consume(); alias = this.consume().value; }
        else if (this.peek()?.type === 'IDENT' && !this.isKeyword('FROM') && !this.isKeyword('WHERE')) {
          // implicit alias
          alias = this.consume().value;
        }
        if (alias) expr = { type: 'alias', expr, alias };
        cols.push(expr);
      }
    } while (this.consumeIf('COMMA'));
    return cols;
  }

  parseTableRef() {
    if (this.peek()?.type === 'LPAREN') {
      this.consume();
      const subq = this.parseSelect();
      this.expect('RPAREN');
      let alias = null;
      if (this.isKeyword('AS')) { this.consume(); alias = this.consume().value; }
      else if (this.peek()?.type === 'IDENT') alias = this.consume().value;
      return { type: 'subquery', query: subq, alias };
    }
    const name = this.consume().value;
    let alias = null;
    if (this.isKeyword('AS')) { this.consume(); alias = this.consume().value; }
    else if (this.peek()?.type === 'IDENT' && !this.isKeyword('JOIN') && !this.isKeyword('INNER') && !this.isKeyword('LEFT') && !this.isKeyword('RIGHT') && !this.isKeyword('FULL') && !this.isKeyword('CROSS') && !this.isKeyword('WHERE') && !this.isKeyword('ON') && !this.isKeyword('GROUP') && !this.isKeyword('ORDER') && !this.isKeyword('HAVING') && !this.isKeyword('LIMIT') && !this.isKeyword('UNION')) {
      alias = this.consume().value;
    }
    return { type: 'table', name, alias };
  }

  parseJoins() {
    const joins = [];
    while (true) {
      let joinType = null;
      if (this.isKeyword('JOIN')) { joinType = 'INNER JOIN'; this.consume(); }
      else if (this.isKeyword('INNER') && this.isKeyword('JOIN', 1)) { this.consume(); this.consume(); joinType = 'INNER JOIN'; }
      else if (this.isKeyword('LEFT')) {
        this.consume();
        this.consumeIf('KEYWORD', 'OUTER');
        this.expect('KEYWORD', 'JOIN');
        joinType = 'LEFT JOIN';
      }
      else if (this.isKeyword('RIGHT')) {
        this.consume();
        this.consumeIf('KEYWORD', 'OUTER');
        this.expect('KEYWORD', 'JOIN');
        joinType = 'RIGHT JOIN';
      }
      else if (this.isKeyword('FULL')) {
        this.consume();
        this.consumeIf('KEYWORD', 'OUTER');
        this.expect('KEYWORD', 'JOIN');
        joinType = 'FULL OUTER JOIN';
      }
      else if (this.isKeyword('CROSS') && this.isKeyword('JOIN', 1)) { this.consume(); this.consume(); joinType = 'CROSS JOIN'; }
      else if (this.isKeyword('NATURAL') && this.isKeyword('JOIN', 1)) { this.consume(); this.consume(); joinType = 'NATURAL JOIN'; }
      else break;

      const table = this.parseTableRef();
      let condition = null;
      if (this.isKeyword('ON')) { this.consume(); condition = this.parseExpr(); }
      else if (this.isKeyword('USING')) {
        this.consume();
        this.expect('LPAREN');
        const cols = [this.consume().value];
        while (this.consumeIf('COMMA')) cols.push(this.consume().value);
        this.expect('RPAREN');
        condition = { type: 'using', columns: cols };
      }
      joins.push({ joinType, table, condition });
    }
    return joins;
  }

  parseOrderList() {
    const items = [];
    do {
      const expr = this.parseExpr();
      const dir = this.isKeyword('ASC') || this.isKeyword('DESC') ? this.consume().value.toUpperCase() : 'ASC';
      items.push({ expr, dir });
    } while (this.consumeIf('COMMA'));
    return items;
  }

  parseInsert() {
    this.expect('KEYWORD', 'INSERT');
    this.expect('KEYWORD', 'INTO');
    const table = this.consume().value;
    let columns = null;
    if (this.peek()?.type === 'LPAREN' && !this.isKeyword('SELECT', 1)) {
      this.consume();
      columns = [];
      do { columns.push(this.consume().value); } while (this.consumeIf('COMMA'));
      this.expect('RPAREN');
    }
    // VALUES or SELECT
    if (this.isKeyword('VALUES')) {
      this.consume();
      const rows = [];
      do {
        this.expect('LPAREN');
        const vals = [];
        do { vals.push(this.parseExpr()); } while (this.consumeIf('COMMA'));
        this.expect('RPAREN');
        rows.push(vals);
      } while (this.consumeIf('COMMA'));
      return { type: 'INSERT', table, columns, rows };
    }
    if (this.isKeyword('SELECT')) {
      const select = this.parseSelect();
      return { type: 'INSERT_SELECT', table, columns, select };
    }
    throw new Error('Expected VALUES or SELECT in INSERT');
  }

  parseUpdate() {
    this.expect('KEYWORD', 'UPDATE');
    const table = this.consume().value;
    let alias = null;
    if (this.isKeyword('AS')) { this.consume(); alias = this.consume().value; }
    else if (this.peek()?.type === 'IDENT' && !this.isKeyword('SET')) alias = this.consume().value;
    this.expect('KEYWORD', 'SET');
    const sets = [];
    do {
      const col = this.consume().value;
      this.expect('OP', '=');
      const val = this.parseExpr();
      sets.push({ col, val });
    } while (this.consumeIf('COMMA'));
    let where = null;
    if (this.isKeyword('WHERE')) { this.consume(); where = this.parseExpr(); }
    return { type: 'UPDATE', table, alias, sets, where };
  }

  parseDelete() {
    this.expect('KEYWORD', 'DELETE');
    this.expect('KEYWORD', 'FROM');
    const table = this.consume().value;
    let where = null;
    if (this.isKeyword('WHERE')) { this.consume(); where = this.parseExpr(); }
    return { type: 'DELETE', table, where };
  }

  parseCreate() {
    this.expect('KEYWORD', 'CREATE');
    if (this.isKeyword('TABLE')) {
      this.consume();
      const ifNotExists = this.isKeyword('IF') && this.isKeyword('NOT', 1) && this.isKeyword('EXISTS', 2);
      if (ifNotExists) { this.consume(); this.consume(); this.consume(); }
      const name = this.consume().value;
      this.expect('LPAREN');
      const columns = this.parseColumnDefs();
      this.expect('RPAREN');
      return { type: 'CREATE_TABLE', name, ifNotExists, columns };
    }
    if (this.isKeyword('VIEW')) {
      this.consume();
      const name = this.consume().value;
      this.expect('KEYWORD', 'AS');
      const select = this.parseSelect();
      return { type: 'CREATE_VIEW', name, select };
    }
    if (this.isKeyword('INDEX')) {
      this.consume();
      const name = this.consume().value;
      this.expect('KEYWORD', 'ON');
      const table = this.consume().value;
      this.expect('LPAREN');
      const cols = [this.consume().value];
      while (this.consumeIf('COMMA')) cols.push(this.consume().value);
      this.expect('RPAREN');
      return { type: 'CREATE_INDEX', name, table, columns: cols };
    }
    throw new Error('Expected TABLE, VIEW, or INDEX after CREATE');
  }

  parseColumnDefs() {
    const columns = [];
    const tableConstraints = [];
    do {
      if (this.isKeyword('PRIMARY') || this.isKeyword('UNIQUE') || this.isKeyword('FOREIGN') || this.isKeyword('CHECK') || this.isKeyword('CONSTRAINT')) {
        // Table-level constraint
        if (this.isKeyword('CONSTRAINT')) this.consume(); // skip name too
        if (this.peek()?.type === 'IDENT') this.consume();
        // Consume until comma or close paren
        while (this.peek() && this.peek().type !== 'COMMA' && this.peek().type !== 'RPAREN') this.consume();
        continue;
      }
      const name = this.consume().value;
      const type = this.consume().value;
      // optional length
      if (this.peek()?.type === 'LPAREN') {
        this.consume();
        while (this.peek()?.type !== 'RPAREN') this.consume();
        this.consume();
      }
      const col = { name, type, primaryKey: false, notNull: false, unique: false, autoIncrement: false, defaultValue: null, foreignKey: null };
      // constraints
      while (this.peek() && this.peek().type !== 'COMMA' && this.peek().type !== 'RPAREN') {
        if (this.isKeyword('PRIMARY')) {
          this.consume(); this.consumeIf('KEYWORD', 'KEY'); col.primaryKey = true;
        } else if (this.isKeyword('NOT')) {
          this.consume(); this.consumeIf('KEYWORD', 'NULL'); col.notNull = true;
        } else if (this.isKeyword('UNIQUE')) {
          this.consume(); col.unique = true;
        } else if (this.isKeyword('AUTO_INCREMENT') || this.isKeyword('AUTOINCREMENT')) {
          this.consume(); col.autoIncrement = true;
        } else if (this.isKeyword('DEFAULT')) {
          this.consume(); col.defaultValue = this.eval(this.parseExpr());
        } else if (this.isKeyword('REFERENCES')) {
          this.consume();
          const refTable = this.consume().value;
          let refCol = null;
          if (this.peek()?.type === 'LPAREN') {
            this.consume(); refCol = this.consume().value; this.expect('RPAREN');
          }
          col.foreignKey = { table: refTable, column: refCol };
        } else { this.consume(); }
      }
      columns.push(col);
    } while (this.consumeIf('COMMA'));
    return columns;
  }

  eval(expr) {
    if (!expr || typeof expr !== 'object') return expr;
    if (expr.type === 'number') return expr.value;
    if (expr.type === 'string') return expr.value;
    if (expr.type === 'null') return null;
    if (expr.type === 'boolean') return expr.value;
    return null;
  }

  parseAlter() {
    this.expect('KEYWORD', 'ALTER');
    this.expect('KEYWORD', 'TABLE');
    const table = this.consume().value;
    if (this.isKeyword('ADD')) {
      this.consume();
      this.consumeIf('KEYWORD', 'COLUMN');
      const colDefs = this.parseColumnDefs();
      return { type: 'ALTER_TABLE', action: 'ADD_COLUMN', table, column: colDefs[0] };
    }
    if (this.isKeyword('DROP')) {
      this.consume();
      this.consumeIf('KEYWORD', 'COLUMN');
      const col = this.consume().value;
      return { type: 'ALTER_TABLE', action: 'DROP_COLUMN', table, column: col };
    }
    if (this.isKeyword('RENAME')) {
      this.consume();
      if (this.isKeyword('TO')) {
        this.consume();
        const newName = this.consume().value;
        return { type: 'ALTER_TABLE', action: 'RENAME_TABLE', table, newName };
      }
      this.consumeIf('KEYWORD', 'COLUMN');
      const oldCol = this.consume().value;
      this.expect('KEYWORD', 'TO');
      const newCol = this.consume().value;
      return { type: 'ALTER_TABLE', action: 'RENAME_COLUMN', table, oldCol, newCol };
    }
    throw new Error('Unknown ALTER TABLE action');
  }

  parseDrop() {
    this.expect('KEYWORD', 'DROP');
    if (this.isKeyword('TABLE')) {
      this.consume();
      const ifExists = this.isKeyword('IF') && this.isKeyword('EXISTS', 1);
      if (ifExists) { this.consume(); this.consume(); }
      const name = this.consume().value;
      return { type: 'DROP_TABLE', name, ifExists };
    }
    if (this.isKeyword('VIEW')) {
      this.consume();
      const name = this.consume().value;
      return { type: 'DROP_VIEW', name };
    }
    if (this.isKeyword('INDEX')) {
      this.consume();
      const name = this.consume().value;
      return { type: 'DROP_INDEX', name };
    }
    throw new Error('Expected TABLE, VIEW, or INDEX after DROP');
  }

  // Expression parsing with precedence climbing
  parseExpr(minPrec = 0) {
    let left = this.parseUnary();

    while (true) {
      const t = this.peek();
      if (!t) break;

      const upper = t.upper || (typeof t.value === 'string' ? t.value.toUpperCase() : '');

      // OVER clause (window functions)
      if (upper === 'OVER') {
        this.consume();
        this.expect('LPAREN');
        const over = this.parseOverClause();
        this.expect('RPAREN');
        left = { type: 'window', func: left, over };
        continue;
      }

      // BETWEEN
      if (upper === 'BETWEEN') {
        this.consume();
        const low = this.parseExpr(5);
        this.expect('KEYWORD', 'AND');
        const high = this.parseExpr(5);
        left = { type: 'between', not: false, expr: left, low, high };
        continue;
      }
      if (upper === 'NOT' && this.isKeyword('BETWEEN', 1)) {
        this.consume(); this.consume();
        const low = this.parseExpr(5);
        this.expect('KEYWORD', 'AND');
        const high = this.parseExpr(5);
        left = { type: 'between', not: true, expr: left, low, high };
        continue;
      }

      // IN
      if (upper === 'IN') {
        this.consume();
        this.expect('LPAREN');
        const list = [];
        if (this.isKeyword('SELECT')) {
          const subq = this.parseSelect();
          this.expect('RPAREN');
          left = { type: 'in', not: false, expr: left, subquery: subq };
          continue;
        }
        do { list.push(this.parseExpr()); } while (this.consumeIf('COMMA'));
        this.expect('RPAREN');
        left = { type: 'in', not: false, expr: left, list };
        continue;
      }
      if (upper === 'NOT' && this.isKeyword('IN', 1)) {
        this.consume(); this.consume();
        this.expect('LPAREN');
        const list = [];
        if (this.isKeyword('SELECT')) {
          const subq = this.parseSelect();
          this.expect('RPAREN');
          left = { type: 'in', not: true, expr: left, subquery: subq };
          continue;
        }
        do { list.push(this.parseExpr()); } while (this.consumeIf('COMMA'));
        this.expect('RPAREN');
        left = { type: 'in', not: true, expr: left, list };
        continue;
      }

      // IS NULL / IS NOT NULL
      if (upper === 'IS') {
        this.consume();
        const not = !!this.consumeIf('KEYWORD', 'NOT');
        this.consumeIf('KEYWORD', 'NULL');
        left = { type: 'is_null', not, expr: left };
        continue;
      }

      // LIKE / NOT LIKE
      if (upper === 'LIKE') {
        this.consume();
        const pattern = this.parseExpr(5);
        left = { type: 'like', not: false, expr: left, pattern };
        continue;
      }
      if (upper === 'NOT' && this.isKeyword('LIKE', 1)) {
        this.consume(); this.consume();
        const pattern = this.parseExpr(5);
        left = { type: 'like', not: true, expr: left, pattern };
        continue;
      }

      // Binary operators with precedence
      const prec = this.getBinaryPrec(t);
      if (prec === null || prec < minPrec) break;

      const op = this.consume().value.toUpperCase();
      const right = this.parseExpr(prec + 1);
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  getBinaryPrec(t) {
    const upper = t.upper || (typeof t.value === 'string' ? t.value.toUpperCase() : '');
    if (upper === 'OR') return 1;
    if (upper === 'AND') return 2;
    if (['=', '!=', '<>', '<', '>', '<=', '>='].includes(t.value)) return 4;
    if (['+', '-', '||'].includes(t.value)) return 6;
    if (['*', '/', '%'].includes(t.value)) return 7;
    return null;
  }

  parseUnary() {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.value === '-' || t.value === '+') {
      this.consume();
      return { type: 'unary', op: t.value, expr: this.parsePrimary() };
    }
    if ((t.upper || (typeof t.value === 'string' ? t.value.toUpperCase() : '')) === 'NOT') {
      this.consume();
      return { type: 'unary', op: 'NOT', expr: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    const upper = t.upper || (typeof t.value === 'string' ? t.value.toUpperCase() : '');

    // Subquery / EXISTS
    if (upper === 'EXISTS') {
      this.consume();
      this.expect('LPAREN');
      const subq = this.parseSelect();
      this.expect('RPAREN');
      return { type: 'exists', query: subq };
    }

    // CASE expression
    if (upper === 'CASE') {
      this.consume();
      const operand = !this.isKeyword('WHEN') ? this.parseExpr() : null;
      const whens = [];
      while (this.isKeyword('WHEN')) {
        this.consume();
        const cond = this.parseExpr();
        this.expect('KEYWORD', 'THEN');
        const result = this.parseExpr();
        whens.push({ cond, result });
      }
      let elseExpr = null;
      if (this.isKeyword('ELSE')) { this.consume(); elseExpr = this.parseExpr(); }
      this.expect('KEYWORD', 'END');
      return { type: 'case', operand, whens, elseExpr };
    }

    // Subquery in parens
    if (t.type === 'LPAREN' && this.isKeyword('SELECT', 1)) {
      this.consume();
      const subq = this.parseSelect();
      this.expect('RPAREN');
      return { type: 'subquery', query: subq };
    }

    // Parenthesized expression
    if (t.type === 'LPAREN') {
      this.consume();
      const expr = this.parseExpr();
      this.expect('RPAREN');
      return expr;
    }

    // NULL literal
    if (upper === 'NULL') { this.consume(); return { type: 'null' }; }

    // TRUE / FALSE
    if (upper === 'TRUE') { this.consume(); return { type: 'boolean', value: true }; }
    if (upper === 'FALSE') { this.consume(); return { type: 'boolean', value: false }; }

    // Star
    if (t.value === '*') { this.consume(); return { type: 'star' }; }

    // Number
    if (t.type === 'NUMBER') { this.consume(); return { type: 'number', value: t.value }; }

    // String
    if (t.type === 'STRING') { this.consume(); return { type: 'string', value: t.value }; }

    // Function call or identifier
    if (t.type === 'KEYWORD' || t.type === 'IDENT') {
      const name = t.value;
      const next = this.peek(1);

      // Function call
      if (next?.type === 'LPAREN') {
        this.consume(); // name
        this.consume(); // (
        const args = [];
        const isAgg = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(name.toUpperCase());
        let distinct = false;
        if (isAgg && this.isKeyword('DISTINCT')) { this.consume(); distinct = true; }
        if (this.peek()?.value === '*') { this.consume(); args.push({ type: 'star' }); }
        else if (this.peek()?.type !== 'RPAREN') {
          do { args.push(this.parseExpr()); } while (this.consumeIf('COMMA'));
        }
        this.expect('RPAREN');
        return { type: 'function', name: name.toUpperCase(), args, distinct };
      }

      // Qualified column: table.column
      if (next?.value === '.') {
        this.consume(); // table
        this.consume(); // .
        if (this.peek()?.value === '*') { this.consume(); return { type: 'star', table: name }; }
        const col = this.consume().value;
        return { type: 'column', table: name, name: col };
      }

      // Plain identifier
      this.consume();
      return { type: 'column', name: name };
    }

    throw new Error(`Unexpected token: '${t.value}'`);
  }

  parseOverClause() {
    const over = { partitionBy: [], orderBy: [], frame: null };
    if (this.isKeyword('PARTITION')) {
      this.consume();
      this.expect('KEYWORD', 'BY');
      do { over.partitionBy.push(this.parseExpr()); } while (this.consumeIf('COMMA'));
    }
    if (this.isKeyword('ORDER')) {
      this.consume();
      this.expect('KEYWORD', 'BY');
      over.orderBy = this.parseOrderList();
    }
    if (this.isKeyword('ROWS') || this.isKeyword('RANGE')) {
      over.frameType = this.consume().value.toUpperCase();
      if (this.isKeyword('BETWEEN')) {
        this.consume();
        over.frameStart = this.parseFrameBound();
        this.expect('KEYWORD', 'AND');
        over.frameEnd = this.parseFrameBound();
      } else {
        over.frameStart = this.parseFrameBound();
      }
    }
    return over;
  }

  parseFrameBound() {
    if (this.isKeyword('UNBOUNDED')) { this.consume(); const dir = this.consume().value.toUpperCase(); return { type: 'UNBOUNDED', dir }; }
    if (this.isKeyword('CURRENT')) { this.consume(); this.consume(); return { type: 'CURRENT_ROW' }; }
    const n = this.parseExpr();
    const dir = this.consume().value.toUpperCase();
    return { type: 'OFFSET', n, dir };
  }

  parseExprList() {
    const list = [];
    do { list.push(this.parseExpr()); } while (this.consumeIf('COMMA'));
    return list;
  }
}

// ─────────────────────────────────────────────
// SQL ENGINE (Executor)
// ─────────────────────────────────────────────
class SQLEngine {
  constructor(db) {
    this.db = db;
    this.steps = [];
  }

  execute(ast) {
    if (!ast) return { rows: [], columns: [], steps: [] };
    this.steps = [];

    if (ast.type === 'MULTI') {
      let last = { rows: [], columns: [] };
      for (const stmt of ast.statements) {
        last = this.executeStatement(stmt);
      }
      last.steps = this.steps;
      return last;
    }

    const result = this.executeStatement(ast);
    result.steps = this.steps;
    return result;
  }

  executeStatement(ast) {
    switch (ast.type) {
      case 'SELECT': return this.executeSelect(ast);
      case 'SET_OP': return this.executeSetOp(ast);
      case 'CTE': return this.executeCTE(ast);
      case 'INSERT': return this.executeInsert(ast);
      case 'INSERT_SELECT': return this.executeInsertSelect(ast);
      case 'UPDATE': return this.executeUpdate(ast);
      case 'DELETE': return this.executeDelete(ast);
      case 'CREATE_TABLE': return this.executeCreateTable(ast);
      case 'CREATE_VIEW': return this.executeCreateView(ast);
      case 'CREATE_INDEX': return this.executeCreateIndex(ast);
      case 'ALTER_TABLE': return this.executeAlterTable(ast);
      case 'DROP_TABLE': return this.executeDropTable(ast);
      case 'DROP_VIEW': { delete this.db.views[ast.name.toLowerCase()]; return { rows: [], columns: [], message: `View '${ast.name}' dropped.` }; }
      default: throw new Error(`Unknown statement type: ${ast.type}`);
    }
  }

  addStep(step) {
    this.steps.push({ ...step, id: this.steps.length });
  }

  executeSelect(ast, cteContext = {}) {
    // Step 1: FROM / Source
    let rows = [];
    let sourceTable = null;

    if (ast.from) {
      const fromResult = this.resolveFrom(ast.from, cteContext);
      rows = fromResult.rows;
      sourceTable = fromResult.name;
      this.addStep({
        clause: 'FROM',
        name: 'Source Data',
        desc: `Reading from ${sourceTable}`,
        rows: rows.map(r => ({...r})),
        sourceTable,
        highlight: 'from'
      });

      // Step 2: JOINs
      for (const join of (ast.joins || [])) {
        const result = this.executeJoin(rows, join, cteContext);
        rows = result.rows;
        this.addStep({
          clause: join.joinType,
          name: `${join.joinType}`,
          desc: `Joining with ${join.table.name || join.table.alias}`,
          rows: rows.map(r => ({...r})),
          leftRows: result.leftRows,
          rightRows: result.rightRows,
          matchedPairs: result.matchedPairs,
          joinType: join.joinType,
          leftTable: sourceTable,
          rightTable: join.table.alias || join.table.name,
          highlight: 'join'
        });
      }
    } else {
      // No FROM — expression only
      rows = [{}];
    }

    // Step 3: WHERE
    if (ast.where) {
      const before = rows.map(r => ({...r}));
      const filtered = [];
      const rejected = [];
      for (const row of rows) {
        const ev = new ExprEvaluator(this.db, row, {});
        if (ev.eval(ast.where)) filtered.push(row);
        else rejected.push(row);
      }
      this.addStep({
        clause: 'WHERE',
        name: 'Filter Rows',
        desc: `Applying WHERE condition: ${this.exprToString(ast.where)}`,
        rows: before,
        filteredRows: filtered.map(r => ({...r})),
        rejectedRows: rejected.map(r => ({...r})),
        highlight: 'where'
      });
      rows = filtered;
    }

    // Step 4: GROUP BY
    let groups = null;
    if (ast.groupBy && ast.groupBy.length > 0) {
      groups = this.groupRows(rows, ast.groupBy);
      this.addStep({
        clause: 'GROUP BY',
        name: 'Group Rows',
        desc: `Grouping by: ${ast.groupBy.map(e => this.exprToString(e)).join(', ')}`,
        groups: Object.entries(groups).map(([key, g]) => ({ key, rows: g.map(r => ({...r})) })),
        highlight: 'group'
      });
    }

    // Step 5: HAVING
    if (ast.having && groups) {
      const beforeGroups = { ...groups };
      const filtered = {};
      for (const [key, groupRows] of Object.entries(groups)) {
        const ctx = { _aggregating: true, _rows: groupRows };
        const rep = groupRows[0] || {};
        const ev = new ExprEvaluator(this.db, rep, ctx);
        if (ev.eval(ast.having)) filtered[key] = groupRows;
      }
      this.addStep({
        clause: 'HAVING',
        name: 'Filter Groups',
        desc: `Applying HAVING: ${this.exprToString(ast.having)}`,
        groups: Object.entries(filtered).map(([key, g]) => ({ key, rows: g })),
        highlight: 'having'
      });
      groups = filtered;
    }

    // Step 6: SELECT (project columns)
    let resultRows = [];
    const hasStar = ast.columns.some(c => c.type === 'star');
    const hasAgg = ast.columns.some(c => this.hasAggregate(c));

    // Check for window functions
    const hasWindow = ast.columns.some(c => this.hasWindowFunc(c));

    if (groups) {
      // Aggregate per group
      for (const [key, groupRows] of Object.entries(groups)) {
        const ctx = { _aggregating: true, _rows: groupRows };
        const rep = { ...groupRows[0] };
        const row = {};
        for (const col of ast.columns) {
          const { name, value } = this.evalColumn(col, rep, ctx, groupRows);
          row[name] = value;
        }
        resultRows.push(row);
      }
    } else if (!ast.from && !hasStar) {
      // Expression-only SELECT
      const row = {};
      for (const col of ast.columns) {
        const { name, value } = this.evalColumn(col, {}, {}, [{}]);
        row[name] = value;
      }
      resultRows = [row];
    } else if (hasAgg && !groups) {
      // Aggregate over all rows
      const ctx = { _aggregating: true, _rows: rows };
      const rep = rows[0] || {};
      const row = {};
      for (const col of ast.columns) {
        const { name, value } = this.evalColumn(col, rep, ctx, rows);
        row[name] = value;
      }
      resultRows = [row];
    } else {
      // Row-by-row projection
      for (const srcRow of rows) {
        if (hasStar) {
          const row = {};
          for (const [k, v] of Object.entries(srcRow)) {
            if (!k.startsWith('_')) row[k] = v;
          }
          // additional cols
          for (const col of ast.columns) {
            if (col.type !== 'star') {
              const { name, value } = this.evalColumn(col, srcRow, {}, rows);
              row[name] = value;
            }
          }
          resultRows.push(row);
        } else {
          const row = {};
          for (const col of ast.columns) {
            const { name, value } = this.evalColumn(col, srcRow, {}, rows);
            row[name] = value;
          }
          resultRows.push(row);
        }
      }
    }

    // Handle window functions
    if (hasWindow) {
      resultRows = this.applyWindowFunctions(ast.columns, rows, resultRows);
      this.addStep({
        clause: 'WINDOW',
        name: 'Window Functions',
        desc: 'Computing window function results over partitions',
        rows: resultRows.map(r => ({...r})),
        highlight: 'window'
      });
    }

    // Step 7: DISTINCT
    if (ast.distinct) {
      const seen = new Set();
      const before = resultRows.length;
      resultRows = resultRows.filter(r => {
        const key = JSON.stringify(Object.values(r));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      this.addStep({
        clause: 'DISTINCT',
        name: 'Remove Duplicates',
        desc: `Removed ${before - resultRows.length} duplicate rows`,
        rows: resultRows.map(r => ({...r})),
        highlight: 'select'
      });
    }

    // Step 8: ORDER BY
    if (ast.orderBy && ast.orderBy.length > 0) {
      const before = resultRows.map(r => ({...r}));
      resultRows = this.sortRows(resultRows, ast.orderBy);
      this.addStep({
        clause: 'ORDER BY',
        name: 'Sort Results',
        desc: `Sorting by: ${ast.orderBy.map(o => `${this.exprToString(o.expr)} ${o.dir}`).join(', ')}`,
        rows: resultRows.map(r => ({...r})),
        highlight: 'order'
      });
    }

    // Step 9: SELECT projection (final display)
    this.addStep({
      clause: 'SELECT',
      name: 'Final Result',
      desc: `Projecting ${ast.distinct ? 'DISTINCT ' : ''}${ast.columns.map(c => this.colToString(c)).join(', ')}`,
      rows: resultRows.map(r => ({...r})),
      highlight: 'select',
      isFinal: true
    });

    // Step 10: LIMIT / OFFSET
    if (ast.limit !== null && ast.limit !== undefined) {
      const ev = new ExprEvaluator(this.db, {}, {});
      const lim = ev.eval(ast.limit);
      const off = ast.offset ? ev.eval(ast.offset) : 0;
      const before = resultRows.length;
      resultRows = resultRows.slice(off, off + lim);
      this.addStep({
        clause: 'LIMIT',
        name: 'Limit Results',
        desc: `Returning ${resultRows.length} of ${before} rows (LIMIT ${lim}${off ? ` OFFSET ${off}` : ''})`,
        rows: resultRows.map(r => ({...r})),
        highlight: 'limit'
      });
    }

    const columns = resultRows.length > 0 ? Object.keys(resultRows[0]).filter(k => !k.startsWith('_')) : [];
    return { rows: resultRows, columns };
  }

  resolveFrom(from, cteContext = {}) {
    if (from.type === 'table') {
      const name = from.alias || from.name;
      // Check CTE context first
      if (cteContext[from.name.toLowerCase()]) {
        const cteRows = cteContext[from.name.toLowerCase()];
        return { rows: cteRows.map(r => this.prefixRow(r, from.alias || from.name)), name: from.alias || from.name };
      }
      const table = this.db.getTable(from.name);
      return {
        rows: table.rows.map(r => this.prefixRow(r, from.alias || from.name)),
        name: from.alias || from.name
      };
    }
    if (from.type === 'subquery') {
      const engine = new SQLEngine(this.db);
      const result = engine.execute(from.query);
      const alias = from.alias || 'subquery';
      return { rows: result.rows.map(r => this.prefixRow(r, alias)), name: alias };
    }
    return { rows: [], name: 'unknown' };
  }

  prefixRow(row, prefix) {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith('_')) { out[k] = v; continue; }
      if (k.includes('.')) out[k] = v;
      else out[`${prefix}.${k}`] = v;
      out[k] = v; // also keep unprefixed for convenience
    }
    return out;
  }

  executeJoin(leftRows, joinDef, cteContext = {}) {
    const rightRef = joinDef.table;
    const rightData = this.resolveFrom(rightRef, cteContext);
    const rightRows = rightData.rows;
    const joinType = joinDef.joinType;
    const condition = joinDef.condition;

    if (joinType === 'CROSS JOIN') {
      const result = [];
      for (const l of leftRows) for (const r of rightRows) result.push({ ...l, ...r });
      return { rows: result, leftRows, rightRows, matchedPairs: [] };
    }

    const matched = [];
    const matchedPairs = [];
    const unmatchedLeft = new Set();
    const unmatchedRight = new Set(rightRows.map((_, i) => i));

    for (let li = 0; li < leftRows.length; li++) {
      const l = leftRows[li];
      let found = false;
      for (let ri = 0; ri < rightRows.length; ri++) {
        const r = rightRows[ri];
        const combined = { ...l, ...r };
        let match = false;
        if (!condition) match = true;
        else if (condition.type === 'using') {
          match = condition.columns.every(col => l[col] == r[col] || l[`${Object.keys(l)[0]?.split('.')[0]}.${col}`] == r[col]);
        } else {
          const ev = new ExprEvaluator(this.db, combined, {});
          match = !!ev.eval(condition);
        }
        if (match) {
          matched.push({ ...combined, _li: li, _ri: ri });
          matchedPairs.push({ li, ri });
          unmatchedRight.delete(ri);
          found = true;
        }
      }
      if (!found) unmatchedLeft.add(li);
    }

    let result = matched;

    if (joinType === 'LEFT JOIN') {
      for (const li of unmatchedLeft) {
        const l = leftRows[li];
        const nullRight = {};
        for (const k of Object.keys(rightRows[0] || {})) nullRight[k] = null;
        result.push({ ...l, ...nullRight });
      }
    }
    if (joinType === 'RIGHT JOIN') {
      for (const ri of unmatchedRight) {
        const r = rightRows[ri];
        const nullLeft = {};
        for (const k of Object.keys(leftRows[0] || {})) nullLeft[k] = null;
        result.push({ ...nullLeft, ...r });
      }
    }
    if (joinType === 'FULL OUTER JOIN') {
      for (const li of unmatchedLeft) {
        const l = leftRows[li];
        const nullRight = {};
        for (const k of Object.keys(rightRows[0] || {})) nullRight[k] = null;
        result.push({ ...l, ...nullRight });
      }
      for (const ri of unmatchedRight) {
        const r = rightRows[ri];
        const nullLeft = {};
        for (const k of Object.keys(leftRows[0] || {})) nullLeft[k] = null;
        result.push({ ...nullLeft, ...r });
      }
    }

    return { rows: result, leftRows, rightRows, matchedPairs };
  }

  groupRows(rows, groupByExprs) {
    const groups = {};
    for (const row of rows) {
      const ev = new ExprEvaluator(this.db, row, {});
      const key = JSON.stringify(groupByExprs.map(e => ev.eval(e)));
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return groups;
  }

  sortRows(rows, orderBy) {
    return [...rows].sort((a, b) => {
      for (const { expr, dir } of orderBy) {
        const evA = new ExprEvaluator(this.db, a, {});
        const evB = new ExprEvaluator(this.db, b, {});
        const va = evA.eval(expr);
        const vb = evB.eval(expr);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  evalColumn(col, row, ctx, allRows) {
    if (col.type === 'alias') {
      const ev = new ExprEvaluator(this.db, row, ctx);
      const value = this.evalWithAgg(col.expr, row, ctx, allRows);
      return { name: col.alias, value };
    }
    if (col.type === 'star') {
      return { name: '*', value: '*' };
    }
    const ev = new ExprEvaluator(this.db, row, ctx);
    const value = this.evalWithAgg(col, row, ctx, allRows);
    const name = this.colToString(col);
    return { name, value };
  }

  evalWithAgg(expr, row, ctx, allRows) {
    if (!expr || typeof expr !== 'object') return expr;
    if (expr.type === 'function' && ['COUNT','SUM','AVG','MIN','MAX'].includes(expr.name.toUpperCase())) {
      const aggCtx = { ...ctx, _aggregating: true, _rows: allRows };
      const ev = new ExprEvaluator(this.db, row, aggCtx);
      return ev.eval(expr);
    }
    const ev = new ExprEvaluator(this.db, row, ctx);
    return ev.eval(expr);
  }

  applyWindowFunctions(columns, sourceRows, resultRows) {
    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const windowCol = col.type === 'alias' && col.expr.type === 'window' ? col.expr : (col.type === 'window' ? col : null);
      if (!windowCol) continue;

      const colName = col.type === 'alias' ? col.alias : this.colToString(col);
      const func = windowCol.func;
      const over = windowCol.over || {};

      // Partition the source rows
      const partitions = {};
      for (let ri = 0; ri < sourceRows.length; ri++) {
        const row = sourceRows[ri];
        let partKey = 'all';
        if (over.partitionBy && over.partitionBy.length > 0) {
          const ev = new ExprEvaluator(this.db, row, {});
          partKey = JSON.stringify(over.partitionBy.map(e => ev.eval(e)));
        }
        if (!partitions[partKey]) partitions[partKey] = [];
        partitions[partKey].push({ row, originalIndex: ri });
      }

      // For each partition, sort and apply window function
      for (const [pk, partEntries] of Object.entries(partitions)) {
        let sorted = partEntries;
        if (over.orderBy && over.orderBy.length > 0) {
          sorted = [...partEntries].sort((a, b) => {
            for (const { expr, dir } of over.orderBy) {
              const evA = new ExprEvaluator(this.db, a.row, {});
              const evB = new ExprEvaluator(this.db, b.row, {});
              const va = evA.eval(expr);
              const vb = evB.eval(expr);
              const cmp = va < vb ? -1 : va > vb ? 1 : 0;
              if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
            }
            return 0;
          });
        }

        const funcName = func.name?.toUpperCase() || func.type?.toUpperCase();
        for (let i = 0; i < sorted.length; i++) {
          const { originalIndex } = sorted[i];
          let val = null;

          switch (funcName) {
            case 'ROW_NUMBER': val = i + 1; break;
            case 'RANK': {
              // Find rank based on order
              let rank = 1;
              for (let j = 0; j < i; j++) {
                const ev1 = new ExprEvaluator(this.db, sorted[j].row, {});
                const ev2 = new ExprEvaluator(this.db, sorted[i].row, {});
                const v1 = over.orderBy ? over.orderBy.map(o => ev1.eval(o.expr)) : [];
                const v2 = over.orderBy ? over.orderBy.map(o => ev2.eval(o.expr)) : [];
                if (JSON.stringify(v1) !== JSON.stringify(v2)) rank = j + 2;
              }
              val = rank;
              break;
            }
            case 'DENSE_RANK': {
              const seen = new Set();
              let drank = 0;
              for (let j = 0; j <= i; j++) {
                const ev = new ExprEvaluator(this.db, sorted[j].row, {});
                const key = JSON.stringify(over.orderBy ? over.orderBy.map(o => ev.eval(o.expr)) : [j]);
                if (!seen.has(key)) { seen.add(key); drank++; }
              }
              val = drank;
              break;
            }
            case 'NTILE': {
              const n = func.args[0]?.value || 1;
              const bucketSize = Math.ceil(sorted.length / n);
              val = Math.floor(i / bucketSize) + 1;
              break;
            }
            case 'LEAD': {
              const offset = func.args[1]?.value || 1;
              const defVal = func.args[2] !== undefined ? func.args[2].value : null;
              const target = sorted[i + offset];
              if (target) {
                const ev = new ExprEvaluator(this.db, target.row, {});
                val = ev.eval(func.args[0]);
              } else val = defVal;
              break;
            }
            case 'LAG': {
              const offset = func.args[1]?.value || 1;
              const defVal = func.args[2] !== undefined ? func.args[2].value : null;
              const target = sorted[i - offset];
              if (target) {
                const ev = new ExprEvaluator(this.db, target.row, {});
                val = ev.eval(func.args[0]);
              } else val = defVal;
              break;
            }
            case 'FIRST_VALUE': {
              const ev = new ExprEvaluator(this.db, sorted[0].row, {});
              val = ev.eval(func.args[0]);
              break;
            }
            case 'LAST_VALUE': {
              const ev = new ExprEvaluator(this.db, sorted[sorted.length - 1].row, {});
              val = ev.eval(func.args[0]);
              break;
            }
            case 'SUM': {
              let sum = 0;
              for (let j = 0; j <= i; j++) {
                const ev = new ExprEvaluator(this.db, sorted[j].row, {});
                sum += ev.eval(func.args[0]) || 0;
              }
              val = sum;
              break;
            }
            default: {
              const ev = new ExprEvaluator(this.db, sorted[i].row, {});
              val = ev.evalFunction(func);
              break;
            }
          }

          if (resultRows[originalIndex]) resultRows[originalIndex][colName] = val;
        }
      }
    }
    return resultRows;
  }

  executeSetOp(ast) {
    const leftResult = this.executeStatement(ast.left);
    const rightResult = this.executeStatement(ast.right);
    let rows;

    if (ast.op === 'UNION ALL') {
      rows = [...leftResult.rows, ...rightResult.rows];
    } else if (ast.op === 'UNION') {
      const seen = new Set();
      rows = [...leftResult.rows, ...rightResult.rows].filter(r => {
        const key = JSON.stringify(Object.values(r));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else if (ast.op === 'INTERSECT') {
      const rightSet = new Set(rightResult.rows.map(r => JSON.stringify(Object.values(r))));
      rows = leftResult.rows.filter(r => rightSet.has(JSON.stringify(Object.values(r))));
    } else if (ast.op === 'EXCEPT') {
      const rightSet = new Set(rightResult.rows.map(r => JSON.stringify(Object.values(r))));
      rows = leftResult.rows.filter(r => !rightSet.has(JSON.stringify(Object.values(r))));
    }

    this.addStep({
      clause: ast.op,
      name: ast.op,
      desc: `Combining ${leftResult.rows.length} + ${rightResult.rows.length} rows with ${ast.op}`,
      rows: rows.map(r => ({...r})),
      highlight: 'select'
    });

    const columns = rows.length > 0 ? Object.keys(rows[0]).filter(k => !k.startsWith('_')) : [];
    return { rows, columns };
  }

  executeCTE(ast) {
    const cteContext = {};
    for (const cte of ast.ctes) {
      const engine = new SQLEngine(this.db);
      const result = engine.execute(cte.query);
      cteContext[cte.name.toLowerCase()] = result.rows;
      this.addStep({
        clause: 'CTE',
        name: `CTE: ${cte.name}`,
        desc: `Computing common table expression '${cte.name}'`,
        rows: result.rows.map(r => ({...r})),
        highlight: 'cte'
      });
    }
    const mainEngine = new SQLEngine(this.db);
    const result = mainEngine.executeSelect(ast.main, cteContext);
    this.steps.push(...mainEngine.steps);
    return result;
  }

  executeInsert(ast) {
    const beforeRows = [...this.db.getTable(ast.table).rows.map(r => ({...r}))];
    const inserted = [];
    for (const valueRow of ast.rows) {
      const ev = new ExprEvaluator(this.db, {}, {});
      const values = {};
      if (ast.columns) {
        ast.columns.forEach((col, i) => { values[col.toLowerCase()] = ev.eval(valueRow[i]); });
      } else {
        const table = this.db.getTable(ast.table);
        table.columns.forEach((col, i) => {
          if (!col.autoIncrement) values[col.name] = ev.eval(valueRow[i]);
        });
      }
      const row = this.db.insert(ast.table, values);
      inserted.push({...row});
    }
    this.addStep({
      clause: 'INSERT',
      name: `Insert into ${ast.table}`,
      desc: `Inserted ${inserted.length} row(s) into '${ast.table}'`,
      beforeRows,
      insertedRows: inserted,
      rows: this.db.getTable(ast.table).rows.map(r => ({...r})),
      tableName: ast.table,
      highlight: 'insert'
    });
    return { rows: inserted, columns: Object.keys(inserted[0] || {}).filter(k => !k.startsWith('_')), message: `${inserted.length} row(s) inserted.`, affectedRows: inserted.length };
  }

  executeInsertSelect(ast) {
    const selectResult = this.executeStatement(ast.select);
    const beforeRows = [...this.db.getTable(ast.table).rows.map(r => ({...r}))];
    const inserted = [];
    for (const srcRow of selectResult.rows) {
      const values = {};
      if (ast.columns) {
        ast.columns.forEach((col, i) => { values[col.toLowerCase()] = srcRow[selectResult.columns[i]]; });
      } else {
        for (const [k, v] of Object.entries(srcRow)) { if (!k.startsWith('_')) values[k] = v; }
      }
      const row = this.db.insert(ast.table, values);
      inserted.push({...row});
    }
    this.addStep({
      clause: 'INSERT',
      name: `Insert-Select into ${ast.table}`,
      desc: `Inserted ${inserted.length} row(s) from query into '${ast.table}'`,
      beforeRows,
      insertedRows: inserted,
      rows: this.db.getTable(ast.table).rows.map(r => ({...r})),
      tableName: ast.table,
      highlight: 'insert'
    });
    return { rows: inserted, columns: [], message: `${inserted.length} row(s) inserted.`, affectedRows: inserted.length };
  }

  executeUpdate(ast) {
    const table = this.db.getTable(ast.table);
    const beforeRows = table.rows.map(r => ({...r}));
    const predicate = ast.where
      ? (row) => { const ev = new ExprEvaluator(this.db, row, {}); return !!ev.eval(ast.where); }
      : null;
    const updates = {};
    const ev0 = new ExprEvaluator(this.db, {}, {});
    // We'll evaluate updates per row
    const affected = this.db.update(ast.table, {}, null); // dry run to get rows
    // Actually update properly
    const realAffected = [];
    for (const row of table.rows) {
      if (!predicate || predicate(row)) {
        const before = { ...row };
        const ev = new ExprEvaluator(this.db, row, {});
        for (const { col, val } of ast.sets) {
          row[col.toLowerCase()] = ev.eval(val);
        }
        realAffected.push({ before, after: { ...row } });
      }
    }
    this.addStep({
      clause: 'UPDATE',
      name: `Update ${ast.table}`,
      desc: `Updated ${realAffected.length} row(s) in '${ast.table}'`,
      beforeRows,
      afterRows: table.rows.map(r => ({...r})),
      updatedRows: realAffected,
      tableName: ast.table,
      highlight: 'update',
      rows: table.rows.map(r => ({...r}))
    });
    return { rows: table.rows, columns: table.columns.map(c => c.name), message: `${realAffected.length} row(s) updated.`, affectedRows: realAffected.length };
  }

  executeDelete(ast) {
    const table = this.db.getTable(ast.table);
    const beforeRows = table.rows.map(r => ({...r}));
    const predicate = ast.where
      ? (row) => { const ev = new ExprEvaluator(this.db, row, {}); return !!ev.eval(ast.where); }
      : null;
    const deleted = this.db.delete(ast.table, predicate);
    this.addStep({
      clause: 'DELETE',
      name: `Delete from ${ast.table}`,
      desc: `Deleted ${deleted.length} row(s) from '${ast.table}'`,
      beforeRows,
      deletedRows: deleted,
      rows: table.rows.map(r => ({...r})),
      tableName: ast.table,
      highlight: 'delete'
    });
    return { rows: table.rows, columns: table.columns.map(c => c.name), message: `${deleted.length} row(s) deleted.`, affectedRows: deleted.length };
  }

  executeCreateTable(ast) {
    if (ast.ifNotExists && this.db.tables[ast.name.toLowerCase()]) {
      return { rows: [], columns: [], message: `Table '${ast.name}' already exists (IF NOT EXISTS).` };
    }
    this.db.createTable(ast.name, ast.columns);
    this.addStep({
      clause: 'CREATE TABLE',
      name: `Create Table: ${ast.name}`,
      desc: `Created table '${ast.name}' with ${ast.columns.length} columns`,
      columns: ast.columns,
      tableName: ast.name,
      highlight: 'create',
      rows: []
    });
    return { rows: [], columns: [], message: `Table '${ast.name}' created.` };
  }

  executeCreateView(ast) {
    const engine = new SQLEngine(this.db);
    const result = engine.execute(ast.select);
    this.db.views[ast.name.toLowerCase()] = {
      name: ast.name.toLowerCase(),
      columns: result.columns.map(c => ({ name: c, type: 'TEXT' })),
      rows: result.rows
    };
    this.addStep({
      clause: 'CREATE VIEW',
      name: `Create View: ${ast.name}`,
      desc: `Created view '${ast.name}'`,
      rows: result.rows,
      highlight: 'create'
    });
    return { rows: [], columns: [], message: `View '${ast.name}' created.` };
  }

  executeCreateIndex(ast) {
    if (!this.db.indexes) this.db.indexes = {};
    this.db.indexes[ast.name] = { table: ast.table, columns: ast.columns };
    this.addStep({
      clause: 'CREATE INDEX',
      name: `Create Index: ${ast.name}`,
      desc: `Created index '${ast.name}' on ${ast.table}(${ast.columns.join(', ')})`,
      rows: [],
      highlight: 'create'
    });
    return { rows: [], columns: [], message: `Index '${ast.name}' created.` };
  }

  executeAlterTable(ast) {
    const table = this.db.getTable(ast.table);
    if (ast.action === 'ADD_COLUMN') {
      table.columns.push({ ...ast.column, name: ast.column.name.toLowerCase() });
      for (const row of table.rows) row[ast.column.name.toLowerCase()] = ast.column.defaultValue ?? null;
    } else if (ast.action === 'DROP_COLUMN') {
      table.columns = table.columns.filter(c => c.name !== ast.column.toLowerCase());
      for (const row of table.rows) delete row[ast.column.toLowerCase()];
    } else if (ast.action === 'RENAME_TABLE') {
      this.db.tables[ast.newName.toLowerCase()] = { ...table, name: ast.newName.toLowerCase() };
      delete this.db.tables[ast.table.toLowerCase()];
    } else if (ast.action === 'RENAME_COLUMN') {
      const col = table.columns.find(c => c.name === ast.oldCol.toLowerCase());
      if (col) col.name = ast.newCol.toLowerCase();
      for (const row of table.rows) {
        row[ast.newCol.toLowerCase()] = row[ast.oldCol.toLowerCase()];
        delete row[ast.oldCol.toLowerCase()];
      }
    }
    this.addStep({
      clause: 'ALTER TABLE',
      name: `Alter Table: ${ast.table}`,
      desc: `${ast.action.replace('_', ' ')} on '${ast.table}'`,
      rows: table.rows.map(r => ({...r})),
      highlight: 'create'
    });
    return { rows: [], columns: [], message: `Table '${ast.table}' altered.` };
  }

  executeDropTable(ast) {
    if (ast.ifExists && !this.db.tables[ast.name.toLowerCase()]) {
      return { rows: [], columns: [], message: `Table '${ast.name}' does not exist (IF EXISTS).` };
    }
    this.db.dropTable(ast.name);
    this.addStep({
      clause: 'DROP TABLE',
      name: `Drop Table: ${ast.name}`,
      desc: `Dropped table '${ast.name}'`,
      rows: [],
      highlight: 'delete'
    });
    return { rows: [], columns: [], message: `Table '${ast.name}' dropped.` };
  }

  hasAggregate(expr) {
    if (!expr || typeof expr !== 'object') return false;
    if (expr.type === 'function' && ['COUNT','SUM','AVG','MIN','MAX'].includes(expr.name?.toUpperCase())) return true;
    if (expr.type === 'alias') return this.hasAggregate(expr.expr);
    if (expr.type === 'binary') return this.hasAggregate(expr.left) || this.hasAggregate(expr.right);
    if (expr.type === 'function') return expr.args?.some(a => this.hasAggregate(a));
    return false;
  }

  hasWindowFunc(expr) {
    if (!expr || typeof expr !== 'object') return false;
    if (expr.type === 'window') return true;
    if (expr.type === 'alias') return this.hasWindowFunc(expr.expr);
    return false;
  }

  exprToString(expr) {
    if (!expr) return '';
    if (typeof expr !== 'object') return String(expr);
    switch (expr.type) {
      case 'column': return expr.table ? `${expr.table}.${expr.name}` : expr.name;
      case 'number': return String(expr.value);
      case 'string': return `'${expr.value}'`;
      case 'null': return 'NULL';
      case 'boolean': return expr.value ? 'TRUE' : 'FALSE';
      case 'star': return '*';
      case 'alias': return `${this.exprToString(expr.expr)} AS ${expr.alias}`;
      case 'binary': return `${this.exprToString(expr.left)} ${expr.op} ${this.exprToString(expr.right)}`;
      case 'unary': return `${expr.op} ${this.exprToString(expr.expr)}`;
      case 'function': return `${expr.name}(${expr.args.map(a => this.exprToString(a)).join(', ')})`;
      case 'is_null': return `${this.exprToString(expr.expr)} IS ${expr.not ? 'NOT ' : ''}NULL`;
      case 'like': return `${this.exprToString(expr.expr)} ${expr.not ? 'NOT ' : ''}LIKE ${this.exprToString(expr.pattern)}`;
      case 'between': return `${this.exprToString(expr.expr)} ${expr.not ? 'NOT ' : ''}BETWEEN ${this.exprToString(expr.low)} AND ${this.exprToString(expr.high)}`;
      case 'in': return `${this.exprToString(expr.expr)} ${expr.not ? 'NOT ' : ''}IN (...)`;
      default: return JSON.stringify(expr);
    }
  }

  colToString(col) {
    if (!col) return '';
    if (col.type === 'alias') return col.alias;
    if (col.type === 'star') return col.table ? `${col.table}.*` : '*';
    if (col.type === 'column') return col.table ? `${col.table}.${col.name}` : col.name;
    if (col.type === 'function') return `${col.name}(${col.args.map(a => this.exprToString(a)).join(', ')})`;
    return this.exprToString(col);
  }
}

// ─────────────────────────────────────────────
// QUERY EXPLAINER
// ─────────────────────────────────────────────
class QueryExplainer {
  explain(ast) {
    if (!ast) return [];
    const parts = [];
    this.explainNode(ast, parts);
    return parts;
  }

  explainNode(ast, parts) {
    switch (ast.type) {
      case 'SELECT': {
        const order = ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'];
        parts.push({ type: 'execution_order', title: 'SQL Execution Order', steps: order });
        if (ast.from) parts.push({ type: 'clause', keyword: 'FROM', desc: `Reads data from the "${ast.from.name || 'subquery'}" table` });
        if (ast.joins?.length) {
          for (const j of ast.joins) {
            const desc = {
              'INNER JOIN': 'Returns only rows where both tables have a match',
              'LEFT JOIN': 'Returns all rows from the left table, and matched rows from the right',
              'RIGHT JOIN': 'Returns all rows from the right table, and matched rows from the left',
              'FULL OUTER JOIN': 'Returns all rows from both tables, with NULLs where there is no match',
              'CROSS JOIN': 'Returns every combination of rows from both tables'
            }[j.joinType] || j.joinType;
            parts.push({ type: 'clause', keyword: j.joinType, desc: `${desc} (on ${j.table.name || 'subquery'})` });
          }
        }
        if (ast.where) parts.push({ type: 'clause', keyword: 'WHERE', desc: `Filters rows where the condition is true` });
        if (ast.groupBy?.length) parts.push({ type: 'clause', keyword: 'GROUP BY', desc: `Groups rows that have the same values in the specified columns` });
        if (ast.having) parts.push({ type: 'clause', keyword: 'HAVING', desc: `Filters groups (like WHERE, but for aggregated results)` });
        if (ast.distinct) parts.push({ type: 'clause', keyword: 'DISTINCT', desc: `Removes duplicate rows from the result` });
        if (ast.orderBy?.length) parts.push({ type: 'clause', keyword: 'ORDER BY', desc: `Sorts the result by the specified column(s)` });
        if (ast.limit !== null && ast.limit !== undefined) parts.push({ type: 'clause', keyword: 'LIMIT', desc: `Returns only the first N rows` });
        parts.push({ type: 'clause', keyword: 'SELECT', desc: `Projects (chooses) the columns to show in the final result` });
        break;
      }
      case 'INSERT':
        parts.push({ type: 'clause', keyword: 'INSERT INTO', desc: `Adds new row(s) into the "${ast.table}" table` });
        parts.push({ type: 'clause', keyword: 'VALUES', desc: `Specifies the data values for each inserted row` });
        break;
      case 'UPDATE':
        parts.push({ type: 'clause', keyword: 'UPDATE', desc: `Modifies existing rows in the "${ast.table}" table` });
        parts.push({ type: 'clause', keyword: 'SET', desc: `Specifies which columns to change and their new values` });
        if (ast.where) parts.push({ type: 'clause', keyword: 'WHERE', desc: `Only rows matching this condition are updated` });
        break;
      case 'DELETE':
        parts.push({ type: 'clause', keyword: 'DELETE FROM', desc: `Removes rows from the "${ast.table}" table` });
        if (ast.where) parts.push({ type: 'clause', keyword: 'WHERE', desc: `Only rows matching this condition are deleted` });
        else parts.push({ type: 'warning', text: '⚠️ No WHERE clause — all rows will be deleted!' });
        break;
      case 'CREATE_TABLE':
        parts.push({ type: 'clause', keyword: 'CREATE TABLE', desc: `Creates a new table named "${ast.name}" with ${ast.columns.length} columns` });
        for (const col of ast.columns) {
          parts.push({ type: 'column_def', name: col.name, colType: col.type, flags: [col.primaryKey && 'PK', col.notNull && 'NOT NULL', col.unique && 'UNIQUE', col.autoIncrement && 'AUTO_INCREMENT'].filter(Boolean) });
        }
        break;
      case 'CTE':
        parts.push({ type: 'clause', keyword: 'WITH (CTE)', desc: `Defines ${ast.ctes.length} common table expression(s) for use in the main query` });
        for (const cte of ast.ctes) parts.push({ type: 'clause', keyword: cte.name, desc: `A named temporary result set` });
        this.explainNode(ast.main, parts);
        break;
      case 'SET_OP':
        this.explainNode(ast.left, parts);
        parts.push({ type: 'clause', keyword: ast.op, desc: `Combines results of two queries` });
        this.explainNode(ast.right, parts);
        break;
    }
  }

  generatePlan(ast) {
    const nodes = [];
    this.buildPlan(ast, nodes, 0);
    return nodes;
  }

  buildPlan(ast, nodes, depth) {
    if (!ast) return;
    switch (ast.type) {
      case 'SELECT': {
        if (ast.limit) nodes.push({ depth, icon: '⚡', type: 'LIMIT', detail: `First ${ast.limit?.value ?? ast.limit} rows`, cost: 'O(1)' });
        if (ast.orderBy?.length) nodes.push({ depth, icon: '↕', type: 'SORT', detail: ast.orderBy.map(o => o.expr?.name || '?').join(', '), cost: 'O(n log n)' });
        if (ast.distinct) nodes.push({ depth, icon: '◈', type: 'DISTINCT', detail: 'Hash deduplication', cost: 'O(n)' });
        if (ast.having) nodes.push({ depth, icon: '▽', type: 'FILTER (HAVING)', detail: 'Post-aggregation filter', cost: 'O(g)' });
        if (ast.groupBy?.length) nodes.push({ depth, icon: '⊕', type: 'HASH AGGREGATE', detail: `Group by ${ast.groupBy.map(e => e.name || '?').join(', ')}`, cost: 'O(n)' });
        for (const join of (ast.joins || []).reverse()) {
          nodes.push({ depth, icon: '⋈', type: join.joinType, detail: join.table.name || 'subquery', cost: 'O(n·m)' });
        }
        if (ast.where) nodes.push({ depth, icon: '▽', type: 'FILTER (WHERE)', detail: 'Row filter', cost: 'O(n)' });
        if (ast.from) nodes.push({ depth, icon: '📋', type: 'TABLE SCAN', detail: ast.from.name || 'subquery', cost: 'O(n)' });
        else nodes.push({ depth, icon: '📋', type: 'EXPRESSION', detail: 'No table source', cost: 'O(1)' });
        break;
      }
      case 'INSERT':
        nodes.push({ depth, icon: '➕', type: 'INSERT', detail: ast.table, cost: `O(${ast.rows.length})` });
        break;
      case 'UPDATE':
        nodes.push({ depth, icon: '✏️', type: 'UPDATE', detail: ast.table, cost: 'O(n)' });
        if (ast.where) nodes.push({ depth: depth + 1, icon: '▽', type: 'FILTER', detail: 'WHERE condition', cost: 'O(n)' });
        break;
      case 'DELETE':
        nodes.push({ depth, icon: '🗑', type: 'DELETE', detail: ast.table, cost: 'O(n)' });
        if (ast.where) nodes.push({ depth: depth + 1, icon: '▽', type: 'FILTER', detail: 'WHERE condition', cost: 'O(n)' });
        break;
      case 'CREATE_TABLE':
        nodes.push({ depth, icon: '🏗', type: 'CREATE TABLE', detail: ast.name, cost: 'O(1)' });
        break;
    }
  }
}

// Export for app.js
window.SQLTokenizer = SQLTokenizer;
window.SQLParser = SQLParser;
window.SQLEngine = SQLEngine;
window.InMemoryDB = InMemoryDB;
window.QueryExplainer = QueryExplainer;
window.ExprEvaluator = ExprEvaluator;
