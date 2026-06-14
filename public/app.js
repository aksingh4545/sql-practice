/**
 * SQLVis — Main Application
 * Handles UI, animations, gamification, editor, and all user interactions
 */

'use strict';

// ─────────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────────
const State = {
  db: new InMemoryDB(),
  currentSteps: [],
  currentStep: 0,
  isPlaying: false,
  playInterval: null,
  xp: 0,
  level: 1,
  achievements: new Set(),
  queriesRun: 0,
  queryHistory: [],
  dialect: 'sqlite',
  bottomCollapsed: false,
  completedChallenges: new Set(),
  activeChallenge: null
};

// ─────────────────────────────────────────────
// SAMPLE DATABASE
// ─────────────────────────────────────────────
function initSampleDB() {
  const db = State.db;

  // Departments
  db.createTable('departments', [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'budget', type: 'REAL' },
    { name: 'location', type: 'TEXT' }
  ]);

  // Employees
  db.createTable('employees', [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'department', type: 'TEXT' },
    { name: 'department_id', type: 'INTEGER', foreignKey: { table: 'departments', column: 'id' } },
    { name: 'salary', type: 'REAL' },
    { name: 'hire_date', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'manager_id', type: 'INTEGER' }
  ]);

  // Products
  db.createTable('products', [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'category', type: 'TEXT' },
    { name: 'price', type: 'REAL' },
    { name: 'stock', type: 'INTEGER' },
    { name: 'supplier_id', type: 'INTEGER' }
  ]);

  // Orders
  db.createTable('orders', [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'customer_name', type: 'TEXT' },
    { name: 'product_id', type: 'INTEGER', foreignKey: { table: 'products', column: 'id' } },
    { name: 'quantity', type: 'INTEGER' },
    { name: 'total_price', type: 'REAL' },
    { name: 'order_date', type: 'TEXT' },
    { name: 'status', type: 'TEXT' }
  ]);

  // Students
  db.createTable('students', [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'name', type: 'TEXT' },
    { name: 'grade', type: 'TEXT' },
    { name: 'score', type: 'REAL' },
    { name: 'subject', type: 'TEXT' }
  ]);

  // Insert departments
  const depts = [
    { name: 'Engineering', budget: 1200000, location: 'San Francisco' },
    { name: 'Marketing', budget: 600000, location: 'New York' },
    { name: 'Sales', budget: 800000, location: 'Chicago' },
    { name: 'HR', budget: 300000, location: 'Austin' },
    { name: 'Finance', budget: 500000, location: 'Boston' }
  ];
  depts.forEach(d => db.insert('departments', d));

  // Insert employees
  const emps = [
    { name: 'Alice Johnson', department: 'Engineering', department_id: 1, salary: 120000, hire_date: '2021-03-15', email: 'alice@company.com', manager_id: null },
    { name: 'Bob Smith', department: 'Engineering', department_id: 1, salary: 95000, hire_date: '2020-07-22', email: 'bob@company.com', manager_id: 1 },
    { name: 'Carol White', department: 'Marketing', department_id: 2, salary: 75000, hire_date: '2022-01-10', email: 'carol@company.com', manager_id: null },
    { name: 'David Lee', department: 'Sales', department_id: 3, salary: 85000, hire_date: '2019-11-05', email: 'david@company.com', manager_id: null },
    { name: 'Eve Martinez', department: 'Engineering', department_id: 1, salary: 110000, hire_date: '2021-08-30', email: 'eve@company.com', manager_id: 1 },
    { name: 'Frank Brown', department: 'HR', department_id: 4, salary: 65000, hire_date: '2023-02-14', email: 'frank@company.com', manager_id: null },
    { name: 'Grace Davis', department: 'Marketing', department_id: 2, salary: 80000, hire_date: '2022-06-18', email: 'grace@company.com', manager_id: 3 },
    { name: 'Henry Wilson', department: 'Finance', department_id: 5, salary: 90000, hire_date: '2020-09-01', email: 'henry@company.com', manager_id: null },
    { name: 'Iris Taylor', department: 'Sales', department_id: 3, salary: 72000, hire_date: '2023-04-25', email: 'iris@company.com', manager_id: 4 },
    { name: 'Jack Anderson', department: 'Engineering', department_id: 1, salary: 105000, hire_date: '2021-12-07', email: 'jack@company.com', manager_id: 1 }
  ];
  emps.forEach(e => db.insert('employees', e));

  // Insert products
  const prods = [
    { name: 'Laptop Pro', category: 'Electronics', price: 1299.99, stock: 45, supplier_id: 1 },
    { name: 'Wireless Mouse', category: 'Electronics', price: 49.99, stock: 200, supplier_id: 1 },
    { name: 'Standing Desk', category: 'Furniture', price: 599.99, stock: 30, supplier_id: 2 },
    { name: 'Monitor 4K', category: 'Electronics', price: 799.99, stock: 60, supplier_id: 1 },
    { name: 'Office Chair', category: 'Furniture', price: 449.99, stock: 25, supplier_id: 2 },
    { name: 'Keyboard', category: 'Electronics', price: 129.99, stock: 150, supplier_id: 3 },
    { name: 'Webcam HD', category: 'Electronics', price: 89.99, stock: 80, supplier_id: 3 },
    { name: 'Desk Lamp', category: 'Furniture', price: 79.99, stock: 100, supplier_id: 2 }
  ];
  prods.forEach(p => db.insert('products', p));

  // Insert orders
  const orders = [
    { customer_name: 'Tech Corp', product_id: 1, quantity: 5, total_price: 6499.95, order_date: '2024-01-15', status: 'delivered' },
    { customer_name: 'StartUp Inc', product_id: 2, quantity: 20, total_price: 999.80, order_date: '2024-01-20', status: 'delivered' },
    { customer_name: 'Global LLC', product_id: 3, quantity: 8, total_price: 4799.92, order_date: '2024-02-01', status: 'pending' },
    { customer_name: 'Tech Corp', product_id: 4, quantity: 3, total_price: 2399.97, order_date: '2024-02-10', status: 'shipped' },
    { customer_name: 'DataSys', product_id: 1, quantity: 10, total_price: 12999.90, order_date: '2024-02-15', status: 'delivered' },
    { customer_name: 'StartUp Inc', product_id: 6, quantity: 15, total_price: 1949.85, order_date: '2024-03-01', status: 'pending' },
    { customer_name: 'Global LLC', product_id: 5, quantity: 4, total_price: 1799.96, order_date: '2024-03-10', status: 'delivered' }
  ];
  orders.forEach(o => db.insert('orders', o));

  // Insert students
  const students = [
    { name: 'Alice', grade: 'A', score: 95, subject: 'Math' },
    { name: 'Bob', grade: 'B', score: 82, subject: 'Math' },
    { name: 'Carol', grade: 'A', score: 91, subject: 'Science' },
    { name: 'David', grade: 'C', score: 73, subject: 'Math' },
    { name: 'Eve', grade: 'A', score: 98, subject: 'Science' },
    { name: 'Frank', grade: 'B', score: 85, subject: 'English' },
    { name: 'Grace', grade: 'A', score: 93, subject: 'English' }
  ];
  students.forEach(s => db.insert('students', s));
}

// ─────────────────────────────────────────────
// SQL SYNTAX HIGHLIGHTER
// ─────────────────────────────────────────────
const KEYWORDS = ['SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','ORDER','BY','GROUP','HAVING',
  'LIMIT','OFFSET','DISTINCT','JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','ON','USING',
  'INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','ADD','COLUMN',
  'RENAME','TO','VIEW','AS','WITH','RECURSIVE','UNION','ALL','INTERSECT','EXCEPT','OVER','PARTITION',
  'ROWS','RANGE','BETWEEN','UNBOUNDED','PRECEDING','FOLLOWING','CURRENT','ROW','CASE','WHEN','THEN',
  'ELSE','END','TRUE','FALSE','LIKE','EXISTS','ANY','SOME','PRIMARY','KEY','FOREIGN','REFERENCES',
  'UNIQUE','CHECK','DEFAULT','CONSTRAINT','INDEX','IF','NOT','AUTO_INCREMENT','AUTOINCREMENT',
  'INTEGER','INT','TEXT','VARCHAR','CHAR','REAL','FLOAT','DOUBLE','BOOLEAN','BOOL','DATE','DATETIME',
  'TIMESTAMP','BLOB','NUMERIC','SERIAL','BIGINT','SMALLINT','ASC','DESC','NATURAL'];
const FUNCTIONS = ['COUNT','SUM','AVG','MIN','MAX','ROW_NUMBER','RANK','DENSE_RANK','NTILE','LEAD','LAG',
  'FIRST_VALUE','LAST_VALUE','COALESCE','IFNULL','NULLIF','CAST','LENGTH','UPPER','LOWER','TRIM',
  'SUBSTR','SUBSTRING','REPLACE','CONCAT','ABS','ROUND','FLOOR','CEIL','CEILING','MOD','POWER',
  'SQRT','NOW','IIF','IF','NVL','STRFTIME'];

function highlightSQL(sql) {
  if (!sql) return '';
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      let end = sql.indexOf('\n', i);
      if (end === -1) end = sql.length;
      tokens.push(`<span class="comment-val">${esc(sql.slice(i, end))}</span>`);
      i = end; continue;
    }
    if (sql[i] === "'" || sql[i] === '"') {
      const q = sql[i]; let end = i + 1;
      while (end < sql.length && sql[end] !== q) { if (sql[end] === '\\') end++; end++; }
      end++;
      tokens.push(`<span class="string-val">${esc(sql.slice(i, end))}</span>`);
      i = end; continue;
    }
    if (/[0-9]/.test(sql[i])) {
      let end = i;
      while (end < sql.length && /[0-9.]/.test(sql[end])) end++;
      tokens.push(`<span class="number-val">${esc(sql.slice(i, end))}</span>`);
      i = end; continue;
    }
    if (/[a-zA-Z_$]/.test(sql[i])) {
      let end = i;
      while (end < sql.length && /[a-zA-Z0-9_$]/.test(sql[end])) end++;
      const word = sql.slice(i, end);
      const upper = word.toUpperCase();
      if (KEYWORDS.includes(upper)) tokens.push(`<span class="keyword">${esc(word)}</span>`);
      else if (FUNCTIONS.includes(upper)) tokens.push(`<span class="fn-val">${esc(word)}</span>`);
      else tokens.push(`<span class="table-name">${esc(word)}</span>`);
      i = end; continue;
    }
    tokens.push(esc(sql[i]));
    i++;
  }
  return tokens.join('');
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─────────────────────────────────────────────
// EDITOR SETUP
// ─────────────────────────────────────────────
const editor = document.getElementById('sql-editor');
const gutter = document.getElementById('editor-gutter');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
let autocompleteSelectedIndex = -1;
let autocompleteItems = [];

function updateGutter() {
  const gutterEl = gutter || document.getElementById('editor-gutter');
  if (!gutterEl) return;
  const lines = editor.value.split('\n');
  const cursorPos = editor.selectionStart;
  let curLine = editor.value.substr(0, cursorPos).split('\n').length;
  gutterEl.innerHTML = lines.map((_, i) =>
    `<div class="gutter-line${i + 1 === curLine ? ' active' : ''}">${i + 1}</div>`
  ).join('');

  const cursorLine = editor.value.substr(0, editor.selectionStart).split('\n');
  const col = cursorLine[cursorLine.length - 1].length + 1;
  const posEl = document.getElementById('cursor-pos');
  if (posEl) posEl.textContent = `Ln ${curLine}, Col ${col}`;
}

function getAutocompleteItems(text, cursorPos) {
  const before = text.substr(0, cursorPos);
  const match = before.match(/([a-zA-Z_]\w*)$/);
  if (!match || match[1].length < 1) return [];
  const prefix = match[1].toUpperCase();
  const items = [];

  // Keywords
  KEYWORDS.filter(k => k.startsWith(prefix)).slice(0, 5).forEach(k =>
    items.push({ label: k, type: 'keyword', tag: 'KW' }));

  // Functions
  FUNCTIONS.filter(f => f.startsWith(prefix)).slice(0, 4).forEach(f =>
    items.push({ label: f + '()', type: 'func', tag: 'FN' }));

  // Tables
  Object.keys(State.db.tables).filter(t => t.toUpperCase().startsWith(prefix)).forEach(t =>
    items.push({ label: t, type: 'table', tag: 'TBL' }));

  // Columns (from all tables)
  for (const table of Object.values(State.db.tables)) {
    table.columns.filter(c => c.name.toUpperCase().startsWith(prefix)).forEach(c =>
      items.push({ label: c.name, type: 'column', tag: 'COL', detail: table.name + '.' + c.name }));
  }

  return items.slice(0, 10);
}

function showAutocomplete(items, query, cursorPos) {
  if (items.length === 0) { autocompleteDropdown.style.display = 'none'; return; }
  autocompleteItems = items;
  autocompleteSelectedIndex = -1;

  autocompleteDropdown.innerHTML = items.map((item, i) => `
    <div class="autocomplete-item" data-index="${i}">
      <span class="autocomplete-tag tag-${item.type}">${item.tag}</span>
      <span>${esc(item.label)}</span>
      ${item.detail ? `<span style="color:var(--text-muted);font-size:10px;margin-left:auto">${esc(item.detail)}</span>` : ''}
    </div>
  `).join('');

  // Position
  const coords = getCaretCoordinates(editor, cursorPos);
  const rect = editor.getBoundingClientRect();
  const editorRect = document.getElementById('editor-container').getBoundingClientRect();
  autocompleteDropdown.style.display = 'block';
  autocompleteDropdown.style.left = `${coords.left + 44}px`;
  autocompleteDropdown.style.top = `${coords.top + 20}px`;

  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.addEventListener('click', () => applyAutocomplete(i));
  });
}

function getCaretCoordinates(el, pos) {
  const div = document.createElement('div');
  const style = getComputedStyle(el);
  ['fontFamily','fontSize','lineHeight','padding','border','whiteSpace','wordWrap','overflowWrap','width'].forEach(p => div.style[p] = style[p]);
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.top = '0'; div.style.left = '0';
  document.body.appendChild(div);
  const text = el.value.substr(0, pos).replace(/\n$/, '\n\u200b');
  div.textContent = text;
  const span = document.createElement('span');
  span.textContent = el.value.substr(pos) || '.';
  div.appendChild(span);
  const { offsetTop, offsetLeft } = span;
  document.body.removeChild(div);
  return { top: offsetTop - el.scrollTop, left: offsetLeft - el.scrollLeft };
}

function applyAutocomplete(index) {
  const item = autocompleteItems[index];
  if (!item) return;
  const text = editor.value;
  const pos = editor.selectionStart;
  const before = text.substr(0, pos);
  const match = before.match(/([a-zA-Z_]\w*)$/);
  if (!match) return;
  const start = pos - match[1].length;
  const label = item.label;
  editor.value = text.substr(0, start) + label + text.substr(pos);
  editor.selectionStart = editor.selectionEnd = start + label.length;
  autocompleteDropdown.style.display = 'none';
  editor.focus();
  updateGutter();
}

editor.addEventListener('input', () => {
  updateGutter();
  const items = getAutocompleteItems(editor.value, editor.selectionStart);
  showAutocomplete(items, editor.value, editor.selectionStart);
  autoRunIfEnabled();
});

editor.addEventListener('keydown', (e) => {
  if (autocompleteDropdown.style.display !== 'none') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, autocompleteItems.length - 1);
      updateAutocompleteSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, -1);
      updateAutocompleteSelection();
    } else if (e.key === 'Enter' && autocompleteSelectedIndex >= 0) {
      e.preventDefault();
      applyAutocomplete(autocompleteSelectedIndex);
    } else if (e.key === 'Escape') {
      autocompleteDropdown.style.display = 'none';
    }
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substr(0, start) + '  ' + editor.value.substr(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    updateGutter();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runQuery();
  }
});

function updateAutocompleteSelection() {
  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.classList.toggle('selected', i === autocompleteSelectedIndex);
  });
}

editor.addEventListener('click', updateGutter);
editor.addEventListener('keyup', updateGutter);
editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });
document.addEventListener('click', (e) => {
  if (!autocompleteDropdown.contains(e.target) && e.target !== editor) {
    autocompleteDropdown.style.display = 'none';
  }
});

let autoRunTimer = null;
function autoRunIfEnabled() {
  clearTimeout(autoRunTimer);
  autoRunTimer = setTimeout(() => {
    const sql = editor.value.trim();
    if (sql.length > 10) {
      try { new SQLParser(sql).parse(); runQuery(); } catch(e) { /* ignore parse errors during typing */ }
    }
  }, 1200);
}

// ─────────────────────────────────────────────
// QUERY RUNNER
// ─────────────────────────────────────────────
function runQuery() {
  clearTimeout(autoRunTimer);
  const sql = editor.value.trim();
  if (!sql) return;
  const timer = document.getElementById('query-timer');
  if (timer) {
    timer.textContent = '⟳ Running...';
    timer.className = 'running';
  }

  const start = performance.now();

  try {
    const ast = new SQLParser(sql).parse();
    const engine = new SQLEngine(State.db);
    const result = engine.execute(ast);
    const elapsed = (performance.now() - start).toFixed(2);

    State.currentSteps = result.steps || [];
    State.currentStep = 0;
    State.queriesRun++;

    // Update metrics
    const metricTime = document.getElementById('metric-time');
    const metricRows = document.getElementById('metric-rows');
    const metricOps = document.getElementById('metric-ops');
    const metricCost = document.getElementById('metric-cost');
    const metricIndex = document.getElementById('metric-index');

    if (metricTime) metricTime.textContent = elapsed + 'ms';
    if (metricRows) metricRows.textContent = (result.affectedRows ?? result.rows?.length ?? 0).toString();
    if (metricOps) metricOps.textContent = State.currentSteps.length.toString();
    if (metricCost) metricCost.textContent = estimateCost(ast);
    if (metricIndex) metricIndex.textContent = detectIndex(ast, State.db);

    if (timer) {
      timer.textContent = `✓ ${elapsed}ms`;
      timer.className = '';
    }

    // Show visualization
    displayVisualization(State.currentSteps, result);

    // Show results
    displayResults(result);

    // Explain
    const explainer = new QueryExplainer();
    displayExplanation(explainer.explain(ast));

    // Execution plan
    displayPlan(explainer.generatePlan(ast));

    // History
    addToHistory(sql, elapsed, result);

    // Refresh schema view
    renderSchema();

    // Gamification
    handleXP(sql, ast, result);

    // Check challenge
    checkChallengeAnswer(sql, result);

  } catch (err) {
    if (timer) {
      timer.textContent = '✗ Error';
      timer.className = 'error';
    }
    displayError(err.message);
  }
}

function estimateCost(ast) {
  if (!ast) return '—';
  const tables = Object.values(State.db.tables);
  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);
  if (ast.type === 'SELECT') {
    let cost = totalRows;
    if (ast.orderBy?.length) cost *= Math.log2(totalRows + 1);
    if (ast.groupBy?.length) cost *= 1.5;
    if (ast.joins?.length) cost *= totalRows;
    return cost.toFixed(0);
  }
  return totalRows.toString();
}

