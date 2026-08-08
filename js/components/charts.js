if (typeof window !== 'undefined' && window.Chart) {
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.05)';
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 24, 39, 0.9)';
  Chart.defaults.plugins.tooltip.titleColor = '#e2e8f0';
  Chart.defaults.plugins.tooltip.bodyColor = '#94a3b8';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
}

const DEFAULT_COLORS = ['#00e5ff', '#39ff14', '#3b82f6', '#a855f7', '#ff9f43', '#ff3b5c'];

export function createAreaChart(canvasElement, data, options = {}) {
  const ctx = canvasElement.getContext('2d');
  
  let chartData = { ...data };
  if (data && data.inbound && data.outbound && !data.datasets) {
    chartData = {
      labels: data.labels || [],
      datasets: [
        {
          label: 'Inbound (MB/s)',
          data: data.inbound,
          borderColor: '#00e5ff',
          backgroundColor: 'gradient'
        },
        {
          label: 'Outbound (MB/s)',
          data: data.outbound,
          borderColor: '#a855f7',
          backgroundColor: 'gradient'
        }
      ]
    };
  }
  
  // Apply gradients
  const datasets = (chartData.datasets || []).map((ds, i) => {
    const dsCopy = { ...ds };
    if (dsCopy.backgroundColor === 'gradient' || !dsCopy.backgroundColor) {
      const color = dsCopy.borderColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasElement.height || 300);
      
      const hex2rgba = (hex, alpha) => {
        const cleaned = hex.replace('#', '');
        const r = parseInt(cleaned.substring(0, 2), 16) || 0;
        const g = parseInt(cleaned.substring(2, 4), 16) || 0;
        const b = parseInt(cleaned.substring(4, 6), 16) || 0;
        return `rgba(${r},${g},${b},${alpha})`;
      };
      
      const parsedColor = color.startsWith('#') ? hex2rgba(color, 0.3) : color;
      const parsedColorEnd = color.startsWith('#') ? hex2rgba(color, 0.0) : 'transparent';
      
      gradient.addColorStop(0, parsedColor);
      gradient.addColorStop(1, parsedColorEnd);
      
      dsCopy.backgroundColor = gradient;
      dsCopy.borderColor = color;
    }
    dsCopy.fill = true;
    dsCopy.tension = dsCopy.tension !== undefined ? dsCopy.tension : 0.4;
    return dsCopy;
  });

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels || [],
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: datasets.length > 1,
          labels: { color: '#94a3b8' }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      ...options
    }
  });
}

export function createDonutChart(canvasElement, data, options = {}) {
  const ctx = canvasElement.getContext('2d');
  let labels = [];
  let values = [];
  let colors = DEFAULT_COLORS;

  if (Array.isArray(data)) {
    labels = data.map(d => d.label || d.name || '');
    values = data.map(d => d.value || d.count || 0);
    colors = data.map((d, i) => d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
  } else if (data && data.labels && data.values) {
    labels = data.labels;
    values = data.values;
    colors = data.colors || DEFAULT_COLORS;
  } else if (data && data.datasets && data.datasets[0]) {
    labels = data.labels || [];
    values = data.datasets[0].data || [];
    colors = data.datasets[0].backgroundColor || DEFAULT_COLORS;
  }

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8' }
        }
      },
      ...options
    }
  });
}

export function createBarChart(canvasElement, data, options = {}) {
  const ctx = canvasElement.getContext('2d');
  
  data.datasets = data.datasets.map((ds, i) => {
    ds.backgroundColor = ds.backgroundColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    ds.borderRadius = ds.borderRadius !== undefined ? ds.borderRadius : 6;
    return ds;
  });

  return new Chart(ctx, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' } }
      },
      plugins: {
        legend: { display: data.datasets.length > 1 }
      },
      ...options
    }
  });
}

export function createSparkline(canvasElement, data, color = '#00e5ff') {
  const ctx = canvasElement.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      layout: { padding: 0 }
    }
  });
}

export function createGauge(container, value, maxValue = 100, label = '', color = '#00e5ff') {
  if (!container) return { update: () => {}, destroy: () => {} };
  container.innerHTML = '';
  
  const percent = Math.min(100, Math.max(0, (value / maxValue) * 100));
  
  const gaugeEl = document.createElement('div');
  gaugeEl.className = 'gauge-container';
  gaugeEl.style.position = 'relative';
  gaugeEl.style.width = '120px';
  gaugeEl.style.height = '120px';
  gaugeEl.style.margin = '0 auto';
  gaugeEl.style.borderRadius = '50%';
  gaugeEl.style.background = `conic-gradient(${color} ${percent}%, rgba(255,255,255,0.1) 0)`;
  gaugeEl.style.display = 'flex';
  gaugeEl.style.alignItems = 'center';
  gaugeEl.style.justifyContent = 'center';
  
  const innerEl = document.createElement('div');
  innerEl.style.width = '100px';
  innerEl.style.height = '100px';
  innerEl.style.borderRadius = '50%';
  innerEl.style.backgroundColor = 'var(--bg-secondary)';
  innerEl.style.display = 'flex';
  innerEl.style.flexDirection = 'column';
  innerEl.style.alignItems = 'center';
  innerEl.style.justifyContent = 'center';
  
  const valEl = document.createElement('div');
  valEl.style.fontSize = '1.5rem';
  valEl.style.fontWeight = 'bold';
  valEl.style.color = 'var(--text-primary)';
  valEl.textContent = `${Math.round(percent)}%`;
  
  const labelEl = document.createElement('div');
  labelEl.style.fontSize = '0.75rem';
  labelEl.style.color = 'var(--text-muted)';
  labelEl.textContent = label;
  
  innerEl.appendChild(valEl);
  innerEl.appendChild(labelEl);
  gaugeEl.appendChild(innerEl);
  container.appendChild(gaugeEl);
  
  return {
    element: gaugeEl,
    update: (newValue) => {
      const p = Math.min(100, Math.max(0, (newValue / maxValue) * 100));
      gaugeEl.style.background = `conic-gradient(${color} ${p}%, rgba(255,255,255,0.1) 0)`;
      valEl.textContent = `${Math.round(p)}%`;
    },
    destroy: () => {
      gaugeEl.remove();
    }
  };
}

export function updateChart(chart, newData) {
  chart.data = newData;
  chart.update('none');
}
