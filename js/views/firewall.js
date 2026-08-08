import { store } from '../data/store.js';
import { createBarChart } from '../components/charts.js';
import { createTable } from '../components/table.js';
import { showModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let subscriptions = [];
let chartInstance = null;
let rulesData = [];

export function render(container) {
  container.innerHTML = `
    <section class="firewall-view fade-in">
      <div class="view-header">
        <div>
          <h2 class="view-title">Firewall Rules</h2>
          <p class="view-subtitle">Manage and monitor firewall rule sets</p>
        </div>
        <button class="btn btn-primary btn-sm" id="add-rule-btn">+ Add Rule</button>
      </div>
      
      <div class="grid-3" style="margin-bottom:1.5rem">
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Total Rules</span></div>
          <div class="stat-value" id="fw-stat-total">0</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Active Rules</span></div>
          <div class="stat-value" id="fw-stat-active" style="color:var(--accent-green)">0</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header"><span class="stat-title">Total Hits</span></div>
          <div class="stat-value" id="fw-stat-hits" style="color:var(--accent-cyan)">0</div>
        </div>
      </div>
      
      <div class="glass-card" style="margin-bottom:1.5rem">
        <div class="card-header"><h3 class="card-title">Rule Hit Distribution</h3></div>
        <div style="height: 200px">
          <canvas id="firewall-hits-chart"></canvas>
        </div>
      </div>
      
      <div class="glass-card" style="padding:0; overflow: hidden;">
        <div id="rules-table-container"></div>
      </div>
    </section>
  `;

  bindEvents();
  
  const ctx = document.getElementById('firewall-hits-chart');
  if (ctx) {
    chartInstance = createBarChart(ctx, { labels: [], datasets: [] });
  }

  subscriptions.push(store.subscribe('rules', handleDataUpdate));
  handleDataUpdate(store.get('rules') || []);
}

export function destroy() {
  subscriptions.forEach(unsub => unsub());
  subscriptions = [];
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function bindEvents() {
  const addBtn = document.getElementById('add-rule-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openRuleModal());
  }
}

function handleDataUpdate(data) {
  rulesData = [...(data || [])];
  updateStats();
  updateChart();
  renderTable();
}

function updateStats() {
  const totalEl = document.getElementById('fw-stat-total');
  if (totalEl) totalEl.textContent = rulesData.length;
  
  const activeEl = document.getElementById('fw-stat-active');
  if (activeEl) activeEl.textContent = rulesData.filter(r => r.enabled).length;
  
  const totalHits = rulesData.reduce((sum, r) => sum + (r.hitCount || 0), 0);
  const hitsEl = document.getElementById('fw-stat-hits');
  if (hitsEl) hitsEl.textContent = totalHits.toLocaleString();
}

function updateChart() {
  if (!chartInstance) return;
  const sorted = [...rulesData].sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0)).slice(0, 8);
  chartInstance.data.labels = sorted.map(r => r.name);
  chartInstance.data.datasets = [{
    label: 'Hit Count',
    data: sorted.map(r => r.hitCount || 0),
    backgroundColor: 'rgba(0, 229, 255, 0.6)',
    borderColor: 'rgba(0, 229, 255, 1)',
    borderWidth: 1
  }];
  chartInstance.update();
}

function renderTable() {
  const container = document.getElementById('rules-table-container');
  if (!container) return;

  const columns = [
    { 
      key: 'enabled', 
      label: 'Status', 
      format: (val, row) => `
        <label style="position:relative;display:inline-block;width:34px;height:18px;cursor:pointer;">
          <input type="checkbox" ${val ? 'checked' : ''} onchange="window.toggleRule('${row.id}')" style="opacity:0;width:0;height:0;">
          <span style="position:absolute;top:0;left:0;right:0;bottom:0;background-color:${val ? 'var(--accent-green)' : 'var(--text-muted)'};border-radius:18px;transition:.3s;"></span>
        </label>
      ` 
    },
    { key: 'name', label: 'Name' },
    { key: 'protocol', label: 'Protocol', format: val => `<span class="badge badge-info">${val || 'ANY'}</span>` },
    { key: 'source', label: 'Source', format: (val, row) => row.source || row.srcIp || 'ANY' },
    { key: 'destination', label: 'Destination', format: (val, row) => row.destination || row.dstIp || 'ANY' },
    { key: 'port', label: 'Port', format: (val, row) => row.port || row.dstPort || '*' },
    { key: 'action', label: 'Action', format: val => `<span class="badge ${(val || '').toLowerCase() === 'allow' ? 'badge-low' : 'badge-critical'}">${val}</span>` },
    { key: 'hitCount', label: 'Hits', format: val => (val || 0).toLocaleString() },
    { key: 'lastHit', label: 'Last Hit', format: val => val ? new Date(val).toLocaleTimeString() : 'Never' },
    {
      key: 'actions',
      label: 'Actions',
      format: (_, row) => `
        <button class="btn btn-icon btn-sm" onclick="window.editRule('${row.id}')" title="Edit Rule">✏️</button>
        <button class="btn btn-icon btn-sm" style="color:var(--accent-red)" onclick="window.deleteRule('${row.id}')" title="Delete Rule">🗑️</button>
      `
    }
  ];

  createTable(container, rulesData, columns);
}

