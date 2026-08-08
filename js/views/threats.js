import { store } from '../data/store.js';
import { createTable, exportToCsv } from '../components/table.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let subscriptions = [];
let activeFilters = new Set(['All']);
let threatsData = [];

export function render(container) {
  container.innerHTML = `
    <section class="threats-view fade-in">
      <div class="view-header">
        <div>
          <h2 class="view-title">Threat Intelligence</h2>
          <p class="view-subtitle">Real-time threat detection and analysis</p>
        </div>
        <button class="btn btn-primary btn-sm" id="export-threats-btn">Export Report</button>
      </div>
      
      <div class="filter-bar" id="threats-filters">
        <span class="filter-chip active" data-filter="All">All</span>
        <span class="filter-chip" data-filter="Critical">Critical</span>
        <span class="filter-chip" data-filter="High">High</span>
        <span class="filter-chip" data-filter="Medium">Medium</span>
        <span class="filter-chip" data-filter="Low">Low</span>
        <span class="filter-chip" style="pointer-events:none;background:transparent;border:none;padding:0;">|</span>
        <span class="filter-chip" data-filter="Malware">Malware</span>
        <span class="filter-chip" data-filter="DDoS">DDoS</span>
        <span class="filter-chip" data-filter="Phishing">Phishing</span>
        <span class="filter-chip" data-filter="Brute Force">Brute Force</span>
      </div>
      
      <div class="grid-4" style="margin-bottom:1.5rem">
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Total Threats</span></div>
          <div class="stat-value" id="threat-stat-total">0</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Critical</span></div>
          <div class="stat-value" id="threat-stat-critical" style="color:var(--accent-red)">0</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Blocked</span></div>
          <div class="stat-value" id="threat-stat-blocked" style="color:var(--accent-green)">0</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Active</span></div>
          <div class="stat-value" id="threat-stat-active" style="color:var(--accent-orange)">0</div>
        </div>
      </div>
      
      <div class="glass-card" style="padding:0; overflow: hidden;">
        <div id="threats-table-container"></div>
      </div>
    </section>
  `;

  bindEvents(container);
  subscriptions.push(store.subscribe('threats', handleDataUpdate));
  handleDataUpdate(store.get('threats') || []);
}

export function destroy() {
  subscriptions.forEach(unsub => unsub());
  subscriptions = [];
}

function bindEvents(container) {
  const chips = container.querySelectorAll('.filter-chip[data-filter]');
  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      if (filter === 'All') {
        activeFilters.clear();
        activeFilters.add('All');
        chips.forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
      } else {
        activeFilters.delete('All');
        container.querySelector('[data-filter="All"]').classList.remove('active');
        
        if (activeFilters.has(filter)) {
          activeFilters.delete(filter);
          e.target.classList.remove('active');
          if (activeFilters.size === 0) {
            activeFilters.add('All');
            container.querySelector('[data-filter="All"]').classList.add('active');
          }
        } else {
          activeFilters.add(filter);
          e.target.classList.add('active');
        }
      }
      renderTable();
    });
  });

  const exportBtn = container.querySelector('#export-threats-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportToCsv(threatsData, 'threat-report.csv');
      showToast('Threat intelligence report exported to CSV', 'success');
    });
  }
}

function handleDataUpdate(data) {
  threatsData = [...(data || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  updateStats();
  renderTable();
}

function updateStats() {
  const totalEl = document.getElementById('threat-stat-total');
  if (totalEl) totalEl.textContent = threatsData.length;
  
  const critEl = document.getElementById('threat-stat-critical');
  if (critEl) critEl.textContent = threatsData.filter(t => (t.severity || '').toLowerCase() === 'critical').length;
  
  const blkEl = document.getElementById('threat-stat-blocked');
  if (blkEl) blkEl.textContent = threatsData.filter(t => (t.action || '').toLowerCase() === 'blocked').length;
  
  const actEl = document.getElementById('threat-stat-active');
  if (actEl) actEl.textContent = threatsData.filter(t => (t.action || '').toLowerCase() !== 'blocked').length;
}

function renderTable() {
  let filtered = threatsData;
  if (!activeFilters.has('All')) {
    filtered = threatsData.filter(t => 
      activeFilters.has(t.severity) || activeFilters.has(t.type)
    );
  }

  const columns = [
    { key: 'timestamp', label: 'Time', format: val => new Date(val).toLocaleString() },
    { key: 'severity', label: 'Severity', format: val => `<span class="badge badge-${(val || 'info').toLowerCase()}">${val}</span>` },
    { key: 'type', label: 'Type' },
    { key: 'sourceIP', label: 'Source IP' },
    { key: 'sourceCountry', label: 'Country' },
    { key: 'targetIP', label: 'Target' },
    { key: 'action', label: 'Action', format: val => `<span class="badge ${(val || '').toLowerCase() === 'blocked' ? 'badge-critical' : 'badge-info'}">${val}</span>` }
  ];

  const container = document.getElementById('threats-table-container');
  if (container) {
    createTable(container, filtered, columns, (row) => {
      showModal({
        title: `Threat Details: ${row.type || 'Incident'}`,
        body: `
          <div style="display:flex; flex-direction:column; gap:1rem;">
            <p><strong>Description:</strong> ${row.description || 'N/A'}</p>
            <p><strong>Source IP:</strong> <code>${row.sourceIP || 'N/A'}</code> (${row.sourceCountry || 'Unknown'})</p>
            <p><strong>Target IP:</strong> <code>${row.targetIP || 'N/A'}</code></p>
            <p><strong>Severity:</strong> <span class="badge badge-${(row.severity || 'info').toLowerCase()}">${row.severity}</span></p>
            <p><strong>Action Taken:</strong> ${row.action || 'Logged'}</p>
            <div class="glass-card" style="margin-top:0.5rem; padding: 1rem;">
              <h4 style="margin-bottom:0.5rem; color:var(--accent-cyan)">Recommended Action</h4>
              <p>Block IP address <code>${row.sourceIP}</code> on edge firewall and run deep scan on target <code>${row.targetIP}</code>.</p>
            </div>
          </div>
        `,
        actions: [
          { label: 'Close', class: 'btn-secondary', onClick: () => {} },
          { 
            label: 'Block IP', 
            class: 'btn-danger', 
            onClick: () => {
              const currentRules = store.get('rules') || [];
              const newRule = {
                id: 'rule-' + Date.now(),
                name: `Block Threat ${row.sourceIP}`,
                action: 'DROP',
                direction: 'INBOUND',
                protocol: 'ANY',
                srcIp: row.sourceIP,
                srcPort: '*',
                dstIp: '*',
                dstPort: '*',
                enabled: true
              };
              store.set('rules', [newRule, ...currentRules]);
              showToast(`Blocked IP ${row.sourceIP} and added firewall drop rule`, 'critical');
            } 
          }
        ]
      });
    });
  }
}
