import { store } from '../data/store.js';
import { createTable, exportToCsv } from '../components/table.js';
import { confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let unsubscribe = null;
let volumeChart = null;
let currentSearch = '';
let currentSeverity = '';
let currentCategory = '';

export function render(container) {
  container.innerHTML = `
    <section class="logs-view fade-in">
      <div class="view-header">
        <div>
          <h2 class="view-title">Security Logs</h2>
          <p class="view-subtitle">Comprehensive event logging and analysis</p>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-secondary btn-sm" id="export-logs-btn">Export CSV</button>
          <button class="btn btn-secondary btn-sm" id="clear-logs-btn">Clear Logs</button>
        </div>
      </div>

      <div class="glass-card stagger-1" style="margin-bottom:1.5rem">
        <div class="card-header"><h3 class="card-title">Event Volume (Last 24h)</h3></div>
        <div style="height: 120px;">
          <canvas id="log-volume-chart"></canvas>
        </div>
      </div>

      <div class="filter-bar stagger-2">
        <input type="search" class="form-input" placeholder="Search logs..." style="width:240px" id="log-search">
        <select class="form-select" id="log-severity-filter" style="width:auto">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
        <select class="form-select" id="log-category-filter" style="width:auto">
          <option value="">All Categories</option>
          <option value="firewall">Firewall</option>
          <option value="ids">IDS</option>
          <option value="auth">Authentication</option>
          <option value="system">System</option>
          <option value="dns">DNS</option>
          <option value="vpn">VPN</option>
        </select>
        <span style="margin-left:auto;color:var(--text-muted);font-size:0.8rem" id="log-count">Showing 0 entries</span>
      </div>

      <div class="glass-card stagger-3" id="logs-table-container" style="padding:0; overflow:hidden;">
        <!-- Table will be injected here -->
      </div>
    </section>
  `;

  initChart();
  attachEventListeners();
  updateView();
  unsubscribe = store.subscribe('logs', updateView);
}

export function destroy() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  if (volumeChart) {
    volumeChart.destroy();
    volumeChart = null;
  }
}

function initChart() {
  const canvas = document.getElementById('log-volume-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  volumeChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', beginAtZero: true } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function updateChart(logs) {
  if (!volumeChart) return;
  const hours = Array(24).fill(0);
  const now = new Date();
  
  (logs || []).forEach(log => {
    const logDate = new Date(log.timestamp);
    const diffHours = Math.floor((now - logDate) / (1000 * 60 * 60));
    if (diffHours >= 0 && diffHours < 24) {
      hours[23 - diffHours]++;
    }
  });

  const labels = Array.from({length: 24}, (_, i) => {
    const d = new Date(now - (23 - i) * 60 * 60 * 1000);
    return d.getHours() + ':00';
  });

  volumeChart.data = {
    labels,
    datasets: [{
      label: 'Events',
      data: hours,
      backgroundColor: 'rgba(0, 229, 255, 0.4)',
      borderColor: 'rgba(0, 229, 255, 1)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };
  volumeChart.update();
}

function attachEventListeners() {
  let searchTimeout;
  const searchInput = document.getElementById('log-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = (e.target.value || '').toLowerCase();
        updateView();
      }, 200);
    });
  }

  const sevFilter = document.getElementById('log-severity-filter');
  if (sevFilter) {
    sevFilter.addEventListener('change', (e) => {
      currentSeverity = e.target.value;
      updateView();
    });
  }

  const catFilter = document.getElementById('log-category-filter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      updateView();
    });
  }

  const exportBtn = document.getElementById('export-logs-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const filteredLogs = getFilteredLogs();
      exportToCsv(filteredLogs, 'security_logs.csv');
      showToast('Logs exported successfully to CSV', 'success');
    });
  }

  const clearBtn = document.getElementById('clear-logs-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      confirmModal('Clear Logs', 'Are you sure you want to clear all security logs? This action cannot be undone.', () => {
        store.set('logs', []);
        showToast('All security logs cleared', 'info');
      });
    });
  }
}

function getFilteredLogs() {
  const logs = store.get('logs') || [];
  return logs.filter(log => {
    const msg = (log.message || '').toLowerCase();
    const src = (log.source || '').toLowerCase();
    const matchSearch = currentSearch ? (msg.includes(currentSearch) || src.includes(currentSearch)) : true;
    const matchSeverity = currentSeverity ? (log.severity || '').toLowerCase() === currentSeverity.toLowerCase() : true;
    const matchCategory = currentCategory ? (log.category || '').toLowerCase() === currentCategory.toLowerCase() : true;
    return matchSearch && matchSeverity && matchCategory;
  });
}

function updateView() {
  const filteredLogs = getFilteredLogs();
  const countEl = document.getElementById('log-count');
  if (countEl) countEl.textContent = `Showing ${filteredLogs.length} entries`;
  updateChart(filteredLogs);

  const container = document.getElementById('logs-table-container');
  if (!container) return;

  const columns = [
    { key: 'timestamp', label: 'Time', format: val => new Date(val).toLocaleTimeString() },
    { key: 'severity', label: 'Severity', format: val => `<span class="badge badge-${(val || 'info').toLowerCase()}">${val}</span>` },
    { key: 'category', label: 'Category', format: val => `<span class="badge badge-info">${val || 'System'}</span>` },
    { key: 'source', label: 'Source' },
    { key: 'message', label: 'Message' }
  ];
  
  createTable(container, filteredLogs, columns);
}
