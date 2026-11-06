export function createNetworkGraph(canvasElement, initialDevicesOrHandler = [], options = {}) {
  const ctx = canvasElement.getContext('2d');
  let animationId;
  let nodes = [];
  let edges = [];
  
  let hoveredNode = null;
  let nodeClickCallback = typeof initialDevicesOrHandler === 'function' ? initialDevicesOrHandler : (options.onNodeClick || null);
  let devices = Array.isArray(initialDevicesOrHandler) ? initialDevicesOrHandler : (options.devices || []);
  
  function initGraph() {
    const width = canvasElement.width || canvasElement.clientWidth || 800;
    const height = canvasElement.height || canvasElement.clientHeight || 600;
    canvasElement.width = width;
    canvasElement.height = height;
    
    const cx = width / 2;
    const cy = height / 2;
    
    // Define rings based on type
    const rings = {
      'router': 0,
      'access-point': 90,
      'server': 160,
      'nas': 160,
      'workstation': 240,
      'mobile': 240,
      'iot': 310
    };
    
    let routerNode = null;
    
    nodes = (devices || []).map((d, index) => {
      const typeKey = (d.type || '').toLowerCase();
      const radius = rings[typeKey] !== undefined ? rings[typeKey] : 200;
      const countForType = (devices || []).filter(item => (item.type || '').toLowerCase() === typeKey).length || 1;
      const typeIndex = (devices || []).filter((item, idx) => idx <= index && (item.type || '').toLowerCase() === typeKey).length - 1;
      const angle = (typeIndex / countForType) * Math.PI * 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      
      const node = {
        ...d,
        x, y, vx: 0, vy: 0,
        radius: typeKey === 'router' ? 22 : (typeKey === 'iot' ? 8 : 14),
        color: d.riskScore > 75 ? '#ff3b5c' : (d.riskScore > 30 ? '#ff9f43' : '#39ff14'),
        targetRadius: radius
      };
      
      if (typeKey === 'router' && !routerNode) routerNode = node;
      return node;
    });
    
    edges = [];
    if (routerNode) {
      nodes.forEach(n => {
        if (n !== routerNode) {
          edges.push({ source: n, target: routerNode, traffic: (n.riskScore || 0) > 50 ? 1 : 0 });
        }
      });
    }
  }
  
  function draw() {
    const width = canvasElement.width;
    const height = canvasElement.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw edges
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      
      const isHovered = (hoveredNode === e.source || hoveredNode === e.target);
      ctx.strokeStyle = isHovered ? 'rgba(0, 229, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = isHovered ? 2 : 1;
      
      // Dashed effect for traffic
      if (e.traffic > 0.5) {
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -Date.now() / 50;
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.stroke();
    });
    
    ctx.setLineDash([]);
    
    // Draw nodes
    nodes.forEach(n => {
      // Apply simple forces (stay near target radius, repel others)
      const cx = width / 2, cy = height / 2;
      const dx = n.x - cx, dy = n.y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const pull = (dist - n.targetRadius) * 0.01;
      
      n.vx -= (dx / dist) * pull;
      n.vy -= (dy / dist) * pull;
      
      // Repel
      nodes.forEach(other => {
        if (n !== other) {
          const odx = n.x - other.x;
          const ody = n.y - other.y;
          const odist = Math.sqrt(odx*odx + ody*ody) || 1;
          if (odist < 50) {
            n.vx += (odx / odist) * 0.5;
            n.vy += (ody / odist) * 0.5;
          }
        }
      });
      
      // Dampen
      n.vx *= 0.9;
      n.vy *= 0.9;
      
      n.x += n.vx;
      n.y += n.vy;
      
      // Keep in bounds
      n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
      n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
      
      // Draw glow
      ctx.shadowBlur = hoveredNode === n ? 20 : 10;
      ctx.shadowColor = n.color;
      
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.status === 'online' ? n.color : '#64748b';
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Label
      if (hoveredNode === n || n.type === 'router') {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.hostname, n.x, n.y + n.radius + 15);
      }
    });
    
    // Tooltip
    if (hoveredNode) {
      const text = `${hoveredNode.hostname} (${hoveredNode.ip})`;
      ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
      ctx.fillRect(hoveredNode.x + 10, hoveredNode.y - 30, ctx.measureText(text).width + 20, 25);
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(text, hoveredNode.x + 20, hoveredNode.y - 13);
    }
    
    animationId = requestAnimationFrame(draw);
  }
  
  // Event listeners
  canvasElement.addEventListener('mousemove', e => {
    const rect = canvasElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    hoveredNode = nodes.find(n => {
      const dx = n.x - mx;
      const dy = n.y - my;
      return Math.sqrt(dx*dx + dy*dy) < n.radius + 5;
    }) || null;
    
    canvasElement.style.cursor = hoveredNode ? 'pointer' : 'default';
  });
  
  canvasElement.addEventListener('click', e => {
    if (hoveredNode && nodeClickCallback) {
      nodeClickCallback(hoveredNode);
    }
  });
  
  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
  });
  resizeObserver.observe(canvasElement);
  
  initGraph();
  draw();
  
  return {
    canvas: canvasElement,
    setData: (newDevices) => {
      devices = newDevices || [];
      initGraph();
    },
    update: (newDevices) => {
      // Soft update, merge state
      (newDevices || []).forEach(d => {
        const node = nodes.find(n => n.id === d.id);
        if (node) {
          node.status = d.status;
          node.riskScore = d.riskScore;
          node.color = d.riskScore > 75 ? '#ff3b5c' : (d.riskScore > 30 ? '#ff9f43' : '#39ff14');
        }
      });
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    },
    onNodeClick: (cb) => {
      nodeClickCallback = cb;
    }
  };
}
