import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';

let currentContainer = null;
let cleanupFns = [];

export function render(container) {
  currentContainer = container;
  cleanupFns = [];

  container.innerHTML = `
    <style>
      .toggle-switch { position: relative; width: 44px; height: 24px; display: inline-block; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; transition: 0.3s; }
      .toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: var(--text-secondary); border-radius: 50%; transition: 0.3s; }
      .toggle-switch input:checked + .toggle-slider { background: var(--accent-cyan); }
      .toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); background: white; }
    </style>
    <section class="settings-view fade-in">
      <div class="view-header">
        <div>
          <h2 class="view-title">Settings</h2>
          <p class="view-subtitle">Configure your security dashboard</p>
        </div>
      </div>

      <div class="grid-2 stagger-1">
        <!-- Left column -->
        <div style="display:flex; flex-direction:column; gap:1.5rem">
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom:1rem">Notifications</h3>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Email Notifications</label>
              <div style="display:flex;align-items:center;gap:0.75rem">
                <label class="toggle-switch">
                  <input type="checkbox" id="set-email-notif" checked>
                  <span class="toggle-slider"></span>
                </label>
                <span style="color:var(--text-secondary);font-size:0.875rem">Send email alerts for critical threats</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="set-email" placeholder="admin@homelab.local">
            </div>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Webhook URL</label>
              <input type="url" class="form-input" id="set-webhook" placeholder="https://hooks.slack.com/...">
            </div>
            <div class="form-group">
              <label class="form-label">Alert Threshold</label>
              <select class="form-select" id="set-threshold">
                <option value="critical">Critical Only</option>
                <option value="high" selected>Critical & High</option>
                <option value="all">All Severities</option>
              </select>
            </div>
          </div>

          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom:1rem">Dashboard</h3>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Refresh Interval</label>
              <div style="display:flex;align-items:center;gap:1rem">
                <input type="range" min="1" max="30" value="5" class="form-input" style="flex:1" id="refresh-slider">
                <span id="refresh-value" style="color:var(--text-primary);font-size:0.875rem;min-width:40px">5s</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Max Log Entries</label>
              <select class="form-select" id="set-max-logs">
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500" selected>500</option>
                <option value="1000">1000</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Theme</label>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-sm btn-primary" id="btn-theme-dark">Dark</button>
                <button class="btn btn-sm btn-secondary" id="btn-theme-light">Light</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div style="display:flex; flex-direction:column; gap:1.5rem">
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom:1rem">Scan Schedule</h3>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Vulnerability Scan Interval</label>
              <select class="form-select" id="set-vuln-interval">
                <option value="6">Every 6 hours</option>
                <option value="12" selected>Every 12 hours</option>
                <option value="24">Daily</option>
                <option value="168">Weekly</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Network Discovery</label>
              <select class="form-select" id="set-net-discovery">
                <option value="5" selected>Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Hourly</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Port Scan Range</label>
              <input type="text" class="form-input" id="set-port-range" value="1-1024" placeholder="1-65535">
            </div>
          </div>

          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom:1rem">API Integrations</h3>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">pfSense API</label>
              <input type="url" class="form-input" id="set-pfsense" placeholder="https://pfsense.local/api">
            </div>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Pi-hole API</label>
              <input type="url" class="form-input" id="set-pihole" placeholder="http://pihole.local/admin/api.php">
            </div>
            <div class="form-group" style="margin-bottom:1rem">
              <label class="form-label">Wazuh API</label>
              <input type="url" class="form-input" id="set-wazuh" placeholder="https://wazuh.local:55000">
            </div>
            <div class="form-group">
              <label class="form-label">Suricata Log Path</label>
              <input type="text" class="form-input" id="set-suricata" placeholder="/var/log/suricata/eve.json">
            </div>
          </div>
        </div>
      </div>

      <div class="stagger-2" style="margin-top:1.5rem;display:flex;justify-content:flex-end;gap:0.75rem">
        <button class="btn btn-secondary" id="reset-settings-btn">Reset Defaults</button>
        <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
      </div>

      <div class="glass-card stagger-3" style="margin-top:1.5rem">
        <h3 class="card-title" style="margin-bottom:0.5rem">About CyberShield</h3>
        <p style="color:var(--text-secondary);font-size:0.875rem">Version 1.0.0 &middot; Homelab Security Dashboard</p>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem">Built with vanilla HTML/CSS/JS &middot; Chart.js &middot; No server required</p>
      </div>
    </section>
  `;

  loadSettings(container);
  attachEventListeners(container);
}

export function destroy() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  currentContainer = null;
}

function addScopedListener(el, event, handler) {
  if (!el) return;
  el.addEventListener(event, handler);
  cleanupFns.push(() => el.removeEventListener(event, handler));
}

