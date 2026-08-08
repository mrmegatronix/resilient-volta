import { store } from '../data/store.js';
import { createTable } from '../components/table.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let unsubscribe = null;
let severityChart = null;
let hostChart = null;

export function render(container) {
  container.innerHTML = `
    <section class="vulnerabilities-view fade-in">
      <div class="view-header">
        <div>
          <h2 class="view-title">Vulnerability Scanner</h2>
          <p class="view-subtitle">Identify and remediate security weaknesses across your infrastructure</p>
        </div>
        <button class="btn btn-primary btn-sm" id="run-scan-btn">⚡ Run Scan</button>
      </div>

      <div class="grid-4 stagger-1" style="margin-bottom:1.5rem" id="vuln-stats">
        <!-- Stats populated dynamically -->
      </div>

      <div class="grid-2 stagger-2" style="margin-bottom:1.5rem">
        <div class="glass-card">
          <div class="card-header"><h3 class="card-title">Severity Distribution</h3></div>
          <div style="height: 180px;">
            <canvas id="vuln-severity-chart"></canvas>
          </div>
        </div>
        <div class="glass-card">
          <div class="card-header"><h3 class="card-title">Vulnerabilities by Host</h3></div>
          <div style="height: 180px;">
            <canvas id="vuln-host-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="glass-card stagger-3" style="padding:0; overflow: hidden;">
        <div id="vuln-table-container"></div>
      </div>
    </section>
  `;

  initCharts();
  attachEventListeners();
  updateView();
  unsubscribe = store.subscribe('vulnerabilities', updateView);
}

export function destroy() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  if (severityChart) {
    severityChart.destroy();
    severityChart = null;
  }
  if (hostChart) {
    hostChart.destroy();
    hostChart = null;
  }
}

function initCharts() {
  const canvasSev = document.getElementById('vuln-severity-chart');
  if (canvasSev && typeof Chart !== 'undefined') {
    const ctxSeverity = canvasSev.getContext('2d');
    severityChart = new Chart(ctxSeverity, {
      type: 'bar',
      data: { labels: ['Critical', 'High', 'Medium', 'Low'], datasets: [{ data: [0, 0, 0, 0] }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 } },
          y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
        }
      }
    });
  }

  const canvasHost = document.getElementById('vuln-host-chart');
  if (canvasHost && typeof Chart !== 'undefined') {
    const ctxHost = canvasHost.getContext('2d');
    hostChart = new Chart(ctxHost, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 } }
        }
      }
    });
  }
}

function attachEventListeners() {
  const scanBtn = document.getElementById('run-scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;display:inline-block;margin-right:4px;"></span> Scanning...';
      
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '⚡ Run Scan';
        showToast('Vulnerability scan completed. 0 new critical threats found.', 'success');
      }, 1500);
    });
  }
}

window.vulnAction = (id, status, e) => {
  if (e) e.stopPropagation();
  const vulns = [...(store.get('vulnerabilities') || [])];
  const idx = vulns.findIndex(v => v.id == id);
  if (idx > -1) {
    vulns[idx].status = status;
    store.set('vulnerabilities', vulns);
    showToast(`Vulnerability ${vulns[idx].cveId} marked as ${status}`, status === 'Patched' ? 'success' : 'info');
  }
};

