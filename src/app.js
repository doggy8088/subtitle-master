/**
 * Subtitle Master - Studio Grade Application Controller
 */

import { convertSubtitle, detectFormat, getFormatExtension, getFormatMimeType, ASS_PRESETS } from './converter.js';
import { decodeBuffer } from './utils/encoding.js';
import { SAMPLE_SUBTITLES } from './utils/sampleSubtitles.js';
import { toast } from './ui/toast.js';
import { celebration } from './ui/confetti.js';
import { formatSecondsToVtt, formatDuration } from './utils/time.js';
import { SubtitlePlayer } from './ui/player.js';
import { inspectSubtitle, autoFixSubtitle } from './ui/diagnostics.js';
import { CommandPalette } from './ui/commandPalette.js';

class SubtitleStudioApp {
  constructor() {
    this.state = {
      sourceText: '',
      sourceFormat: 'auto',
      targetFormat: 'vtt',
      timeOffset: 0,
      encoding: 'auto',
      currentFilename: 'subtitle.srt',
      assPreset: 'classicYellow',
      assCustomStyle: { ...ASS_PRESETS.classicYellow },
      txtWithTimestamps: false,
      activeRightView: 'raw', // 'raw' | 'table' | 'player' | 'style'
      activeMobileTab: 'input', // 'input' | 'output' | 'player'
      batchFiles: [],
      isBatchMode: false,
      cues: [],
      stats: null,
      diagnostics: { issues: [], health: 'empty' },
      theme: 'dark'
    };

    this.player = null;
    this.commandPalette = null;
    this.debounceTimer = null;
    this.init();
  }

  init() {
    this.initTheme();
    this.bindDomElements();
    this.initPlayer();
    this.bindEvents();
    this.commandPalette = new CommandPalette(this);
    this.loadSample('srt');
  }