function detectIndex(ast, db) {
  if (!ast || ast.type !== 'SELECT') return 'None';
  if (ast.where) {
    const expr = ast.where;
    if (expr.type === 'binary' && expr.left?.type === 'column') {
      const col = expr.left.name;
      const tableName = ast.from?.name;
      if (tableName) {
        const table = db.tables[tableName?.toLowerCase()];
        if (table) {
          const pk = table.columns.find(c => c.primaryKey && c.name === col);
          if (pk) return 'PK Index ⚡';
        }
      }
    }
    return 'Sequential Scan';
  }
  return 'Full Scan';
}

// ─────────────────────────────────────────────
// VISUALIZATION
// ─────────────────────────────────────────────
function displayVisualization(steps, result) {
  const welcome = document.getElementById('viz-welcome');
  const vizSteps = document.getElementById('viz-steps');
  const execFlow = document.getElementById('execution-flow');
  const scrubber = document.getElementById('timeline-scrubber');
  const counter = document.getElementById('step-counter');

  if (welcome) welcome.style.display = 'none';
  if (vizSteps) vizSteps.style.display = 'block';
  if (execFlow) execFlow.style.display = 'block';

  if (vizSteps) {
    if (steps.length === 0) {
      vizSteps.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:12px">No visualization steps for this query.</div>';
      return;
    }
    // Render all steps
    vizSteps.innerHTML = steps.map((step, i) => renderStep(step, i)).join('');
  }

  // Execution flow
  renderExecutionFlow(steps);

  // Timeline
  if (steps.length > 1) {
    if (scrubber) scrubber.style.display = 'block';
    renderTimeline(steps);
  } else {
    if (scrubber) scrubber.style.display = 'none';
  }

  if (counter) counter.textContent = `Step ${steps.length}/${steps.length}`;
  State.currentStep = steps.length - 1;

  if (vizSteps) {
    // Animate steps sequentially with stagger
    const stepEls = vizSteps.querySelectorAll('.viz-step');
    stepEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => {
        el.style.transition = 'all 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 120);
    });

    // Scroll to last step
    setTimeout(() => {
      const lastStep = vizSteps.lastElementChild;
      if (lastStep) lastStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, steps.length * 120 + 100);
  }
}

function renderStep(step, index) {
  const themeMap = {
    'FROM': 'from', 'WHERE': 'where', 'GROUP BY': 'group', 'HAVING': 'having',
    'ORDER BY': 'order', 'LIMIT': 'limit', 'SELECT': 'select', 'DISTINCT': 'select',
    'INSERT': 'insert', 'UPDATE': 'update', 'DELETE': 'delete',
    'CREATE TABLE': 'create', 'CREATE_TABLE': 'create', 'ALTER TABLE': 'create',
    'DROP TABLE': 'delete', 'CTE': 'cte', 'WINDOW': 'window',
    'INNER JOIN': 'join', 'LEFT JOIN': 'join', 'RIGHT JOIN': 'join',
    'FULL OUTER JOIN': 'join', 'CROSS JOIN': 'join', 'NATURAL JOIN': 'join',
    'UNION': 'select', 'UNION ALL': 'select', 'INTERSECT': 'select', 'EXCEPT': 'select'
  };
  const theme = themeMap[step.clause] || 'select';

  let bodyHTML = `<div class="step-desc">${esc(step.desc || '')}</div>`;

  // Render based on step type
  if (step.highlight === 'join') {
    bodyHTML += renderJoinStep(step);
  } else if (step.highlight === 'group' && step.groups) {
    bodyHTML += renderGroupStep(step);
  } else if (step.highlight === 'insert') {
    bodyHTML += renderInsertStep(step);
  } else if (step.highlight === 'update') {
    bodyHTML += renderUpdateStep(step);
  } else if (step.highlight === 'delete') {
    bodyHTML += renderDeleteStep(step);
  } else if (step.highlight === 'create' && step.columns) {
    bodyHTML += renderCreateStep(step);
  } else if (step.rows && step.rows.length > 0) {
    bodyHTML += renderDataTable(step.rows, step.highlight, step);
  } else if (step.rows && step.rows.length === 0) {
    bodyHTML += `<div style="color:var(--text-muted);font-size:12px;padding:8px">No rows</div>`;
  }

  return `
    <div class="viz-step step-theme-${theme}${step.isFinal ? ' active' : ''}" data-step="${index}">
      <div class="step-header">
        <div class="step-number">${index + 1}</div>
        <div class="step-name">${esc(step.name || step.clause)}</div>
        <div class="step-clause">${esc(step.clause)}</div>
      </div>
      <div class="step-body">${bodyHTML}</div>
    </div>
  `;
}

