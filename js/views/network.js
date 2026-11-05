import { store } from '../data/store.js';
import { createNetworkGraph } from '../components/network-graph.js';

let subscriptions = [];
let networkGraphInstance = null;
let currentFilter = 'All Devices';
let currentRiskFilter = 'All';

export function render(container) {
  container.innerHTML = `
    <section class="network-view fade-in" style="position: relative;">
      <div class="view-header">
        <div>
          <h2 class="view-title">Network Map</h2>
          <p class="view-subtitle">Interactive topology of your homelab network</p>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-secondary btn-sm" id="refresh-network-btn">Refresh</button>
          <select class="form-select" id="network-filter" style="width:auto">
            <option value="All Devices">All Devices</option>
            <option value="Server">Servers</option>
            <option value="IoT">IoT</option>
            <option value="Workstation">Workstations</option>
          </select>
        </div>
      </div>
      
      <div class="filter-bar" id="network-risk-filters">
        <span class="filter-chip ${currentRiskFilter === 'All' ? 'active' : ''}" data-risk="All">All Risks</span>
        <span class="filter-chip ${currentRiskFilter === 'Low' ? 'active' : ''}" data-risk="Low"><span class="status-dot status-online"></span> Low Risk</span>
        <span class="filter-chip ${currentRiskFilter === 'Medium' ? 'active' : ''}" data-risk="Medium"><span class="status-dot" style="background:var(--accent-orange)"></span> Medium Risk</span>
        <span class="filter-chip ${currentRiskFilter === 'High' ? 'active' : ''}" data-risk="High"><span class="status-dot" style="background:var(--accent-red)"></span> High Risk</span>
      </div>
      
      <div class="glass-card" style="padding:0;overflow:hidden;height:calc(100vh - 240px);position:relative;">
        <canvas id="network-canvas" style="width:100%; height:100%;"></canvas>
        
        <!-- Detail Panel -->
        <div id="network-detail-panel" style="position: absolute; right: -400px; top: 0; bottom: 0; width: 350px; background: var(--bg-card); border-left: 1px solid var(--border-card); padding: 1.5rem; transition: right 0.3s ease; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 class="card-title" id="detail-hostname">Device Details</h3>
            <button class="btn btn-icon btn-sm" id="close-detail-btn">✕</button>
          </div>
          <div id="detail-content" style="display:flex; flex-direction:column; gap: 1rem;">
            <!-- Details injected here -->
          </div>
        </div>
      </div>
    </section>
  `;

  bindEvents(container);
  
  const canvas = document.getElementById('network-canvas');
  if (canvas) {
    networkGraphInstance = createNetworkGraph(canvas, handleNodeClick);
  }

  subscriptions.push(store.subscribe('devices', updateNetwork));
  updateNetwork(store.get('devices') || []);
}

export function destroy() {
  subscriptions.forEach(unsub => unsub());
  subscriptions = [];
  if (networkGraphInstance) {
    networkGraphInstance.destroy();
    networkGraphInstance = null;
  }
}

function bindEvents(container) {
  const filterSelect = container.querySelector('#network-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      updateNetwork(store.get('devices') || []);
    });
  }

  const riskChips = container.querySelectorAll('#network-risk-filters .filter-chip[data-risk]');
  riskChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      const targetChip = e.currentTarget;
      const risk = targetChip.dataset.risk;
      if (currentRiskFilter === risk && risk !== 'All') {
        currentRiskFilter = 'All';
      } else {
        currentRiskFilter = risk;
      }
      riskChips.forEach(c => c.classList.toggle('active', c.dataset.risk === currentRiskFilter));
      updateNetwork(store.get('devices') || []);
    });
  });

  const refreshBtn = container.querySelector('#refresh-network-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      updateNetwork(store.get('devices') || []);
    });
  }

  const closeBtn = container.querySelector('#close-detail-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('network-detail-panel').style.right = '-400px';
    });
  }
}

function updateNetwork(devices) {
  if (!networkGraphInstance) return;
  
  let filtered = devices || [];
  if (currentFilter !== 'All Devices') {
    filtered = filtered.filter(d => (d.type || '').toLowerCase() === currentFilter.toLowerCase());
  }
  if (currentRiskFilter !== 'All') {
    filtered = filtered.filter(d => {
      const score = Number(d.riskScore) || 0;
      if (currentRiskFilter === 'Low') return score <= 30;
      if (currentRiskFilter === 'Medium') return score > 30 && score <= 75;
      if (currentRiskFilter === 'High') return score > 75;
      return true;
    });
  }
  
  networkGraphInstance.setData(filtered);
}

function handleNodeClick(nodeData) {
  const panel = document.getElementById('network-detail-panel');
  if (!panel) return;
  
  document.getElementById('detail-hostname').textContent = nodeData.hostname || 'Unknown Device';
  
  const riskColor = nodeData.riskScore > 80 ? 'var(--accent-red)' : nodeData.riskScore > 40 ? 'var(--accent-orange)' : 'var(--accent-green)';
  
  document.getElementById('detail-content').innerHTML = `
    <div class="form-group">
      <label class="form-label">IP Address</label>
      <div style="color: var(--text-primary)">${nodeData.ip || 'N/A'}</div>
    </div>
    <div class="form-group">
      <label class="form-label">MAC Address</label>
      <div style="color: var(--text-primary)">${nodeData.mac || 'N/A'}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Operating System</label>
      <div style="color: var(--text-primary)">${nodeData.os || 'N/A'}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <div><span class="badge ${nodeData.status === 'online' ? 'badge-info' : ''}">${nodeData.status || 'unknown'}</span></div>
    </div>
    <div class="form-group">
      <label class="form-label">Risk Score</label>
      <div style="color: ${riskColor}; font-weight: bold; font-size: 1.2rem;">${nodeData.riskScore || 0}/100</div>
    </div>
    <div class="form-group">
      <label class="form-label">Open Ports</label>
      <div style="color: var(--text-primary)">${(nodeData.openPorts || []).join(', ') || 'None'}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Last Seen</label>
      <div style="color: var(--text-primary)">${nodeData.lastSeen || 'N/A'}</div>
    </div>
  `;
  
  panel.style.right = '0';
}
