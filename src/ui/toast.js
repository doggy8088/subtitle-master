/**
 * Subtitle Master - Modern Non-Intrusive Floating Toast System
 * Floating in the bottom-right corner without affecting document flow.
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
      document.body.appendChild(el);
    }
    el.className = 'fixed bottom-4 right-4 z-[999] flex flex-col-reverse gap-2 pointer-events-none max-w-[320px] sm:max-w-[360px] w-full px-3';
    this.container = el;
  }

  /**
   * @param {string} message 
   * @param {'success'|'error'|'info'|'warning'} type 
   * @param {number} [duration=2000]
   */
  show(message, type = 'info', duration = 2000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold transition-all duration-300 transform translate-y-3 opacity-0 select-none backdrop-blur-md ${this.getTypeStyles(type)}`;

    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span class="flex-shrink-0 text-sm sm:text-base">${icon}</span>
      <span class="flex-1 leading-snug break-words">${message}</span>
      <button class="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition p-0.5 rounded" aria-label="Close">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('opacity-0', 'scale-95', 'translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }

  getTypeStyles(type) {
    switch (type) {
      case 'success':
        return 'bg-emerald-600/95 dark:bg-emerald-700/95 text-white border-emerald-400/30 shadow-emerald-950/30';
      case 'error':
        return 'bg-rose-600/95 dark:bg-rose-700/95 text-white border-rose-400/30 shadow-rose-950/30';
      case 'warning':
        return 'bg-amber-600/95 dark:bg-amber-700/95 text-white border-amber-400/30 shadow-amber-950/30';
      case 'info':
      default:
        return 'bg-slate-900/90 dark:bg-slate-800/95 text-white border-slate-700/50 shadow-slate-950/40';
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