function renderDataTable(rows, highlight, step) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]).filter(k => !k.startsWith('_') && !k.includes('.'));
  if (cols.length === 0) {
    // Try with dot notation
    const allKeys = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
    if (allKeys.length === 0) return '';
  }

  const displayCols = cols.length > 0 ? cols : Object.keys(rows[0]).filter(k => !k.startsWith('_'));
  const displayRows = rows.slice(0, 50); // Show max 50 rows

  const getRowClass = (row, i) => {
    if (highlight === 'where') {
      if (step.filteredRows && step.filteredRows.some(r => r._id === row._id)) return 'row-highlight-where';
      if (step.rejectedRows && step.rejectedRows.some(r => r._id === row._id)) return 'row-highlight-filtered';
    }
    if (highlight === 'select' || highlight === 'order' || highlight === 'limit') return 'row-highlight-result';
    if (highlight === 'from') return 'row-highlight-select';
    return '';
  };

  return `
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr>${displayCols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${displayRows.map((row, i) => `
            <tr class="${getRowClass(row, i)}">
              ${displayCols.map(c => `<td>${formatValue(row[c])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${rows.length > 50 ? `<div style="padding:8px;color:var(--text-muted);font-size:11px">... and ${rows.length - 50} more rows</div>` : ''}
    </div>
  `;
}

function buildVennSVG(joinType) {
  const jt = (joinType || '').toUpperCase();

  // Region fill configs: left-only, intersection, right-only
  // Each: [leftOnlyFill, intersectFill, rightOnlyFill]
  const configs = {
    'INNER JOIN':      ['transparent',              'rgba(99,102,241,0.75)',  'transparent'],
    'LEFT JOIN':       ['rgba(56,189,248,0.65)',    'rgba(99,102,241,0.75)', 'transparent'],
    'LEFT OUTER JOIN': ['rgba(56,189,248,0.65)',    'rgba(99,102,241,0.75)', 'transparent'],
    'RIGHT JOIN':      ['transparent',              'rgba(99,102,241,0.75)', 'rgba(52,211,153,0.65)'],
    'RIGHT OUTER JOIN':['transparent',              'rgba(99,102,241,0.75)', 'rgba(52,211,153,0.65)'],
    'FULL OUTER JOIN': ['rgba(56,189,248,0.65)',    'rgba(99,102,241,0.75)', 'rgba(52,211,153,0.65)'],
    'FULL JOIN':       ['rgba(56,189,248,0.65)',    'rgba(99,102,241,0.75)', 'rgba(52,211,153,0.65)'],
    'CROSS JOIN':      ['rgba(56,189,248,0.45)',    'rgba(248,113,113,0.7)', 'rgba(52,211,153,0.45)'],
    'NATURAL JOIN':    ['transparent',              'rgba(99,102,241,0.75)', 'transparent'],
    'LEFT EXCLUDING JOIN':  ['rgba(56,189,248,0.65)', 'transparent', 'transparent'],
    'RIGHT EXCLUDING JOIN': ['transparent', 'transparent', 'rgba(52,211,153,0.65)'],
  };
  const [lFill, iFill, rFill] = configs[jt] || ['transparent', 'rgba(99,102,241,0.75)', 'transparent'];

  // Labels
  const labelMap = {
    'INNER JOIN': 'Returns matching rows from both tables',
    'LEFT JOIN':  'All left rows + matching right rows',
    'LEFT OUTER JOIN': 'All left rows + matching right rows',
    'RIGHT JOIN': 'Matching left rows + all right rows',
    'RIGHT OUTER JOIN': 'Matching left rows + all right rows',
    'FULL OUTER JOIN': 'All rows from both tables',
    'FULL JOIN': 'All rows from both tables',
    'CROSS JOIN': 'Every combination of rows (Cartesian product)',
    'NATURAL JOIN': 'Implicit match on common column names',
  };
  const desc = labelMap[jt] || jt;

  const uid = `venn-${Date.now()}`;
  // SVG uses clipPath technique: draw the two circles, then fill intersection region
  return `
    <div class="venn-container">
      <div class="venn-title">${esc(jt)}</div>
      <div class="venn-desc">${esc(desc)}</div>
      <svg class="venn-svg" viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Left circle clip -->
          <clipPath id="${uid}-left">
            <circle cx="78" cy="55" r="44"/>
          </clipPath>
          <!-- Right circle clip -->
          <clipPath id="${uid}-right">
            <circle cx="142" cy="55" r="44"/>
          </clipPath>
          <!-- Intersection: left circle clipped to right circle -->
          <clipPath id="${uid}-inter">
            <circle cx="142" cy="55" r="44"/>
          </clipPath>
        </defs>

        <!-- Left-only fill (left circle, clipped to exclude right) -->
        <g clip-path="url(#${uid}-left)">
          <rect x="0" y="0" width="142" height="110" fill="${lFill}" class="venn-region-anim"/>
        </g>

        <!-- Right-only fill (right circle, clipped to exclude left) -->
        <g clip-path="url(#${uid}-right)">
          <rect x="110" y="0" width="110" height="110" fill="${rFill}" class="venn-region-anim"/>
        </g>

        <!-- Intersection fill (left circle clipped to right circle area) -->
        <g clip-path="url(#${uid}-left)">
          <g clip-path="url(#${uid}-inter)">
            <rect x="78" y="0" width="64" height="110" fill="${iFill}" class="venn-region-anim"/>
          </g>
        </g>

        <!-- Circle outlines -->
        <circle cx="78"  cy="55" r="44" fill="none" stroke="rgba(56,189,248,0.8)"  stroke-width="1.8"/>
        <circle cx="142" cy="55" r="44" fill="none" stroke="rgba(52,211,153,0.8)"  stroke-width="1.8"/>

        <!-- Table name labels -->
        <text x="52"  y="22" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(56,189,248,0.9)"  font-family="monospace">A</text>
        <text x="168" y="22" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(52,211,153,0.9)"  font-family="monospace">B</text>
      </svg>
      <div class="venn-legend">
        <span class="venn-legend-dot" style="background:rgba(56,189,248,0.8)"></span><span>Left Table</span>
        <span class="venn-legend-dot" style="background:rgba(99,102,241,0.9)"></span><span>Match</span>
        <span class="venn-legend-dot" style="background:rgba(52,211,153,0.8)"></span><span>Right Table</span>
      </div>
    </div>`;
}

function renderJoinStep(step) {
  const leftRows = (step.leftRows || []).slice(0, 8);
  const rightRows = (step.rightRows || []).slice(0, 8);
  const resultRows = (step.rows || []).slice(0, 10);
  const matchedPairs = step.matchedPairs || [];

  const leftAlias  = (step.leftTable  || '').toLowerCase();
  const rightAlias = (step.rightTable || '').toLowerCase();

  const allLeftKeys  = leftRows.length  > 0 ? Object.keys(leftRows[0])  : [];
  const allRightKeys = rightRows.length > 0 ? Object.keys(rightRows[0]) : [];

  function pickCols(keys, alias, limit) {
    const qualified = keys.filter(k => !k.startsWith('_') && k.startsWith(alias + '.'));
    if (qualified.length > 0) return qualified.slice(0, limit);
    return keys.filter(k => !k.startsWith('_') && !k.includes('.')).slice(0, limit);
  }

  const leftCols  = pickCols(allLeftKeys,  leftAlias,  4);
  const rightCols = pickCols(allRightKeys, rightAlias, 4);
  const resultCols = resultRows.length > 0 ? Object.keys(resultRows[0]).filter(k => !k.startsWith('_') && !k.includes('.')).slice(0, 6) : [];

  // Replace left/right table name labels in SVG with actual table names
  const vennSVG = buildVennSVG(step.joinType).replace(
    /font-family="monospace">A</,
    `font-family="monospace">${esc(step.leftTable || 'A')}<`
  ).replace(
    /font-family="monospace">B</,
    `font-family="monospace">${esc(step.rightTable || 'B')}<`
  );

  return `
    ${vennSVG}
    <div class="join-viz">
      <div class="join-table-wrap">
        <div style="font-size:11px;font-weight:600;color:var(--accent-cyan);margin-bottom:6px">📋 ${esc(step.leftTable || 'Left')}</div>
        <table class="data-table">
          <thead><tr>${leftCols.map(c => `<th>${esc(c.split('.').pop())}</th>`).join('')}</tr></thead>
          <tbody>${leftRows.map((r, i) => {
            const isMatched = matchedPairs.some(p => p.li === i);
            return `<tr class="${isMatched ? 'row-highlight-join-match' : 'row-highlight-join-miss'}">
              ${leftCols.map(c => `<td>${formatValue(r[c])}</td>`).join('')}
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="join-arrow-wrap">
        <div class="join-type-badge">${esc(step.joinType)}</div>
        <div class="join-arrow">⟺</div>
      </div>
      <div class="join-table-wrap">
        <div style="font-size:11px;font-weight:600;color:var(--accent-green);margin-bottom:6px">📋 ${esc(step.rightTable || 'Right')}</div>
        <table class="data-table">
          <thead><tr>${rightCols.map(c => `<th>${esc(c.split('.').pop())}</th>`).join('')}</tr></thead>
          <tbody>${rightRows.map((r, i) => {
            const isMatched = matchedPairs.some(p => p.ri === i);
            return `<tr class="${isMatched ? 'row-highlight-join-match' : 'row-highlight-join-miss'}">
              ${rightCols.map(c => `<td>${formatValue(r[c])}</td>`).join('')}
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>
    ${resultRows.length > 0 ? `
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:600;color:var(--accent-blue);margin-bottom:6px">Result (${step.rows.length} rows)</div>
        ${renderDataTable(resultRows, 'select', step)}
      </div>
    ` : ''}
  `;
}


function renderGroupStep(step) {
  const groups = step.groups || [];
  const colors = ['#58a6ff', '#39d0d8', '#bc8cff', '#3fb950', '#f0883e', '#ff7b72', '#f778ba', '#d29922'];
  return `
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${groups.slice(0, 6).map((g, gi) => {
        const cols = g.rows.length > 0 ? Object.keys(g.rows[0]).filter(k => !k.startsWith('_') && !k.includes('.')).slice(0, 4) : [];
        const color = colors[gi % colors.length];
        return `
          <div style="flex:1;min-width:160px;border:1px solid ${color}44;border-radius:8px;overflow:hidden">
            <div style="background:${color}22;padding:6px 10px;font-size:11px;font-weight:700;color:${color}">
              Group: ${esc(g.key.replace(/["[\]]/g, ''))} (${g.rows.length} rows)
            </div>
            <table class="data-table" style="font-size:11px">
              <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
              <tbody>
                ${g.rows.slice(0, 5).map(r => `<tr class="row-highlight-group">
                  ${cols.map(c => `<td>${formatValue(r[c])}</td>`).join('')}
                </tr>`).join('')}
                ${g.rows.length > 5 ? `<tr><td colspan="${cols.length}" style="color:var(--text-muted);text-align:center">+${g.rows.length-5} more</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
      ${groups.length > 6 ? `<div style="color:var(--text-muted);font-size:11px;padding:8px">+${groups.length-6} more groups</div>` : ''}
    </div>
  `;
}

function renderInsertStep(step) {
  return `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Before</div>
        ${renderDataTable((step.beforeRows || []).slice(0, 8), 'from', {})}
      </div>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:600;color:var(--accent-green);margin-bottom:6px">After (${step.insertedRows?.length} inserted)</div>
        <table class="data-table">
          <tbody>
            ${(step.rows || []).map((r, i) => {
              const isNew = step.insertedRows?.some(ins => ins._id === r._id);
              const cols = Object.keys(r).filter(k => !k.startsWith('_') && !k.includes('.'));
              return `<tr class="${isNew ? 'row-highlight-insert' : ''}">
                ${cols.slice(0,6).map(c => `<td>${formatValue(r[c])}</td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUpdateStep(step) {
  const updates = step.updatedRows || [];
  return `
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--accent-orange);margin-bottom:8px">Updated ${updates.length} row(s)</div>
      ${updates.slice(0, 5).map(u => {
        const cols = Object.keys(u.after).filter(k => !k.startsWith('_') && !k.includes('.'));
        const changedCols = cols.filter(c => u.before[c] !== u.after[c]);
        return `
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
            <div style="flex:1;background:#f0883e11;border:1px solid #f0883e33;border-radius:6px;padding:6px 10px">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">Before</div>
              ${cols.slice(0,5).map(c => `<span style="font-size:11px;color:${changedCols.includes(c)?'var(--accent-red)':'var(--text-muted)'};">${c}: ${formatValue(u.before[c])}&nbsp;</span>`).join('')}
            </div>
            <span style="color:var(--accent-orange);font-size:16px">→</span>
            <div style="flex:1;background:#3fb95011;border:1px solid #3fb95033;border-radius:6px;padding:6px 10px">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">After</div>
              ${cols.slice(0,5).map(c => `<span style="font-size:11px;color:${changedCols.includes(c)?'var(--accent-green)':'var(--text-muted)'};">${c}: ${formatValue(u.after[c])}&nbsp;</span>`).join('')}
            </div>
          </div>
        `;
      }).join('')}
      ${updates.length > 5 ? `<div style="color:var(--text-muted);font-size:11px">+${updates.length-5} more updates</div>` : ''}
    </div>
  `;
}

function renderDeleteStep(step) {
  return `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:11px;font-weight:600;color:var(--accent-red);margin-bottom:6px">Deleted (${step.deletedRows?.length} rows)</div>
        ${renderDataTable((step.deletedRows || []), 'delete', {})}
      </div>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:600;color:var(--accent-green);margin-bottom:6px">Remaining</div>
        ${renderDataTable((step.rows || []).slice(0, 8), 'from', {})}
      </div>
    </div>
  `;
}

function renderCreateStep(step) {
  return `
    <div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Created table "${esc(step.tableName)}"</div>
      <table class="data-table">
        <thead><tr><th>Column</th><th>Type</th><th>Constraints</th></tr></thead>
        <tbody>
          ${(step.columns || []).map(c => `
            <tr>
              <td class="col-name">${esc(c.name)}</td>
              <td><span class="col-type">${esc(c.type)}</span></td>
              <td>${[c.primaryKey && '<span class="col-pk">PK</span>', c.notNull && '<span class="col-nn">NOT NULL</span>', c.unique && '<span class="col-pk" style="color:var(--accent-cyan)">UNIQUE</span>', c.autoIncrement && '<span class="col-nn">AI</span>'].filter(Boolean).join(' ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderExecutionFlow(steps) {
  const flowEl = document.getElementById('flow-steps');
  if (!flowEl) return;
  const clauses = steps.map(s => s.clause);
  flowEl.innerHTML = clauses.map((c, i) => `
    ${i > 0 ? '<span class="flow-arrow">→</span>' : ''}
    <span class="flow-step-badge ${i === clauses.length - 1 ? 'active' : ''}">${esc(c)}</span>
  `).join('');
}

function renderTimeline(steps) {
  const track = document.getElementById('timeline-track');
  const labels = document.getElementById('timeline-labels');
  if (labels) {
    labels.innerHTML = steps.map((s, i) => {
      const pct = steps.length <= 1 ? 50 : (i / (steps.length - 1)) * 100;
      return `<span style="position:absolute;left:${pct}%;transform:translateX(-50%);font-size:9px;color:var(--text-muted)">${esc(s.clause)}</span>`;
    }).join('');
    labels.style.position = 'relative';
    labels.style.height = '16px';
  }

  // Scrubber interaction
  function updateScrubber(pct) {
    const fill = document.getElementById('timeline-fill');
    const thumb = document.getElementById('timeline-thumb');
    if (fill) fill.style.width = pct + '%';
    if (thumb) thumb.style.left = pct + '%';
    const stepIndex = Math.round((pct / 100) * (steps.length - 1));
    goToStep(stepIndex);
  }

  if (track) {
    track.addEventListener('click', (e) => {
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      updateScrubber(pct);
    });
  }

  // Full timeline
  const fill = document.getElementById('timeline-fill');
  const thumb = document.getElementById('timeline-thumb');
  if (fill) fill.style.width = '100%';
  if (thumb) thumb.style.left = '100%';
}

function goToStep(index) {
  State.currentStep = index;
  const stepEls = document.querySelectorAll('.viz-step');
  stepEls.forEach((el, i) => {
    el.classList.toggle('active', i === index);
    el.classList.toggle('dimmed', i > index);
  });
  const flowBadges = document.querySelectorAll('.flow-step-badge');
  flowBadges.forEach((el, i) => el.classList.toggle('active', i === index));
  document.getElementById('step-counter').textContent = `Step ${index + 1}/${State.currentSteps.length}`;
}

function formatValue(val) {
  if (val === null || val === undefined) return '<span class="null-val">NULL</span>';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  return esc(String(val));
}

// ─────────────────────────────────────────────
// RESULTS TABLE
// ─────────────────────────────────────────────
function displayResults(result) {
  const wrap = document.getElementById('results-table-wrap');
  if (wrap) {
    if (!result.rows || result.rows.length === 0) {
      if (result.message) {
        wrap.innerHTML = `<div style="color:var(--accent-green);padding:12px;font-size:13px">✓ ${esc(result.message)}</div>`;
      } else {
        wrap.innerHTML = '<div class="explanation-placeholder">No results returned.</div>';
      }
      return;
    }
    const cols = Object.keys(result.rows[0]).filter(k => !k.startsWith('_') && !k.includes('.'));
    const displayCols = cols.length > 0 ? cols : Object.keys(result.rows[0]).filter(k => !k.startsWith('_'));
    wrap.innerHTML = `
      <div class="results-info">${result.rows.length} row(s) returned${result.message ? ' — ' + esc(result.message) : ''}</div>
      <table class="data-table">
        <thead><tr>${displayCols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${result.rows.slice(0, 200).map(row => `
            <tr>${displayCols.map(c => `<td>${formatValue(row[c])}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
      ${result.rows.length > 200 ? `<div style="padding:8px;color:var(--text-muted);font-size:11px">... and ${result.rows.length - 200} more rows</div>` : ''}
    `;
  }
  switchBottomTab('results');
}

function displayError(msg) {
  const vizSteps = document.getElementById('viz-steps');
  const welcome = document.getElementById('viz-welcome');
  if (welcome) welcome.style.display = 'none';
  if (vizSteps) {
    vizSteps.style.display = 'block';
    vizSteps.innerHTML = `
      <div class="error-banner" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="error-icon">⚠</span>
          <div>
            <div style="font-weight:700;margin-bottom:4px">SQL Error</div>
            <div>${esc(msg)}</div>
          </div>
        </div>
        <button class="btn-run" id="btn-fix-ai-error" style="background: linear-gradient(135deg, var(--accent-purple), #6366f1); margin-top: 8px; border: none; box-shadow: 0 2px 8px rgba(124,58,237,0.3); font-size:12px;">
          ✨ Fix with AI
        </button>
      </div>
    `;
  }

  const wrap = document.getElementById('results-table-wrap');
  if (wrap) {
    wrap.innerHTML = `<div style="color:var(--accent-red);padding:12px;font-size:12px">
      ⚠ ${esc(msg)}
      <br/>
      <button class="btn-run" id="btn-fix-ai-error-results" style="background: linear-gradient(135deg, var(--accent-purple), #6366f1); margin-top: 8px; border: none; box-shadow: 0 2px 8px rgba(124,58,237,0.3); font-size:11px; padding: 4px 10px;">
        ✨ Explain & Fix with AI
      </button>
    </div>`;
  }

  const exp = document.getElementById('explanation-text');
  if (exp) {
    exp.innerHTML = `<div class="explanation-placeholder" style="color:var(--accent-red)">
      Error: ${esc(msg)}
      <br/><br/>
      <button class="btn-run" id="btn-fix-ai-error-exp" style="background: linear-gradient(135deg, var(--accent-purple), #6366f1); border: none; box-shadow: 0 2px 8px rgba(124,58,237,0.3); font-size:11px; padding: 4px 10px;">
        ✨ Help me fix this error
      </button>
    </div>`;
  }

  // Attach click handlers
  const handleFixClick = () => {
    const sql = editor.value.trim();
    askAITutor(`My query has an error: "${msg}". Can you explain what went wrong and help me fix it?\n\nHere is my query:\n\`\`\`sql\n${sql}\n\`\`\``, msg);
  };

  setTimeout(() => {
    const btn1 = document.getElementById('btn-fix-ai-error');
    const btn2 = document.getElementById('btn-fix-ai-error-results');
    const btn3 = document.getElementById('btn-fix-ai-error-exp');
    if (btn1) btn1.addEventListener('click', handleFixClick);
    if (btn2) btn2.addEventListener('click', handleFixClick);
    if (btn3) btn3.addEventListener('click', handleFixClick);
  }, 50);
}

// ─────────────────────────────────────────────
// EXPLANATION
// ─────────────────────────────────────────────
function displayExplanation(parts) {
  const container = document.getElementById('explanation-text');
  if (container) {
    let html = '';
    for (const part of parts) {
      if (part.type === 'execution_order') {
        html += `
          <div class="explanation-section">
            <h4>${esc(part.title)}</h4>
            <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
              ${part.steps.map((s, i) => `
                ${i > 0 ? '<span style="color:var(--text-muted);font-size:11px">→</span>' : ''}
                <span class="badge badge-blue">${esc(s)}</span>
              `).join('')}
            </div>
          </div>
        `;
      } else if (part.type === 'clause') {
        html += `
          <div class="clause-explain">
            <span class="clause-kw">${esc(part.keyword)}</span>
            <span class="clause-desc">${esc(part.desc)}</span>
          </div>
        `;
      } else if (part.type === 'warning') {
        html += `<div style="color:var(--accent-yellow);font-size:12px;margin:4px 0">${esc(part.text)}</div>`;
      } else if (part.type === 'column_def') {
        html += `
          <div class="clause-explain">
            <span class="clause-kw">${esc(part.name)}</span>
            <span class="col-type">${esc(part.colType)}</span>
            ${part.flags.map(f => `<span class="badge badge-purple">${esc(f)}</span>`).join('')}
          </div>
        `;
      }
    }
    container.innerHTML = html || '<div class="explanation-placeholder">Run a query to see its explanation.</div>';
  }
}

// ─────────────────────────────────────────────
// EXECUTION PLAN
// ─────────────────────────────────────────────
function displayPlan(nodes) {
  const container = document.getElementById('exec-plan');
  if (!container) return;
  if (!nodes || nodes.length === 0) {
    container.innerHTML = '<div class="explanation-placeholder">No plan available.</div>';
    return;
  }
  container.innerHTML = nodes.map(n => `
    <div class="exec-plan-node" style="margin-left:${(n.depth || 0) * 20}px">
      <div class="plan-node-icon">${n.icon || '•'}</div>
      <div class="plan-node-body">
        <div class="plan-node-type">${esc(n.type)}</div>
        <div class="plan-node-detail">${esc(n.detail || '')}</div>
      </div>
      <div class="plan-node-cost">${esc(n.cost || '')}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────
function addToHistory(sql, time, result) {
  State.queryHistory.unshift({ sql, time, rows: result.rows?.length ?? 0, ts: new Date().toLocaleTimeString() });
  if (State.queryHistory.length > 50) State.queryHistory.pop();

  const container = document.getElementById('query-history');
  if (container) {
    container.innerHTML = State.queryHistory.map((h, i) => `
      <div class="history-item" data-index="${i}">
        <span class="history-icon">${h.sql.trim().toUpperCase().startsWith('SELECT') ? '🔍' : h.sql.trim().toUpperCase().startsWith('INSERT') ? '➕' : h.sql.trim().toUpperCase().startsWith('UPDATE') ? '✏️' : h.sql.trim().toUpperCase().startsWith('DELETE') ? '🗑' : '⚙️'}</span>
        <span class="history-query">${esc(h.sql.replace(/\s+/g,' '))}</span>
        <span class="history-time">${h.ts}</span>
      </div>
    `).join('');

    container.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        editor.value = State.queryHistory[idx].sql;
        updateGutter();
      });
    });
  }
}

// ─────────────────────────────────────────────
// SCHEMA EXPLORER
// ─────────────────────────────────────────────
function renderSchema() {
  const container = document.getElementById('schema-tables');
  if (container) {
    const tables = Object.values(State.db.tables);

    container.innerHTML = tables.map(table => `
      <div class="table-card" id="card-${table.name}">
        <div class="table-card-header" onclick="toggleTableCard('${table.name}')">
          <div class="table-card-name">${esc(table.name)}</div>
          <div class="table-card-meta">${table.rows.length} rows · ${table.columns.length} cols</div>
          <div class="table-card-toggle">▾</div>
        </div>
        <div class="table-card-body">
          <div>
            ${table.columns.map(col => `
              <div class="column-list-item">
                <span class="col-name">${esc(col.name)}</span>
                <span class="col-type">${esc(col.type)}</span>
                ${col.primaryKey ? '<span class="col-pk">PK</span>' : ''}
                ${col.foreignKey ? '<span class="col-fk">FK</span>' : ''}
                ${col.notNull ? '<span class="col-nn">NN</span>' : ''}
              </div>
            `).join('')}
          </div>
          <div class="table-card-data">
            ${renderMiniTable(table)}
          </div>
        </div>
      </div>
    `).join('');
  }
}

function renderMiniTable(table) {
  if (table.rows.length === 0) return '<div style="padding:8px;color:var(--text-muted);font-size:11px">No data</div>';
  const cols = table.columns.slice(0, 5);
  return `
    <table class="data-table">
      <thead><tr>${cols.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead>
      <tbody>
        ${table.rows.slice(0, 5).map(r => `
          <tr>${cols.map(c => `<td>${formatValue(r[c.name])}</td>`).join('')}</tr>
        `).join('')}
        ${table.rows.length > 5 ? `<tr><td colspan="${cols.length}" style="color:var(--text-muted);text-align:center;font-size:10px">+${table.rows.length-5} more</td></tr>` : ''}
      </tbody>
    </table>
  `;
}

window.toggleTableCard = function(name) {
  const card = document.getElementById(`card-${name}`);
  if (card) card.classList.toggle('expanded');
};

// ─────────────────────────────────────────────
// ER DIAGRAM
// ─────────────────────────────────────────────
function renderERDiagram() {
  const canvas = document.getElementById('er-canvas');
  const container = document.getElementById('schema-er');
  if (!canvas || !container) return;
  const ctx = canvas.getContext('2d');
  const tables = Object.values(State.db.tables);

  canvas.width = container.offsetWidth || 400;
  canvas.height = Math.max(300, tables.length * 120);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const themeStyle = getComputedStyle(document.documentElement);
  const getCSSVar = (name, fallback) => themeStyle.getPropertyValue(name).trim() || fallback;

  const accentCyan = getCSSVar('--accent-cyan', '#0ea5e9');
  const accentBlue = getCSSVar('--accent-blue', '#0284c7');
  const accentPurple = getCSSVar('--accent-purple', '#7c3aed');
  const accentYellow = getCSSVar('--accent-yellow', '#ca8a04');
  const bgCard = getCSSVar('--bg-card', '#f8fafc');
  const borderPrimary = getCSSVar('--border-primary', '#cbd5e1');
  const textSecondary = getCSSVar('--text-secondary', '#475569');

  // Layout tables in a grid
  const positions = {};
  const tableW = 150, tableH = 30 + tables[0]?.columns.length * 20 || 80;
  const cols = Math.floor(canvas.width / (tableW + 40));

  tables.forEach((table, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[table.name] = {
      x: col * (tableW + 60) + 30,
      y: row * (tableH + 60) + 30
    };
  });

  // Draw relationship lines first
  ctx.strokeStyle = accentCyan + '44';
  ctx.lineWidth = 1.5;
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.foreignKey && positions[col.foreignKey.table]) {
        const from = positions[table.name];
        const to = positions[col.foreignKey.table];
        const fx = from.x + tableW;
        const fy = from.y + 20;
        const tx = to.x;
        const ty = to.y + 20;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.bezierCurveTo(fx + 40, fy, tx - 40, ty, tx, ty);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = accentCyan;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - 8, ty - 4);
        ctx.lineTo(tx - 8, ty + 4);
        ctx.fill();
      }
    }
  }

  // Draw table boxes
  for (const table of tables) {
    const pos = positions[table.name];
    const h = 30 + table.columns.length * 20;

    // Shadow
    ctx.shadowColor = accentBlue + '22';
    ctx.shadowBlur = 10;

    // Box
    ctx.fillStyle = bgCard;
    ctx.strokeStyle = borderPrimary;
    ctx.lineWidth = 1;
    roundRect(ctx, pos.x, pos.y, tableW, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Header
    ctx.fillStyle = accentBlue + '22';
    roundRect(ctx, pos.x, pos.y, tableW, 24, 6, true, false);
    ctx.fill();

    // Table name
    ctx.fillStyle = accentBlue;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(table.name, pos.x + 8, pos.y + 16);

    // Columns
    table.columns.forEach((col, ci) => {
      const cy = pos.y + 30 + ci * 20;
      ctx.fillStyle = col.primaryKey ? accentYellow : textSecondary;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText((col.primaryKey ? '🔑 ' : col.foreignKey ? '🔗 ' : '') + col.name, pos.x + 8, cy + 13);
      ctx.fillStyle = accentPurple;
      ctx.fillText(col.type, pos.x + tableW - 45, cy + 13);
    });
  }
}

function roundRect(ctx, x, y, w, h, r, topOnly = false, bottomOnly = false) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  if (topOnly) { ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); }
  else {
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────
// GAMIFICATION
// ─────────────────────────────────────────────
const ACHIEVEMENTS = {
  first_query: { title: 'First Steps!', desc: 'Ran your first SQL query', xp: 10 },
  select_star: { title: 'Stargazer', desc: 'Used SELECT *', xp: 5 },
  join_master: { title: 'Join Master', desc: 'Used a JOIN', xp: 25 },
  group_by_hero: { title: 'Aggregator', desc: 'Used GROUP BY', xp: 20 },
  window_wizard: { title: 'Window Wizard', desc: 'Used a window function', xp: 50 },
  cte_creator: { title: 'CTE Creator', desc: 'Used a WITH clause', xp: 40 },
  inserter: { title: 'Data Architect', desc: 'Inserted data', xp: 15 },
  updater: { title: 'Data Editor', desc: 'Updated data', xp: 15 },
  deleter: { title: 'Data Janitor', desc: 'Deleted data', xp: 10 },
  creator: { title: 'Schema Builder', desc: 'Created a table', xp: 30 },
  historian: { title: 'Historian', desc: 'Ran 10 queries', xp: 25 },
  marathon: { title: 'SQL Marathon', desc: 'Ran 25 queries', xp: 50 }
};

function handleXP(sql, ast, result) {
  let gained = 0;
  const sqlUpper = sql.toUpperCase();
  const achsToGrant = [];

  if (State.queriesRun === 1) achsToGrant.push('first_query');
  if (State.queriesRun === 10) achsToGrant.push('historian');
  if (State.queriesRun === 25) achsToGrant.push('marathon');
  if (sqlUpper.includes('SELECT *')) achsToGrant.push('select_star');
  if (sqlUpper.includes('JOIN')) achsToGrant.push('join_master');
  if (sqlUpper.includes('GROUP BY')) achsToGrant.push('group_by_hero');
  if (sqlUpper.includes('OVER (') || sqlUpper.includes('OVER(')) achsToGrant.push('window_wizard');
  if (sqlUpper.startsWith('WITH ')) achsToGrant.push('cte_creator');
  if (sqlUpper.startsWith('INSERT')) achsToGrant.push('inserter');
  if (sqlUpper.startsWith('UPDATE')) achsToGrant.push('updater');
  if (sqlUpper.startsWith('DELETE')) achsToGrant.push('deleter');
  if (sqlUpper.startsWith('CREATE TABLE')) achsToGrant.push('creator');

  for (const ach of achsToGrant) {
    if (!State.achievements.has(ach)) {
      State.achievements.add(ach);
      const data = ACHIEVEMENTS[ach];
      gained += data.xp;
      showAchievement(data);
    }
  }

  // Base XP for running a query
  gained += 2;
  if (sqlUpper.includes('JOIN')) gained += 5;
  if (sqlUpper.includes('GROUP BY')) gained += 3;
  if (sqlUpper.includes('OVER')) gained += 10;

  State.xp += gained;
  State.level = Math.floor(State.xp / 100) + 1;

  const xpCount = document.getElementById('xp-count');
  const levelNum = document.getElementById('level-num');
  if (xpCount) xpCount.textContent = State.xp + ' XP';
  if (levelNum) levelNum.textContent = State.level;
}

function showAchievement(data) {
  const toast = document.getElementById('achievement-toast');
  if (toast) {
    const title = document.getElementById('achievement-title');
    const desc = document.getElementById('achievement-desc');
    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.desc + ' (+' + data.xp + ' XP)';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
  }
}

// ─────────────────────────────────────────────
// PRACTICE SYSTEM — 110 Questions
// ─────────────────────────────────────────────

const PRACTICE_QUESTIONS = [
  // ── LEVEL 1: Basic SELECT – Employees ──
  { id:1,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Show all employees.',
    hint:'Use SELECT * to get all columns.',
    starterQuery:'SELECT * FROM employees;' },
  { id:2,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Show employee names and salaries only.',
    hint:'List only the columns you need: name, salary.',
    starterQuery:'SELECT name, salary FROM employees;' },
  { id:3,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Show employees with salary greater than 100000.',
    hint:'Use WHERE salary > 100000.',
    starterQuery:'SELECT * FROM employees WHERE salary > 100000;' },
  { id:4,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:"Show employees working in Engineering.",
    hint:"Filter: WHERE department = 'Engineering'.",
    starterQuery:"SELECT * FROM employees WHERE department = 'Engineering';" },
  { id:5,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Show employees hired after 2022-01-01.',
    hint:'Compare hire_date > date string.',
    starterQuery:"SELECT * FROM employees WHERE hire_date > '2022-01-01';" },
  { id:6,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Display unique departments from employees table.',
    hint:'Use SELECT DISTINCT.',
    starterQuery:'SELECT DISTINCT department FROM employees;' },
  { id:7,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Show employees ordered by salary descending.',
    hint:'Use ORDER BY salary DESC.',
    starterQuery:'SELECT * FROM employees ORDER BY salary DESC;' },
  { id:8,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Show top 3 highest-paid employees.',
    hint:'Use ORDER BY salary DESC LIMIT 3.',
    starterQuery:'SELECT * FROM employees ORDER BY salary DESC LIMIT 3;' },
  { id:9,  level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:"Find employees whose names start with 'A'.",
    hint:"Use WHERE name LIKE 'A%'.",
    starterQuery:"SELECT * FROM employees WHERE name LIKE 'A%';" },
  { id:10, level:1, levelName:'Basic SELECT', table:'employees', difficulty:'Beginner',
    question:'Find employees whose email contains "company".',
    hint:"Use WHERE email LIKE '%company%'.",
    starterQuery:"SELECT * FROM employees WHERE email LIKE '%company%';" },

  // ── LEVEL 1: Basic SELECT – Products ──
  { id:11, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Show all products.',
    hint:'SELECT * FROM products.',
    starterQuery:'SELECT * FROM products;' },
  { id:12, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Display product names and prices.',
    hint:'Select only name and price columns.',
    starterQuery:'SELECT name, price FROM products;' },
  { id:13, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Find products costing more than 500.',
    hint:'WHERE price > 500.',
    starterQuery:'SELECT * FROM products WHERE price > 500;' },
  { id:14, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Find products with stock less than 50.',
    hint:'WHERE stock < 50.',
    starterQuery:'SELECT * FROM products WHERE stock < 50;' },
  { id:15, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:"Show products in Electronics category.",
    hint:"WHERE category = 'Electronics'.",
    starterQuery:"SELECT * FROM products WHERE category = 'Electronics';" },
  { id:16, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Sort products by price ascending.',
    hint:'ORDER BY price ASC.',
    starterQuery:'SELECT * FROM products ORDER BY price ASC;' },
  { id:17, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Show top 5 most expensive products.',
    hint:'ORDER BY price DESC LIMIT 5.',
    starterQuery:'SELECT * FROM products ORDER BY price DESC LIMIT 5;' },
  { id:18, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Find products whose name contains "Desk".',
    hint:"WHERE name LIKE '%Desk%'.",
    starterQuery:"SELECT * FROM products WHERE name LIKE '%Desk%';" },
  { id:19, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Show products with stock between 20 and 100.',
    hint:'WHERE stock BETWEEN 20 AND 100.',
    starterQuery:'SELECT * FROM products WHERE stock BETWEEN 20 AND 100;' },
  { id:20, level:1, levelName:'Basic SELECT', table:'products', difficulty:'Beginner',
    question:'Count total products.',
    hint:'SELECT COUNT(*) FROM products.',
    starterQuery:'SELECT COUNT(*) AS total_products FROM products;' },

  // ── LEVEL 2: Aggregate Functions ──
  { id:21, level:2, levelName:'Aggregate Functions', table:'employees', difficulty:'Beginner',
    question:'Find average employee salary.',
    hint:'Use AVG(salary).',
    starterQuery:'SELECT AVG(salary) AS avg_salary FROM employees;' },
  { id:22, level:2, levelName:'Aggregate Functions', table:'employees', difficulty:'Beginner',
    question:'Find highest salary.',
    hint:'Use MAX(salary).',
    starterQuery:'SELECT MAX(salary) AS highest_salary FROM employees;' },
  { id:23, level:2, levelName:'Aggregate Functions', table:'employees', difficulty:'Beginner',
    question:'Find lowest salary.',
    hint:'Use MIN(salary).',
    starterQuery:'SELECT MIN(salary) AS lowest_salary FROM employees;' },
  { id:24, level:2, levelName:'Aggregate Functions', table:'employees', difficulty:'Beginner',
    question:'Count total employees.',
    hint:'SELECT COUNT(*) FROM employees.',
    starterQuery:'SELECT COUNT(*) AS total_employees FROM employees;' },
  { id:25, level:2, levelName:'Aggregate Functions', table:'employees', difficulty:'Beginner',
    question:'Calculate total salary expenditure.',
    hint:'Use SUM(salary).',
    starterQuery:'SELECT SUM(salary) AS total_salary FROM employees;' },
  { id:26, level:2, levelName:'Aggregate Functions', table:'products', difficulty:'Beginner',
    question:'Find average product price.',
    hint:'AVG(price) from products.',
    starterQuery:'SELECT AVG(price) AS avg_price FROM products;' },
  { id:27, level:2, levelName:'Aggregate Functions', table:'products', difficulty:'Beginner',
    question:'Find total stock available.',
    hint:'SUM(stock).',
    starterQuery:'SELECT SUM(stock) AS total_stock FROM products;' },
  { id:28, level:2, levelName:'Aggregate Functions', table:'products', difficulty:'Beginner',
    question:'Find most expensive product.',
    hint:'MAX(price).',
    starterQuery:'SELECT name, MAX(price) AS max_price FROM products;' },
  { id:29, level:2, levelName:'Aggregate Functions', table:'products', difficulty:'Beginner',
    question:'Find cheapest product.',
    hint:'MIN(price).',
    starterQuery:'SELECT name, MIN(price) AS min_price FROM products;' },
  { id:30, level:2, levelName:'Aggregate Functions', table:'products', difficulty:'Beginner',
    question:'Count products by category.',
    hint:'GROUP BY category with COUNT(*).',
    starterQuery:'SELECT category, COUNT(*) AS count FROM products GROUP BY category;' },
  { id:31, level:2, levelName:'Aggregate Functions', table:'students', difficulty:'Beginner',
    question:'Find average score.',
    hint:'AVG(score) from students.',
    starterQuery:'SELECT AVG(score) AS avg_score FROM students;' },
  { id:32, level:2, levelName:'Aggregate Functions', table:'students', difficulty:'Beginner',
    question:'Find highest score.',
    hint:'MAX(score).',
    starterQuery:'SELECT MAX(score) AS highest_score FROM students;' },
  { id:33, level:2, levelName:'Aggregate Functions', table:'students', difficulty:'Beginner',
    question:'Find lowest score.',
    hint:'MIN(score).',
    starterQuery:'SELECT MIN(score) AS lowest_score FROM students;' },
  { id:34, level:2, levelName:'Aggregate Functions', table:'students', difficulty:'Beginner',
    question:'Count students in each grade.',
    hint:'GROUP BY grade.',
    starterQuery:'SELECT grade, COUNT(*) AS count FROM students GROUP BY grade;' },
  { id:35, level:2, levelName:'Aggregate Functions', table:'students', difficulty:'Beginner',
    question:'Find average score by subject.',
    hint:'GROUP BY subject.',
    starterQuery:'SELECT subject, AVG(score) AS avg_score FROM students GROUP BY subject;' },

  // ── LEVEL 3: GROUP BY & HAVING ──
  { id:36, level:3, levelName:'GROUP BY & HAVING', table:'employees', difficulty:'Intermediate',
    question:'Find average salary by department.',
    hint:'GROUP BY department, use AVG(salary).',
    starterQuery:'SELECT department, AVG(salary) AS avg_salary FROM employees GROUP BY department;' },
  { id:37, level:3, levelName:'GROUP BY & HAVING', table:'employees', difficulty:'Intermediate',
    question:'Count employees in each department.',
    hint:'GROUP BY department with COUNT(*).',
    starterQuery:'SELECT department, COUNT(*) AS emp_count FROM employees GROUP BY department;' },
  { id:38, level:3, levelName:'GROUP BY & HAVING', table:'employees', difficulty:'Intermediate',
    question:'Find departments with more than 2 employees.',
    hint:'HAVING COUNT(*) > 2.',
    starterQuery:'SELECT department, COUNT(*) AS emp_count FROM employees GROUP BY department HAVING COUNT(*) > 2;' },
  { id:39, level:3, levelName:'GROUP BY & HAVING', table:'products', difficulty:'Intermediate',
    question:'Find categories having more than 2 products.',
    hint:'GROUP BY category HAVING COUNT(*) > 2.',
    starterQuery:'SELECT category, COUNT(*) FROM products GROUP BY category HAVING COUNT(*) > 2;' },
  { id:40, level:3, levelName:'GROUP BY & HAVING', table:'products', difficulty:'Intermediate',
    question:'Find average product price by category.',
    hint:'GROUP BY category, AVG(price).',
    starterQuery:'SELECT category, AVG(price) AS avg_price FROM products GROUP BY category;' },
  { id:41, level:3, levelName:'GROUP BY & HAVING', table:'students', difficulty:'Intermediate',
    question:'Find subjects with average score above 85.',
    hint:'HAVING AVG(score) > 85.',
    starterQuery:'SELECT subject, AVG(score) AS avg_score FROM students GROUP BY subject HAVING AVG(score) > 85;' },
  { id:42, level:3, levelName:'GROUP BY & HAVING', table:'employees', difficulty:'Intermediate',
    question:'Find departments where average salary exceeds 90000.',
    hint:'HAVING AVG(salary) > 90000.',
    starterQuery:'SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 90000;' },
  { id:43, level:3, levelName:'GROUP BY & HAVING', table:'students', difficulty:'Intermediate',
    question:'Find grades having more than 1 student.',
    hint:'GROUP BY grade HAVING COUNT(*) > 1.',
    starterQuery:'SELECT grade, COUNT(*) FROM students GROUP BY grade HAVING COUNT(*) > 1;' },
  { id:44, level:3, levelName:'GROUP BY & HAVING', table:'products', difficulty:'Intermediate',
    question:'Find total stock by category.',
    hint:'GROUP BY category, SUM(stock).',
    starterQuery:'SELECT category, SUM(stock) AS total_stock FROM products GROUP BY category;' },
  { id:45, level:3, levelName:'GROUP BY & HAVING', table:'employees', difficulty:'Intermediate',
    question:'Find maximum salary in each department.',
    hint:'GROUP BY department, MAX(salary).',
    starterQuery:'SELECT department, MAX(salary) AS max_salary FROM employees GROUP BY department;' },

  // ── LEVEL 4: Joins ──
  { id:46, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Show employee names with department names.',
    hint:'JOIN employees with departments on department_id.',
    starterQuery:'SELECT e.name, d.name AS dept_name\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id;' },
  { id:47, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Show employee names and department budgets.',
    hint:'Join employees and departments, select name and budget.',
    starterQuery:'SELECT e.name, d.budget\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id;' },
  { id:48, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Find employees working in departments located in San Francisco.',
    hint:"JOIN + WHERE d.location = 'San Francisco'.",
    starterQuery:"SELECT e.name\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id\nWHERE d.location = 'San Francisco';" },
  { id:49, level:4, levelName:'Joins', table:'departments', difficulty:'Intermediate',
    question:'Find department with highest budget.',
    hint:'ORDER BY budget DESC LIMIT 1.',
    starterQuery:'SELECT name, budget FROM departments ORDER BY budget DESC LIMIT 1;' },
  { id:50, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Show all employees and their department locations.',
    hint:'LEFT JOIN to include employees without departments.',
    starterQuery:'SELECT e.name, d.location\nFROM employees e\nLEFT JOIN departments d ON e.department_id = d.id;' },
  { id:51, level:4, levelName:'Joins', table:'orders', difficulty:'Intermediate',
    question:'Show all orders with product names.',
    hint:'JOIN orders with products on product_id.',
    starterQuery:'SELECT o.id, p.name AS product_name, o.quantity\nFROM orders o\nINNER JOIN products p ON o.product_id = p.id;' },
  { id:52, level:4, levelName:'Joins', table:'orders', difficulty:'Intermediate',
    question:'Show customer name and ordered product.',
    hint:'SELECT customer_name and product name.',
    starterQuery:'SELECT o.customer_name, p.name AS product\nFROM orders o\nINNER JOIN products p ON o.product_id = p.id;' },
  { id:53, level:4, levelName:'Joins', table:'orders', difficulty:'Intermediate',
    question:'Show orders where product category is Electronics.',
    hint:'JOIN orders + products, WHERE category = Electronics.',
    starterQuery:"SELECT o.customer_name, p.name, p.category\nFROM orders o\nINNER JOIN products p ON o.product_id = p.id\nWHERE p.category = 'Electronics';" },
  { id:54, level:4, levelName:'Joins', table:'orders', difficulty:'Intermediate',
    question:'Find total revenue generated by each product.',
    hint:'SUM(o.quantity * p.price) GROUP BY product.',
    starterQuery:'SELECT p.name, SUM(o.quantity * p.price) AS revenue\nFROM orders o\nINNER JOIN products p ON o.product_id = p.id\nGROUP BY p.name;' },
  { id:55, level:4, levelName:'Joins', table:'orders', difficulty:'Intermediate',
    question:'Find the most ordered product.',
    hint:'SUM(quantity) GROUP BY product ORDER BY DESC LIMIT 1.',
    starterQuery:'SELECT p.name, SUM(o.quantity) AS total_ordered\nFROM orders o\nINNER JOIN products p ON o.product_id = p.id\nGROUP BY p.name\nORDER BY total_ordered DESC LIMIT 1;' },
  { id:56, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Show employee name, department name, and department budget.',
    hint:'Three-column join result.',
    starterQuery:'SELECT e.name, d.name AS dept, d.budget\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id;' },
  { id:57, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Find employees whose department budget exceeds 700000.',
    hint:'JOIN + WHERE d.budget > 700000.',
    starterQuery:'SELECT e.name, d.budget\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id\nWHERE d.budget > 700000;' },
  { id:58, level:4, levelName:'Joins', table:'departments', difficulty:'Intermediate',
    question:'Show department name and number of employees.',
    hint:'LEFT JOIN departments to employees, COUNT.',
    starterQuery:'SELECT d.name, COUNT(e.id) AS emp_count\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nGROUP BY d.name;' },
  { id:59, level:4, levelName:'Joins', table:'departments', difficulty:'Intermediate',
    question:'Find departments with no employees.',
    hint:'LEFT JOIN and WHERE e.id IS NULL.',
    starterQuery:'SELECT d.name\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nWHERE e.id IS NULL;' },
  { id:60, level:4, levelName:'Joins', table:'employees', difficulty:'Intermediate',
    question:'Show total salary cost per department.',
    hint:'JOIN + SUM(salary) GROUP BY department.',
    starterQuery:'SELECT d.name, SUM(e.salary) AS total_salary\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id\nGROUP BY d.name;' },

  // ── LEVEL 5: Subqueries ──
  { id:61, level:5, levelName:'Subqueries', table:'employees', difficulty:'Advanced',
    question:'Find employees earning above average salary.',
    hint:'WHERE salary > (SELECT AVG(salary) FROM employees).',
    starterQuery:'SELECT * FROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees);' },
  { id:62, level:5, levelName:'Subqueries', table:'employees', difficulty:'Advanced',
    question:'Find employees earning the highest salary.',
    hint:'WHERE salary = (SELECT MAX(salary) FROM employees).',
    starterQuery:'SELECT * FROM employees\nWHERE salary = (SELECT MAX(salary) FROM employees);' },
  { id:63, level:5, levelName:'Subqueries', table:'products', difficulty:'Advanced',
    question:'Find products priced above average product price.',
    hint:'WHERE price > (SELECT AVG(price) FROM products).',
    starterQuery:'SELECT * FROM products\nWHERE price > (SELECT AVG(price) FROM products);' },
  { id:64, level:5, levelName:'Subqueries', table:'students', difficulty:'Advanced',
    question:'Find students scoring above average score.',
    hint:'WHERE score > (SELECT AVG(score) FROM students).',
    starterQuery:'SELECT * FROM students\nWHERE score > (SELECT AVG(score) FROM students);' },
  { id:65, level:5, levelName:'Subqueries', table:'departments', difficulty:'Advanced',
    question:'Find departments whose budget exceeds average budget.',
    hint:'WHERE budget > (SELECT AVG(budget) FROM departments).',
    starterQuery:'SELECT * FROM departments\nWHERE budget > (SELECT AVG(budget) FROM departments);' },
  { id:66, level:5, levelName:'Subqueries', table:'employees', difficulty:'Advanced',
    question:'Find employees in the department with highest budget.',
    hint:'Use a subquery on departments to get the max budget dept id.',
    starterQuery:'SELECT * FROM employees\nWHERE department_id = (SELECT id FROM departments ORDER BY budget DESC LIMIT 1);' },
  { id:67, level:5, levelName:'Subqueries', table:'products', difficulty:'Advanced',
    question:'Find products with stock lower than average stock.',
    hint:'WHERE stock < (SELECT AVG(stock) FROM products).',
    starterQuery:'SELECT * FROM products\nWHERE stock < (SELECT AVG(stock) FROM products);' },
  { id:68, level:5, levelName:'Subqueries', table:'orders', difficulty:'Advanced',
    question:'Find customers who placed orders above average order value.',
    hint:'Subquery on AVG(quantity * price) via join.',
    starterQuery:'SELECT o.customer_name, o.quantity * p.price AS order_value\nFROM orders o JOIN products p ON o.product_id = p.id\nWHERE o.quantity * p.price > (\n  SELECT AVG(o2.quantity * p2.price)\n  FROM orders o2 JOIN products p2 ON o2.product_id = p2.id\n);' },
  { id:69, level:5, levelName:'Subqueries', table:'employees', difficulty:'Advanced',
    question:'Find departments having more employees than average.',
    hint:'HAVING COUNT(*) > (SELECT AVG(cnt) FROM ...).',
    starterQuery:'SELECT department, COUNT(*) AS cnt\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > (SELECT AVG(c) FROM (SELECT COUNT(*) c FROM employees GROUP BY department) t);' },
  { id:70, level:5, levelName:'Subqueries', table:'students', difficulty:'Advanced',
    question:'Find students with highest score in each subject.',
    hint:'Correlated subquery: WHERE score = MAX score for that subject.',
    starterQuery:'SELECT * FROM students s\nWHERE score = (SELECT MAX(score) FROM students WHERE subject = s.subject);' },

  // ── LEVEL 6: Self Joins ──
  { id:71, level:6, levelName:'Self Joins', table:'employees', difficulty:'Advanced',
    question:'Show employees and their managers.',
    hint:'Self join: e JOIN employees m ON e.manager_id = m.id.',
    starterQuery:'SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id;' },
  { id:72, level:6, levelName:'Self Joins', table:'employees', difficulty:'Advanced',
    question:'Find employees without managers.',
    hint:'WHERE manager_id IS NULL.',
    starterQuery:'SELECT * FROM employees WHERE manager_id IS NULL;' },
  { id:73, level:6, levelName:'Self Joins', table:'employees', difficulty:'Advanced',
    question:'Find managers with more than one subordinate.',
    hint:'GROUP BY manager_id HAVING COUNT(*) > 1.',
    starterQuery:'SELECT m.name, COUNT(e.id) AS subordinates\nFROM employees e\nINNER JOIN employees m ON e.manager_id = m.id\nGROUP BY m.name\nHAVING COUNT(e.id) > 1;' },
  { id:74, level:6, levelName:'Self Joins', table:'employees', difficulty:'Advanced',
    question:'Show manager name and employee name pairs.',
    hint:'Self join with INNER JOIN to get only managed employees.',
    starterQuery:'SELECT m.name AS manager, e.name AS employee\nFROM employees e\nINNER JOIN employees m ON e.manager_id = m.id;' },
  { id:75, level:6, levelName:'Self Joins', table:'employees', difficulty:'Advanced',
    question:'Count employees reporting to each manager.',
    hint:'GROUP BY manager_id, join manager name.',
    starterQuery:'SELECT m.name AS manager, COUNT(e.id) AS reports\nFROM employees e\nINNER JOIN employees m ON e.manager_id = m.id\nGROUP BY m.name;' },

  // ── LEVEL 7: Window Functions ──
  { id:76, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Rank employees by salary.',
    hint:'RANK() OVER (ORDER BY salary DESC).',
    starterQuery:'SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS salary_rank\nFROM employees;' },
  { id:77, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Dense rank employees by salary.',
    hint:'DENSE_RANK() OVER (ORDER BY salary DESC).',
    starterQuery:'SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank\nFROM employees;' },
  { id:78, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Find top 3 highest-paid employees using window functions.',
    hint:'Use RANK() in a subquery, filter WHERE rank <= 3.',
    starterQuery:'SELECT * FROM (\n  SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS rnk\n  FROM employees\n) t WHERE rnk <= 3;' },
  { id:79, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Show salary rank within each department.',
    hint:'RANK() OVER (PARTITION BY department ORDER BY salary DESC).',
    starterQuery:'SELECT name, department, salary,\n  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank\nFROM employees;' },
  { id:80, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Calculate running total of salaries.',
    hint:'SUM(salary) OVER (ORDER BY id ROWS UNBOUNDED PRECEDING).',
    starterQuery:'SELECT name, salary,\n  SUM(salary) OVER (ORDER BY id) AS running_total\nFROM employees;' },
  { id:81, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:"Show each employee's salary compared to department average.",
    hint:'AVG(salary) OVER (PARTITION BY department).',
    starterQuery:'SELECT name, department, salary,\n  AVG(salary) OVER (PARTITION BY department) AS dept_avg\nFROM employees;' },
  { id:82, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Find second highest salary.',
    hint:'Use DENSE_RANK(), filter WHERE rank = 2.',
    starterQuery:'SELECT name, salary FROM (\n  SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk\n  FROM employees\n) t WHERE rnk = 2;' },
  { id:83, level:7, levelName:'Window Functions', table:'employees', difficulty:'Advanced',
    question:'Find highest-paid employee in each department.',
    hint:'RANK() PARTITION BY department, filter rank = 1.',
    starterQuery:'SELECT * FROM (\n  SELECT name, department, salary,\n    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk\n  FROM employees\n) t WHERE rnk = 1;' },
  { id:84, level:7, levelName:'Window Functions', table:'products', difficulty:'Advanced',
    question:'Show cumulative stock by product price.',
    hint:'SUM(stock) OVER (ORDER BY price).',
    starterQuery:'SELECT name, price, stock,\n  SUM(stock) OVER (ORDER BY price) AS cumulative_stock\nFROM products;' },
  { id:85, level:7, levelName:'Window Functions', table:'students', difficulty:'Advanced',
    question:'Rank students by score within each subject.',
    hint:'RANK() OVER (PARTITION BY subject ORDER BY score DESC).',
    starterQuery:'SELECT name, subject, score,\n  RANK() OVER (PARTITION BY subject ORDER BY score DESC) AS subject_rank\nFROM students;' },

  // ── LEVEL 8: Advanced Challenges ──
  { id:86, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Find department contributing highest percentage of total salary.',
    hint:'SUM(salary)/total * 100 per department.',
    starterQuery:'SELECT department,\n  SUM(salary) AS dept_salary,\n  ROUND(SUM(salary) * 100.0 / (SELECT SUM(salary) FROM employees), 2) AS pct\nFROM employees GROUP BY department ORDER BY pct DESC LIMIT 1;' },
  { id:87, level:8, levelName:'Advanced Challenges', table:'products', difficulty:'Expert',
    question:'Find products never ordered.',
    hint:'LEFT JOIN orders, WHERE order id IS NULL.',
    starterQuery:'SELECT p.name FROM products p\nLEFT JOIN orders o ON o.product_id = p.id\nWHERE o.id IS NULL;' },
  { id:88, level:8, levelName:'Advanced Challenges', table:'orders', difficulty:'Expert',
    question:'Find customers who ordered multiple products.',
    hint:'GROUP BY customer, COUNT(DISTINCT product_id) > 1.',
    starterQuery:'SELECT customer_name, COUNT(DISTINCT product_id) AS products_ordered\nFROM orders GROUP BY customer_name HAVING COUNT(DISTINCT product_id) > 1;' },
  { id:89, level:8, levelName:'Advanced Challenges', table:'orders', difficulty:'Expert',
    question:'Find the product generating maximum revenue.',
    hint:'SUM(quantity * price) per product, ORDER BY DESC LIMIT 1.',
    starterQuery:'SELECT p.name, SUM(o.quantity * p.price) AS revenue\nFROM orders o JOIN products p ON o.product_id = p.id\nGROUP BY p.name ORDER BY revenue DESC LIMIT 1;' },
  { id:90, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Find department with highest average salary.',
    hint:'GROUP BY department, ORDER BY AVG(salary) DESC LIMIT 1.',
    starterQuery:'SELECT department, AVG(salary) AS avg_salary\nFROM employees GROUP BY department ORDER BY avg_salary DESC LIMIT 1;' },
  { id:91, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Find employees earning more than their manager.',
    hint:'Self join: WHERE e.salary > m.salary.',
    starterQuery:'SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary\nFROM employees e JOIN employees m ON e.manager_id = m.id\nWHERE e.salary > m.salary;' },
  { id:92, level:8, levelName:'Advanced Challenges', table:'students', difficulty:'Expert',
    question:'Find students in top 10% scores.',
    hint:'WHERE score >= PERCENTILE or score > 90th percentile value.',
    starterQuery:'SELECT * FROM students\nWHERE score >= (SELECT score FROM students ORDER BY score DESC LIMIT 1 OFFSET (SELECT COUNT(*)/10 FROM students));' },
  { id:93, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Find departments where salary expenditure exceeds budget.',
    hint:'JOIN departments, compare SUM(salary) to budget.',
    starterQuery:'SELECT d.name, SUM(e.salary) AS total_salary, d.budget\nFROM employees e JOIN departments d ON e.department_id = d.id\nGROUP BY d.name, d.budget HAVING SUM(e.salary) > d.budget;' },
  { id:94, level:8, levelName:'Advanced Challenges', table:'orders', difficulty:'Expert',
    question:'Find month-wise order revenue.',
    hint:'Extract month from order_date, SUM(quantity * price).',
    starterQuery:"SELECT strftime('%Y-%m', o.order_date) AS month,\n  SUM(o.quantity * p.price) AS revenue\nFROM orders o JOIN products p ON o.product_id = p.id\nGROUP BY month ORDER BY month;" },
  { id:95, level:8, levelName:'Advanced Challenges', table:'orders', difficulty:'Expert',
    question:'Find category-wise revenue from orders.',
    hint:'JOIN orders + products, GROUP BY category.',
    starterQuery:'SELECT p.category, SUM(o.quantity * p.price) AS revenue\nFROM orders o JOIN products p ON o.product_id = p.id\nGROUP BY p.category ORDER BY revenue DESC;' },
  { id:96, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Find employees hired earliest in each department.',
    hint:'MIN(hire_date) per department with self-join or subquery.',
    starterQuery:'SELECT * FROM employees e\nWHERE hire_date = (SELECT MIN(hire_date) FROM employees WHERE department = e.department);' },
  { id:97, level:8, levelName:'Advanced Challenges', table:'orders', difficulty:'Expert',
    question:'Find customers who purchased Electronics and Furniture.',
    hint:'Two IN subqueries or GROUP BY with HAVING two categories.',
    starterQuery:"SELECT customer_name FROM orders o\nJOIN products p ON o.product_id = p.id\nWHERE p.category IN ('Electronics', 'Furniture')\nGROUP BY customer_name\nHAVING COUNT(DISTINCT p.category) = 2;" },
  { id:98, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Find salary difference between highest and lowest employee in each department.',
    hint:'MAX(salary) - MIN(salary) per department.',
    starterQuery:'SELECT department, MAX(salary) - MIN(salary) AS salary_range\nFROM employees GROUP BY department;' },
  { id:99, level:8, levelName:'Advanced Challenges', table:'employees', difficulty:'Expert',
    question:'Report: department name, employee count, average salary, total salary, and budget.',
    hint:'JOIN departments, multiple aggregates.',
    starterQuery:'SELECT d.name, COUNT(e.id) AS emp_count,\n  AVG(e.salary) AS avg_salary,\n  SUM(e.salary) AS total_salary,\n  d.budget\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nGROUP BY d.name, d.budget;' },
  { id:100, level:8, levelName:'Advanced Challenges', table:'students', difficulty:'Expert',
    question:'Return the top-performing student in every subject.',
    hint:'Correlated subquery or RANK() PARTITION BY subject.',
    starterQuery:'SELECT * FROM (\n  SELECT *, RANK() OVER (PARTITION BY subject ORDER BY score DESC) AS rnk\n  FROM students\n) t WHERE rnk = 1;' },

  // ── LEVEL 9: Expert Interview Questions ──
  { id:101, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Write the query for the 3rd highest salary.',
    hint:'DENSE_RANK() = 3 or LIMIT 1 OFFSET 2 on sorted salary.',
    starterQuery:'SELECT DISTINCT salary FROM (\n  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk\n  FROM employees\n) t WHERE rnk = 3;' },
  { id:102, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Find employees earning more than all employees in Marketing.',
    hint:'WHERE salary > ALL (SELECT salary FROM ... WHERE dept = Marketing).',
    starterQuery:"SELECT * FROM employees\nWHERE salary > ALL (SELECT salary FROM employees WHERE department = 'Marketing');" },
  { id:103, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Find duplicate salaries.',
    hint:'GROUP BY salary HAVING COUNT(*) > 1.',
    starterQuery:'SELECT salary, COUNT(*) AS occurrences\nFROM employees\nGROUP BY salary HAVING COUNT(*) > 1;' },
  { id:104, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Find departments with the same average salary.',
    hint:'Self-join on AVG salary grouped by department.',
    starterQuery:'SELECT a.department, b.department, a.avg_sal\nFROM (SELECT department, AVG(salary) AS avg_sal FROM employees GROUP BY department) a\nJOIN (SELECT department, AVG(salary) AS avg_sal FROM employees GROUP BY department) b\n  ON a.avg_sal = b.avg_sal AND a.department < b.department;' },
  { id:105, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Find gaps in employee IDs.',
    hint:'Self join where id+1 not in employee ids.',
    starterQuery:'SELECT e.id + 1 AS gap_start\nFROM employees e\nWHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = e.id + 1)\nAND e.id < (SELECT MAX(id) FROM employees);' },
  { id:106, level:9, levelName:'Expert Interview', table:'students', difficulty:'Expert',
    question:'Find consecutive students with grade A.',
    hint:'Self join on consecutive IDs where both have grade A.',
    starterQuery:"SELECT s1.name AS student1, s2.name AS student2\nFROM students s1 JOIN students s2 ON s1.id + 1 = s2.id\nWHERE s1.grade = 'A' AND s2.grade = 'A';" },
  { id:107, level:9, levelName:'Expert Interview', table:'students', difficulty:'Expert',
    question:'Pivot student subjects into columns (show score per subject).',
    hint:'Use CASE WHEN subject = X THEN score END aggregated.',
    starterQuery:"SELECT name,\n  MAX(CASE WHEN subject = 'Math' THEN score END) AS Math,\n  MAX(CASE WHEN subject = 'Science' THEN score END) AS Science,\n  MAX(CASE WHEN subject = 'English' THEN score END) AS English\nFROM students GROUP BY name;" },
  { id:108, level:9, levelName:'Expert Interview', table:'products', difficulty:'Expert',
    question:'Find top product by stock in each category.',
    hint:'RANK() OVER (PARTITION BY category ORDER BY stock DESC) = 1.',
    starterQuery:'SELECT * FROM (\n  SELECT *, RANK() OVER (PARTITION BY category ORDER BY stock DESC) AS rnk\n  FROM products\n) t WHERE rnk = 1;' },
  { id:109, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Calculate median employee salary.',
    hint:'Use PERCENTILE concept or middle row(s) with LIMIT OFFSET.',
    starterQuery:'SELECT AVG(salary) AS median_salary FROM (\n  SELECT salary FROM employees ORDER BY salary\n  LIMIT 2 - (SELECT COUNT(*) FROM employees) % 2\n  OFFSET ((SELECT COUNT(*) FROM employees) - 1) / 2\n) t;' },
  { id:110, level:9, levelName:'Expert Interview', table:'employees', difficulty:'Expert',
    question:'Find employees whose salary is in the top 20% of all salaries.',
    hint:'WHERE salary >= 80th percentile value.',
    starterQuery:'SELECT * FROM employees\nWHERE salary >= (\n  SELECT salary FROM employees ORDER BY salary DESC\n  LIMIT 1 OFFSET (SELECT COUNT(*)/5 FROM employees)\n);' },
];

// Level metadata
const PRACTICE_LEVELS = [
  { level:1, name:'Basic SELECT',        icon:'📖', desc:'Fundamental SELECT queries on employees and products',  difficulty:'Beginner' },
  { level:2, name:'Aggregate Functions', icon:'📊', desc:'COUNT, SUM, AVG, MIN, MAX across multiple tables',      difficulty:'Beginner' },
  { level:3, name:'GROUP BY & HAVING',   icon:'🗂️',  desc:'Group rows and filter aggregated data',                difficulty:'Intermediate' },
  { level:4, name:'Joins',               icon:'🔗', desc:'INNER, LEFT, and multi-table joins',                   difficulty:'Intermediate' },
  { level:5, name:'Subqueries',          icon:'🔍', desc:'Nested queries and correlated subqueries',             difficulty:'Advanced' },
  { level:6, name:'Self Joins',          icon:'🔄', desc:'Join a table with itself for hierarchical data',       difficulty:'Advanced' },
  { level:7, name:'Window Functions',    icon:'🪟', desc:'RANK, DENSE_RANK, ROW_NUMBER, running totals',         difficulty:'Advanced' },
  { level:8, name:'Advanced Challenges', icon:'🚀', desc:'Complex multi-table and analytical queries',           difficulty:'Expert' },
  { level:9, name:'Expert Interview',    icon:'🎓', desc:'Real interview questions — gaps, pivots, medians',     difficulty:'Expert' },
];

// Practice state
const practiceState = {
  activeLevel: 1,
  activeQuestionId: null
};

function getPracticeSolved() {
  try {
    const raw = localStorage.getItem('sqlvis_practice_solved');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch(e) { return new Set(); }
}

function savePracticeSolved(solvedSet) {
  try { localStorage.setItem('sqlvis_practice_solved', JSON.stringify([...solvedSet])); } catch(e) {}
}

function compareResults(res1, res2) {
  if (!res1 || !res2) return false;
  const rows1 = res1.rows || [];
  const rows2 = res2.rows || [];
  if (rows1.length !== rows2.length) return false;
  if (rows1.length === 0) return true;

  const getCleanKeys = (row) => Object.keys(row).filter(k => !k.startsWith('_'));
  const keys1 = getCleanKeys(rows1[0]);
  const keys2 = getCleanKeys(rows2[0]);

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < rows1.length; i++) {
    const r1 = rows1[i];
    const r2 = rows2[i];

    for (let j = 0; j < keys1.length; j++) {
      const v1 = r1[keys1[j]];
      const v2 = r2[keys2[j]];

      if (v1 === undefined || v2 === undefined) return false;

      const f1 = parseFloat(v1);
      const f2 = parseFloat(v2);
      if (!isNaN(f1) && !isNaN(f2)) {
        if (Math.abs(f1 - f2) > 0.01) return false;
      } else {
        if (String(v1).trim().toLowerCase() !== String(v2).trim().toLowerCase()) {
          return false;
        }
      }
    }
  }
  return true;
}

function checkChallengeAnswer(sql, result) {
  if (!practiceState.activeQuestionId) return;

  const q = PRACTICE_QUESTIONS.find(q => q.id === practiceState.activeQuestionId);
  if (!q) return;

  const sqlLower = sql.toLowerCase();
  const tableLower = q.table.toLowerCase();
  if (!sqlLower.includes(tableLower)) {
    return;
  }

  try {
    const expectedAst = new SQLParser(q.starterQuery).parse();
    const engine = new SQLEngine(State.db);
    const expectedResult = engine.execute(expectedAst);

    if (compareResults(result, expectedResult)) {
      markQuestionSolved(q.id);
    }
  } catch (e) {
    console.error("Error verifying challenge answer:", e);
  }
}

function markQuestionSolved(id) {
  const solved = getPracticeSolved();
  if (solved.has(id)) return;
  solved.add(id);
  savePracticeSolved(solved);

  // Update circle UI if modal is open
  const circle = document.querySelector(`.chal-circle[data-qid="${id}"]`);
  if (circle) {
    circle.classList.add('chal-circle-solved');
    circle.classList.remove('chal-circle-active');
  }
  // Also update old card UI if present
  const card = document.querySelector(`.question-card[data-qid="${id}"]`);
  if (card) {
    card.classList.add('solved');
    const badge = card.querySelector('.question-num-badge');
    if (badge) badge.style.background = 'linear-gradient(135deg,#10b981,#059669)';
  }

  // Update progress
  updatePracticeProgress();

  // Update level badge in sidebar
  updatePracticeSidebarCounts();

  // Show achievement toast & award XP based on difficulty
  const q = PRACTICE_QUESTIONS.find(q => q.id === id);
  if (q) {
    let xpGained = 10;
    if (q.difficulty === 'Intermediate') xpGained = 20;
    else if (q.difficulty === 'Advanced') xpGained = 35;
    else if (q.difficulty === 'Expert') xpGained = 50;

    State.xp += xpGained;
    State.level = Math.floor(State.xp / 100) + 1;
    const countEl = document.getElementById('xp-count');
    const numEl = document.getElementById('level-num');
    if (countEl) countEl.textContent = State.xp + ' XP';
    if (numEl) numEl.textContent = State.level;

    showAchievementMsg('🎯 Question Solved!', `#${q.id} Solved! (+${xpGained} XP)`);
  }
}

function updatePracticeProgress() {
  const solved = getPracticeSolved();
  const count = solved.size;
  const pct = Math.round((count / 110) * 100);
  const el = document.getElementById('practice-solved-count');
  const bar = document.getElementById('practice-progress-bar');
  if (el) el.textContent = count;
  if (bar) bar.style.width = pct + '%';
}

function updatePracticeSidebarCounts() {
  const solved = getPracticeSolved();
  PRACTICE_LEVELS.forEach(lvl => {
    // Update old sidebar buttons (if present)
    const btn = document.querySelector(`.practice-level-btn[data-level="${lvl.level}"]`);
    if (btn) {
      const qs = PRACTICE_QUESTIONS.filter(q => q.level === lvl.level);
      const solvedCount = qs.filter(q => solved.has(q.id)).length;
      const badge = btn.querySelector('.lvl-badge');
      if (badge) badge.textContent = `${solvedCount}/${qs.length}`;
    }
    // Update new circle UI level count
    const section = document.getElementById(`chal-level-${lvl.level}`);
    if (section) {
      const countEl = section.querySelector('.chal-level-count');
      if (countEl) {
        const qs = PRACTICE_QUESTIONS.filter(q => q.level === lvl.level);
        const solvedCount = qs.filter(q => solved.has(q.id)).length;
        countEl.textContent = `${solvedCount}/${qs.length} solved`;
      }
    }
  });
}

function renderPracticeModal() {
  const solved = getPracticeSolved();

  // ── Progress bar ──
  updatePracticeProgress();

  // ── Render circle-grid body ──
  const body = document.getElementById('chal-modal-body');
  if (!body) return;

  body.innerHTML = PRACTICE_LEVELS.map((lvl, idx) => {
    const qs = PRACTICE_QUESTIONS.filter(q => q.level === lvl.level);
    const solvedCount = qs.filter(q => solved.has(q.id)).length;
    const diffClass = lvl.difficulty.toLowerCase();

    const circles = qs.map(q => {
      const isSolved = solved.has(q.id);
      const isActive = practiceState.activeQuestionId === q.id;
      
      // Check saved question border color
      const qColor = (practiceState.questionColors && practiceState.questionColors[q.id]) || 'none';
      
      let cls = 'chal-circle';
      if (isSolved) cls += ' chal-circle-solved';
      if (isActive) cls += ' chal-circle-active';
      if (qColor !== 'none') cls += ` border-${qColor}`;
      
      return `<button class="${cls}" data-qid="${q.id}" title="${esc(q.question)}" onclick="openQuestionColorChooser(event, ${q.id})">${q.id}</button>`;
    }).join('');

    const divider = idx < PRACTICE_LEVELS.length - 1 ? '<hr class="chal-level-divider">' : '';

    return `
      <div class="chal-level-section" id="chal-level-${lvl.level}">
        <div class="chal-level-heading">
          <span style="font-size:18px">${lvl.icon}</span>
          <span class="chal-level-heading-text">Level ${lvl.level}: ${esc(lvl.name)}</span>
          <span class="chal-level-diff-badge ${diffClass}">${esc(lvl.difficulty)}</span>
          <span class="chal-level-count">${solvedCount}/${qs.length} solved</span>
        </div>
        <div class="chal-circles-grid">${circles}</div>
      </div>
      ${divider}`;
  }).join('');
}

window.switchPracticeLevel = function(level) {
  practiceState.activeLevel = level;
  renderPracticeModal();
};

// ── Challenge navigation helpers ──
function getChalLevelQuestions(qId) {
  const q = PRACTICE_QUESTIONS.find(x => x.id === qId);
  if (!q) return [];
  return PRACTICE_QUESTIONS.filter(x => x.level === q.level);
}

function goToNextChallenge() {
  const currentId = practiceState.activeQuestionId;
  if (!currentId) return;
  const allLevelQs = getChalLevelQuestions(currentId);
  const idx = allLevelQs.findIndex(x => x.id === currentId);
  if (idx === -1) return;
  // Try next in same level, then first of next level
  let nextQ = allLevelQs[idx + 1];
  if (!nextQ) {
    const currentLevel = allLevelQs[0]?.level;
    const nextLevelMeta = PRACTICE_LEVELS.find(l => l.level === (currentLevel || 0) + 1);
    if (nextLevelMeta) {
      nextQ = PRACTICE_QUESTIONS.find(x => x.level === nextLevelMeta.level);
    }
  }
  if (nextQ) tryQuestion(nextQ.id);
}

// ── Close challenge bar ──
function closeChallengeBar() {
  practiceState.activeQuestionId = null;
  const bar = document.getElementById('challenge-bar');
  const revWrap = document.getElementById('reveal-solution-wrap');
  if (bar) bar.style.display = 'none';
  if (revWrap) revWrap.style.display = 'none';
  // Remove solution overlay if present
  const overlay = document.getElementById('solution-overlay');
  if (overlay) overlay.remove();

  // Reset hint panel
  const hintBar = document.getElementById('challenge-hint-bar');
  const hintBtn = document.getElementById('btn-challenge-hint');
  if (hintBar) hintBar.style.display = 'none';
  if (hintBtn) hintBtn.classList.remove('active');
}

window.toggleHint = function(id) {
  const el = document.getElementById('hint-' + id);
  if (!el) return;
  el.classList.toggle('visible');
};

// Global function to open color chooser popover for individual question circles
window.openQuestionColorChooser = function(event, qId) {
  event.stopPropagation();
  event.preventDefault();
  
  const q = PRACTICE_QUESTIONS.find(x => x.id === qId);
  if (!q) return;

  let popover = document.getElementById('color-chooser-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'color-chooser-popover';
    popover.className = 'color-chooser-popover';
    popover.style.position = 'absolute';
    popover.style.zIndex = '10000';
    document.body.appendChild(popover);
    
    // Close on clicking anywhere else
    document.addEventListener('click', function(e) {
      if (!popover.contains(e.target) && !e.target.closest('.chal-circle')) {
        popover.style.display = 'none';
      }
    });
  }
  
  popover.innerHTML = `
    <div class="color-chooser-q-title">Q${q.id}: ${esc(q.question.substring(0, 45))}${q.question.length > 45 ? '...' : ''}</div>
    <button class="color-opt-btn start-btn" onclick="selectQuestionAction(${q.id}, 'try')">▶ Start Challenge</button>
    <div class="color-chooser-title">Set Difficulty</div>
    <div class="color-palette">
      <button class="color-circle-btn easy" onclick="selectQuestionColor(${q.id}, 'green')" title="Easy">🟢</button>
      <button class="color-circle-btn medium" onclick="selectQuestionColor(${q.id}, 'orange')" title="Medium">🟠</button>
      <button class="color-circle-btn hard" onclick="selectQuestionColor(${q.id}, 'red')" title="Hard">🔴</button>
    </div>
  `;
  
  popover.style.display = 'block';
  
  const rect = event.target.getBoundingClientRect();
  popover.style.left = `${window.scrollX + rect.left + rect.width / 2 - 110}px`;
  popover.style.top = `${window.scrollY + rect.bottom + 8}px`;
};

// Global function to trigger starting challenge from popover
window.selectQuestionAction = function(qId, action) {
  if (action === 'try') {
    const popover = document.getElementById('color-chooser-popover');
    if (popover) popover.style.display = 'none';
    tryQuestion(qId);
  }
};

// Global function to select a question border color
window.selectQuestionColor = function(qId, color) {
  practiceState.questionColors = practiceState.questionColors || {};
  if (color === 'none') {
    delete practiceState.questionColors[qId];
  } else {
    practiceState.questionColors[qId] = color;
  }
  
  // Update border in DOM directly if present
  const btn = document.querySelector(`.chal-circle[data-qid="${qId}"]`);
  if (btn) {
    btn.classList.remove('border-red', 'border-orange', 'border-green');
    if (color !== 'none') {
      btn.classList.add(`border-${color}`);
    }
  }
  
  // Hide popover
  const popover = document.getElementById('color-chooser-popover');
  if (popover) {
    popover.style.display = 'none';
  }
  
  // Save updated config
  window.saveConfigToDatabase();
};

let saveDebounceTimer = null;
window.saveConfigToDatabase = function() {
  const statusEl = document.getElementById('notes-status');
  if (statusEl) {
    statusEl.textContent = 'Saving...';
  }
  
  const notesVal = document.getElementById('notes-textarea')?.value || '';
  const data = {
    levelColors: practiceState.levelColors || {},
    questionColors: practiceState.questionColors || {},
    notes: notesVal
  };
  
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const resData = await res.json();
        if (statusEl) {
          statusEl.textContent = resData.storage === 'fallback' ? 'Saved locally (fallback)' : 'Saved to database';
        }
      } else {
        if (statusEl) statusEl.textContent = 'Error saving';
      }
    } catch (err) {
      console.error('Error saving config:', err);
      if (statusEl) statusEl.textContent = 'Error saving';
    }
  }, 400);
};

window.loadConfigFromDatabase = async function() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      practiceState.levelColors = data.levelColors || {};
      practiceState.questionColors = data.questionColors || {};
      
      // Update modal borders by re-rendering
      renderPracticeModal();
      
      // Update notes
      const notesArea = document.getElementById('notes-textarea');
      if (notesArea) {
        notesArea.value = data.notes || '';
      }
      
      const statusEl = document.getElementById('notes-status');
      if (statusEl) {
        statusEl.textContent = data.storage === 'fallback' ? 'Saved locally' : 'Saved to database';
      }
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
};

window.tryQuestion = function(id) {
  const q = PRACTICE_QUESTIONS.find(q => q.id === id);
  if (!q) return;

  // Set active question for solved-tracking
  practiceState.activeQuestionId = id;

  // Build the editor content: question as comment on top, then query
  const commentBlock = `-- 🎯 Challenge Q${q.id} · Level ${q.level}: ${q.levelName}\n-- ${q.question}\n\n`;
  const editorEl = document.getElementById('sql-editor');
  if (editorEl) {
    editorEl.value = commentBlock;
    if (typeof updateGutter === 'function') updateGutter();
  }

  // Close modal, switch nav back to Editor tab
  document.getElementById('challenges-modal').style.display = 'none';
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-editor').classList.add('active');

  // Show challenge bar
  const bar = document.getElementById('challenge-bar');
  const badgeEl = document.getElementById('challenge-bar-badge');
  const textEl = document.getElementById('challenge-bar-text');
  if (bar) bar.style.display = 'flex';
  if (badgeEl) badgeEl.textContent = `Q${q.id} · Lv${q.level}`;
  if (textEl) textEl.textContent = q.question;

  // Reset hint panel
  const hintBar = document.getElementById('challenge-hint-bar');
  const hintBtn = document.getElementById('btn-challenge-hint');
  if (hintBar) {
    hintBar.style.display = 'none';
  }
  if (hintBtn) {
    hintBtn.classList.remove('active');
  }

  // Show reveal solution button
  const revWrap = document.getElementById('reveal-solution-wrap');
  if (revWrap) revWrap.style.display = 'block';

  // Remove any existing solution overlay
  const existingOverlay = document.getElementById('solution-overlay');
  if (existingOverlay) existingOverlay.remove();

  // Show hint in explanation panel
  if (typeof switchBottomTab === 'function') switchBottomTab('explanation');
  const explEl = document.getElementById('explanation-text');
  if (explEl) {
    explEl.innerHTML = `
      <div style="background:#7c3aed11;border:1px solid #7c3aed33;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-weight:700;color:var(--accent-purple);margin-bottom:4px">
          🎯 Practice Q${q.id}: ${esc(q.question)}
        </div>
        <div style="color:var(--text-secondary);font-size:11px">Table: <code>${esc(q.table)}</code> · Level ${q.level}: ${esc(q.levelName)}</div>
        <div style="color:var(--text-muted);font-size:11px;margin-top:6px">💡 Hint: ${esc(q.hint)}</div>
      </div>`;
  }

  // Clear previous query run artifacts
  const resultsWrap = document.getElementById('results-table-wrap');
  if (resultsWrap) {
    resultsWrap.innerHTML = '<div class="explanation-placeholder">Query results will appear here.</div>';
  }
  const timer = document.getElementById('query-timer');
  if (timer) {
    timer.textContent = '—';
    timer.className = '';
  }
  const metricTime = document.getElementById('metric-time');
  if (metricTime) metricTime.textContent = '—';
  const metricRows = document.getElementById('metric-rows');
  if (metricRows) metricRows.textContent = '—';
  const metricCost = document.getElementById('metric-cost');
  if (metricCost) metricCost.textContent = '—';
  const metricIndex = document.getElementById('metric-index');
  if (metricIndex) metricIndex.textContent = '—';
  const metricOps = document.getElementById('metric-ops');
  if (metricOps) metricOps.textContent = '—';

  const welcome = document.getElementById('viz-welcome');
  const vizSteps = document.getElementById('viz-steps');
  const execFlow = document.getElementById('execution-flow');
  const scrubber = document.getElementById('timeline-scrubber');
  if (welcome) welcome.style.display = 'block';
  if (vizSteps) {
    vizSteps.style.display = 'none';
    vizSteps.innerHTML = '';
  }
  if (execFlow) {
    execFlow.style.display = 'none';
    execFlow.innerHTML = '';
  }
  if (scrubber) scrubber.style.display = 'none';
};

// Backward-compat alias so the nav-tab handler still works
function renderChallenges() {
  renderPracticeModal();
}

function showAchievementMsg(title, desc) {
  const toast = document.getElementById('achievement-toast');
  if (toast) {
    const titleEl = document.getElementById('achievement-title');
    const descEl = document.getElementById('achievement-desc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
}

// ── Wire up event listeners ──
function initSQLVisApp() {
  // New close button
  const closeBtn = document.getElementById('btn-close-chal-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      document.getElementById('challenges-modal').style.display = 'none';
    });
  }

  // Next challenge arrow
  const nextBtn = document.getElementById('btn-next-challenge');
  if (nextBtn) {
    nextBtn.addEventListener('click', goToNextChallenge);
  }

  // Close challenge bar
  const closeChalBtn = document.getElementById('btn-close-challenge');
  if (closeChalBtn) {
    closeChalBtn.addEventListener('click', closeChallengeBar);
  }

  // Challenge hint button toggle
  const hintBtn = document.getElementById('btn-challenge-hint');
  if (hintBtn) {
    hintBtn.addEventListener('click', function() {
      const hintBar = document.getElementById('challenge-hint-bar');
      if (!hintBar) return;
      
      const isHidden = hintBar.style.display === 'none';
      if (isHidden) {
        // Find current question hint
        const qId = practiceState.activeQuestionId;
        if (!qId) return;
        const q = PRACTICE_QUESTIONS.find(x => x.id === qId);
        if (!q) return;
        
        const textEl = document.getElementById('challenge-hint-text');
        if (textEl) textEl.textContent = q.hint;
        hintBar.style.display = 'flex';
        hintBtn.classList.add('active');
      } else {
        hintBar.style.display = 'none';
        hintBtn.classList.remove('active');
      }
    });
  }

  // Reveal solution button
  const revealBtn = document.getElementById('btn-reveal-solution');
  if (revealBtn) {
    revealBtn.addEventListener('click', function() {
      const qId = practiceState.activeQuestionId;
      if (!qId) return;
      const q = PRACTICE_QUESTIONS.find(x => x.id === qId);
      if (!q) return;

      // Remove existing overlay
      const existing = document.getElementById('solution-overlay');
      if (existing) { existing.remove(); return; }

      const container = document.getElementById('editor-container');
      if (!container) return;

      const overlay = document.createElement('div');
      overlay.className = 'solution-overlay';
      overlay.id = 'solution-overlay';
      overlay.innerHTML = `
        <div class="solution-overlay-label">✅ Solution</div>
        <pre class="solution-overlay-query">${esc(q.starterQuery)}</pre>
        <div style="display:flex;gap:8px">
          <button class="solution-overlay-copy" id="sol-copy-btn">📋 Copy &amp; Use</button>
          <button class="solution-overlay-dismiss" id="sol-dismiss-btn">✕ Dismiss</button>
        </div>`;

      container.style.position = 'relative';
      container.appendChild(overlay);

      document.getElementById('sol-copy-btn').addEventListener('click', function() {
        const editor = document.getElementById('sql-editor');
        if (editor) {
          editor.value = q.starterQuery;
          if (typeof updateGutter === 'function') updateGutter();
        }
        overlay.remove();
        if (typeof runQuery === 'function') runQuery();
      });

      document.getElementById('sol-dismiss-btn').addEventListener('click', function() {
        overlay.remove();
      });
    });
  }

  // Mobile panel switching
  document.querySelectorAll('.mobile-panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mobile-panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const targetPanel = tab.dataset.panel;
      const left = document.getElementById('panel-left');
      const center = document.getElementById('panel-center');
      const right = document.getElementById('panel-right');
      
      left.classList.remove('mobile-active');
      center.classList.remove('mobile-active');
      right.classList.remove('mobile-active');
      
      if (targetPanel === 'left') left.classList.add('mobile-active');
      else if (targetPanel === 'center') center.classList.add('mobile-active');
      else if (targetPanel === 'right') right.classList.add('mobile-active');
    });
  });

  // Load config on startup
  if (typeof window.loadConfigFromDatabase === 'function') {
    window.loadConfigFromDatabase();
  }

  // Attach notes textarea change listener
  const notesArea = document.getElementById('notes-textarea');
  if (notesArea) {
    notesArea.addEventListener('input', window.saveConfigToDatabase);
  }

  // Clear notes button
  const clearNotesBtn = document.getElementById('btn-clear-notes');
  if (clearNotesBtn) {
    clearNotesBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear your notes?')) {
        const notesArea = document.getElementById('notes-textarea');
        if (notesArea) notesArea.value = '';
        window.saveConfigToDatabase();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSQLVisApp);
} else {
  initSQLVisApp();
}

// Hook into the sidebar close button (legacy)
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.practice-modal-close');
  if (btn) {
    const modalId = btn.dataset.modal;
    if (modalId) {
      document.getElementById(modalId).style.display = 'none';
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-editor').classList.add('active');
    }
  }
});


// ─────────────────────────────────────────────
// LEARN CENTER
// ─────────────────────────────────────────────
const LEARN_TOPICS = [
  { icon: '🔍', title: 'SELECT Basics', desc: 'Choose columns and filter data', query: 'SELECT name, salary FROM employees WHERE salary > 80000;' },
  { icon: '⋈', title: 'JOINs Explained', desc: 'Combine data from multiple tables', query: 'SELECT e.name, d.name as dept FROM employees e INNER JOIN departments d ON e.department_id = d.id;' },
  { icon: '⊕', title: 'GROUP BY & Aggregates', desc: 'Summarize data with COUNT, SUM, AVG', query: 'SELECT department, COUNT(*) as cnt, AVG(salary) as avg_sal FROM employees GROUP BY department HAVING COUNT(*) > 1 ORDER BY avg_sal DESC;' },
  { icon: '🪟', title: 'Window Functions', desc: 'Rank, number rows, calculate running totals', query: 'SELECT name, salary, department, RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank, SUM(salary) OVER (PARTITION BY department ORDER BY salary) as running_total FROM employees;' },
  { icon: '🧩', title: 'CTEs (WITH clause)', desc: 'Write readable, modular queries', query: 'WITH high_earners AS (\n  SELECT * FROM employees WHERE salary > 90000\n)\nSELECT department, COUNT(*) as count, AVG(salary) as avg\nFROM high_earners\nGROUP BY department;' },
  { icon: '📋', title: 'Subqueries', desc: 'Use queries inside queries', query: 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC;' },
  { icon: '➕', title: 'INSERT Data', desc: 'Add new rows to tables', query: "INSERT INTO departments (name, budget, location) VALUES ('Research', 900000, 'Seattle');SELECT * FROM departments;" },
  { icon: '✏️', title: 'UPDATE & DELETE', desc: 'Modify or remove existing data', query: "UPDATE employees SET salary = salary * 1.1 WHERE department = 'Engineering';\nSELECT name, department, salary FROM employees WHERE department = 'Engineering';" },
  { icon: '🏗', title: 'CREATE TABLE', desc: 'Define schema and constraints', query: 'CREATE TABLE IF NOT EXISTS projects (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT NOT NULL,\n  budget REAL DEFAULT 0,\n  status TEXT DEFAULT \'active\'\n);\nSELECT * FROM projects;' },
  { icon: '🔗', title: 'UNION & Set Ops', desc: 'Combine results from multiple queries', query: "SELECT name, 'Engineering' as source FROM employees WHERE department = 'Engineering'\nUNION ALL\nSELECT name, 'Marketing' as source FROM employees WHERE department = 'Marketing'\nORDER BY source;" }
];

function renderLearnContent() {
  const container = document.getElementById('learn-content');
  container.innerHTML = `
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">Click a topic to load its example query and see it visualized instantly.</p>
    <div class="learn-grid">
      ${LEARN_TOPICS.map((t, i) => `
        <div class="learn-card" onclick="loadLearnTopic(${i})">
          <div class="learn-card-icon">${t.icon}</div>
          <div class="learn-card-title">${esc(t.title)}</div>
          <div class="learn-card-desc">${esc(t.desc)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

window.loadLearnTopic = function(index) {
  const topic = LEARN_TOPICS[index];
  if (!topic) return;
  editor.value = topic.query;
  updateGutter();
  document.getElementById('learn-modal').style.display = 'none';
  runQuery();
};

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────
const LEADERBOARD_DATA = [
  { name: 'SQLNinja', xp: 4250, avatar: 'S' },
  { name: 'QueryQueen', xp: 3810, avatar: 'Q' },
  { name: 'DataDragon', xp: 3390, avatar: 'D' },
  { name: 'TableTamer', xp: 2980, avatar: 'T' },
  { name: 'JoinJockey', xp: 2640, avatar: 'J' },
  { name: 'IndexIvan', xp: 2100, avatar: 'I' },
  { name: 'WindowWendy', xp: 1870, avatar: 'W' },
  { name: 'You', xp: State.xp, avatar: '⭐', isYou: true }
];

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-content');
  const sorted = [...LEADERBOARD_DATA, { name: 'You', xp: State.xp, avatar: '⭐', isYou: true }]
    .filter((v, i, a) => !v.isYou || i === a.length - 1)
    .sort((a, b) => b.xp - a.xp);

  container.innerHTML = sorted.map((entry, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
    return `
      <div class="leaderboard-entry" style="${entry.isYou ? 'background:var(--bg-active);border-radius:8px;padding:4px;' : ''}">
        <div class="lb-rank ${rankClass}">${medal}</div>
        <div class="lb-avatar" style="${entry.isYou ? 'background:linear-gradient(135deg,#f0883e,#d29922)' : ''}">${entry.avatar}</div>
        <div class="lb-name">${esc(entry.name)}${entry.isYou ? ' <span class="badge badge-yellow">You</span>' : ''}</div>
        <div class="lb-xp">${entry.xp} XP</div>
      </div>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────
const TEMPLATES = [
  { title: 'Basic SELECT', desc: 'Select all rows from a table', sql: 'SELECT * FROM employees;' },
  { title: 'Filter with WHERE', desc: 'Filter employees by salary', sql: 'SELECT name, department, salary\nFROM employees\nWHERE salary > 90000\nORDER BY salary DESC;' },
  { title: 'GROUP BY + Aggregates', desc: 'Count and average per department', sql: 'SELECT department,\n  COUNT(*) AS headcount,\n  AVG(salary) AS avg_salary,\n  MIN(salary) AS min_sal,\n  MAX(salary) AS max_sal\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 1\nORDER BY avg_salary DESC;' },
  { title: 'INNER JOIN', desc: 'Join employees with departments', sql: 'SELECT e.name, e.salary, d.name AS dept_name, d.location\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id\nORDER BY e.salary DESC;' },
  { title: 'LEFT JOIN', desc: 'All products with optional orders', sql: 'SELECT p.name, p.price,\n  COALESCE(SUM(o.quantity), 0) AS total_orders\nFROM products p\nLEFT JOIN orders o ON p.id = o.product_id\nGROUP BY p.id, p.name, p.price\nORDER BY total_orders DESC;' },
  { title: 'Window Functions', desc: 'Salary rank within department', sql: 'SELECT\n  name, department, salary,\n  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,\n  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,\n  DENSE_RANK() OVER (ORDER BY salary DESC) AS overall_rank,\n  SUM(salary) OVER (PARTITION BY department ORDER BY salary) AS running_total\nFROM employees;' },
  { title: 'CTE', desc: 'Common Table Expression example', sql: 'WITH dept_stats AS (\n  SELECT\n    department,\n    COUNT(*) AS cnt,\n    AVG(salary) AS avg_sal\n  FROM employees\n  GROUP BY department\n)\nSELECT\n  e.name, e.salary, e.department,\n  ds.avg_sal AS dept_avg,\n  ROUND(e.salary - ds.avg_sal, 2) AS diff_from_avg\nFROM employees e\nJOIN dept_stats ds ON e.department = ds.department\nORDER BY diff_from_avg DESC;' },
  { title: 'Subquery', desc: 'Employees earning above average', sql: 'SELECT name, department, salary\nFROM employees\nWHERE salary > (\n  SELECT AVG(salary) FROM employees\n)\nORDER BY salary DESC;' },
  { title: 'UNION', desc: 'Combine Engineering and Marketing', sql: "SELECT name, salary, 'Engineering' AS dept FROM employees WHERE department = 'Engineering'\nUNION ALL\nSELECT name, salary, 'Marketing' FROM employees WHERE department = 'Marketing'\nORDER BY salary DESC;" },
  { title: 'INSERT + SELECT', desc: 'Insert new data then view', sql: "INSERT INTO departments (name, budget, location)\nVALUES ('AI Research', 2000000, 'Seattle');\n\nSELECT * FROM departments ORDER BY id;" },
  { title: 'UPDATE', desc: 'Give Engineering a raise', sql: "UPDATE employees\nSET salary = ROUND(salary * 1.15, 2)\nWHERE department = 'Engineering';\n\nSELECT name, department, salary\nFROM employees\nWHERE department = 'Engineering'\nORDER BY salary DESC;" },
  { title: 'CREATE TABLE', desc: 'Create a new table with constraints', sql: "CREATE TABLE IF NOT EXISTS projects (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT NOT NULL,\n  employee_id INTEGER REFERENCES employees(id),\n  budget REAL DEFAULT 0,\n  status TEXT DEFAULT 'active',\n  deadline TEXT\n);\n\nINSERT INTO projects (title, employee_id, budget, deadline)\nVALUES ('AI Dashboard', 1, 50000, '2024-12-31');\n\nSELECT * FROM projects;" }
];

function renderTemplates() {
  const list = document.getElementById('template-list');
  list.innerHTML = TEMPLATES.map((t, i) => `
    <div class="template-item" data-index="${i}">
      <div class="template-item-title">${esc(t.title)}</div>
      <div class="template-item-desc">${esc(t.desc)}</div>
    </div>
  `).join('');
  list.querySelectorAll('.template-item').forEach(el => {
    el.addEventListener('click', () => {
      const t = TEMPLATES[parseInt(el.dataset.index)];
      editor.value = t.sql;
      updateGutter();
      document.getElementById('template-picker').style.display = 'none';
      runQuery();
    });
  });
}

// ─────────────────────────────────────────────
// STEP CONTROLS
// ─────────────────────────────────────────────
document.getElementById('btn-prev-step').addEventListener('click', () => {
  if (State.currentStep > 0) {
    goToStep(State.currentStep - 1);
    const pct = State.currentSteps.length <= 1 ? 100 : (State.currentStep / (State.currentSteps.length - 1)) * 100;
    document.getElementById('timeline-fill').style.width = pct + '%';
    document.getElementById('timeline-thumb').style.left = pct + '%';
  }
});

document.getElementById('btn-next-step').addEventListener('click', () => {
  if (State.currentStep < State.currentSteps.length - 1) {
    goToStep(State.currentStep + 1);
    const pct = State.currentSteps.length <= 1 ? 100 : (State.currentStep / (State.currentSteps.length - 1)) * 100;
    document.getElementById('timeline-fill').style.width = pct + '%';
    document.getElementById('timeline-thumb').style.left = pct + '%';
  }
});

document.getElementById('btn-play-steps').addEventListener('click', () => {
  if (State.isPlaying) {
    clearInterval(State.playInterval);
    State.isPlaying = false;
    document.getElementById('btn-play-steps').textContent = '▶';
    return;
  }
  State.isPlaying = true;
  document.getElementById('btn-play-steps').textContent = '⏸';
  State.currentStep = 0;
  State.playInterval = setInterval(() => {
    if (State.currentStep >= State.currentSteps.length - 1) {
      clearInterval(State.playInterval);
      State.isPlaying = false;
      document.getElementById('btn-play-steps').textContent = '▶';
      return;
    }
    goToStep(State.currentStep + 1);
    const pct = State.currentSteps.length <= 1 ? 100 : (State.currentStep / (State.currentSteps.length - 1)) * 100;
    document.getElementById('timeline-fill').style.width = pct + '%';
    document.getElementById('timeline-thumb').style.left = pct + '%';
    // Scroll to active step
    const activeEl = document.querySelector('.viz-step.active');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1000);
});

document.getElementById('btn-reset-viz').addEventListener('click', () => {
  if (State.currentSteps.length > 0) {
    goToStep(State.currentSteps.length - 1);
  }
});

// ─────────────────────────────────────────────
// PANEL RESIZE
// ─────────────────────────────────────────────
function setupResize(handleId, targetId) {
  const handle = document.getElementById(handleId);
  const target = document.getElementById(targetId);
  if (!handle || !target) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = target.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const diff = e.clientX - startX;
    const newWidth = targetId === 'panel-left' ? startWidth + diff : startWidth - diff;
    if (newWidth >= 220 && newWidth <= 700) target.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

setupResize('resize-left', 'panel-left');
setupResize('resize-right', 'panel-right');

// ─────────────────────────────────────────────
// BOTTOM PANEL
// ─────────────────────────────────────────────
function switchBottomTab(name) {
  document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bottom-pane').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.bottom-tab[data-bottom-tab="${name}"]`);
  const pane = document.getElementById(`pane-${name}`);
  if (tab) tab.classList.add('active');
  if (pane) pane.classList.add('active');
}

document.querySelectorAll('.bottom-tab[data-bottom-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    if (State.bottomCollapsed) {
      State.bottomCollapsed = false;
      document.getElementById('bottom-panel').classList.remove('collapsed');
      document.querySelector('.main-layout').style.height = `calc(100vh - var(--nav-height) - var(--bottom-panel-height))`;
    }
    switchBottomTab(tab.dataset.bottomTab);
  });
});

document.getElementById('btn-toggle-bottom').addEventListener('click', () => {
  State.bottomCollapsed = !State.bottomCollapsed;
  const panel = document.getElementById('bottom-panel');
  panel.classList.toggle('collapsed', State.bottomCollapsed);
  const mainLayout = document.querySelector('.main-layout');
  if (State.bottomCollapsed) mainLayout.style.height = `calc(100vh - var(--nav-height) - 36px)`;
  else mainLayout.style.height = `calc(100vh - var(--nav-height) - var(--bottom-panel-height))`;
});

// ─────────────────────────────────────────────
// NAV TABS
// ─────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const name = tab.dataset.tab;
    if (name === 'challenges') {
      renderPracticeModal();
      document.getElementById('challenges-modal').style.display = 'flex';
    } else if (name === 'learn') {
      renderLearnContent();
      document.getElementById('learn-modal').style.display = 'flex';
    } else if (name === 'leaderboard') {
      renderLeaderboard();
      document.getElementById('leaderboard-modal').style.display = 'flex';
    }
  });
});

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.dataset.modal;
    document.getElementById(modalId).style.display = 'none';
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-editor').classList.add('active');
  });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-editor').classList.add('active');
    }
  });
});

