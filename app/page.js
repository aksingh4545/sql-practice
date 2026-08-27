'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading SQLVis...</div>
      </div>
    );
  }

  const htmlContent = `
  <!-- Top Navigation Bar -->
  <nav id="top-nav" class="top-nav">
    <div class="nav-left">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">SQL<span class="logo-accent">Vis</span></span>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab active" data-tab="editor" id="tab-editor">Editor</button>
        <button class="nav-tab" data-tab="challenges" id="tab-challenges">Challenges</button>
        <button class="nav-tab" data-tab="interview" id="tab-interview">💼 Interview Qs</button>
        <button class="nav-tab" data-tab="learn" id="btab-learn">Learn</button>
        <button class="nav-tab" data-tab="leaderboard" id="tab-leaderboard">Leaderboard</button>
      </div>
    <div class="nav-right">
      <div class="xp-badge" id="xp-badge">
        <span class="xp-icon">✦</span>
        <span id="xp-count">0 XP</span>
      </div>
      <div class="level-badge" id="level-badge">
        <span>Lv.</span><span id="level-num">1</span>
      </div>
      <button class="icon-btn theme-toggle-btn" id="btn-theme-toggle" title="Toggle Theme" style="font-size: 15px; margin-right: 8px; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); border: 1px solid var(--border-primary); color: var(--text-primary); cursor: pointer; padding: 0;">
        🌙
      </button>
      <div class="dialect-selector">
        <select id="dialect-select">
          <option value="sqlite">SQLite</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="sqlserver">SQL Server</option>
        </select>
      </div>
      <button class="btn-run" id="btn-run">
        <span class="run-icon">▶</span> Run Query
      </button>
    </div>
  </nav>

  <!-- Mobile Panel Tabs (responsive panel switching) -->
  <div class="mobile-panel-tabs" style="display: none;">
    <button class="mobile-panel-tab active" data-panel="left">💻 Editor</button>
    <button class="mobile-panel-tab" data-panel="center">👁️ Viz</button>
    <button class="mobile-panel-tab" data-panel="right">📁 DB</button>
  </div>

  <!-- Achievement Toast -->
  <div class="achievement-toast" id="achievement-toast">
    <div class="achievement-icon">🏆</div>
    <div class="achievement-text">
      <div class="achievement-title" id="achievement-title">Achievement Unlocked!</div>
      <div class="achievement-desc" id="achievement-desc"></div>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="main-layout" id="main-layout">

    <!-- LEFT PANEL: SQL Editor -->
    <div class="panel panel-left mobile-active" id="panel-left">
      <div class="panel-header">
        <span class="panel-title">SQL Editor</span>
        <div class="panel-controls">
          <button class="icon-btn" id="btn-format" title="Format SQL">⇌</button>
          <button class="icon-btn" id="btn-clear" title="Clear editor">✕</button>
          <button class="icon-btn" id="btn-template" title="Load template">⊞</button>
        </div>
      </div>

      <!-- Active Challenge Bar (shown when a challenge is loaded) -->
      <div class="challenge-bar" id="challenge-bar" style="display:none">
        <div class="challenge-bar-left">
          <span class="challenge-bar-badge" id="challenge-bar-badge">Q1</span>
          <span class="challenge-bar-text" id="challenge-bar-text">Challenge question appears here</span>
        </div>
        <div class="challenge-bar-right">
          <button class="challenge-bar-btn hint-btn" id="btn-challenge-hint" title="Show Hint">💡</button>
          <button class="challenge-bar-btn" id="btn-next-challenge" title="Next Question">&#8594;</button>
          <button class="challenge-bar-close" id="btn-close-challenge" title="Close Challenge">&#10005;</button>
        </div>
      </div>

      <!-- Challenge Hint Bar (toggled by the bulb icon) -->
      <div class="challenge-hint-bar" id="challenge-hint-bar" style="display:none">
        <span class="challenge-hint-icon">💡</span>
        <span class="challenge-hint-text" id="challenge-hint-text">Hint text goes here</span>
      </div>

      <div class="editor-container" id="editor-container">
        <div class="editor-gutter" id="editor-gutter"></div>
        <div class="editor-area-wrapper">
          <pre id="editor-highlight" class="sql-highlight-overlay" aria-hidden="true"></pre>
          <textarea id="sql-editor" class="sql-editor" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"
            placeholder="-- Write your SQL here...&#10;SELECT * FROM employees WHERE department = 'Engineering';"></textarea>
        </div>
        <div class="autocomplete-dropdown" id="autocomplete-dropdown"></div>
      </div>
      <div class="editor-status-bar">
        <span id="cursor-pos">Ln 1, Col 1</span>
        <span id="editor-dialect-badge">SQLite</span>
        <span id="query-timer">Ready</span>
      </div>

      <!-- Reveal Solution Button (shown when challenge active) -->
      <div class="reveal-solution-wrap" id="reveal-solution-wrap" style="display:none">
        <button class="reveal-solution-btn" id="btn-reveal-solution">💡 Reveal Solution</button>
      </div>

      <!-- Template Picker -->
      <div class="template-picker" id="template-picker" style="display:none">
        <div class="template-picker-header">
          <span>Query Templates</span>
          <button class="icon-btn" id="btn-close-templates">✕</button>
        </div>
        <div class="template-list" id="template-list"></div>
      </div>
    </div>

    <!-- Panel Resize Handle -->
    <div class="resize-handle" id="resize-left" data-target="panel-left"></div>

    <!-- CENTER PANEL: Visualization -->
    <div class="panel panel-center" id="panel-center">
      <div class="panel-header">
        <span class="panel-title">Query Visualization</span>
        <div class="panel-controls">
          <button class="icon-btn" id="btn-play-steps" title="Play steps">▶</button>
          <button class="icon-btn" id="btn-prev-step" title="Previous step">◀</button>
          <button class="icon-btn" id="btn-next-step" title="Next step">▶</button>
          <span class="step-counter" id="step-counter">Step 0/0</span>
          <button class="icon-btn" id="btn-reset-viz" title="Reset">↺</button>
        </div>
      </div>
      <div class="viz-canvas" id="viz-canvas">
        <div class="viz-welcome" id="viz-welcome">
          <div class="welcome-icon">⚡</div>
          <h2>Write a SQL query to see it visualized</h2>
          <p>Watch your data transform step-by-step with real-time animations</p>
          <div class="quick-starts">
            <button class="quick-start-btn" data-query="SELECT * FROM employees">SELECT *</button>
            <button class="quick-start-btn" data-query="SELECT name, salary FROM employees WHERE department = 'Engineering' ORDER BY salary DESC">WHERE + ORDER BY</button>
            <button class="quick-start-btn" data-query="SELECT department, COUNT(*) as count, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING COUNT(*) > 1">GROUP BY + HAVING</button>
            <button class="quick-start-btn" data-query="SELECT e.name, e.salary, d.name as dept_name FROM employees e INNER JOIN departments d ON e.department_id = d.id">INNER JOIN</button>
          </div>

          <!-- Venn Diagram Join Cheatsheet -->
          <div class="venn-cheatsheet">
            <div class="venn-cheatsheet-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="7"/><circle cx="15" cy="12" r="7"/></svg>
              JOIN Types — Click to run
            </div>
            <div class="venn-cheatsheet-grid" id="venn-cheatsheet-grid"></div>
          </div>
        </div>

        <div class="viz-steps" id="viz-steps" style="display:none"></div>
        <div class="execution-flow" id="execution-flow" style="display:none">
          <div class="flow-title">Execution Flow</div>
          <div class="flow-steps" id="flow-steps"></div>
        </div>
      </div>
      <!-- Timeline Scrubber -->
      <div class="timeline-scrubber" id="timeline-scrubber" style="display:none">
        <div class="timeline-track" id="timeline-track">
          <div class="timeline-fill" id="timeline-fill"></div>
          <div class="timeline-thumb" id="timeline-thumb"></div>
        </div>
        <div class="timeline-labels" id="timeline-labels"></div>
      </div>

      <!-- Floating AI Action Button (Relocated to Query Visualization bottom-right) -->
      <button class="floating-ai-btn" id="btn-floating-ai" title="Ask AI Tutor">
        <span class="floating-ai-icon">🤖</span>
      </button>

      <!-- Floating AI Tutor Panel (Relocated to Query Visualization bottom-right) -->
      <div class="floating-ai-panel" id="floating-ai-panel" style="display:none">
        <div class="floating-ai-header">
          <div class="floating-ai-header-title">
            <span>🤖</span>
            <span>SQL AI Tutor</span>
          </div>
          <button class="icon-btn" id="btn-floating-ai-close" title="Close">✕</button>
        </div>
        <div class="floating-ai-content">
          <div class="ai-tutor-container">
            <div class="ai-tutor-messages" id="ai-tutor-messages">
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
            </div>
            <div class="ai-tutor-input-area">
              <button class="icon-btn" id="btn-ai-tutor-clear" title="Clear Chat" style="margin-right: 4px;">✕</button>
              <input type="text" id="ai-tutor-input" class="ai-tutor-input" placeholder="Ask the SQL AI Tutor..." />
              <button class="btn-run" id="btn-ai-tutor-send">Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel Resize Handle -->
    <div class="resize-handle" id="resize-right" data-target="panel-right"></div>

    <!-- RIGHT PANEL: Database Explorer -->
    <div class="panel panel-right" id="panel-right">
      <div class="panel-header">
        <span class="panel-title">Database Explorer</span>
        <div class="panel-controls">
          <button class="icon-btn" id="btn-add-table" title="Add table">+</button>
          <button class="icon-btn" id="btn-reset-db" title="Reset database">↺</button>
        </div>
      </div>
      <div class="schema-view" id="schema-view">
        <div class="schema-tabs">
          <button class="schema-tab active" data-schema-tab="tables">Tables</button>
          <button class="schema-tab" data-schema-tab="er">ER Diagram</button>
          <button class="schema-tab" data-schema-tab="ai-suggestions" id="tab-ai-suggestions">🤖 AI Quests</button>
        </div>
        <div class="schema-content" id="schema-tables"></div>
        <div class="schema-content" id="schema-er" style="display:none">
          <canvas id="er-canvas" class="er-canvas"></canvas>
        </div>
        <div class="schema-content" id="schema-ai-suggestions" style="display:none">
          <div class="ai-suggestions-header">
            <button class="btn-run" id="btn-generate-suggestions" style="width: 100%; margin-bottom: 12px; display: flex; justify-content: center; gap: 8px;">
              ✨ Generate AI Quests
            </button>
          </div>
          <div id="ai-suggestions-list" class="ai-suggestions-list">
            <div class="explanation-placeholder">Click the button above to generate practice questions tailored to your current database schema.</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- BOTTOM PANEL -->
  <div class="bottom-panel" id="bottom-panel">
    <div class="bottom-tabs">
      <button class="bottom-tab active" data-bottom-tab="explanation" id="btab-explanation">💬 Explanation</button>
      <button class="bottom-tab" data-bottom-tab="plan" id="btab-plan">📊 Execution Plan</button>
      <button class="bottom-tab" data-bottom-tab="metrics" id="btab-metrics">⚡ Performance</button>
      <button class="bottom-tab" data-bottom-tab="history" id="btab-history">🕒 History</button>
      <button class="bottom-tab" data-bottom-tab="results" id="btab-results">📋 Results</button>
      <button class="bottom-tab" data-bottom-tab="notes" id="btab-notes">📝 Notes</button>
      <button class="bottom-toggle" id="btn-toggle-bottom">▲</button>
    </div>
    <div class="bottom-content" id="bottom-content">
      <div class="bottom-pane active" id="pane-explanation">
        <div class="explanation-text" id="explanation-text">
          <div class="explanation-placeholder">Run a query to see a plain-English explanation of what it does.</div>
        </div>
      </div>
      <div class="bottom-pane" id="pane-plan">
        <div class="exec-plan" id="exec-plan">
          <div class="explanation-placeholder">Run a query to see the execution plan.</div>
        </div>
      </div>
      <div class="bottom-pane" id="pane-metrics">
        <div class="metrics-grid" id="metrics-grid">
          <div class="metric-card">
            <div class="metric-value" id="metric-time">—</div>
            <div class="metric-label">Execution Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" id="metric-rows">—</div>
            <div class="metric-label">Rows Affected</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" id="metric-cost">—</div>
            <div class="metric-label">Est. Cost</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" id="metric-index">—</div>
            <div class="metric-label">Index Used</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" id="metric-ops">—</div>
            <div class="metric-label">Operations</div>
          </div>
        </div>
      </div>
      <div class="bottom-pane" id="pane-history">
        <div class="query-history" id="query-history">
          <div class="explanation-placeholder">Your query history will appear here.</div>
        </div>
      </div>
      <div class="bottom-pane" id="pane-results">
        <div class="results-table-wrap" id="results-table-wrap">
          <div class="explanation-placeholder">Query results will appear here.</div>
        </div>
      </div>
      <div class="bottom-pane" id="pane-notes">
        <div class="notes-container">
          <div class="notes-header">
            <span class="notes-status" id="notes-status">Saved locally</span>
            <button class="notes-btn" id="btn-clear-notes" title="Clear notes">✕ Clear Notes</button>
          </div>
          <textarea class="notes-textarea" id="notes-textarea" placeholder="Type your personal SQL notes, queries, or thoughts here..."></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- Challenges / Practice Modal - Redesigned -->
  <div class="modal-overlay chal-overlay" id="challenges-modal" style="display:none">
    <div class="chal-modal">
      <div class="chal-modal-header">
        <div class="chal-modal-title">
          <span class="chal-modal-icon">🎯</span>
          <span>SQL Challenges</span>
        </div>
        <div class="chal-modal-meta">
          <div class="chal-global-progress">
            <span class="chal-progress-text"><span id="practice-solved-count">0</span> / <span id="practice-total-count">100</span> solved</span>
            <div class="chal-progress-track">
              <div class="chal-progress-bar" id="practice-progress-bar" style="width:0%"></div>
            </div>
          </div>
        </div>
        <button class="chal-close-btn" id="btn-close-chal-modal" title="Close">&#10005;</button>
      </div>
      <div class="chal-modal-body" id="chal-modal-body">
        <!-- Level sections with numbered circles rendered by JS -->
      </div>
    </div>
  </div>

  <!-- Learn Modal -->
  <div class="modal-overlay" id="learn-modal" style="display:none">
    <div class="modal modal-wide">
      <div class="modal-header">
        <h2>📚 SQL Learning Center</h2>
        <button class="icon-btn modal-close" data-modal="learn-modal">✕</button>
      </div>
      <div class="modal-body" id="learn-content"></div>
    </div>
  </div>

  <!-- Leaderboard Modal -->
  <div class="modal-overlay" id="leaderboard-modal" style="display:none">
    <div class="modal">
      <div class="modal-header">
        <h2>🏆 Leaderboard</h2>
        <button class="icon-btn modal-close" data-modal="leaderboard-modal">✕</button>
      </div>
      <div class="modal-body" id="leaderboard-content"></div>
    </div>
  </div>

  <!-- Add Table Modal -->
  <div class="modal-overlay" id="add-table-modal" style="display:none">
    <div class="modal">
      <div class="modal-header">
        <h2>➕ Create New Table</h2>
        <button class="icon-btn modal-close" data-modal="add-table-modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Table Name</label>
          <input type="text" id="new-table-name" class="form-input" placeholder="e.g. products" />
        </div>
        <div id="new-table-columns">
          <div class="form-group">
            <label>Columns</label>
            <div id="column-list"></div>
            <button class="btn-secondary" id="btn-add-column">+ Add Column</button>
          </div>
        </div>
        <button class="btn-run" id="btn-create-table">Create Table</button>
      </div>
    </div>
  </div>
  `;

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <Script src="/engine.js" strategy="afterInteractive" />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
