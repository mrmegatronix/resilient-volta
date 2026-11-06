import { store } from '../data/store.js';
import { createAreaChart, createDonutChart, createSparkline, createGauge } from '../components/charts.js';

let subscriptions = [];
let chartInstances = [];
let sparklineInstances = [];
let gauges = {};
let updateInterval = null;
let currentRange = '24h';

export function render(container) {
  container.innerHTML = `
    <section class="dashboard-view fade-in">
      <!-- KPI Row -->
      <div class="grid-4">
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-title"><i class="icon-shield"></i> Threats Blocked</span>
          </div>
          <div class="stat-value" id="dash-threats-val">0</div>
          <div class="stat-trend">0%</div>
          <canvas class="stat-sparkline" id="spark-threats"></canvas>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-title"><i class="icon-monitor"></i> Active Devices</span>
          </div>
          <div class="stat-value" id="dash-devices-val">0</div>
          <div class="stat-trend">0%</div>
          <canvas class="stat-sparkline" id="spark-devices"></canvas>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-title"><i class="icon-brick-wall"></i> Firewall Rules</span>
          </div>
          <div class="stat-value" id="dash-rules-val">0</div>
          <div class="stat-trend">0%</div>
          <canvas class="stat-sparkline" id="spark-rules"></canvas>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-title"><i class="icon-clock"></i> Uptime</span>
          </div>
          <div class="stat-value" id="dash-uptime-val">N/A</div>
          <div class="stat-trend">0%</div>
          <canvas class="stat-sparkline" id="spark-uptime"></canvas>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-top: 1.5rem">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">Network Traffic</h3>
            <div class="btn-group">
              <button class="btn btn-sm btn-secondary ${currentRange === '1h' ? 'active' : ''}" data-range="1h">1h</button>
              <button class="btn btn-sm btn-secondary ${currentRange === '6h' ? 'active' : ''}" data-range="6h">6h</button>
              <button class="btn btn-sm btn-secondary ${currentRange === '24h' ? 'active' : ''}" data-range="24h">24h</button>
              <button class="btn btn-sm btn-secondary ${currentRange === '7d' ? 'active' : ''}" data-range="7d">7d</button>
            </div>
          </div>
          <div style="height: 300px">
            <canvas id="traffic-chart"></canvas>
          </div>
        </div>
        
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">Threat Distribution</h3>
          </div>
          <div style="height: 300px; position: relative">
            <canvas id="threat-donut-chart"></canvas>
            <div id="donut-total" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; font-weight: bold; pointer-events: none;">0</div>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="grid-2" style="margin-top: 1.5rem">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">Live Log Feed</h3>
            <button class="btn btn-icon btn-sm" id="toggle-log-feed">Pause</button>
          </div>
          <div id="log-feed-container" style="max-height: 320px; overflow-y: auto;">
            <!-- Logs go here -->
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="glass-card">
            <div class="card-header"><h3 class="card-title">Top Blocked IPs</h3></div>
            <table class="data-table" style="width: 100%">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>IP Address</th>
                  <th>Blocks</th>
                </tr>
              </thead>
              <tbody id="top-ips-tbody">
                <!-- IP rows -->
              </tbody>
            </table>
          </div>
          
          <div class="glass-card">
            <div class="card-header"><h3 class="card-title">System Health</h3></div>
            <div class="grid-3">
              <div id="gauge-cpu"></div>
              <div id="gauge-ram"></div>
              <div id="gauge-disk"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  initCharts();
  bindEvents(container);
  
  subscriptions.push(store.subscribe('threats', updateThreats));
  subscriptions.push(store.subscribe('devices', updateDevices));
  subscriptions.push(store.subscribe('rules', updateRules));
  subscriptions.push(store.subscribe('traffic', updateTraffic));
  subscriptions.push(store.subscribe('logs', updateLogs));
  subscriptions.push(store.subscribe('metrics', updateMetrics));

  // Initial render
  updateThreats(store.get('threats') || []);
  updateDevices(store.get('devices') || []);
  updateRules(store.get('rules') || []);
  updateTraffic(store.get('traffic') || { labels: [], inbound: [], outbound: [] });
  updateLogs(store.get('logs') || []);
  updateMetrics(store.get('metrics') || { cpu: 0, ram: 0, disk: 0 });

  updateInterval = setInterval(() => {
    updateSparklines();
  }, 10000);
}

export function destroy() {
  subscriptions.forEach(unsub => unsub());
  subscriptions = [];
  chartInstances.forEach(chart => chart && chart.destroy && chart.destroy());
  chartInstances = [];
  sparklineInstances.forEach(chart => chart && chart.destroy && chart.destroy());
  sparklineInstances = [];
  Object.values(gauges).forEach(g => g && g.destroy && g.destroy());
  gauges = {};
  if (updateInterval) clearInterval(updateInterval);
}

function initCharts() {
  const trafficCtx = document.getElementById('traffic-chart');
  if (trafficCtx) {
    chartInstances.push(createAreaChart(trafficCtx, { labels: [], inbound: [], outbound: [] }));
  }

  const donutCtx = document.getElementById('threat-donut-chart');
  if (donutCtx) {
    chartInstances.push(createDonutChart(donutCtx, []));
  }

  sparklineInstances.push(createSparkline(document.getElementById('spark-threats'), [0, 0, 0, 0, 0, 0, 0], 'var(--accent-red)'));
  sparklineInstances.push(createSparkline(document.getElementById('spark-devices'), [0, 0, 0, 0, 0, 0, 0], 'var(--accent-green)'));
  sparklineInstances.push(createSparkline(document.getElementById('spark-rules'), [0, 0, 0, 0, 0, 0, 0], 'var(--accent-cyan)'));
  sparklineInstances.push(createSparkline(document.getElementById('spark-uptime'), [0, 0, 0, 0, 0, 0, 0], 'var(--accent-purple)'));

  gauges.cpu = createGauge(document.getElementById('gauge-cpu'), 0, 100, 'CPU', 'var(--accent-cyan)');
  gauges.ram = createGauge(document.getElementById('gauge-ram'), 0, 100, 'RAM', 'var(--accent-purple)');
  gauges.disk = createGauge(document.getElementById('gauge-disk'), 0, 100, 'Disk', 'var(--accent-blue)');
}

function bindEvents(container) {
  const rangeBtns = container.querySelectorAll('[data-range]');
  rangeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      rangeBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentRange = e.currentTarget.dataset.range || '24h';
      updateTraffic(store.get('traffic') || { labels: [], inbound: [], outbound: [] });
    });
  });

  const toggleFeed = container.querySelector('#toggle-log-feed');
  if (toggleFeed) {
    toggleFeed.addEventListener('click', (e) => {
      const isPaused = e.target.textContent === 'Resume';
      e.target.textContent = isPaused ? 'Pause' : 'Resume';
      container.querySelector('#log-feed-container').dataset.paused = !isPaused;
    });
  }
}

function updateThreats(threats) {
  const el = document.getElementById('dash-threats-val');
  if (el) el.textContent = threats.length;
  
  const typeCounts = threats.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {});
  
  const donutData = Object.keys(typeCounts).map(type => ({ label: type, value: typeCounts[type] }));
  const donutChart = chartInstances[1];
  if (donutChart) {
    donutChart.data.labels = donutData.map(d => d.label);
    if (donutChart.data.datasets[0]) {
      donutChart.data.datasets[0].data = donutData.map(d => d.value);
    }
    donutChart.update();
  }
  
  const totalEl = document.getElementById('donut-total');
  if (totalEl) totalEl.textContent = threats.length;

  const topIps = {};
  threats.forEach(t => {
    if (!topIps[t.sourceIP]) topIps[t.sourceIP] = { count: 0, country: t.sourceCountry || '🌐' };
    topIps[t.sourceIP].count++;
  });
  
  const sortedIps = Object.entries(topIps).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  const tbody = document.getElementById('top-ips-tbody');
  if (tbody) {
    tbody.innerHTML = sortedIps.map(([ip, data]) => `
      <tr>
        <td>${data.country}</td>
        <td>${ip}</td>
        <td>${data.count}</td>
      </tr>
    `).join('');
  }
}

function updateDevices(devices) {
  const onlineCount = (devices || []).filter(d => d.status === 'online').length;
  const el = document.getElementById('dash-devices-val');
  if (el) el.textContent = onlineCount;
}

function updateRules(rules) {
  const el = document.getElementById('dash-rules-val');
  if (el) el.textContent = (rules || []).length;
}

function updateTraffic(data) {
  const chart = chartInstances[0];
  if (chart && data && data.labels) {
    let labels = data.labels || [];
    let inbound = data.inbound || [];
    let outbound = data.outbound || [];

    if (currentRange === '1h') {
      labels = labels.slice(-6);
      inbound = inbound.slice(-6);
      outbound = outbound.slice(-6);
    } else if (currentRange === '6h') {
      labels = labels.slice(-36);
      inbound = inbound.slice(-36);
      outbound = outbound.slice(-36);
    } else if (currentRange === '7d') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      if (inbound.length === 0 && outbound.length === 0) {
        inbound = [0, 0, 0, 0, 0, 0, 0];
        outbound = [0, 0, 0, 0, 0, 0, 0];
      } else {
        const avgIn = inbound.length ? inbound.reduce((a, b) => a + b, 0) / inbound.length : 0;
        const avgOut = outbound.length ? outbound.reduce((a, b) => a + b, 0) / outbound.length : 0;
        const dayFactors = [1, 1, 1, 1, 1, 1, 1];
        inbound = dayFactors.map(f => Math.round(avgIn * f));
        outbound = dayFactors.map(f => Math.round(avgOut * f));
      }
    }

    chart.data.labels = labels;
    if (chart.data.datasets[0]) chart.data.datasets[0].data = inbound;
    if (chart.data.datasets[1]) chart.data.datasets[1].data = outbound;
    chart.update();
  }
}

function updateLogs(logs) {
  const container = document.getElementById('log-feed-container');
  if (!container || container.dataset.paused === 'true') return;
  
  const recentLogs = [...(logs || [])].reverse().slice(0, 20);
  container.innerHTML = recentLogs.map(log => `
    <div class="log-entry">
      <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
      <span class="badge badge-${(log.severity || 'info').toLowerCase()}">${log.severity}</span>
      <span class="log-source">${log.source || ''}</span>
      <span class="log-message">${log.message || ''}</span>
    </div>
  `).join('');
}

function updateMetrics(metrics) {
  if (!metrics) return;
  if (gauges.cpu && metrics.cpu !== undefined) gauges.cpu.update(metrics.cpu);
  if (gauges.ram && metrics.ram !== undefined) gauges.ram.update(metrics.ram);
  if (gauges.disk && metrics.disk !== undefined) gauges.disk.update(metrics.disk);
}

function updateSparklines() {
  // No random walk when mock data is removed
}