// ─────────────────────────────────────────────
// TOOLBAR BUTTONS
// ─────────────────────────────────────────────
document.getElementById('btn-run').addEventListener('click', runQuery);

document.getElementById('btn-format').addEventListener('click', () => {
  const sql = editor.value;
  // Simple formatter: uppercase keywords, add newlines
  const formatted = sql.replace(/\b(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE|WITH|ON|AND|OR)\b/gi,
    (m) => '\n' + m.toUpperCase()
  ).replace(/^(\n)+/, '').replace(/\s*,\s*/g, ',\n  ');
  editor.value = formatted;
  updateGutter();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  editor.value = '';
  updateGutter();
  document.getElementById('viz-welcome').style.display = 'flex';
  document.getElementById('viz-steps').style.display = 'none';
  document.getElementById('execution-flow').style.display = 'none';
  document.getElementById('timeline-scrubber').style.display = 'none';
  State.currentSteps = [];
});

document.getElementById('btn-template').addEventListener('click', () => {
  const picker = document.getElementById('template-picker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  renderTemplates();
});

document.getElementById('btn-close-templates').addEventListener('click', () => {
  document.getElementById('template-picker').style.display = 'none';
});

// ─────────────────────────────────────────────
// SCHEMA TABS
// ─────────────────────────────────────────────
document.querySelectorAll('.schema-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.schema-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const name = tab.dataset.schemaTab;
    document.getElementById('schema-tables').style.display = name === 'tables' ? 'block' : 'none';
    document.getElementById('schema-er').style.display = name === 'er' ? 'block' : 'none';
    document.getElementById('schema-ai-suggestions').style.display = name === 'ai-suggestions' ? 'block' : 'none';
    if (name === 'er') setTimeout(renderERDiagram, 50);
  });
});

