/**
 * Subtitle Master - Toast Notification System
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('toastContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastContainer';
      el.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
      document.body.appendChild(el);
    }
    this.container = el;
  }

  /**
   * @param {string} message 
   * @param {'success'|'error'|'info'|'warning'} type 
   * @param {number} [duration=3000]
   */
  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 p-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 select-none ${this.getTypeStyles(type)}`;

    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span class="flex-shrink-0 text-base">${icon}</span>
      <span class="flex-1 leading-snug break-words">${message}</span>
      <button class="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition ml-2" aria-label="Close">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }

  getTypeStyles(type) {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20';
      case 'error':
        return 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20';
      case 'warning':
        return 'bg-amber-600 text-white border-amber-500 shadow-amber-900/20';
      case 'info':
      default:
        return 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/20';
    }
  }

  getIcon(type) {
    switch (type) {
      case 'success':
        return '✨';
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'info':
      default:
        return 'ℹ️';
    }
  }
}

export const toast = new ToastManager();
