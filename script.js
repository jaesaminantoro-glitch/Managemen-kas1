* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

body {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
  padding: 24px;
  color: #1a1a1a;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

header {
  text-align: center;
  color: white;
  margin-bottom: 24px;
}

header h1 { font-size: 2rem; margin-bottom: 8px; }
.subtitle { opacity: 0.9; font-size: 0.95rem; }

/* ====== MAIN TABS ====== */
.main-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.main-tab {
  padding: 12px 22px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.main-tab:hover { background: rgba(255, 255, 255, 0.25); }

.main-tab.active {
  background: white;
  color: #1e3c72;
}

/* ====== CARDS ====== */
.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.panel-header h2 { font-size: 1.2rem; margin-bottom: 6px; }

.hint {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.5;
}

.hint code {
  background: #f0f0f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ====== FORM ====== */
label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #333;
}

input[type="text"],
input[type="password"],
select,
textarea {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #2a5298;
}

textarea { resize: vertical; line-height: 1.6; }

.search-row { margin-bottom: 16px; }

.counter {
  text-align: right;
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
}

/* ====== BUTTONS ====== */
button {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  color: white;
  flex: 1;
  padding: 12px 24px;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(42, 82, 152, 0.4);
}

.btn-primary-sm {
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  color: white;
}

.btn-primary-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(42, 82, 152, 0.3);
}

.btn-secondary {
  background: #f0f0f5;
  color: #333;
}

.btn-secondary:hover { background: #e4e4ec; }

.btn-icon {
  background: transparent;
  color: #c33;
  font-size: 1.1rem;
  padding: 6px 10px;
  border-radius: 6px;
}

.btn-icon:hover { background: #fee; }

.btn-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.btn-row-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ====== TABLE ====== */
.table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e5e5ea;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  background: #f8f9fc;
  text-align: left;
  padding: 12px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e5e5ea;
  font-size: 0.85rem;
}

.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f5;
}

.data-table tr:last-child td { border-bottom: none; }

.data-table input[type="text"] {
  padding: 8px 10px;
  font-size: 0.88rem;
  border-width: 1px;
}

.data-table input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #2a5298;
}

.data-table select {
  padding: 6px 8px;
  font-size: 0.82rem;
  border-width: 1px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 0.9rem;
  background: #fafafc;
  border-radius: 10px;
  border: 2px dashed #e5e5ea;
}

/* ====== RESULT ====== */
.result-section { margin-top: 20px; }

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.result-header h2 { font-size: 1.2rem; }

.result-box {
  background: #f8f9ff;
  border: 1px solid #e0e5ff;
  border-radius: 10px;
  padding: 18px;
  line-height: 1.8;
  font-size: 1rem;
  white-space: pre-wrap;
  min-height: 100px;
}

.diff-info {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fc;
  border-radius: 10px;
  border-left: 4px solid #2a5298;
}

.diff-info h3 { font-size: 1rem; margin-bottom: 12px; }

.diff-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 0.88rem;
  border-bottom: 1px dashed #e5e5ea;
}

.diff-item:last-child { border-bottom: none; }

.diff-item .from { color: #c33; text-decoration: line-through; }
.diff-item .to { color: #2a8f2a; font-weight: 600; }
.diff-item .count {
  background: #2a5298;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ====== CHECKER ====== */
.checker-input { margin-bottom: 16px; }

#checkerResult {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fc;
  border-radius: 10px;
}

#checkerResult h3 {
  font-size: 1rem;
  margin-bottom: 12px;
}

.inconsistency-item {
  padding: 12px;
  background: #fffbf0;
  border-left: 4px solid #f5a623;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 0.88rem;
}

.inconsistency-item .term {
  font-weight: 700;
  color: #d97706;
  margin-bottom: 6px;
}

.inconsistency-item .variants {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.inconsistency-item .variant {
  background: white;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e5e5ea;
  font-size: 0.82rem;
}

.no-issue {
  padding: 16px;
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  border-radius: 6px;
  color: #2e7d32;
  font-weight: 600;
}

/* ====== FOOTER ====== */
.footer-note {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.82rem;
  padding: 16px;
}

/* ====== HIGHLIGHT ====== */
.highlight-change {
  background: #fff3cd;
  border-radius: 3px;
  padding: 1px 3px;
  font-weight: 600;
}

/* ====== RESPONSIVE ====== */
@media (max-width: 640px) {
  header h1 { font-size: 1.4rem; }
  .card { padding: 16px; }
  .main-tabs { gap: 6px; }
  .main-tab { padding: 10px 14px; font-size: 0.85rem; }
  .panel-header { flex-direction: column; }
}