// ─────────────────────────────────────────────
// DIALECT SELECTOR
// ─────────────────────────────────────────────
document.getElementById('dialect-select').addEventListener('change', (e) => {
  State.dialect = e.target.value;
  document.getElementById('editor-dialect-badge').textContent = e.target.options[e.target.selectedIndex].text;
});

// ─────────────────────────────────────────────
// QUICK START BUTTONS
// ─────────────────────────────────────────────
document.querySelectorAll('.quick-start-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    editor.value = btn.dataset.query;
    updateGutter();
    runQuery();
  });
});

// ─────────────────────────────────────────────
// VENN CHEATSHEET — Render mini diagrams in welcome screen
// ─────────────────────────────────────────────
(function renderVennCheatsheet() {
  const grid = document.getElementById('venn-cheatsheet-grid');
  if (!grid) return;

  const joinDefs = [
    {
      type: 'INNER JOIN',
      label: 'Matching rows only',
      l: 'transparent', i: 'rgba(99,102,241,0.85)', r: 'transparent',
      query: `SELECT e.name, e.department, d.location\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id`
    },
    {
      type: 'LEFT JOIN',
      label: 'All left + matching right',
      l: 'rgba(56,189,248,0.7)', i: 'rgba(99,102,241,0.85)', r: 'transparent',
      query: `SELECT e.name, d.name AS dept\nFROM employees e\nLEFT JOIN departments d ON e.department_id = d.id`
    },
    {
      type: 'RIGHT JOIN',
      label: 'Matching left + all right',
      l: 'transparent', i: 'rgba(99,102,241,0.85)', r: 'rgba(52,211,153,0.7)',
      query: `SELECT e.name, d.name AS dept\nFROM employees e\nRIGHT JOIN departments d ON e.department_id = d.id`
    },
    {
      type: 'FULL OUTER JOIN',
      label: 'All rows from both',
      l: 'rgba(56,189,248,0.7)', i: 'rgba(99,102,241,0.85)', r: 'rgba(52,211,153,0.7)',
      query: `SELECT e.name, d.name AS dept\nFROM employees e\nFULL OUTER JOIN departments d ON e.department_id = d.id`
    },
    {
      type: 'CROSS JOIN',
      label: 'Cartesian product',
      l: 'rgba(56,189,248,0.45)', i: 'rgba(248,113,113,0.8)', r: 'rgba(52,211,153,0.45)',
      query: `SELECT e.name, d.name AS dept\nFROM employees e\nCROSS JOIN departments d`
    },
    {
      type: 'NATURAL JOIN',
      label: 'Implicit common columns',
      l: 'transparent', i: 'rgba(99,102,241,0.85)', r: 'transparent',
      query: `SELECT name, department\nFROM employees\nNATURAL JOIN departments`
    },
  ];

  grid.innerHTML = joinDefs.map((def, idx) => {
    const uid = `vc-${idx}`;
    return `
      <div class="venn-card" title="Click to run: ${def.type}" onclick="
        document.getElementById('sql-editor').value = ${JSON.stringify(def.query)};
        if(typeof updateGutter==='function') updateGutter();
        if(typeof runQuery==='function') runQuery();
      ">
        <svg class="venn-card-svg" viewBox="0 0 110 60" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="${uid}-l"><circle cx="38" cy="30" r="24"/></clipPath>
            <clipPath id="${uid}-r"><circle cx="72" cy="30" r="24"/></clipPath>
            <clipPath id="${uid}-i"><circle cx="72" cy="30" r="24"/></clipPath>
          </defs>
          <!-- Left-only -->
          <g clip-path="url(#${uid}-l)">
            <rect x="0" y="0" width="72" height="60" fill="${def.l}"/>
          </g>
          <!-- Right-only -->
          <g clip-path="url(#${uid}-r)">
            <rect x="55" y="0" width="55" height="60" fill="${def.r}"/>
          </g>
          <!-- Intersection -->
          <g clip-path="url(#${uid}-l)">
            <g clip-path="url(#${uid}-i)">
              <rect x="38" y="0" width="34" height="60" fill="${def.i}"/>
            </g>
          </g>
          <circle cx="38" cy="30" r="24" fill="none" stroke="rgba(56,189,248,0.75)" stroke-width="1.2"/>
          <circle cx="72" cy="30" r="24" fill="none" stroke="rgba(52,211,153,0.75)" stroke-width="1.2"/>
        </svg>
        <div class="venn-card-type">${def.type}</div>
        <div class="venn-card-label">${def.label}</div>
      </div>
    `;
  }).join('');
})();

