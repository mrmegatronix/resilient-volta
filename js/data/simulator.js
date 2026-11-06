export function generateTrafficData() {
  return { labels: [], inbound: [], outbound: [] };
}

export function generateThreatEvents() {
  return [];
}

export function generateDevices() {
  return [];
}

export function generateFirewallRules() {
  return [];
}

export function generateLogEntries() {
  return [];
}

export function generateVulnerabilities() {
  return [];
}

export function generateSystemMetrics() {
  return {
    cpu: 0,
    ram: 0,
    disk: 0,
    cpuTemp: 0,
    networkIn: 0,
    networkOut: 0,
    processes: 0
  };
}

export function startLiveSimulation(store) {
  store.set('traffic', { labels: [], inbound: [], outbound: [] });
  store.set('threats', []);
  store.set('devices', []);
  store.set('rules', []);
  store.set('logs', []);
  store.set('vulnerabilities', []);
  store.set('metrics', {
    cpu: 0,
    ram: 0,
    disk: 0,
    cpuTemp: 0,
    networkIn: 0,
    networkOut: 0,
    processes: 0
  });
}