  initTheme() {
    const savedTheme = localStorage.getItem('sm_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.state.theme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme() {
    if (this.state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.innerHTML = this.state.theme === 'dark' 
        ? '<i class="fa-solid fa-sun text-amber-400"></i>'
        : '<i class="fa-solid fa-moon text-indigo-600"></i>';
    }
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sm_theme', this.state.theme);
    this.applyTheme();
    toast.show(`已切換為${this.state.theme === 'dark' ? '深色' : '淺色'}模式`, 'info', 1500);
  }

  bindDomElements() {
    this.dom = {
      // Main textareas & drop zones
      sourceInput: document.getElementById('sourceInput'),
      targetOutput: document.getElementById('targetOutput'),
      fileInput: document.getElementById('fileInput'),
      dropZone: document.getElementById('dropZone'),
      globalDropOverlay: document.getElementById('globalDropOverlay'),
      
      // Selectors & Badges
      sourceFormatSelect: document.getElementById('sourceFormatSelect'),
      targetFormatSelect: document.getElementById('targetFormatSelect'),
      detectedBadge: document.getElementById('detectedBadge'),
      statsBadge: document.getElementById('statsBadge'),
      fileInfoText: document.getElementById('fileInfoText'),
      diagnosticBadge: document.getElementById('diagnosticBadge'),
      
      // Time Offset Controls
      timeOffsetDisplay: document.getElementById('timeOffsetDisplay'),
      btnTimeMinus1: document.getElementById('btnTimeMinus1'),
      btnTimeMinus05: document.getElementById('btnTimeMinus05'),
      btnTimePlus05: document.getElementById('btnTimePlus05'),
      btnTimePlus1: document.getElementById('btnTimePlus1'),
      btnTimeReset: document.getElementById('btnTimeReset'),
      
      // Header & Quick Action Buttons
      btnSwapFormat: document.getElementById('btnSwapFormat'),
      btnClear: document.getElementById('btnClear'),
      btnCopy: document.getElementById('btnCopy'),
      btnDownload: document.getElementById('btnDownload'),
      btnSample: document.getElementById('btnSample'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      btnCommandPalette: document.getElementById('btnCommandPalette'),
      btnFindReplace: document.getElementById('btnFindReplace'),
      btnAutoFix: document.getElementById('btnAutoFix'),
      
      // View Switcher Tabs
      viewRawBtn: document.getElementById('viewRawBtn'),
      viewTableBtn: document.getElementById('viewTableBtn'),
      viewPlayerBtn: document.getElementById('viewPlayerBtn'),
      viewStyleBtn: document.getElementById('viewStyleBtn'),
      viewRawContainer: document.getElementById('viewRawContainer'),
      viewTableContainer: document.getElementById('viewTableContainer'),
      viewPlayerContainer: document.getElementById('viewPlayerContainer'),
      viewStyleContainer: document.getElementById('viewStyleContainer'),
      tableBody: document.getElementById('tableBody'),
      
      // Player Controls
      playerSubtitleText: document.getElementById('playerSubtitleText'),
      playerTimeDisplay: document.getElementById('playerTimeDisplay'),
      playerPlayBtn: document.getElementById('playerPlayBtn'),
      playerScrubber: document.getElementById('playerScrubber'),
      playerSpeedSelect: document.getElementById('playerSpeedSelect'),
      playerPrevBtn: document.getElementById('playerPrevBtn'),
      playerNextBtn: document.getElementById('playerNextBtn'),
      
      // ASS Style Studio Controls
      stylePresetSelect: document.getElementById('stylePresetSelect'),
      styleFontFamily: document.getElementById('styleFontFamily'),
      styleFontSize: document.getElementById('styleFontSize'),
      styleFontSizeVal: document.getElementById('styleFontSizeVal'),
      styleTextColor: document.getElementById('styleTextColor'),
      styleOutlineColor: document.getElementById('styleOutlineColor'),
      styleShadowColor: document.getElementById('styleShadowColor'),
      styleOutlineSize: document.getElementById('styleOutlineSize'),
      styleOutlineSizeVal: document.getElementById('styleOutlineSizeVal'),
      stylePreviewBox: document.getElementById('stylePreviewBox'),
      
      // Find & Replace Modal
      findModal: document.getElementById('findModal'),
      findInput: document.getElementById('findInput'),
      replaceInput: document.getElementById('replaceInput'),
      btnExecuteReplace: document.getElementById('btnExecuteReplace'),
      btnCloseFindModal: document.getElementById('btnCloseFindModal'),

      // Diagnostic Modal
      diagnosticModal: document.getElementById('diagnosticModal'),
      diagnosticModalList: document.getElementById('diagnosticModalList'),
      btnCloseDiagnosticModal: document.getElementById('btnCloseDiagnosticModal'),
      btnModalAutoFix: document.getElementById('btnModalAutoFix'),
      
      // Batch Mode Elements
      batchContainer: document.getElementById('batchContainer'),
      batchFileList: document.getElementById('batchFileList'),
      btnBatchDownloadAll: document.getElementById('btnBatchDownloadAll'),
      btnExitBatch: document.getElementById('btnExitBatch'),
      
      // Mobile Navigation
      tabInputBtn: document.getElementById('tabInputBtn'),
      tabOutputBtn: document.getElementById('tabOutputBtn'),
      tabPlayerBtn: document.getElementById('tabPlayerBtn'),
      mobileInputPane: document.getElementById('mobileInputPane'),
      mobileOutputPane: document.getElementById('mobileOutputPane'),
      
      // Celebration Modal
      successOverlay: document.getElementById('successOverlay'),
      closeSuccessBtn: document.getElementById('closeSuccessBtn')
    };
  }

  initPlayer() {
    this.player = new SubtitlePlayer({
      onTimeUpdate: (curr, dur) => {
        if (this.dom.playerTimeDisplay) {
          this.dom.playerTimeDisplay.textContent = `${formatSecondsToVtt(curr)} / ${formatSecondsToVtt(dur)}`;
        }
        if (this.dom.playerScrubber) {
          this.dom.playerScrubber.max = dur;
          this.dom.playerScrubber.value = curr;
        }
      },
      onCueChange: (cue) => {
        if (this.dom.playerSubtitleText) {
          this.dom.playerSubtitleText.textContent = cue ? (cue.text || '') : '';
        }
        this.highlightActiveTableRow(cue);
      }
    });
  }

  bindEvents() {
    // 1. Text input real-time debounce conversion
    this.dom.sourceInput.addEventListener('input', () => {
      this.state.sourceText = this.dom.sourceInput.value;
      this.debounceProcess();
    });

    // 2. Format selector change
    this.dom.sourceFormatSelect.addEventListener('change', (e) => {
      this.state.sourceFormat = e.target.value;
      this.processConversion();
    });

    this.dom.targetFormatSelect.addEventListener('change', (e) => {
      this.state.targetFormat = e.target.value;
      this.processConversion();
    });

    // 3. Quick preset format buttons
    document.querySelectorAll('[data-quick-format]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const [src, tgt] = e.currentTarget.dataset.quickFormat.split('->');
        this.setQuickFormat(src, tgt);
      });
    });

    // 4. Format swap
    this.dom.btnSwapFormat.addEventListener('click', () => {
      const oldSrc = this.state.sourceFormat === 'auto' ? (this.state.stats?.detectedSourceFormat || 'srt') : this.state.sourceFormat;
      const oldTgt = this.state.targetFormat;
      
      this.state.sourceFormat = oldTgt;
      this.state.targetFormat = oldSrc;
      this.dom.sourceFormatSelect.value = oldTgt;
      this.dom.targetFormatSelect.value = oldSrc;

      if (this.dom.targetOutput.value.trim()) {
        this.state.sourceText = this.dom.targetOutput.value;
        this.dom.sourceInput.value = this.state.sourceText;
      }
      this.processConversion();
      toast.show('已交換來源與目標格式 ⇄', 'info');
    });