function applyThemeChoice(container, theme, notify = false) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cybershield_theme', theme);

  const darkBtn = container.querySelector('#btn-theme-dark');
  const lightBtn = container.querySelector('#btn-theme-light');
  if (darkBtn && lightBtn) {
    if (theme === 'light') {
      lightBtn.classList.add('btn-primary');
      lightBtn.classList.remove('btn-secondary');
      darkBtn.classList.add('btn-secondary');
      darkBtn.classList.remove('btn-primary');
    } else {
      darkBtn.classList.add('btn-primary');
      darkBtn.classList.remove('btn-secondary');
      lightBtn.classList.add('btn-secondary');
      lightBtn.classList.remove('btn-primary');
    }
  }

  if (notify) {
    showToast(`Theme switched to ${theme === 'light' ? 'Light' : 'Dark'} mode`, 'info');
  }
}

function attachEventListeners(container) {
  const slider = container.querySelector('#refresh-slider');
  const refreshVal = container.querySelector('#refresh-value');
  addScopedListener(slider, 'input', (e) => {
    if (refreshVal) refreshVal.textContent = e.target.value + 's';
  });

  addScopedListener(container.querySelector('#btn-theme-dark'), 'click', () => {
    applyThemeChoice(container, 'dark', true);
  });

  addScopedListener(container.querySelector('#btn-theme-light'), 'click', () => {
    applyThemeChoice(container, 'light', true);
  });

  addScopedListener(container.querySelector('#save-settings-btn'), 'click', () => {
    saveSettings(container);
    import('../data/pihole.js').then(({ pihole }) => {
      const piholeUrl = container.querySelector('#set-pihole')?.value || 'http://192.168.1.253';
      pihole.setCredentials(piholeUrl);
      pihole.syncAll();
    });
    showToast('Settings saved successfully and Pi-hole synced');
  });

  addScopedListener(container.querySelector('#reset-settings-btn'), 'click', () => {
    confirmModal('Reset Settings', 'Are you sure you want to revert to default settings?', () => {
      localStorage.removeItem('cybershield_settings');
      applyThemeChoice(container, 'dark', false);
      loadSettings(container);
      showToast('Settings reset to defaults');
    });
  });
}

function saveSettings(container) {
  const settings = {
    emailNotif: container.querySelector('#set-email-notif').checked,
    email: container.querySelector('#set-email').value,
    webhook: container.querySelector('#set-webhook').value,
    threshold: container.querySelector('#set-threshold').value,
    refresh: container.querySelector('#refresh-slider').value,
    maxLogs: container.querySelector('#set-max-logs').value,
    vulnInterval: container.querySelector('#set-vuln-interval').value,
    netDiscovery: container.querySelector('#set-net-discovery').value,
    portRange: container.querySelector('#set-port-range').value,
    apiPfsense: container.querySelector('#set-pfsense').value,
    apiPihole: container.querySelector('#set-pihole').value,
    apiWazuh: container.querySelector('#set-wazuh').value,
    suricataPath: container.querySelector('#set-suricata').value,
  };
  localStorage.setItem('cybershield_settings', JSON.stringify(settings));
}

function loadSettings(container) {
  const defaults = {
    emailNotif: true, email: '', webhook: '', threshold: 'high',
    refresh: 5, maxLogs: '500', vulnInterval: '12', netDiscovery: '5',
    portRange: '1-1024', apiPfsense: '', apiPihole: 'http://192.168.1.253', apiWazuh: '', suricataPath: ''
  };
  
  const savedStr = localStorage.getItem('cybershield_settings');
  const settings = savedStr ? JSON.parse(savedStr) : defaults;

  container.querySelector('#set-email-notif').checked = settings.emailNotif;
  container.querySelector('#set-email').value = settings.email;
  container.querySelector('#set-webhook').value = settings.webhook;
  container.querySelector('#set-threshold').value = settings.threshold;
  
  container.querySelector('#refresh-slider').value = settings.refresh;
  container.querySelector('#refresh-value').textContent = settings.refresh + 's';
  
  container.querySelector('#set-max-logs').value = settings.maxLogs;
  container.querySelector('#set-vuln-interval').value = settings.vulnInterval;
  container.querySelector('#set-net-discovery').value = settings.netDiscovery;
  container.querySelector('#set-port-range').value = settings.portRange;
  
  container.querySelector('#set-pfsense').value = settings.apiPfsense;
  container.querySelector('#set-pihole').value = settings.apiPihole;
  container.querySelector('#set-wazuh').value = settings.apiWazuh;
  container.querySelector('#set-suricata').value = settings.suricataPath;

  const currentTheme = localStorage.getItem('cybershield_theme') || document.documentElement.getAttribute('data-theme') || 'dark';
  applyThemeChoice(container, currentTheme, false);
}
