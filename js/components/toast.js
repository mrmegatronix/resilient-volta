let toastContainer = null;

export function showToast(optionsOrMessage, type = 'info', durationMs = 5000) {
  let message = '';
  let severity = type;
  let duration = durationMs;
  let action = null;

  if (typeof optionsOrMessage === 'string') {
    message = optionsOrMessage;
  } else if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null) {
    message = optionsOrMessage.message || '';
    severity = optionsOrMessage.severity || optionsOrMessage.type || 'info';
    duration = optionsOrMessage.duration !== undefined ? optionsOrMessage.duration : 5000;
    action = optionsOrMessage.action || null;
  }

  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container') || document.createElement('div');
    if (!toastContainer.parentElement) {
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${severity} fade-in`;
  
  const content = document.createElement('div');
  content.className = 'toast-message';
  content.textContent = message;
  toast.appendChild(content);
  
  if (action) {
    const actBtn = document.createElement('button');
    actBtn.className = 'btn btn-sm btn-secondary';
    actBtn.style.marginRight = '0.5rem';
    actBtn.textContent = action.label;
    actBtn.onclick = () => {
      action.onClick();
      dismiss();
    };
    toast.appendChild(actBtn);
  }
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = dismiss;
  toast.appendChild(closeBtn);
  
  if (duration > 0) {
    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    progress.style.width = '100%';
    progress.style.transition = `width ${duration}ms linear`;
    toast.appendChild(progress);
    
    // Start animation next frame
    requestAnimationFrame(() => {
      progress.style.width = '0%';
    });
    
    setTimeout(dismiss, duration);
  }
  
  // Stack management
  toastContainer.appendChild(toast);
  while (toastContainer.children.length > 5) {
    toastContainer.removeChild(toastContainer.firstChild);
  }
  
  function dismiss() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }
  
  return { element: toast, dismiss };
}
