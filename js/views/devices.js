import { store } from '../data/store.js';
import { createTable } from '../components/table.js';
import { showModal } from '../components/modal.js';

let unsubscribe = null;
let currentView = 'grid';
let searchQuery = '';
let typeFilter = '';
let statusFilter = '';

export function render(container) {
  container.innerHTML = `
    <section class="devices-view fade-in">
      <div class="view-header">
        <div>
          <h2 class="view-title">Device Inventory</h2>
          <p class="view-subtitle">Monitor and manage all connected network assets</p>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <button class="btn btn-secondary btn-sm device-view-toggle active" data-view="grid">Grid View</button>
          <button class="btn btn-secondary btn-sm device-view-toggle" data-view="table">Table View</button>
        </div>
      </div>

      <div class="grid-4 stagger-1" style="margin-bottom:1.5rem" id="devices-stats">
        <!-- Stats populated dynamically -->
      </div>

      <div class="filter-bar stagger-2">
        <input type="search" class="form-input" placeholder="Search devices by name, IP, OS..." style="width:280px" id="device-search">
        <select class="form-select" style="width:auto" id="device-type-filter">
          <option value="">All Types</option>
          <option value="server">Servers</option>
          <option value="router">Routers</option>
          <option value="nas">NAS</option>
          <option value="iot">IoT</option>
          <option value="workstation">Workstations</option>
          <option value="mobile">Mobile</option>
        </select>
        <select class="form-select" style="width:auto" id="device-status-filter">
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <div id="devices-grid" class="grid-3 stagger-3"></div>
      
      <div class="glass-card stagger-3" id="devices-table-container" style="display:none; padding:0; overflow:hidden;"></div>
    </section>
  `;

  attachEventListeners();
  updateView();
  unsubscribe = store.subscribe('devices', updateView);
}

export function destroy() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  delete window._showDevice;
}

function attachEventListeners() {
  document.querySelectorAll('.device-view-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.device-view-toggle').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      updateViewDisplay();
    });
  });

  const searchInput = document.getElementById('device-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').toLowerCase();
      updateView();
    });
  }

  const typeSelect = document.getElementById('device-type-filter');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      typeFilter = e.target.value;
      updateView();
    });
  }

  const statusSelect = document.getElementById('device-status-filter');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      updateView();
    });
  }
}

function updateViewDisplay() {
  const grid = document.getElementById('devices-grid');
  const table = document.getElementById('devices-table-container');
  if (!grid || !table) return;

  if (currentView === 'grid') {
    grid.style.display = 'grid';
    table.style.display = 'none';
  } else {
    grid.style.display = 'none';
    table.style.display = 'block';
  }
}

