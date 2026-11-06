import { store } from './store.js';

export class PiholeClient {
  constructor(baseUrl = 'http://192.168.1.253', apiToken = '') {
    this.baseUrl = (baseUrl || 'http://192.168.1.253').replace(/\/$/, '');
    this.apiToken = apiToken || '';
    this.pollInterval = null;
  }

  setCredentials(baseUrl, apiToken) {
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/$/, '');
    if (apiToken !== undefined) this.apiToken = apiToken;
  }

  getHeaders() {
    const headers = { 'Accept': 'application/json' };
    if (this.apiToken) {
      headers['sid'] = this.apiToken;
    }
    return headers;
  }

  async fetchEndpoint(path) {
    // Try local reverse proxy endpoint first (/api/pihole) to avoid CORS in remote browsers,
    // otherwise fallback to direct baseUrl.
    const isLocalServer = typeof window !== 'undefined' && (window.location.port === '8080' || window.location.hostname === 'localhost' || window.location.hostname === '100.114.224.85' || window.location.hostname === '192.168.1.221');
    const proxyUrl = `/api/pihole${path}`;
    const directUrl = `${this.baseUrl}${path}`;

    const tryFetch = async (targetUrl) => {
      const resp = await fetch(targetUrl, { headers: this.getHeaders() });
      if (!resp.ok) return null;
      return await resp.json();
    };

    if (isLocalServer) {
      try {
        const data = await tryFetch(proxyUrl);
        if (data && !data.error) return data;
      } catch (e) {}
    }

    try {
      return await tryFetch(directUrl);
    } catch (err) {
      return null;
    }
  }

  async syncAll() {
    if (!this.baseUrl) return;

    // 1. Live Summary & Gravity Stats
    const summary = await this.fetchEndpoint('/api/stats/summary');
    if (summary && summary.queries) {
      const totalQueries = summary.queries.total || 0;
      const blockedQueries = summary.queries.blocked || 0;
      const percentBlocked = (summary.queries.percent_blocked || 0).toFixed(1);
      const activeClients = summary.clients?.active || 0;
      const domainsBeingBlocked = summary.gravity?.domains_being_blocked || 0;

      store.update('metrics', m => ({
        ...m,
        piholeConnected: true,
        totalQueries,
        blockedQueries,
        percentBlocked,
        activeClients,
        domainsBeingBlocked,
        uptime: 'Live Sync'
      }));

      // Ingest live firewall rule
      store.set('rules', [
        {
          id: 'pihole-gravity-rule',
          name: 'Pi-hole Gravity DNS Adblocker',
          enabled: true,
          protocol: 'DNS (UDP/TCP)',
          source: 'LAN Subnet',
          destination: 'Gravity Blocklist Engine',
          port: '53',
          action: 'Block',
          hitCount: blockedQueries,
          lastHit: new Date(),
          description: `${domainsBeingBlocked.toLocaleString()} active ad/telemetry domains filtered`
        }
      ]);
    }

    // 2. Real Query Timeline (Over Time)
    const history = await this.fetchEndpoint('/api/history');
    if (history && Array.isArray(history.history)) {
      const recent = history.history.slice(-24);
      const labels = recent.map(h => {
        const d = new Date(h.timestamp * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });
      const inbound = recent.map(h => h.total || 0);
      const outbound = recent.map(h => h.blocked || 0);

      store.set('traffic', { labels, inbound, outbound });
    }

    // 3. Blocked Domains mapped to Real Security Threats
    const topBlocked = await this.fetchEndpoint('/api/stats/top_domains?blocked=true');
    if (topBlocked && Array.isArray(topBlocked.domains)) {
      const realThreats = topBlocked.domains.map((item, idx) => ({
        id: `pihole-threat-${idx}`,
        timestamp: new Date(),
        type: 'DNS Blocklist / Telemetry',
        severity: item.count > 10 ? 'High' : 'Medium',
        sourceIP: item.domain,
        sourceCountry: '🛡️ Pi-hole Blocklist',
        targetIP: '192.168.1.0/24',
        action: 'Blocked',
        description: `Blocked ad, tracker, or telemetry domain resolution (${item.count} attempts)`
      }));
      store.set('threats', realThreats);
    }

    // 4. Live Query Log mapped to System Security Logs
    const queriesResp = await this.fetchEndpoint('/api/queries');
    if (queriesResp && Array.isArray(queriesResp.queries)) {
      const realLogs = queriesResp.queries.slice(0, 100).map(q => {
        const isBlocked = (q.status || '').includes('BLOCKED') || (q.status || '').includes('GRAVITY') || (q.status || '').includes('DENYLIST');
        return {
          id: `pihole-log-${q.id}`,
          timestamp: new Date(q.time * 1000),
          severity: isBlocked ? 'critical' : 'info',
          source: (q.client && q.client.ip) || 'LAN Client',
          category: 'dns',
          message: `${isBlocked ? '[BLOCKED]' : '[ALLOWED]'} ${q.type || 'A'} query for ${q.domain || 'unknown'} (${q.status || 'OK'})`
        };
      });
      store.set('logs', realLogs);
    }

    // 5. Connected Clients mapped to Real Network Devices
    const topClients = await this.fetchEndpoint('/api/stats/top_clients');
    if (topClients && Array.isArray(topClients.clients)) {
      const realDevices = topClients.clients.map((c, idx) => ({
        id: `dev-${idx}`,
        hostname: c.name || `Host-${c.ip.split('.').pop()}`,
        ip: c.ip,
        mac: 'Auto-detected',
        os: c.ip === '127.0.0.1' ? 'Linux (Pi-hole Host)' : 'LAN Client',
        type: c.ip.endsWith('.254') ? 'router' : (c.ip.endsWith('.250') || c.ip.endsWith('.249') ? 'server' : 'workstation'),
        status: 'online',
        riskScore: c.count > 5000 ? 15 : 5,
        openPorts: [53, 80],
        lastSeen: new Date(),
        uptime: `${c.count.toLocaleString()} queries`
      }));
      store.set('devices', realDevices);
    }
  }

  startPolling(intervalMs = 5000) {
    this.stopPolling();
    this.syncAll();
    this.pollInterval = setInterval(() => this.syncAll(), intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

const savedSettingsStr = typeof localStorage !== 'undefined' ? localStorage.getItem('cybershield_settings') : null;
const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : {};
const defaultHost = savedSettings.apiPihole || 'http://192.168.1.253';
const defaultToken = 'chVJ0cTJowo/2vbGO/+XdP8B912LmSP+q7K2+Wj0eTQ=';

export const pihole = new PiholeClient(defaultHost, defaultToken);
