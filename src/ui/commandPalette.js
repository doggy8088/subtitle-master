/**
 * Subtitle Master - Command Palette (⌘K / Ctrl+K)
 */

export class CommandPalette {
  constructor(app) {
    this.app = app;
    this.isOpen = false;
    this.modal = null;
    this.input = null;
    this.list = null;
    this.selectedIndex = 0;
    this.commands = this.getCommands();
    this.filteredCommands = [...this.commands];
    this.init();
  }

  getCommands() {
    return [
      { id: 'sample', title: '載入示範字幕 (Demo Subtitle)', icon: '✨', category: '快速操作', action: () => this.app.loadSample() },
      { id: 'srt2vtt', title: '切換為 SRT ➔ WebVTT 格式', icon: '🔄', category: '格式轉換', action: () => this.app.setQuickFormat('srt', 'vtt') },
      { id: 'vtt2ass', title: '切換為 WebVTT ➔ ASS 格式', icon: '🎨', category: '格式轉換', action: () => this.app.setQuickFormat('vtt', 'ass') },
      { id: 'srt2ass', title: '切換為 SRT ➔ ASS 格式', icon: '🎨', category: '格式轉換', action: () => this.app.setQuickFormat('srt', 'ass') },
      { id: 'ass2srt', title: '切換為 ASS ➔ SRT 格式', icon: '📄', category: '格式轉換', action: () => this.app.setQuickFormat('ass', 'srt') },
      { id: 'toTxt', title: '轉為純文字逐行文稿 (TXT)', icon: '📝', category: '格式轉換', action: () => this.app.setQuickFormat('auto', 'txt') },
      { id: 'toJson', title: '轉為結構化資料 (JSON)', icon: '⚡', category: '格式轉換', action: () => this.app.setQuickFormat('auto', 'json') },
      { id: 'timePlus1', title: '時間軸延後 +1.0 秒 (+1s)', icon: '⏱️', category: '時間軸', action: () => this.app.adjustTimeOffset(+1.0) },
      { id: 'timeMinus1', title: '時間軸提早 -1.0 秒 (-1s)', icon: '⏱️', category: '時間軸', action: () => this.app.adjustTimeOffset(-1.0) },
      { id: 'timeReset', title: '時間軸平移歸零 (0s)', icon: '🔄', category: '時間軸', action: () => this.app.resetTimeOffset() },
      { id: 'copy', title: '複製轉換結果到剪貼簿 (Copy)', icon: '📋', category: '匯出', action: () => this.app.copyToClipboard() },
      { id: 'download', title: '下載轉換後的字幕檔案 (Download)', icon: '📥', category: '匯出', action: () => this.app.downloadConvertedFile() },
      { id: 'theme', title: '切換深色 / 淺色外觀 (Toggle Theme)', icon: '🌓', category: '介面外觀', action: () => this.app.toggleTheme() },
      { id: 'assStudio', title: '開啟 ASS 字幕樣式工房 (Style Studio)', icon: '🎨', category: '樣式設定', action: () => this.app.openAssModal() },
      { id: 'clear', title: '清除全部輸入內容 (Clear)', icon: '🗑️', category: '快速操作', action: () => this.app.clearAll() }
    ];
  }

  init() {
    this.modal = document.getElementById('commandPaletteModal');
    this.input = document.getElementById('commandPaletteInput');
    this.list = document.getElementById('commandPaletteList');

    if (!this.modal || !this.input || !this.list) return;

    // Keyboard shortcut ⌘K / Ctrl+K
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    this.input.value = '';
    this.selectedIndex = 0;
    this.filteredCommands = [...this.commands];
    this.render();
    setTimeout(() => this.input.focus(), 50);
  }

  close() {
    this.isOpen = false;
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
  }

  filter() {
    const q = this.input.value.trim().toLowerCase();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(c => 
        c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.render();
  }

  render() {
    if (this.filteredCommands.length === 0) {
      this.list.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-medium">找不到相關指令</div>`;
      return;
    }

    this.list.innerHTML = this.filteredCommands.map((cmd, i) => `
      <div data-cmd-index="${i}" class="px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition select-none ${i === this.selectedIndex ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}">
        <div class="flex items-center space-x-3">
          <span class="text-base">${cmd.icon}</span>
          <span class="text-xs sm:text-sm font-semibold">${cmd.title}</span>
        </div>
        <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md ${i === this.selectedIndex ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}">${cmd.category}</span>
      </div>
    `).join('');

    this.list.querySelectorAll('[data-cmd-index]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.cmdIndex, 10);
        this.execute(idx);
      });
    });
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
      this.render();
      this.scrollActiveIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
      this.render();
      this.scrollActiveIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.execute(this.selectedIndex);
    }
  }

  scrollActiveIntoView() {
    const active = this.list.children[this.selectedIndex];
    if (active) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  execute(index) {
    const cmd = this.filteredCommands[index];
    if (cmd && cmd.action) {
      this.close();
      cmd.action();
    }
  }
}
