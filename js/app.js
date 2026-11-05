import { store } from './data/store.js';
import { startLiveSimulation } from './data/simulator.js';
import { showToast } from './components/toast.js';
import { showModal } from './components/modal.js';

import * as dashboardView from './views/dashboard.js';
import * as networkView from './views/network.js';
import * as threatsView from './views/threats.js';
import * as firewallView from './views/firewall.js';
import * as logsView from './views/logs.js';
import * as vulnerabilitiesView from './views/vulnerabilities.js';
import * as devicesView from './views/devices.js';
import * as settingsView from './views/settings.js';

// Route definitions mapping to view modules
const routes = {
  'dashboard': dashboardView,
  'network': networkView,
  'threats': threatsView,
  'firewall': firewallView,
  'logs': logsView,
  'vulnerabilities': vulnerabilitiesView,
  'devices': devicesView,
  'settings': settingsView
};

let currentRoute = null;

async function handleRoute() {
  const hash = window.location.hash || '#/dashboard';
  const path = hash.replace('#/', '');
  
  if (!routes[path]) {
    window.location.hash = '#/dashboard';
    return;
  }
  
  if (currentRoute && routes[currentRoute] && typeof routes[currentRoute].destroy === 'function') {
    try {
      routes[currentRoute].destroy();
    } catch (e) {
      console.error(`Error destroying view ${currentRoute}:`, e);
    }
  }
  
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  mainContent.innerHTML = '';
  
  try {
    store.set('currentView', path);
    currentRoute = path;
    routes[path].render(mainContent);
  } catch (e) {
    console.error(`Error loading view ${path}:`, e);
    mainContent.innerHTML = `<div class="empty-state fade-in" style="color: var(--accent-red)">Failed to load view: ${path}</div>`;
  }
  
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.view === path) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