// Global handlers for inline HTML events
window.toggleRule = (id) => {
  const updated = rulesData.map(r => {
    if (r.id === id) return { ...r, enabled: !r.enabled };
    return r;
  });
  store.set('rules', updated);
  const changed = updated.find(r => r.id === id);
  if (changed) {
    showToast(`Rule "${changed.name}" ${changed.enabled ? 'enabled' : 'disabled'}.`, 'info');
  }
};

window.editRule = (id) => {
  const rule = rulesData.find(r => r.id === id);
  if (rule) openRuleModal(rule);
};

window.deleteRule = (id) => {
  const rule = rulesData.find(r => r.id === id);
  if (rule) {
    confirmModal('Delete Rule', `Are you sure you want to delete "${rule.name}"?`, () => {
      const updated = rulesData.filter(r => r.id !== id);
      store.set('rules', updated);
      showToast(`Rule "${rule.name}" deleted successfully.`, 'success');
    });
  }
};

function openRuleModal(rule = null) {
  const isEdit = !!rule;
  showModal({
    title: isEdit ? 'Edit Firewall Rule' : 'Add Firewall Rule',
    body: `
      <form id="rule-form">
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="rf-name" value="${rule?.name || ''}" placeholder="e.g. Block Malicious IP" required>
        </div>
        <div class="grid-2" style="margin-bottom: 1rem;">
          <div class="form-group">
            <label class="form-label">Protocol</label>
            <select class="form-select" id="rf-proto">
              <option ${rule?.protocol === 'TCP' ? 'selected' : ''}>TCP</option>
              <option ${rule?.protocol === 'UDP' ? 'selected' : ''}>UDP</option>
              <option ${rule?.protocol === 'ICMP' ? 'selected' : ''}>ICMP</option>
              <option ${rule?.protocol === 'ANY' || !rule ? 'selected' : ''}>ANY</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Port</label>
            <input type="text" class="form-input" id="rf-port" value="${rule?.port || rule?.dstPort || '*'}" placeholder="* or 443">
          </div>
        </div>
        <div class="grid-2" style="margin-bottom: 1rem;">
          <div class="form-group">
            <label class="form-label">Source IP / CIDR</label>
            <input type="text" class="form-input" id="rf-src" value="${rule?.source || rule?.srcIp || 'ANY'}" placeholder="ANY or 192.168.1.0/24">
          </div>
          <div class="form-group">
            <label class="form-label">Destination IP</label>
            <input type="text" class="form-input" id="rf-dst" value="${rule?.destination || rule?.dstIp || 'ANY'}" placeholder="ANY or 10.0.0.1">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Action</label>
          <select class="form-select" id="rf-action">
            <option ${rule?.action === 'ALLOW' ? 'selected' : ''}>ALLOW</option>
            <option ${rule?.action === 'DROP' || !rule ? 'selected' : ''}>DROP</option>
            <option ${rule?.action === 'REJECT' ? 'selected' : ''}>REJECT</option>
          </select>
        </div>
      </form>
    `,
    actions: [
      { label: 'Cancel', class: 'btn-secondary', onClick: () => {} },
      { 
        label: 'Save Rule', 
        class: 'btn-primary', 
        onClick: () => {
          const name = document.getElementById('rf-name')?.value || 'Unnamed Rule';
          const protocol = document.getElementById('rf-proto')?.value || 'ANY';
          const port = document.getElementById('rf-port')?.value || '*';
          const source = document.getElementById('rf-src')?.value || 'ANY';
          const destination = document.getElementById('rf-dst')?.value || 'ANY';
          const action = document.getElementById('rf-action')?.value || 'DROP';

          if (isEdit) {
            const updated = rulesData.map(r => {
              if (r.id === rule.id) {
                return { ...r, name, protocol, port, source, destination, action, srcIp: source, dstIp: destination, dstPort: port };
              }
              return r;
            });
            store.set('rules', updated);
            showToast(`Rule "${name}" updated successfully.`, 'success');
          } else {
            const newRule = {
              id: 'rule-' + Date.now(),
              name,
              protocol,
              port,
              source,
              destination,
              srcIp: source,
              dstIp: destination,
              dstPort: port,
              action,
              enabled: true,
              hitCount: 0,
              lastHit: null
            };
            store.set('rules', [newRule, ...rulesData]);
            showToast(`Rule "${name}" created successfully.`, 'success');
          }
        } 
      }
    ]
  });
}