    // 5. Full-Screen Drag & Drop Overlay
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (this.dom.globalDropOverlay) {
        this.dom.globalDropOverlay.classList.remove('hidden');
        this.dom.globalDropOverlay.classList.add('flex');
      }
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0 && this.dom.globalDropOverlay) {
        dragCounter = 0;
        this.dom.globalDropOverlay.classList.add('hidden');
        this.dom.globalDropOverlay.classList.remove('flex');
      }
    });

    window.addEventListener('dragover', (e) => e.preventDefault());

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (this.dom.globalDropOverlay) {
        this.dom.globalDropOverlay.classList.add('hidden');
        this.dom.globalDropOverlay.classList.remove('flex');
      }
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        this.handleUploadedFiles(files);
      }
    });

    // File input picker
    this.dom.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        this.handleUploadedFiles(files);
      }
    });

    // 6. Time offset buttons
    this.dom.btnTimeMinus1.addEventListener('click', () => this.adjustTimeOffset(-1.0));
    this.dom.btnTimeMinus05.addEventListener('click', () => this.adjustTimeOffset(-0.5));
    this.dom.btnTimePlus05.addEventListener('click', () => this.adjustTimeOffset(+0.5));
    this.dom.btnTimePlus1.addEventListener('click', () => this.adjustTimeOffset(+1.0));
    this.dom.btnTimeReset.addEventListener('click', () => this.resetTimeOffset());

    // 7. Action buttons
    this.dom.btnClear.addEventListener('click', () => this.clearAll());
    this.dom.btnCopy.addEventListener('click', () => this.copyToClipboard());
    this.dom.btnDownload.addEventListener('click', () => this.downloadConvertedFile());
    this.dom.btnSample.addEventListener('click', () => this.loadSample());
    this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    this.dom.btnCommandPalette?.addEventListener('click', () => this.commandPalette?.toggle());

    // 8. View Switcher buttons
    this.dom.viewRawBtn.addEventListener('click', () => this.switchRightView('raw'));
    this.dom.viewTableBtn.addEventListener('click', () => this.switchRightView('table'));
    this.dom.viewPlayerBtn.addEventListener('click', () => this.switchRightView('player'));
    this.dom.viewStyleBtn.addEventListener('click', () => this.switchRightView('style'));

    // 9. Live Player Events
    this.dom.playerPlayBtn.addEventListener('click', () => this.togglePlayerPlay());
    this.dom.playerScrubber.addEventListener('input', (e) => {
      const time = parseFloat(e.target.value);
      this.player.seek(time);
    });
    this.dom.playerSpeedSelect.addEventListener('change', (e) => {
      this.player.setPlaybackRate(parseFloat(e.target.value));
    });
    this.dom.playerPrevBtn.addEventListener('click', () => this.stepPlayerCue(-1));
    this.dom.playerNextBtn.addEventListener('click', () => this.stepPlayerCue(1));

    // 10. ASS Style Studio Controls
    this.dom.stylePresetSelect?.addEventListener('change', (e) => this.applyPresetFromStudio(e.target.value));
    this.dom.styleFontFamily?.addEventListener('input', () => this.updateCustomStyleFromStudio());
    this.dom.styleFontSize?.addEventListener('input', (e) => {
      if (this.dom.styleFontSizeVal) this.dom.styleFontSizeVal.textContent = `${e.target.value}px`;
      this.updateCustomStyleFromStudio();
    });
    this.dom.styleOutlineSize?.addEventListener('input', (e) => {
      if (this.dom.styleOutlineSizeVal) this.dom.styleOutlineSizeVal.textContent = `${e.target.value}px`;
      this.updateCustomStyleFromStudio();
    });
    this.dom.styleTextColor?.addEventListener('input', () => this.updateCustomStyleFromStudio());
    this.dom.styleOutlineColor?.addEventListener('input', () => this.updateCustomStyleFromStudio());
    this.dom.styleShadowColor?.addEventListener('input', () => this.updateCustomStyleFromStudio());

    // 11. Find & Replace Modal
    this.dom.btnFindReplace?.addEventListener('click', () => this.openFindModal());
    this.dom.btnCloseFindModal?.addEventListener('click', () => this.closeFindModal());
    this.dom.btnExecuteReplace?.addEventListener('click', () => this.executeFindReplace());

    // 12. Diagnostics Details Modal & Auto-Fix
    this.dom.diagnosticBadge?.addEventListener('click', () => this.openDiagnosticModal());
    this.dom.btnCloseDiagnosticModal?.addEventListener('click', () => this.closeDiagnosticModal());
    this.dom.btnModalAutoFix?.addEventListener('click', () => this.autoFixIssues());
    this.dom.btnAutoFix?.addEventListener('click', () => this.autoFixIssues());

    // 13. Mobile Navigation
    this.dom.tabInputBtn?.addEventListener('click', () => this.switchMobileTab('input'));
    this.dom.tabOutputBtn?.addEventListener('click', () => this.switchMobileTab('output'));
    this.dom.tabPlayerBtn?.addEventListener('click', () => this.switchMobileTab('player'));

    // 14. Batch mode controls
    this.dom.btnExitBatch?.addEventListener('click', () => this.exitBatchMode());
    this.dom.btnBatchDownloadAll?.addEventListener('click', () => this.downloadAllBatchAsZip());

    // 15. Celebration overlay
    this.dom.closeSuccessBtn?.addEventListener('click', () => celebration.stop());
    this.dom.successOverlay?.addEventListener('click', (e) => {
      if (e.target === this.dom.successOverlay) celebration.stop();
    });

    // 16. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Spacebar plays/pauses if in player view and not focusing on textarea/input
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.togglePlayerPlay();
      }
      // ⌘S or Ctrl+S to download
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        this.downloadConvertedFile();
      }
    });
  }

  setQuickFormat(src, tgt) {
    if (src) this.state.sourceFormat = src;
    if (tgt) this.state.targetFormat = tgt;
    this.dom.sourceFormatSelect.value = src;
    this.dom.targetFormatSelect.value = tgt;
    this.processConversion();
    toast.show(`已切換為 ${src.toUpperCase()} ➔ ${tgt.toUpperCase()} 轉換模式`, 'info');
  }

  loadSample(format = 'srt') {
    const sample = SAMPLE_SUBTITLES[format] || SAMPLE_SUBTITLES.srt;
    this.state.sourceText = sample;
    this.state.sourceFormat = format;
    this.state.targetFormat = format === 'srt' ? 'vtt' : 'ass';
    this.state.currentFilename = `sample.${format}`;
    this.state.timeOffset = 0;
    
    this.dom.sourceInput.value = sample;
    this.dom.sourceFormatSelect.value = format;
    this.dom.targetFormatSelect.value = this.state.targetFormat;
    this.updateTimeOffsetDisplay();
    this.processConversion();
  }

  debounceProcess() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processConversion();
    }, 120);
  }

  processConversion() {
    const { sourceText, sourceFormat, targetFormat, timeOffset, assPreset, assCustomStyle, txtWithTimestamps, currentFilename } = this.state;

    const result = convertSubtitle(sourceText, {
      sourceFormat,
      targetFormat,
      timeOffset,
      assPreset,
      assCustomStyle,
      txtWithTimestamps,
      filename: currentFilename
    });

    this.state.cues = result.cues;
    this.state.stats = result.stats;

    // Run smart health diagnostics
    this.state.diagnostics = inspectSubtitle(sourceText, result.cues, sourceFormat);

    // Update Output
    this.dom.targetOutput.value = result.output;

    // Update Badges & UI
    this.updateBadges(result.stats);
    this.updateDiagnosticsUI();

    // Reload player cues
    this.player.loadCues(result.cues);

    // Update Table View
    this.renderTableView();

    // Update Style Studio Preview
    this.updateStyleStudioVisual();

    // Enable/disable buttons
    this.dom.btnDownload.disabled = result.cues.length === 0;
    this.dom.btnCopy.disabled = !result.output || result.output.trim() === '' || result.output.trim() === 'WEBVTT';
  }

  updateBadges(stats) {
    if (!stats || stats.cueCount === 0) {
      this.dom.detectedBadge.textContent = '未檢測到字幕';
      this.dom.detectedBadge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
      this.dom.statsBadge.textContent = '0 條字幕 · 0 字';
      return;
    }

    const fmt = (stats.detectedSourceFormat || 'srt').toUpperCase();
    this.dom.detectedBadge.textContent = `✨ ${fmt} (${stats.cueCount} 句)`;
    this.dom.detectedBadge.className = 'px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
    this.dom.statsBadge.textContent = `時長 ${stats.durationFormatted} · ${stats.charCount} 字 · ${stats.cueCount} 句`;
  }

  updateDiagnosticsUI() {
    if (!this.dom.diagnosticBadge) return;
    const { issues, health } = this.state.diagnostics;

    if (health === 'none') {
      this.dom.diagnosticBadge.innerHTML = `<i class="fa-solid fa-circle-minus text-slate-400 mr-1"></i>未輸入字幕`;
      this.dom.diagnosticBadge.className = 'text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center';
      if (this.dom.btnAutoFix) this.dom.btnAutoFix.classList.add('hidden');
    } else if (health === 'perfect') {
      this.dom.diagnosticBadge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>品質優良`;
      this.dom.diagnosticBadge.className = 'text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center cursor-pointer hover:underline';
      if (this.dom.btnAutoFix) this.dom.btnAutoFix.classList.add('hidden');
    } else if (health === 'error' || health === 'danger') {
      const label = health === 'error' ? '格式異常 (無法解析)' : `發現 ${issues.length} 項異常`;
      this.dom.diagnosticBadge.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-500 mr-1"></i>${label}`;
      this.dom.diagnosticBadge.className = 'text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center cursor-pointer hover:underline';
      const hasFixable = issues.some(iss => iss.fixable !== false);
      if (this.dom.btnAutoFix) this.dom.btnAutoFix.classList.toggle('hidden', !hasFixable);
    } else {
      this.dom.diagnosticBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-500 mr-1"></i>發現 ${issues.length} 項問題`;
      this.dom.diagnosticBadge.className = 'text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center cursor-pointer hover:underline';
      const hasFixable = issues.some(iss => iss.fixable !== false);
      if (this.dom.btnAutoFix) this.dom.btnAutoFix.classList.toggle('hidden', !hasFixable);
    }
  }

  openDiagnosticModal() {
    const { issues, health } = this.state.diagnostics;
    if (health === 'none') {
      toast.show('尚未輸入字幕內容', 'info');
      return;
    }
    if (health === 'perfect' && issues.length === 0) {
      toast.show('目前字幕時間軸與格式品質優良，無任何異常！✨', 'success', 2000);
      return;
    }

    if (!this.dom.diagnosticModal || !this.dom.diagnosticModalList) return;

    this.dom.diagnosticModalList.innerHTML = issues.map((iss, i) => {
      const isCritical = iss.type === 'syntax_error' || iss.type === 'syntax_arrow' || iss.type === 'zero_duration';
      const bgClass = isCritical 
        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300' 
        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300';
      const icon = isCritical ? 'fa-solid fa-circle-xmark text-rose-500' : 'fa-solid fa-triangle-exclamation text-amber-500';

      return `
        <div class="p-3 rounded-xl border flex items-start space-x-2.5 ${bgClass}">
          <i class="${icon} text-sm mt-0.5 flex-shrink-0"></i>
          <div class="flex-1 min-w-0 leading-relaxed font-medium">
            ${iss.message}
          </div>
          ${iss.fixable ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">可自動修復</span>' : ''}
        </div>
      `;
    }).join('');

    this.dom.diagnosticModal.classList.remove('hidden');
    this.dom.diagnosticModal.classList.add('flex');
  }

  closeDiagnosticModal() {
    if (!this.dom.diagnosticModal) return;
    this.dom.diagnosticModal.classList.add('hidden');
    this.dom.diagnosticModal.classList.remove('flex');
  }

  autoFixIssues() {
    const { fixedText, fixedCount } = autoFixSubtitle(this.state.sourceText, this.state.cues);
    if (fixedCount > 0) {
      this.state.sourceText = fixedText;
      this.dom.sourceInput.value = fixedText;
      this.processConversion();
      this.closeDiagnosticModal();
      toast.show(`已成功自動修復 ${fixedCount} 處語法與時間軸問題！✨`, 'success', 2500);
    } else {
      toast.show('目前未檢測到可自動修正的規則問題', 'info');
    }
  }

  adjustTimeOffset(delta) {
    this.state.timeOffset = Math.round((this.state.timeOffset + delta) * 10) / 10;
    this.updateTimeOffsetDisplay();
    this.processConversion();
    toast.show(`時間軸平移: ${this.state.timeOffset > 0 ? '+' : ''}${this.state.timeOffset}s`, 'info', 1200);
  }

  resetTimeOffset() {
    if (this.state.timeOffset === 0) return;
    this.state.timeOffset = 0;
    this.updateTimeOffsetDisplay();
    this.processConversion();
    toast.show('時間軸已重設為 0.0s', 'info', 1200);
  }

  updateTimeOffsetDisplay() {
    const offset = this.state.timeOffset;
    this.dom.timeOffsetDisplay.textContent = `${offset > 0 ? '+' : ''}${offset.toFixed(1)}s`;
    if (offset !== 0) {
      this.dom.timeOffsetDisplay.className = 'font-mono text-xs px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    } else {
      this.dom.timeOffsetDisplay.className = 'font-mono text-xs px-2 py-0.5 rounded-md font-medium text-slate-500 dark:text-slate-400';
    }
  }

  async handleUploadedFiles(files) {
    if (files.length === 0) return;

    if (files.length === 1) {
      const file = files[0];
      this.state.currentFilename = file.name;
      this.dom.fileInfoText.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      try {
        const buffer = await file.arrayBuffer();
        const { text, encoding } = decodeBuffer(buffer, this.state.encoding);
        
        this.state.sourceText = text;
        this.dom.sourceInput.value = text;

        const detected = detectFormat(text, file.name);
        this.state.sourceFormat = detected;
        this.dom.sourceFormatSelect.value = detected;

        if (detected === 'srt') this.state.targetFormat = 'vtt';
        else if (detected === 'vtt') this.state.targetFormat = 'ass';
        else if (detected === 'ass' || detected === 'ssa') this.state.targetFormat = 'srt';
        else this.state.targetFormat = 'vtt';

        this.dom.targetFormatSelect.value = this.state.targetFormat;
        this.state.timeOffset = 0;
        this.updateTimeOffsetDisplay();
        this.processConversion();

        toast.show(`已成功載入 ${file.name}`, 'info', 1800);
      } catch (err) {
        console.error('File load error:', err);
        toast.show(`載入檔案失敗: ${err.message}`, 'error');
      }
    } else {
      this.setupBatchMode(files);
    }
  }

  async setupBatchMode(files) {
    this.state.isBatchMode = true;
    this.dom.batchContainer.classList.remove('hidden');
    this.dom.viewRawContainer.classList.add('hidden');
    this.dom.viewTableContainer.classList.add('hidden');
    this.dom.viewPlayerContainer.classList.add('hidden');
    this.dom.viewStyleContainer.classList.add('hidden');

    this.state.batchFiles = [];
    this.dom.batchFileList.innerHTML = '';
    toast.show(`正在批次處理 ${files.length} 個檔案...`, 'info');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const { text } = decodeBuffer(buffer, this.state.encoding);
        const detected = detectFormat(text, file.name);
        const targetFmt = this.state.targetFormat;

        const converted = convertSubtitle(text, {
          sourceFormat: detected,
          targetFormat: targetFmt,
          timeOffset: this.state.timeOffset,
          assPreset: this.state.assPreset,
          filename: file.name
        });

        const targetExt = getFormatExtension(targetFmt);
        const outName = file.name.replace(/\.[^/.]+$/, '') + targetExt;

        this.state.batchFiles.push({
          id: i,
          name: file.name,
          outName,
          size: file.size,
          sourceFormat: detected,
          targetFormat: targetFmt,
          cuesCount: converted.cues.length,
          output: converted.output,
          status: 'done'
        });
      } catch (e) {
        this.state.batchFiles.push({
          id: i,
          name: file.name,
          status: 'error',
          error: e.message
        });
      }
    }

    this.renderBatchList();
    toast.show(`批次轉換完成 (${files.length} 個檔案)`, 'success', 2000);
  }

  renderBatchList() {
    this.dom.batchFileList.innerHTML = this.state.batchFiles.map(f => {
      if (f.status === 'done') {
        return `
          <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
            <div class="flex items-center space-x-3 overflow-hidden min-w-0">
              <span class="text-xl flex-shrink-0">📄</span>
              <div class="truncate">
                <div class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">${f.name} ➔ <span class="text-indigo-600 dark:text-indigo-400">${f.outName}</span></div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">${f.cuesCount} 條字幕 · ${(f.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button data-batch-download="${f.id}" class="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition active:scale-95">
              下載
            </button>
          </div>
        `;
      }
      return `
        <div class="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
          <div class="text-xs text-rose-700 dark:text-rose-300 font-medium">${f.name}: 轉換失敗 (${f.error})</div>
        </div>
      `;
    }).join('');

    this.dom.batchFileList.querySelectorAll('[data-batch-download]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.batchDownload, 10);
        const item = this.state.batchFiles.find(b => b.id === id);
        if (item) {
          const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), item.output], { type: getFormatMimeType(item.targetFormat) });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.outName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    });
  }

  async downloadAllBatchAsZip() {
    if (!window.JSZip) {
      toast.show('正在加載 ZIP 工具...', 'info');
      return;
    }
    const zip = new window.JSZip();
    this.state.batchFiles.forEach(f => {
      if (f.status === 'done' && f.output) {
        zip.file(f.outName, '\uFEFF' + f.output);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles_converted.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show('ZIP 打包下載已開始！📦', 'success');
  }

  exitBatchMode() {
    this.state.isBatchMode = false;
    this.dom.batchContainer.classList.add('hidden');
    this.switchRightView('raw');
  }

  clearAll() {
    this.state.sourceText = '';
    this.state.cues = [];
    this.dom.sourceInput.value = '';
    this.dom.targetOutput.value = '';
    this.dom.fileInput.value = '';
    this.dom.fileInfoText.textContent = '';
    this.state.timeOffset = 0;
    this.updateTimeOffsetDisplay();
    this.processConversion();
    toast.show('內容已全部清空', 'info');
  }

  async copyToClipboard() {
    const text = this.dom.targetOutput.value;
    if (!text || text.trim() === '' || text.trim() === 'WEBVTT') {
      toast.show('沒有可複製的內容', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      celebration.trigger('✨ 複製成功！ ✨', '字幕內容已成功寫入剪貼簿，立即貼上使用吧！🚀');
      toast.show('已複製到剪貼簿！', 'success');
    } catch (e) {
      this.dom.targetOutput.select();
      document.execCommand('copy');
      toast.show('已複製到剪貼簿！', 'success');
    }
  }

  downloadConvertedFile() {
    const content = this.dom.targetOutput.value;
    if (!content || content.trim() === '') {
      toast.show('沒有內容可供下載', 'warning');
      return;
    }

    const targetFmt = this.state.targetFormat;
    const targetExt = getFormatExtension(targetFmt);
    const baseName = this.state.currentFilename.replace(/\.[^/.]+$/, '') || 'subtitle';
    const filename = `${baseName}${targetExt}`;

    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const encoded = new TextEncoder().encode(content);
    const blob = new Blob([BOM, encoded], { type: getFormatMimeType(targetFmt) });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    celebration.trigger('🎉 檔案下載成功！', `已為您成功匯出 <strong>${filename}</strong>！✨`);
  }

  switchRightView(view) {
    this.state.activeRightView = view;
    if (this.state.isBatchMode) {
      this.dom.batchContainer.classList.add('hidden');
      this.state.isBatchMode = false;
    }

    const activeClass = 'bg-indigo-600 text-white shadow-sm';
    const inactiveClass = 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60';

    this.dom.viewRawBtn.className = `px-2.5 py-1 text-xs font-bold rounded-lg transition ${view === 'raw' ? activeClass : inactiveClass}`;
    this.dom.viewTableBtn.className = `px-2.5 py-1 text-xs font-bold rounded-lg transition ${view === 'table' ? activeClass : inactiveClass}`;
    this.dom.viewPlayerBtn.className = `px-2.5 py-1 text-xs font-bold rounded-lg transition ${view === 'player' ? activeClass : inactiveClass}`;
    this.dom.viewStyleBtn.className = `px-2.5 py-1 text-xs font-bold rounded-lg transition ${view === 'style' ? activeClass : inactiveClass}`;

    this.dom.viewRawContainer.classList.toggle('hidden', view !== 'raw');
    this.dom.viewTableContainer.classList.toggle('hidden', view !== 'table');
    this.dom.viewPlayerContainer.classList.toggle('hidden', view !== 'player');
    this.dom.viewStyleContainer.classList.toggle('hidden', view !== 'style');

    if (view === 'player') {
      this.updatePlayerVisualStyles();
    }
  }

  togglePlayerPlay() {
    const isPlaying = this.player.toggle();
    if (this.dom.playerPlayBtn) {
      this.dom.playerPlayBtn.innerHTML = isPlaying 
        ? '<i class="fa-solid fa-pause"></i>' 
        : '<i class="fa-solid fa-play"></i>';
    }
  }

  stepPlayerCue(delta) {
    const cues = this.state.cues;
    if (!cues || cues.length === 0) return;
    const current = this.player.currentTime;
    let targetIdx = cues.findIndex(c => c.start > current);

    if (delta < 0) {
      targetIdx = targetIdx > 1 ? targetIdx - 2 : 0;
    } else {
      if (targetIdx === -1) targetIdx = cues.length - 1;
    }

    if (cues[targetIdx]) {
      this.player.seek(cues[targetIdx].start);
    }
  }

  highlightActiveTableRow(activeCue) {
    if (!this.dom.tableBody || !activeCue) return;
    this.dom.tableBody.querySelectorAll('tr').forEach(tr => {
      const idx = parseInt(tr.dataset.rowIdx, 10);
      if (this.state.cues[idx] === activeCue) {
        tr.classList.add('bg-indigo-500/15', 'dark:bg-indigo-500/20');
      } else {
        tr.classList.remove('bg-indigo-500/15', 'dark:bg-indigo-500/20');
      }
    });
  }

  renderTableView() {
    if (!this.dom.tableBody) return;
    const cues = this.state.cues;
    if (cues.length === 0) {
      this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">尚無字幕資料，請先輸入或載入字幕</td></tr>`;
      return;
    }

    this.dom.tableBody.innerHTML = cues.map((c, i) => `
      <tr data-row-idx="${i}" class="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
        <td class="p-2 text-center font-mono text-xs text-slate-400">${i + 1}</td>
        <td class="p-2 font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap cursor-pointer hover:underline" data-seek-time="${c.start}">
          <i class="fa-regular fa-circle-play mr-1 text-[10px]"></i>${formatSecondsToVtt(c.start)}
        </td>
        <td class="p-2 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">${formatSecondsToVtt(c.end)}</td>
        <td class="p-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100">
          <input type="text" data-cue-index="${i}" value="${this.escapeHtml(c.text || '')}" class="w-full bg-transparent border-b border-transparent group-hover:border-slate-300 dark:group-hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1.5 py-0.5 rounded transition">
        </td>
      </tr>
    `).join('');

    // Seek on time click
    this.dom.tableBody.querySelectorAll('[data-seek-time]').forEach(el => {
      el.addEventListener('click', (e) => {
        const time = parseFloat(e.currentTarget.dataset.seekTime);
        this.switchRightView('player');
        this.player.seek(time);
        this.player.play();
      });
    });

    // Inline edit
    this.dom.tableBody.querySelectorAll('[data-cue-index]').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.cueIndex, 10);
        if (this.state.cues[idx]) {
          this.state.cues[idx].text = e.target.value;
          this.rebuildSourceFromCues();
        }
      });
    });
  }

  rebuildSourceFromCues() {
    const result = convertSubtitle(this.state.sourceText, {
      sourceFormat: this.state.sourceFormat,
      targetFormat: this.state.targetFormat,
      timeOffset: this.state.timeOffset,
      assPreset: this.state.assPreset,
      assCustomStyle: this.state.assCustomStyle
    });
    this.dom.targetOutput.value = result.output;
  }

  hexToAssColor(hex, alpha = '00') {
    if (!hex || !hex.startsWith('#')) return '&H00FFFFFF';
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const rr = clean.substring(0, 2);
      const gg = clean.substring(2, 4);
      const bb = clean.substring(4, 6);
      return `&H${alpha}${bb}${gg}${rr}&`.toUpperCase();
    }
    return '&H00FFFFFF';
  }

  assToHexColor(ass) {
    if (!ass || !ass.startsWith('&H')) return '#ffffff';
    const clean = ass.replace('&H', '').replace('&', '').padStart(8, '0');
    const rr = clean.substring(6, 8);
    const gg = clean.substring(4, 6);
    const bb = clean.substring(2, 4);
    return `#${rr}${gg}${bb}`.toLowerCase();
  }

  applyPresetFromStudio(presetKey) {
    const preset = ASS_PRESETS[presetKey];
    if (!preset) return;

    this.state.assPreset = presetKey;
    this.state.assCustomStyle = { ...preset };

    if (this.dom.styleFontFamily) this.dom.styleFontFamily.value = preset.fontName;
    if (this.dom.styleFontSize) {
      this.dom.styleFontSize.value = preset.fontSize;
      this.dom.styleFontSizeVal.textContent = `${preset.fontSize}px`;
    }
    if (this.dom.styleOutlineSize) {
      this.dom.styleOutlineSize.value = preset.outline;
      this.dom.styleOutlineSizeVal.textContent = `${preset.outline}px`;
    }
    if (this.dom.styleTextColor) this.dom.styleTextColor.value = this.assToHexColor(preset.primaryColor);
    if (this.dom.styleOutlineColor) this.dom.styleOutlineColor.value = this.assToHexColor(preset.outlineColor);
    if (this.dom.styleShadowColor) this.dom.styleShadowColor.value = this.assToHexColor(preset.backColor);

    this.processConversion();
  }

  updateCustomStyleFromStudio() {
    const fontName = this.dom.styleFontFamily?.value || '微軟正黑體';
    const fontSize = parseInt(this.dom.styleFontSize?.value, 10) || 52;
    const outline = parseFloat(this.dom.styleOutlineSize?.value) || 2.5;
    const primaryColor = this.hexToAssColor(this.dom.styleTextColor?.value || '#ffff00', '00');
    const outlineColor = this.hexToAssColor(this.dom.styleOutlineColor?.value || '#000000', '00');
    const backColor = this.hexToAssColor(this.dom.styleShadowColor?.value || '#000000', '80');

    this.state.assCustomStyle = {
      ...this.state.assCustomStyle,
      fontName,
      fontSize,
      outline,
      primaryColor,
      outlineColor,
      backColor
    };

    this.processConversion();
  }

  updateStyleStudioVisual() {
    if (!this.dom.stylePreviewBox) return;
    const style = this.state.assCustomStyle || ASS_PRESETS.classicYellow;
    const textColor = this.assToHexColor(style.primaryColor || '&H0000FFFF');
    const outlineColor = this.assToHexColor(style.outlineColor || '&H00000000');
    const strokeWidth = style.outline || 2.5;

    this.dom.stylePreviewBox.style.fontFamily = style.fontName || 'sans-serif';
    this.dom.stylePreviewBox.style.color = textColor;
    this.dom.stylePreviewBox.style.fontSize = `${Math.min(32, Math.max(16, style.fontSize * 0.45))}px`;
    this.dom.stylePreviewBox.style.textShadow = `
      -${strokeWidth}px -${strokeWidth}px 0 ${outlineColor},
       ${strokeWidth}px -${strokeWidth}px 0 ${outlineColor},
      -${strokeWidth}px  ${strokeWidth}px 0 ${outlineColor},
       ${strokeWidth}px  ${strokeWidth}px 0 ${outlineColor},
       0px 3px 6px rgba(0,0,0,0.8)
    `;

    this.updatePlayerVisualStyles();
  }

  updatePlayerVisualStyles() {
    if (!this.dom.playerSubtitleText) return;
    const style = this.state.assCustomStyle || ASS_PRESETS.classicYellow;
    const textColor = this.assToHexColor(style.primaryColor || '&H0000FFFF');
    const outlineColor = this.assToHexColor(style.outlineColor || '&H00000000');
    const strokeWidth = style.outline || 2.5;

    this.dom.playerSubtitleText.style.fontFamily = style.fontName || 'sans-serif';
    this.dom.playerSubtitleText.style.color = textColor;
    this.dom.playerSubtitleText.style.fontSize = `${Math.min(32, Math.max(18, style.fontSize * 0.45))}px`;
    this.dom.playerSubtitleText.style.textShadow = `
      -${strokeWidth}px -${strokeWidth}px 0 ${outlineColor},
       ${strokeWidth}px -${strokeWidth}px 0 ${outlineColor},
      -${strokeWidth}px  ${strokeWidth}px 0 ${outlineColor},
       ${strokeWidth}px  ${strokeWidth}px 0 ${outlineColor},
       0px 3px 6px rgba(0,0,0,0.9)
    `;
  }

  // Find & Replace Modal
  openFindModal() {
    this.dom.findModal.classList.remove('hidden');
    this.dom.findModal.classList.add('flex');
    this.dom.findInput.focus();
  }

  closeFindModal() {
    this.dom.findModal.classList.add('hidden');
    this.dom.findModal.classList.remove('flex');
  }

  executeFindReplace() {
    const findStr = this.dom.findInput.value;
    const replaceStr = this.dom.replaceInput.value;
    if (!findStr) {
      toast.show('請輸入搜尋關鍵字', 'warning');
      return;
    }

    let count = 0;
    this.state.cues.forEach(c => {
      if (c.text && c.text.includes(findStr)) {
        c.text = c.text.replaceAll(findStr, replaceStr);
        count++;
      }
    });

    if (count > 0) {
      this.rebuildSourceFromCues();
      this.renderTableView();
      this.closeFindModal();
      toast.show(`已成功替換 ${count} 處關鍵字！✨`, 'success');
    } else {
      toast.show('未找到相符的文字', 'info');
    }
  }

  switchMobileTab(tab) {
    this.state.activeMobileTab = tab;
    const activeClass = 'bg-indigo-600 text-white shadow-sm';
    const inactiveClass = 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

    if (this.dom.tabInputBtn) this.dom.tabInputBtn.className = `flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 ${tab === 'input' ? activeClass : inactiveClass}`;
    if (this.dom.tabOutputBtn) this.dom.tabOutputBtn.className = `flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 ${tab === 'output' ? activeClass : inactiveClass}`;
    if (this.dom.tabPlayerBtn) this.dom.tabPlayerBtn.className = `flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 ${tab === 'player' ? activeClass : inactiveClass}`;

    if (tab === 'input') {
      this.dom.mobileInputPane.classList.remove('hidden');
      this.dom.mobileInputPane.classList.add('flex');
      this.dom.mobileOutputPane.classList.add('hidden');
      this.dom.mobileOutputPane.classList.remove('flex');
    } else if (tab === 'output') {
      this.dom.mobileInputPane.classList.add('hidden');
      this.dom.mobileInputPane.classList.remove('flex');
      this.dom.mobileOutputPane.classList.remove('hidden');
      this.dom.mobileOutputPane.classList.add('flex');
      this.switchRightView('raw');
    } else if (tab === 'player') {
      this.dom.mobileInputPane.classList.add('hidden');
      this.dom.mobileInputPane.classList.remove('flex');
      this.dom.mobileOutputPane.classList.remove('hidden');
      this.dom.mobileOutputPane.classList.add('flex');
      this.switchRightView('player');
    }
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.subtitleStudio = new SubtitleStudioApp();
});
