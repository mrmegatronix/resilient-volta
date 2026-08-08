export function generateTrafficData(hours = 24) {
  const labels = [];
  const inbound = [];
  const outbound = [];
  const now = new Date();
  
  for (let i = hours * 60; i >= 0; i -= 10) { // Every 10 mins
    const t = new Date(now.getTime() - i * 60000);
    labels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    const hour = t.getHours();
    // Peak 14-18, valley 2-6
    const timeFactor = Math.sin((hour - 8) * Math.PI / 12) * 0.5 + 0.5;
    
    let inVal = 50 + (400 * timeFactor) + (Math.random() * 50 - 25);
    let outVal = 20 + (150 * timeFactor) + (Math.random() * 30 - 15);
    
    inbound.push(Math.max(0, Math.round(inVal)));
    outbound.push(Math.max(0, Math.round(outVal)));
  }
  
  return { labels, inbound, outbound };
}

const threatTypes = ['Malware', 'DDoS', 'Phishing', 'Brute Force', 'Port Scan', 'SQL Injection'];
const severities = [
  { level: 'critical', weight: 5 },
  { level: 'high', weight: 15 },
  { level: 'medium', weight: 40 },
  { level: 'low', weight: 40 }
];
const countries = [
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Iran', flag: '🇮🇷' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'North Korea', flag: '🇰🇵' },
  { name: 'Germany', flag: '🇩🇪' }
];

function getRandomWeighted(options) {
  const total = options.reduce((sum, opt) => sum + opt.weight, 0);
  let rand = Math.random() * total;
  for (const opt of options) {
    if (rand < opt.weight) return opt.level;
    rand -= opt.weight;
  }
  return options[0].level;
}

function randomIP() {
  return `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
}

export function generateThreatEvents(count = 50) {
  const events = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
    const severity = getRandomWeighted(severities);
    
    events.push({
      id: `thr-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(now.getTime() - Math.random() * 86400000),
      type,
      severity,
      sourceIP: randomIP(),
      sourceCountry: `${country.flag} ${country.name}`,
      targetIP: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      targetPort: [80, 443, 22, 3389, 53][Math.floor(Math.random() * 5)],
      action: ['Blocked', 'Quarantined', 'Flagged'][Math.floor(Math.random() * 3)],
      description: `Detected ${type} attempt from ${country.name}`,
      details: 'Automated defense systems intercepted the payload. Analysis indicates known signature match.'
    });
  }
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateDevices(count = 23) {
  const hostnames = ['pfsense-gw', 'proxmox-01', 'pihole-dns', 'nas-synology', 'cam-frontdoor', 'desktop-zeus', 'iphone-15', 'tv-livingroom', 'hue-bridge', 'ubuntu-server'];
  const osTypes = ['pfSense', 'Proxmox VE', 'Ubuntu 22.04', 'Raspberry Pi OS', 'Synology DSM', 'ESXi', 'Windows 11', 'iOS 17', 'Android 14'];
  const devTypes = ['router', 'server', 'nas', 'iot', 'workstation', 'mobile', 'access-point'];
  
  const devices = [];
  for (let i = 0; i < count; i++) {
    devices.push({
      id: `dev-${i}`,
      hostname: hostnames[i % hostnames.length] + (i > hostnames.length ? `-${i}` : ''),
      ip: `192.168.1.${i + 1}`,
      mac: Array.from({length: 6}, () => Math.floor(Math.random()*255).toString(16).padStart(2,'0')).join(':'),
      os: osTypes[Math.floor(Math.random() * osTypes.length)],
      type: devTypes[Math.floor(Math.random() * devTypes.length)],
      status: Math.random() > 0.1 ? 'online' : 'offline',
      riskScore: Math.floor(Math.random() * 100),
      openPorts: Array.from({length: Math.floor(Math.random()*5)}, () => Math.floor(Math.random()*1000)),
      lastSeen: new Date(Date.now() - Math.random() * 10000),
      uptime: `${Math.floor(Math.random()*100)}d ${Math.floor(Math.random()*24)}h`
    });
  }
  return devices;
}

export function generateFirewallRules(count = 30) {
  const rules = [];
  for (let i = 0; i < count; i++) {
    rules.push({
      id: `rule-${i}`,
      name: `Rule ${i + 1}`,
      enabled: Math.random() > 0.2,
      protocol: ['TCP', 'UDP', 'ICMP', 'ANY'][Math.floor(Math.random() * 4)],
      source: Math.random() > 0.5 ? 'ANY' : randomIP(),
      destination: Math.random() > 0.5 ? 'ANY' : `192.168.1.${Math.floor(Math.random() * 200)}`,
      port: Math.floor(Math.random() * 10000).toString(),
      action: ['Allow', 'Block', 'Reject'][Math.floor(Math.random() * 3)],
      hitCount: Math.floor(Math.random() * 100000),
      lastHit: new Date(Date.now() - Math.random() * 86400000),
      description: `Auto-generated rule ${i}`
    });
  }
  return rules;
}