function handleGlobalSearch(query) {
  if (!query) return;
  const q = query.toLowerCase();

  const devices = (store.get('devices') || []).filter(d => 
    (d.hostname || '').toLowerCase().includes(q) || 
    (d.ip || '').includes(q) || 
    (d.os || '').toLowerCase().includes(q)
  );

  const threats = (store.get('threats') || []).filter(t => 
    (t.type || '').toLowerCase().includes(q) || 
    (t.sourceIP || '').includes(q) || 
    (t.targetIP || '').includes(q) || 
    (t.sourceCountry || '').toLowerCase().includes(q)
  );

  const vulns = (store.get('vulnerabilities') || []).filter(v => 
    (v.cveId || '').toLowerCase().includes(q) || 
    (v.service || '').toLowerCase().includes(q) || 
    (v.host || '').includes(q)
  );

  const logs = (store.get('logs') || []).filter(l => 
    (l.message || '').toLowerCase().includes(q) || 
    (l.source || '').includes(q)
  ).slice(0, 5);

  const totalResults = devices.length + threats.length + vulns.length + logs.length;

  if (totalResults === 0) {
    showToast(`No results found for "${query}"`, 'info');
    return;
  }

  const resultsHtml = `
    <div style="display:flex; flex-direction:column; gap:1rem; max-height:60vh; overflow-y:auto; padding-right:0.5rem;">
      ${devices.length > 0 ? `
        <div>
          <h4 style="color:var(--accent-cyan); margin-bottom:0.5rem; font-size:0.85rem; text-transform:uppercase;">Devices (${devices.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${devices.map(d => `
              <div class="glass-card" style="padding:0.6rem 0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="location.hash='#/devices'">
                <span><strong>${d.hostname}</strong> (${d.ip})</span>
                <span class="badge ${d.status === 'online' ? 'badge-low' : 'badge-high'}">${d.status}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${threats.length > 0 ? `
        <div>
          <h4 style="color:var(--accent-red); margin-bottom:0.5rem; font-size:0.85rem; text-transform:uppercase;">Threats (${threats.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${threats.slice(0, 5).map(t => `
              <div class="glass-card" style="padding:0.6rem 0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="location.hash='#/threats'">
                <span><strong>${t.type}</strong> from ${t.sourceCountry} (${t.sourceIP})</span>
                <span class="badge badge-${(t.severity || 'info').toLowerCase()}">${t.severity}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${vulns.length > 0 ? `
        <div>
          <h4 style="color:var(--accent-orange); margin-bottom:0.5rem; font-size:0.85rem; text-transform:uppercase;">Vulnerabilities (${vulns.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${vulns.map(v => `
              <div class="glass-card" style="padding:0.6rem 0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="location.hash='#/vulnerabilities'">
                <span><strong>${v.cveId}</strong> - ${v.service} on ${v.host}</span>
                <span class="badge badge-${(v.severity || 'info').toLowerCase()}">${v.severity}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${logs.length > 0 ? `
        <div>
          <h4 style="color:var(--accent-blue); margin-bottom:0.5rem; font-size:0.85rem; text-transform:uppercase;">Recent Log Matches (${logs.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${logs.map(l => `
              <div class="glass-card" style="padding:0.6rem 0.8rem; font-size:0.8rem; cursor:pointer;" onclick="location.hash='#/logs'">
                <span style="color:var(--accent-cyan)">[${l.source}]</span> ${l.message}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  showModal({
    title: `Search Results for "${query}" (${totalResults} matches)`,
    body: resultsHtml,
    actions: [
      { label: 'Close', class: 'btn-secondary', onClick: () => {} }
    ]
  });
}

function showNotificationsModal() {
  const threats = store.get('threats') || [];
  const criticalThreats = threats.filter(t => (t.severity || '').toLowerCase() === 'critical' || (t.severity || '').toLowerCase() === 'high').slice(0, 6);

  const content = `
    <div style="display:flex; flex-direction:column; gap:0.75rem; max-height:60vh; overflow-y:auto;">
      ${criticalThreats.length > 0 ? criticalThreats.map(t => `
        <div class="glass-card" style="padding:0.75rem 1rem; border-left:3px solid var(--accent-${(t.severity || '').toLowerCase() === 'critical' ? 'red' : 'orange'})">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
            <strong style="color:var(--text-primary)">${t.type}</strong>
            <span class="badge badge-${(t.severity || 'info').toLowerCase()}">${t.severity}</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.25rem;">${t.description || `Attack attempt detected from ${t.sourceIP}`}</p>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; justify-content:space-between;">
            <span>Source: ${t.sourceCountry}</span>
            <span>${t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>
      `).join('') : '<div class="empty-state">No critical alerts at this time.</div>'}
    </div>
  `;

  showModal({
    title: `Security Alerts & Notifications`,
    body: content,
    actions: [
      { label: 'View All Threats', class: 'btn-primary', onClick: () => { window.location.hash = '#/threats'; } },
      { label: 'Dismiss', class: 'btn-secondary', onClick: () => {} }
    ]
  });
}

const routeList = ['dashboard', 'network', 'threats', 'firewall', 'logs', 'vulnerabilities', 'devices', 'settings'];

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const elHH = document.getElementById('clock-hh');
  const elMM = document.getElementById('clock-mm');
  const elSS = document.getElementById('clock-ss');
  if (elHH) elHH.textContent = hh;
  if (elMM) elMM.textContent = mm;
  if (elSS) elSS.textContent = ss;
}

function updateNotificationBadge(threats) {
  const badge = document.querySelector('.notification-badge');
  if (!badge) return;
  const list = Array.isArray(threats) ? threats : (store.get('threats') || []);
  const count = list.filter(t => {
    const sev = (t.severity || '').toLowerCase();
    return sev === 'critical' || sev === 'high';
  }).length;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function initApp() {
  // Apply saved theme on boot
  const savedTheme = localStorage.getItem('cybershield_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Start header live clock
  updateClock();
  setInterval(updateClock, 1000);

  // Subscribe to threats for notification badge updates
  store.subscribe('threats', (threats) => {
    updateNotificationBadge(threats);
  });

  // Start simulator first to populate store state
  startLiveSimulation(store);
  updateNotificationBadge(store.get('threats'));

  // Setup router
  window.addEventListener('hashchange', handleRoute);
  
  // Force initial route
  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  } else {
    handleRoute();
  }
  
  // Setup sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }
  
  // Close sidebar on mobile when clicking nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });
  
  // Setup global search
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          handleGlobalSearch(query);
        }
      }
    });
  }
  
  // Setup notifications button
  const notifBtn = document.getElementById('notifications-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      showNotificationsModal();
    });
  }

  // Global keyboard navigation shortcuts
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const currentIdx = Math.max(0, routeList.indexOf(currentRoute || 'dashboard'));

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (window.__cybershieldFrozen) return;
      const prevIdx = (currentIdx - 1 + routeList.length) % routeList.length;
      window.location.hash = `#/${routeList[prevIdx]}`;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (window.__cybershieldFrozen) return;
      const nextIdx = (currentIdx + 1) % routeList.length;
      window.location.hash = `#/${routeList[nextIdx]}`;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (window.__cybershieldFrozen) return;
      window.location.hash = `#/${routeList[0]}`;
    } else if (e.key === ' ') {
      e.preventDefault();
      window.__cybershieldPaused = !window.__cybershieldPaused;
      showToast(window.__cybershieldPaused ? 'Live simulation paused' : 'Live simulation resumed', 'info');
    } else if (e.key === '0') {
      e.preventDefault();
      window.__cybershieldFrozen = !window.__cybershieldFrozen;
      showToast(window.__cybershieldFrozen ? 'Navigation freeze lock enabled' : 'Navigation freeze lock disabled', 'info');
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