function showDeviceDetails(devOrId) {
  const devices = store.get('devices') || [];
  const dev = typeof devOrId === 'object' ? devOrId : devices.find(d => d.id == devOrId);
  if (!dev) return;

  const content = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      <div class="grid-2">
        <div class="glass-card" style="padding:1rem;">
          <h4 style="color:var(--text-secondary);margin-bottom:0.5rem;font-size:0.8rem;text-transform:uppercase;">Network Info</h4>
          <p style="margin-bottom:0.25rem;"><strong>IP:</strong> <span style="font-family:monospace;color:var(--accent-cyan)">${dev.ip}</span></p>
          <p style="margin-bottom:0.25rem;"><strong>MAC:</strong> <span style="font-family:monospace">${dev.mac || 'N/A'}</span></p>
          <p style="margin-bottom:0.25rem;"><strong>Status:</strong> <span class="status-dot ${dev.status === 'online' ? 'status-online' : 'status-offline'}"></span> ${dev.status}</p>
          <p><strong>Uptime:</strong> ${dev.uptime || 'N/A'}</p>
        </div>
        <div class="glass-card" style="padding:1rem;">
          <h4 style="color:var(--text-secondary);margin-bottom:0.5rem;font-size:0.8rem;text-transform:uppercase;">System & Security</h4>
          <p style="margin-bottom:0.25rem;"><strong>OS:</strong> ${dev.os}</p>
          <p style="margin-bottom:0.25rem;"><strong>Type:</strong> ${dev.type}</p>
          <div style="margin-top:0.5rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
              <span>Risk Score:</span>
              <span style="font-weight:700; color:${getRiskColor(dev.riskScore)}">${dev.riskScore}/100</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${dev.riskScore}%; background: ${getRiskColor(dev.riskScore)}"></div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h4 style="color:var(--text-secondary);margin-bottom:0.5rem;font-size:0.8rem;text-transform:uppercase;">Open Ports</h4>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          ${(dev.openPorts || []).length > 0 ? 
            dev.openPorts.map(p => `<span class="badge badge-info">${p}</span>`).join('') : 
            '<span style="color:var(--text-muted)">No open ports detected</span>'}
        </div>
      </div>
    </div>
  `;
  showModal({
    title: `Device: ${dev.hostname || dev.ip}`,
    body: content,
    actions: [
      { label: 'Close', class: 'btn-secondary', onClick: () => {} }
    ]
  });
}

function getRiskColor(score) {
  if (score < 30) return 'var(--accent-green)';
  if (score < 70) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

function updateView() {
  const allDevices = store.get('devices') || [];
  const filtered = allDevices.filter(d => {
    const host = (d.hostname || '').toLowerCase();
    const ip = (d.ip || '').toLowerCase();
    const os = (d.os || '').toLowerCase();
    const mSearch = searchQuery ? (host.includes(searchQuery) || ip.includes(searchQuery) || os.includes(searchQuery)) : true;
    const mType = typeFilter ? (d.type || '').toLowerCase() === typeFilter.toLowerCase() : true;
    const mStatus = statusFilter ? (d.status || '').toLowerCase() === statusFilter.toLowerCase() : true;
    return mSearch && mType && mStatus;
  });

  // Update stats
  const total = allDevices.length;
  const online = allDevices.filter(d => d.status === 'online').length;
  const offline = total - online;
  const highRisk = allDevices.filter(d => (d.riskScore || 0) >= 70).length;

  const statsContainer = document.getElementById('devices-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Total Devices</span></div>
        <div class="stat-value">${total}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Online</span></div>
        <div class="stat-value" style="color:var(--accent-green)">${online}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">Offline</span></div>
        <div class="stat-value" style="color:var(--text-muted)">${offline}</div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-header"><span class="stat-title">High Risk</span></div>
        <div class="stat-value" style="color:var(--accent-red)">${highRisk}</div>
      </div>
    `;
  }

  // Render Grid
  const gridContainer = document.getElementById('devices-grid');
  if (gridContainer) {
    gridContainer.innerHTML = filtered.map(d => `
      <div class="glass-card" style="cursor:pointer;" onclick="window._showDevice('${d.id}')">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
          <h3 class="card-title">${d.hostname || 'Device'}</h3>
          <div class="status-dot ${d.status === 'online' ? 'status-online' : 'status-offline'}"></div>
        </div>
        <div style="font-family:monospace; color:var(--accent-cyan); margin-bottom:0.5rem; font-size:0.9rem;">${d.ip}</div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.75rem;">${d.os} • ${d.type}</div>
        
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem; display:flex; justify-content:space-between;">
          <span>Risk Score</span>
          <span style="color:${getRiskColor(d.riskScore)}; font-weight:600;">${d.riskScore}/100</span>
        </div>
        <div class="progress-bar" style="margin-bottom:0.75rem">
          <div class="progress-fill" style="width: ${d.riskScore}%; background: ${getRiskColor(d.riskScore)}"></div>
        </div>
        
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
          <span>Ports: ${(d.openPorts || []).length}</span>
          <span>Seen: ${d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'N/A'}</span>
        </div>
      </div>
    `).join('');
  }

  window._showDevice = showDeviceDetails;

  // Render Table
  const tableContainer = document.getElementById('devices-table-container');
  if (tableContainer) {
    const cols = [
      { key: 'status', label: '', format: v => `<div class="status-dot ${v === 'online' ? 'status-online' : 'status-offline'}"></div>` },
      { key: 'hostname', label: 'Hostname' },
      { key: 'ip', label: 'IP', format: v => `<span style="font-family:monospace;color:var(--accent-cyan)">${v}</span>` },
      { key: 'mac', label: 'MAC', format: v => `<span style="font-family:monospace">${v || 'N/A'}</span>` },
      { key: 'os', label: 'OS' },
      { key: 'type', label: 'Type' },
      { key: 'riskScore', label: 'Risk Score', format: v => `
        <div style="display:flex; align-items:center; gap:0.5rem">
          <span style="width:24px; font-weight:600; color:${getRiskColor(v)}">${v}</span>
          <div class="progress-bar" style="width:60px; height:4px"><div class="progress-fill" style="width:${v}%; background:${getRiskColor(v)}"></div></div>
        </div>`
      },
      { key: 'openPorts', label: 'Ports', format: v => (v || []).length },
      { key: 'uptime', label: 'Uptime' },
      { key: 'lastSeen', label: 'Last Seen', format: v => v ? new Date(v).toLocaleTimeString() : 'N/A' }
    ];
    
    createTable(tableContainer, filtered, cols, (row) => {
      showDeviceDetails(row);
    });
  }

  updateViewDisplay();
}