export function generateLogEntries(count = 200) {
  const categories = ['firewall', 'ids', 'auth', 'system', 'dns', 'vpn'];
  const logs = [];
  const now = new Date();
  
  const messages = [
    'SSH brute force attempt from ',
    'DNS query blocked: malware.bad-domain.ru',
    'VPN tunnel established: user admin@wireguard',
    'Certificate renewal: pihole.local.lan',
    'System update available for ',
    'Unusual outbound traffic detected on port 4444'
  ];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const severity = Math.random() > 0.9 ? 'critical' : (Math.random() > 0.7 ? 'warning' : 'info');
    let msg = messages[Math.floor(Math.random() * messages.length)];
    if (msg.endsWith('from ') || msg.endsWith('for ')) msg += randomIP();
    
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(now.getTime() - i * 60000 - Math.random() * 10000),
      severity,
      source: `192.168.1.${Math.floor(Math.random() * 200)}`,
      message: msg,
      category
    });
  }
  return logs;
}

export function generateVulnerabilities(count = 15) {
  const vulns = [];
  for (let i = 0; i < count; i++) {
    vulns.push({
      id: `vuln-${i}`,
      cveId: `CVE-2024-${Math.floor(10000 + Math.random() * 90000)}`,
      severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)],
      cvssScore: (Math.random() * 10).toFixed(1),
      host: `192.168.1.${Math.floor(Math.random() * 200)}`,
      service: ['OpenSSH', 'Nginx', 'Apache', 'Samba', 'Docker'][Math.floor(Math.random() * 5)],
      description: 'Remote code execution vulnerability exists due to improper bounds checking.',
      remediation: 'Upgrade to the latest version immediately.',
      status: ['open', 'patched', 'accepted'][Math.floor(Math.random() * 3)],
      discoveredDate: new Date(Date.now() - Math.random() * 30 * 86400000)
    });
  }
  return vulns;
}

export function generateSystemMetrics() {
  return {
    cpu: Math.floor(Math.random() * 100),
    ram: Math.floor(Math.random() * 100),
    disk: Math.floor(Math.random() * 100),
    cpuTemp: 35 + Math.floor(Math.random() * 50),
    networkIn: Math.floor(Math.random() * 1000),
    networkOut: Math.floor(Math.random() * 1000),
    processes: 100 + Math.floor(Math.random() * 300)
  };
}

export function startLiveSimulation(store) {
  store.set('traffic', generateTrafficData());
  store.set('threats', generateThreatEvents());
  store.set('devices', generateDevices());
  store.set('rules', generateFirewallRules());
  store.set('logs', generateLogEntries());
  store.set('vulnerabilities', generateVulnerabilities());
  store.set('metrics', generateSystemMetrics());
  
  setInterval(() => {
    store.update('logs', logs => {
      const newLog = generateLogEntries(1)[0];
      newLog.timestamp = new Date();
      return [newLog, ...logs].slice(0, 500);
    });
  }, 3000);
  
  setInterval(() => {
    store.update('metrics', metrics => {
      return {
        ...metrics,
        cpu: Math.max(0, Math.min(100, metrics.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(0, Math.min(100, metrics.ram + (Math.random() * 4 - 2))),
        cpuTemp: Math.max(35, Math.min(85, metrics.cpuTemp + (Math.random() * 2 - 1)))
      };
    });
  }, 5000);
  
  setInterval(() => {
    store.update('traffic', traffic => {
      const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        labels: [...traffic.labels.slice(1), newTime],
        inbound: [...traffic.inbound.slice(1), Math.max(0, traffic.inbound[traffic.inbound.length-1] + (Math.random() * 40 - 20))],
        outbound: [...traffic.outbound.slice(1), Math.max(0, traffic.outbound[traffic.outbound.length-1] + (Math.random() * 20 - 10))]
      };
    });
  }, 10000);
  
  setInterval(() => {
    store.update('devices', devices => {
      const idx = Math.floor(Math.random() * devices.length);
      const newDevices = [...devices];
      newDevices[idx] = { ...newDevices[idx], status: newDevices[idx].status === 'online' ? 'offline' : 'online' };
      return newDevices;
    });
  }, 15000);
  
  setInterval(() => {
    store.update('threats', threats => {
      const newThreat = generateThreatEvents(1)[0];
      newThreat.timestamp = new Date();
      
      if (newThreat.severity === 'critical' || newThreat.severity === 'high') {
        import('../components/toast.js').then(({ showToast }) => {
          showToast({
            message: `New ${newThreat.severity} threat: ${newThreat.type} from ${newThreat.sourceCountry}`,
            severity: newThreat.severity,
            duration: 5000
          });
        });
      }
      
      return [newThreat, ...threats].slice(0, 100);
    });
  }, 30000);
}
