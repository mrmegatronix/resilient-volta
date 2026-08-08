export function showModal(optionsOrTitle, maybeContent) {
  let title = '';
  let content = '';
  let footer = null;
  let onClose = null;
  let width = null;
  let actions = null;

  if (typeof optionsOrTitle === 'string') {
    title = optionsOrTitle;
    content = maybeContent || '';
  } else if (typeof optionsOrTitle === 'object' && optionsOrTitle !== null) {
    title = optionsOrTitle.title || '';
    content = optionsOrTitle.content || optionsOrTitle.body || '';
    footer = optionsOrTitle.footer || null;
    actions = optionsOrTitle.actions || null;
    onClose = optionsOrTitle.onClose || null;
    width = optionsOrTitle.width || null;
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'glass-modal fade-in';
  if (width) dialog.style.width = width;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay fade-in';
  
  const header = document.createElement('div');
  header.className = 'modal-header';
  
  const titleEl = document.createElement('h3');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-icon';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = close;
  
  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  
  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (typeof content === 'string') {
    bodyEl.innerHTML = content;
  } else if (content instanceof Node) {
    bodyEl.appendChild(content);
  }
  
  const footerEl = document.createElement('div');
  footerEl.className = 'modal-footer';
  if (actions && Array.isArray(actions)) {
    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = `btn ${act.class || 'btn-secondary'}`;
      btn.textContent = act.label;
      btn.onclick = () => {
        if (act.onClick) act.onClick();
        close();
      };
      footerEl.appendChild(btn);
    });
    dialog.appendChild(footerEl);
  } else if (footer) {
    if (typeof footer === 'string') {
      footerEl.innerHTML = footer;
    } else if (footer instanceof Node) {
      footerEl.appendChild(footer);
    }
    dialog.appendChild(footerEl);
  }
  
  dialog.appendChild(header);
  dialog.appendChild(bodyEl);
  if (footer || (actions && Array.isArray(actions))) {
    // Already added footerEl if exists
  }
  
  // Reorder elements correctly
  dialog.innerHTML = '';
  dialog.appendChild(header);
  dialog.appendChild(bodyEl);
  if (footer || (actions && Array.isArray(actions))) {
    dialog.appendChild(footerEl);
  }
  
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  dialog.showModal();
  
  // Focus first input if any
  const firstInput = dialog.querySelector('input, select, textarea');
  if (firstInput) firstInput.focus();
  
  overlay.addEventListener('click', close);
  dialog.addEventListener('close', close);
  
  function close() {
    dialog.classList.remove('fade-in');
    overlay.classList.remove('fade-in');
    
    setTimeout(() => {
      if (dialog.parentElement) dialog.remove();
      if (overlay.parentElement) overlay.remove();
      if (onClose) onClose();
    }, 200);
  }
  
  return { dialog, close };
}

export function confirmModal(optionsOrTitle, maybeMessage, maybeOnConfirm) {
  let title = '';
  let message = '';
  let confirmText = 'Confirm';
  let cancelText = 'Cancel';
  let onConfirm = () => {};
  let variant = 'primary';

  if (typeof optionsOrTitle === 'string') {
    title = optionsOrTitle;
    message = maybeMessage || '';
    onConfirm = typeof maybeOnConfirm === 'function' ? maybeOnConfirm : () => {};
  } else if (typeof optionsOrTitle === 'object' && optionsOrTitle !== null) {
    title = optionsOrTitle.title || '';
    message = optionsOrTitle.message || '';
    confirmText = optionsOrTitle.confirmText || 'Confirm';
    cancelText = optionsOrTitle.cancelText || 'Cancel';
    onConfirm = optionsOrTitle.onConfirm || (() => {});
    variant = optionsOrTitle.variant || 'primary';
  }

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.gap = '1rem';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = cancelText;
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = `btn btn-${variant}`;
  confirmBtn.textContent = confirmText;
  
  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);
  
  const { close } = showModal({
    title,
    content: `<p>${message}</p>`,
    footer,
    width: '400px'
  });
  
  cancelBtn.onclick = close;
  confirmBtn.onclick = () => {
    onConfirm();
    close();
  };
}
