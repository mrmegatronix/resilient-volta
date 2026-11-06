export const store = {
  _state: {
    currentView: 'dashboard',
    devices: [],
    threats: [],
    logs: [],
    traffic: { labels: [], inbound: [], outbound: [] },
    trafficData: { labels: [], inbound: [], outbound: [] },
    rules: [],
    firewallRules: [],
    vulnerabilities: [],
    metrics: { cpu: 0, ram: 0, disk: 0, cpuTemp: 0, networkIn: 0, networkOut: 0, processes: 0 },
    systemMetrics: { cpu: 0, ram: 0, disk: 0, cpuTemp: 0, networkIn: 0, networkOut: 0, processes: 0 },
    notifications: []
  },
  _listeners: {},
  get(key) { 
    if (key === 'trafficData' && this._state.traffic) return this._state.traffic;
    if (key === 'firewallRules' && this._state.rules) return this._state.rules;
    if (key === 'systemMetrics' && this._state.metrics) return this._state.metrics;
    return this._state[key]; 
  },
  getState(key) {
    return this.get(key);
  },
  set(key, value) { 
    this._state[key] = value; 
    (this._listeners[key] || []).forEach(fn => fn(value)); 

    // Handle aliases
    const aliases = {
      'traffic': 'trafficData',
      'trafficData': 'traffic',
      'rules': 'firewallRules',
      'firewallRules': 'rules',
      'metrics': 'systemMetrics',
      'systemMetrics': 'metrics'
    };
    if (aliases[key]) {
      const aliasKey = aliases[key];
      this._state[aliasKey] = value;
      (this._listeners[aliasKey] || []).forEach(fn => fn(value));
    }
  },
  subscribe(key, callback) { 
    (this._listeners[key] = this._listeners[key] || []).push(callback); 
    return () => { 
      this._listeners[key] = this._listeners[key].filter(fn => fn !== callback); 
    }; 
  },
  update(key, updater) { 
    this.set(key, updater(this.get(key))); 
  }
};