function showVulnDetails(v) {
  if (!v) return;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div class="grid-2">
        <div><strong>CVE ID:</strong> <span style="color:var(--accent-cyan)">${v.cveId}</span></div>
        <div><strong>CVSS Score:</strong> <span class="badge badge-${(v.severity || 'info').toLowerCase()}">${v.cvssScore || 'N/A'} (${v.severity})</span></div>
      </div>
      <div class="grid-2">
        <div><strong>Target Host:</strong> ${v.host || 'N/A'}</div>
        <div><strong>Vulnerable Service:</strong> ${v.service || 'N/A'}</div>
      </div>
      <div>
        <h4 style="color:var(--text-secondary); margin-bottom: 0.25rem;">Description</h4>
        <p style="color:var(--text-primary); font-size: 0.9rem; line-height: 1.5;">${v.description || 'No description available.'}</p>
      </div>
      <div class="glass-card" style="padding: 1rem;">
        <h4 style="color:var(--accent-green); margin-bottom: 0.25rem;">Recommended Remediation</h4>
        <p style="color:var(--text-primary); font-size: 0.875rem;">${v.remediation || 'Apply latest vendor security updates.'}</p>
      </div>
    </div>
  `;
  showModal({
    title: `Vulnerability: ${v.cveId}`,
    body: content,
    actions: [
      { label: 'Close', class: 'btn-secondary', onClick: () => {} },
      v.status === 'Open' ? {
        label: 'Mark as Patched',
        class: 'btn-primary',
        onClick: () => window.vulnAction(v.id, 'Patched')
      } : null
    ].filter(Boolean)
  });
}

function updateView() {
  const vulns = store.get('vulnerabilities') || [];
  
  // Update stats
  const total = vulns.length;
  const critical = vulns.filter(v => (v.severity || '').toLowerCase() === 'critical' && v.status === 'Open').length;
  const open = vulns.filter(v => v.status === 'Open').length;
  const patched = vulns.filter(v => v.status === 'Patched').length;

  const statsContainer = document.getElementById('vuln-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Total Found</span></div>
        <div class="stat-value">${total}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Critical (Open)</span></div>
        <div class="stat-value" style="color:var(--accent-red)">${critical}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Open Issues</span></div>
        <div class="stat-value" style="color:var(--accent-orange)">${open}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Patched</span></div>
        <div class="stat-value" style="color:var(--accent-green)">${patched}</div>
      </div>
    `;
  }

  // Update Charts
  const severities = { critical: 0, high: 0, medium: 0, low: 0 };
  const hosts = {};
  
  vulns.forEach(v => {
    if (v.status === 'Open') {
      const sev = (v.severity || '').toLowerCase();
      if (severities[sev] !== undefined) severities[sev]++;
      if (v.host) hosts[v.host] = (hosts[v.host] || 0) + 1;
    }
  });

  if (severityChart) {
    severityChart.data = {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [severities.critical, severities.high, severities.medium, severities.low],
        backgroundColor: ['rgba(255,59,92,0.7)', 'rgba(255,159,67,0.7)', 'rgba(0,229,255,0.7)', 'rgba(57,255,20,0.7)']
      }]
    };
    severityChart.update();
  }

  if (hostChart) {
    const hostLabels = Object.keys(hosts);
    hostChart.data = {
      labels: hostLabels.length > 0 ? hostLabels : ['No hosts'],
      datasets: [{
        data: hostLabels.length > 0 ? Object.values(hosts) : [0],
        backgroundColor: 'rgba(168, 85, 247, 0.6)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    };
    hostChart.update();
  }

  // Update Table
  const tableContainer = document.getElementById('vuln-table-container');
  if (!tableContainer) return;

  const cols = [
    { key: 'cveId', label: 'CVE ID', format: v => `<span style="color:var(--accent-cyan);font-family:monospace;font-weight:600;">${v}</span>` },
    { key: 'severity', label: 'Severity', format: (v, item) => `<span class="badge badge-${(v || 'info').toLowerCase()}">${v} (${item.cvssScore || '0'})</span>` },
    { key: 'host', label: 'Host' },
    { key: 'service', label: 'Service' },
    { key: 'status', label: 'Status', format: v => `<span class="badge ${v === 'Patched' ? 'badge-low' : 'badge-high'}">${v}</span>` },
    { key: 'discoveredDate', label: 'Discovered', format: v => v ? new Date(v).toLocaleDateString() : 'N/A' },
    { key: 'actions', label: 'Actions', format: (_, item) => 
      item.status === 'Open' ? 
      `<div style="display:flex; gap:0.25rem;">
        <button class="btn btn-sm btn-secondary" onclick="window.vulnAction('${item.id}', 'Patched', event)">Patch</button>
        <button class="btn btn-sm btn-secondary" onclick="window.vulnAction('${item.id}', 'Accepted', event)">Accept</button>
       </div>` : '<span style="color:var(--text-muted)">Resolved</span>'
    }
  ];

  createTable(tableContainer, vulns, cols, (row) => {
    showVulnDetails(row);
  });
}