// ─────────────────────────────────────────────
// RESET DB
// ─────────────────────────────────────────────
document.getElementById('btn-reset-db').addEventListener('click', () => {
  if (confirm('Reset database to default? All changes will be lost.')) {
    State.db = new InMemoryDB();
    initSampleDB();
    renderSchema();
    document.getElementById('viz-welcome').style.display = 'flex';
    document.getElementById('viz-steps').style.display = 'none';
    document.getElementById('execution-flow').style.display = 'none';
    document.getElementById('timeline-scrubber').style.display = 'none';
  }
});

// ─────────────────────────────────────────────
// ADD TABLE MODAL
// ─────────────────────────────────────────────
document.getElementById('btn-add-table').addEventListener('click', () => {
  document.getElementById('column-list').innerHTML = '';
  addColumnEntry();
  document.getElementById('add-table-modal').style.display = 'flex';
});

function addColumnEntry() {
  const list = document.getElementById('column-list');
  const div = document.createElement('div');
  div.className = 'column-entry';
  div.innerHTML = `
    <input type="text" placeholder="column_name" style="flex:1" />
    <select>
      <option>INTEGER</option><option>TEXT</option><option>REAL</option><option>BLOB</option><option>BOOLEAN</option>
    </select>
    <input type="checkbox" title="Primary Key" /> PK
    <input type="checkbox" title="Not Null" /> NN
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:14px">✕</button>
  `;
  list.appendChild(div);
}

