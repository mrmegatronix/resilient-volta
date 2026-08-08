export function createTable(arg1, arg2, arg3, arg4) {
  // Case A: createTable(data, columns) -> returns HTML string
  if (Array.isArray(arg1)) {
    const data = arg1 || [];
    const columns = arg2 || [];
    if (data.length === 0) {
      return `<table class="data-table"><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody><tr><td colspan="${columns.length}" style="text-align:center;padding:2rem;">No data</td></tr></tbody></table>`;
    }
    const theadHtml = `<thead><tr>${columns.map(c => `<th${c.width ? ` style="width:${c.width}"` : ''}>${c.label}</th>`).join('')}</tr></thead>`;
    const tbodyHtml = `<tbody>${data.map(row => {
      return `<tr>${columns.map(col => {
        let val = row[col.key];
        let formatted = val;
        if (col.format) {
          formatted = col.format(val, row);
        } else if (col.render) {
          const res = col.render(val, row);
          formatted = res instanceof Node ? res.outerHTML : res;
        } else if (val === undefined || val === null) {
          formatted = '';
        }
        return `<td>${formatted}</td>`;
      }).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<table class="data-table">${theadHtml}${tbodyHtml}</table>`;
  }

  // Case B: arg1 is container HTMLElement
  const container = arg1;
  let config = {};

  if (Array.isArray(arg2)) {
    // createTable(container, data, columns, onRowClick)
    config = {
      data: arg2,
      columns: arg3 || [],
      onRowClick: arg4 || null
    };
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    // createTable(container, config)
    config = arg2;
  }

  const { columns = [], data = [], sortable = true, virtual = false, pageSize = 50, onRowClick, emptyMessage = 'No data' } = config;
  
  let currentData = [...data];
  let sortKey = null;
  let sortDesc = false;
  
  const table = document.createElement('table');
  table.className = 'data-table';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    if (col.width) th.style.width = col.width;
    
    if (sortable && col.sortable !== false) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (sortKey === col.key) {
          if (sortDesc) {
            sortKey = null;
          } else {
            sortDesc = true;
          }
        } else {
          sortKey = col.key;
          sortDesc = false;
        }
        render();
      });
    }
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  
  container.innerHTML = '';
  container.appendChild(table);
  
  function render() {
    tbody.innerHTML = '';
    
    let displayData = [...currentData];
    
    if (sortKey) {
      displayData.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortDesc ? 1 : -1;
        if (valA > valB) return sortDesc ? -1 : 1;
        return 0;
      });
    }
    
    if (virtual) {
      displayData = displayData.slice(0, pageSize);
    }
    
    if (displayData.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = columns.length;
      td.textContent = emptyMessage;
      td.style.textAlign = 'center';
      td.style.padding = '2rem';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    
    displayData.forEach(row => {
      const tr = document.createElement('tr');
      if (onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => onRowClick(row));
      }
      
      columns.forEach(col => {
        const td = document.createElement('td');
        if (col.format) {
          const content = col.format(row[col.key], row);
          if (content instanceof Node) {
            td.appendChild(content);
          } else {
            td.innerHTML = content;
          }
        } else if (col.render) {
          const content = col.render(row[col.key], row);
          if (content instanceof Node) {
            td.appendChild(content);
          } else {
            td.innerHTML = content;
          }
        } else {
          td.textContent = row[col.key] !== undefined ? row[col.key] : '';
        }
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    // Update header arrows
    Array.from(headerRow.children).forEach((th, i) => {
      const col = columns[i];
      th.textContent = col.label;
      if (sortKey === col.key) {
        th.textContent += sortDesc ? ' ▼' : ' ▲';
      }
    });
  }
  
  render();
  
  return {
    element: table,
    updateData: (newData) => {
      currentData = [...newData];
      render();
    },
    destroy: () => {
      table.remove();
    }
  };
}

export function exportToCsv(data, columnsOrFilename, maybeFilename) {
  let columns = [];
  let filename = 'export.csv';

  if (typeof columnsOrFilename === 'string') {
    filename = columnsOrFilename;
    if (data && data.length > 0) {
      columns = Object.keys(data[0]).map(k => ({ key: k, label: k.toUpperCase() }));
    }
  } else if (Array.isArray(columnsOrFilename)) {
    columns = columnsOrFilename;
    filename = maybeFilename || 'export.csv';
  } else if (data && data.length > 0) {
    columns = Object.keys(data[0]).map(k => ({ key: k, label: k.toUpperCase() }));
  }

  const headers = columns.map(c => c.label).join(',');
  const rows = (data || []).map(row => {
    return columns.map(c => {
      let val = row[c.key] !== undefined ? row[c.key] : '';
      if (val instanceof Date) val = val.toISOString();
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