document.getElementById('btn-add-column').addEventListener('click', addColumnEntry);

document.getElementById('btn-create-table').addEventListener('click', () => {
  const name = document.getElementById('new-table-name').value.trim();
  if (!name) return alert('Enter a table name');
  const entries = document.querySelectorAll('#column-list .column-entry');
  const columns = Array.from(entries).map(e => {
    const inputs = e.querySelectorAll('input, select');
    return {
      name: inputs[0].value.trim() || 'col',
      type: inputs[1].value,
      primaryKey: inputs[2].checked,
      notNull: inputs[3].checked
    };
  }).filter(c => c.name);
  if (columns.length === 0) return alert('Add at least one column');
  try {
    State.db.createTable(name, columns);
    renderSchema();
    document.getElementById('add-table-modal').style.display = 'none';
    showAchievementMsg('Table Created!', name + ' with ' + columns.length + ' columns');
  } catch(e) {
    alert(e.message);
  }
});

// ─────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') { e.preventDefault(); runQuery(); }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => { if (m.style.display !== 'none') m.style.display = 'none'; });
    document.getElementById('template-picker').style.display = 'none';
    autocompleteDropdown.style.display = 'none';
  }
});

// ─────────────────────────────────────────────
// INITIAL QUERY
// ─────────────────────────────────────────────
const DEFAULT_QUERY = `-- 🎉 Welcome to SQLVis — Interactive SQL Learning!
-- Try typing a query or use the templates button (⊞)
-- Press Ctrl+Enter or click "Run Query" to execute

SELECT 
  e.name,
  e.department,
  e.salary,
  d.location,
  RANK() OVER (PARTITION BY e.department ORDER BY e.salary DESC) AS dept_rank
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
ORDER BY e.department, dept_rank;`;

// ─────────────────────────────────────────────
// LLM INTEGRATION (AI TUTOR & QUESTS)
// ─────────────────────────────────────────────
let aiChatHistory = [];

function getLLMContextSchema() {
  const tables = Object.values(State.db.tables);
  return tables.map(table => {
    const cols = table.columns.map(col => {
      let extra = [];
      if (col.primaryKey) extra.push("PRIMARY KEY");
      if (col.foreignKey) extra.push(`FOREIGN KEY REFERENCES ${col.foreignKey.table}(${col.foreignKey.column})`);
      if (col.notNull) extra.push("NOT NULL");
      if (col.unique) extra.push("UNIQUE");
      return `  - ${col.name} (${col.type})${extra.length ? ' ' + extra.join(', ') : ''}`;
    }).join('\n');
    
    // Sample rows (up to 3)
    const sampleRows = table.rows.slice(0, 3).map(r => JSON.stringify(r)).join('\n');
    return `Table: ${table.name}\nColumns:\n${cols}\nSample Data (up to 3 rows):\n${sampleRows || '  (No data)'}`;
  }).join('\n\n');
}

window.useQueryInEditor = function(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return;
  // Read from data-sql to preserve exact original whitespace and newlines
  const rawSql = block.dataset.sql;
  if (!rawSql) return;
  editor.value = rawSql;
  updateGutter();
  runQuery();
  switchBottomTab('results');
};

window.copyQueryToClipboard = function(blockId, btn) {
  const block = document.getElementById(blockId);
  if (!block) return;
  // Read from data-sql to preserve exact original whitespace and newlines
  const rawSql = block.dataset.sql;
  if (!rawSql) return;
  navigator.clipboard.writeText(rawSql).then(() => {
    const originalHtml = btn.innerHTML;
    const originalTitle = btn.title;
    btn.innerHTML = '✓';
    btn.title = 'Copied!';
    btn.style.background = 'rgba(16, 185, 129, 0.15)';
    btn.style.color = 'var(--accent-green)';
    btn.style.borderColor = 'var(--accent-green)';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.title = originalTitle;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy query:', err);
    alert('Failed to copy: ' + err.message);
  });
};

let _sqlBlockCounter = 0;

function formatMarkdown(text) {
  // Reset block counter per message render
  _sqlBlockCounter = 0;
  // Escaping html characters first
  let html = esc(text);

  // Restore SQL code blocks — wrap in a labelled block with header copy icon and action buttons
  // IMPORTANT: extract rawCode from the original `text` (before esc()) to preserve newlines
  const rawTextForBlocks = text;
  const sqlBlocks = {};
  html = html.replace(/```sql([\s\S]*?)```/gi, (match, escapedCode) => {
    const trimmedEscaped = escapedCode.trim();
    const blockId = `sql-block-${Date.now()}-${++_sqlBlockCounter}`;
    // Reverse the HTML entity escaping done by esc() to recover original SQL text
    const rawSql = trimmedEscaped
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
    sqlBlocks[blockId] = rawSql;
    // Use a placeholder that won't be mangled by paragraph formatter
    return `\x02SQL_BLOCK:${blockId}\x03`;
  });

  // Restore other code blocks
  html = html.replace(/```(javascript|json|html|css)?([\s\S]*?)```/gi, (match, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Lists
  // 1. Unordered lists
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 2. Ordered lists
  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li>$2</li>');

  // Paragraphs — split on double newlines, protect block elements from <br> injection
  const paragraphs = html.split(/\n\n+/);
  let result = paragraphs.map(p => {
    const trimmed = p.trim();
    // Pass block-level HTML through without modification
    if (
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<li>') ||
      trimmed.startsWith('<ol>') ||
      trimmed.startsWith('\x02SQL_BLOCK:')
    ) {
      return trimmed;
    }
    if (!trimmed) return '';
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  // Now inject the real SQL block HTML, with raw SQL stored in data-sql attribute
  result = result.replace(/\x02SQL_BLOCK:([^\x03]+)\x03/g, (match, blockId) => {
    const rawSql = sqlBlocks[blockId] || '';
    // Display version: HTML-escaped for safe rendering inside <code>
    const displaySql = rawSql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Escape rawSql for safe embedding in a data attribute value
    const attrSql = rawSql.replace(/"/g, '&quot;');
    return `
      <div class="sql-code-block" id="${blockId}" data-sql="${attrSql}">
        <div class="sql-code-header">
          <span class="sql-code-lang-tag">SQL</span>
          <button class="sql-copy-icon-btn" title="Copy Query" onclick="window.copyQueryToClipboard('${blockId}', this)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
        <pre><code class="language-sql">${displaySql}</code></pre>
        <div class="sql-code-actions">
          <button class="use-query-btn" onclick="window.useQueryInEditor('${blockId}')">⚡ Use Query</button>
        </div>
      </div>`;
  });

  return result;
}

async function askAITutor(message, queryError = null) {
  // Open the floating AI panel if it is hidden
  const panel = document.getElementById('floating-ai-panel');
  if (panel && panel.style.display === 'none') {
    panel.style.display = 'flex';
  }

  const messagesContainer = document.getElementById('ai-tutor-messages');
  
  // Remove welcome screen if it exists
  const welcome = messagesContainer.querySelector('.ai-tutor-welcome');
  if (welcome) {
    welcome.remove();
  }

  // Append User message
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'user-message';
  userMsgDiv.textContent = message;
  messagesContainer.appendChild(userMsgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Append Thinking message
  const aiMsgDiv = document.createElement('div');
  aiMsgDiv.className = 'ai-message';
  aiMsgDiv.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--text-muted)">
      <span class="ai-loader" style="border-top-color:var(--accent-purple)"></span>
      <span>Tutor is thinking...</span>
    </div>
  `;
  messagesContainer.appendChild(aiMsgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    // Check if protocol is file://
    if (window.location.protocol === 'file:') {
      aiMsgDiv.innerHTML = `
        <div style="color:var(--accent-red); text-align:left; font-size:12px; line-height:1.4;">
          <strong>⚠️ Local Server Required</strong><br/>
          To use the AI Tutor, you must run the server locally. Please:<br/><br/>
          1. Start the server by running <code>npm run dev</code> or <code>node server.js</code> in your terminal.<br/>
          2. Open <a href="http://localhost:3000" target="_blank" style="color:var(--accent-blue);font-weight:600;text-decoration:underline;">http://localhost:3000</a> in your browser.
        </div>
      `;
      return;
    }

    const schemaDesc = getLLMContextSchema();
    const currentQuery = editor.value.trim();

    // Call local server endpoint
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        schema: schemaDesc,
        currentQuery,
        history: aiChatHistory,
        queryError
      })
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid server response: ${responseText.slice(0, 150) || '(Empty response)'}`);
    }

    if (!response.ok) {
      throw new Error(data.error || response.statusText);
    }

    const reply = data.reply;

    // Save history
    aiChatHistory.push({ role: 'user', content: message });
    aiChatHistory.push({ role: 'assistant', content: reply });
    if (aiChatHistory.length > 20) {
      aiChatHistory = aiChatHistory.slice(-20); // Keep last 20 messages
    }

    // Render answer
    aiMsgDiv.innerHTML = formatMarkdown(reply);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (error) {
    console.error('AI Tutor error:', error);
    aiMsgDiv.innerHTML = `<span style="color:var(--accent-red)">Error: ${esc(error.message)}</span>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Attach event listeners for AI Tutor
document.getElementById('btn-ai-tutor-send').addEventListener('click', () => {
  const input = document.getElementById('ai-tutor-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  askAITutor(text);
});

document.getElementById('ai-tutor-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = e.target.value.trim();
    if (!text) return;
    e.target.value = '';
    askAITutor(text);
  }
});

document.getElementById('btn-ai-tutor-clear').addEventListener('click', () => {
  const messagesContainer = document.getElementById('ai-tutor-messages');
  aiChatHistory = [];
  messagesContainer.innerHTML = `
    <div class="ai-tutor-welcome">
      <div class="ai-tutor-welcome-icon">🤖</div>
      <h3>Welcome to your SQL AI Tutor!</h3>
      <p>I can help you write queries, fix syntax errors, and explain SQL concepts.</p>
      <div class="ai-tutor-quick-prompts">
        <button class="ai-prompt-chip" data-prompt="Explain my current query step-by-step">Explain Query</button>
        <button class="ai-prompt-chip" data-prompt="How do I join employees with departments?">How do I JOIN?</button>
        <button class="ai-prompt-chip" data-prompt="How do I use GROUP BY to aggregate data?">Explain GROUP BY</button>
      </div>
    </div>
  `;
  // Re-attach quick prompt event listener
  attachQuickPromptListeners();
});

function attachQuickPromptListeners() {
  document.querySelectorAll('.ai-prompt-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        askAITutor(prompt);
      }
    });
  });
}
attachQuickPromptListeners();

// Floating AI Panel Toggles
const floatingBtn = document.getElementById('btn-floating-ai');
const floatingPanel = document.getElementById('floating-ai-panel');
const floatingCloseBtn = document.getElementById('btn-floating-ai-close');

if (floatingBtn && floatingPanel) {
  floatingBtn.addEventListener('click', () => {
    const isHidden = floatingPanel.style.display === 'none';
    floatingPanel.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      const messagesContainer = document.getElementById('ai-tutor-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show file:// protocol warning if opened directly as file
        if (window.location.protocol === 'file:') {
          const warningExist = messagesContainer.querySelector('.file-protocol-warning');
          if (!warningExist) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'file-protocol-warning';
            warningDiv.style = 'padding:12px;background:rgba(225,29,72,0.08);color:var(--accent-red);border-radius:var(--radius-md);border:1px solid rgba(225,29,72,0.15);margin-bottom:12px;font-size:11.5px;line-height:1.4;text-align:left;';
            warningDiv.innerHTML = `
              <strong>⚠️ Local Server Required</strong><br/>
              To use the AI Tutor, please run <code>npm run dev</code> or <code>node server.js</code> in your terminal and open <a href="http://localhost:3000" target="_blank" style="color:var(--accent-blue);font-weight:600;text-decoration:underline;">http://localhost:3000</a>.
            `;
            messagesContainer.insertBefore(warningDiv, messagesContainer.firstChild);
          }
        }
      }
    }
  });
}

if (floatingCloseBtn && floatingPanel) {
  floatingCloseBtn.addEventListener('click', () => {
    floatingPanel.style.display = 'none';
  });
}


// AI SUGGESTIONS (QUESTS) GENERATION
let generatedSuggestions = [];

async function generateAISuggestions() {
  const btn = document.getElementById('btn-generate-suggestions');
  const list = document.getElementById('ai-suggestions-list');

  btn.disabled = true;
  btn.innerHTML = `<span class="ai-loader"></span> Generating Quests...`;
  list.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 10px;color:var(--text-muted);gap:12px">
      <span class="ai-loader" style="width:24px;height:24px;border-width:3px;border-top-color:var(--accent-cyan)"></span>
      <span>Generating schema-specific quests...</span>
    </div>
  `;

  try {
    // Check if protocol is file://
    if (window.location.protocol === 'file:') {
      list.innerHTML = `
        <div style="padding:16px;color:var(--accent-red);border:1px solid rgba(225,29,72,0.15);background:rgba(225,29,72,0.05);border-radius:var(--radius-md);margin-top:10px;font-size:12px;line-height:1.4;text-align:left;">
          <strong>⚠️ Local Server Required</strong><br/>
          To generate AI practice quests, you must run the server locally. Please:<br/><br/>
          1. Start the server by running <code>npm run dev</code> or <code>node server.js</code> in your terminal.<br/>
          2. Open <a href="http://localhost:3000" target="_blank" style="color:var(--accent-blue);font-weight:600;text-decoration:underline;">http://localhost:3000</a> in your browser.
        </div>
      `;
      return;
    }

    const schemaDesc = getLLMContextSchema();
    const response = await fetch('/api/llm/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schema: schemaDesc })
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid server response: ${responseText.slice(0, 150) || '(Empty response)'}`);
    }

    if (!response.ok) {
      throw new Error(data.error || response.statusText);
    }

    generatedSuggestions = data.suggestions || [];

    if (generatedSuggestions.length === 0) {
      list.innerHTML = `<div class="explanation-placeholder">Could not generate any suggestions. Please try again.</div>`;
      return;
    }

    renderSuggestionsList(generatedSuggestions);

  } catch (error) {
    console.error('Suggestions generator error:', error);
    list.innerHTML = `<div style="color:var(--accent-red);padding:12px;font-size:12px">⚠ Error: ${esc(error.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `✨ Generate AI Quests`;
  }
}

function renderSuggestionsList(suggestions) {
  const list = document.getElementById('ai-suggestions-list');
  list.innerHTML = suggestions.map((s, idx) => {
    const diffClass = s.difficulty.toLowerCase() === 'easy' ? 'diff-easy' : s.difficulty.toLowerCase() === 'medium' ? 'diff-medium' : 'diff-hard';
    return `
      <div class="suggestion-card" data-index="${idx}">
        <div class="suggestion-card-header">
          <span class="suggestion-card-title">${esc(s.title)}</span>
          <span class="diff-badge ${diffClass}">${esc(s.difficulty)}</span>
        </div>
        <div class="suggestion-card-quest">${esc(s.question)}</div>
        <div class="suggestion-card-actions">
          <button class="btn-card-action primary" onclick="trySuggestionQuest(${idx})">Try Quest</button>
          <button class="btn-card-action" onclick="toggleSuggestionHint(${idx})">Hint</button>
          <button class="btn-card-action" onclick="askTutorAboutQuest(${idx})">Ask Tutor</button>
        </div>
        <div class="suggestion-hint" id="hint-sug-${idx}" style="display:none">
          <strong>Hint:</strong> ${esc(s.hint)}
        </div>
      </div>
    `;
  }).join('');
}

window.trySuggestionQuest = function(idx) {
  const sug = generatedSuggestions[idx];
  if (!sug) return;
  editor.value = sug.suggestedQuery || `-- Quest: ${sug.question}\n`;
  updateGutter();
  
  const tabEditor = document.getElementById('tab-editor');
  if (tabEditor) {
    tabEditor.click();
  }

  runQuery();
};

window.toggleSuggestionHint = function(idx) {
  const el = document.getElementById(`hint-sug-${idx}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.askTutorAboutQuest = function(idx) {
  const sug = generatedSuggestions[idx];
  if (!sug) return;
  askAITutor(`I'm practicing SQL with the quest: "${sug.question}". Can you explain the concepts I need to know and guide me on how to write the correct SQL query step-by-step?`);
};

document.getElementById('btn-generate-suggestions').addEventListener('click', generateAISuggestions);

// ─────────────────────────────────────────────
// INITIALIZE
// ─────────────────────────────────────────────
function init() {
  initSampleDB();
  editor.value = DEFAULT_QUERY;
  updateGutter();
  renderSchema();

  // Auto-run default query after short delay
  setTimeout(() => {
    runQuery();
    // Expand first table card
    const firstCard = document.querySelector('.table-card');
    if (firstCard) firstCard.classList.add('expanded');
  }, 300);

  console.log('%c SQLVis Initialized! ⚡ ', 'background:#0d1117;color:#39d0d8;font-size:14px;padding:4px 8px;border-radius:4px;font-weight:bold');
  console.log('DB Tables:', Object.keys(State.db.tables));
}

init();
