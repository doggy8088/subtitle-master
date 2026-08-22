/**
 * Subtitle Master - Main Application Controller
 */

import { convertSubtitle, detectFormat, getFormatExtension, getFormatMimeType, ASS_PRESETS } from './converter.js';
import { decodeBuffer, SUPPORTED_ENCODINGS } from './utils/encoding.js';
import { SAMPLE_SUBTITLES } from './utils/sampleSubtitles.js';
import { toast } from './ui/toast.js';
import { celebration } from './ui/confetti.js';
import { formatSecondsToVtt, formatDuration } from './utils/time.js';

class SubtitleApp {
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
      activeRightView: 'raw', // 'raw' | 'table' | 'screen'
      activeMobileTab: 'input', // 'input' | 'output' | 'preview'
      currentPreviewCueIndex: 0,
      batchFiles: [],
      isBatchMode: false,
      cues: [],
      stats: null,
      theme: 'dark' // 'dark' | 'light'
    };

    this.debounceTimer = null;
    this.init();
  }

  init() {
    this.initTheme();
    this.bindDomElements();
    this.bindEvents();
    this.loadInitialSample();
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
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
    }
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sm_theme', this.state.theme);
    this.applyTheme();
  }

  bindDomElements() {
    this.dom = {
      // Inputs & Textareas
      sourceInput: document.getElementById('sourceInput'),
      targetOutput: document.getElementById('targetOutput'),
      fileInput: document.getElementById('fileInput'),
      dropZone: document.getElementById('dropZone'),
      
      // Selectors & Badges
      sourceFormatSelect: document.getElementById('sourceFormatSelect'),
      targetFormatSelect: document.getElementById('targetFormatSelect'),
      detectedBadge: document.getElementById('detectedBadge'),
      statsBadge: document.getElementById('statsBadge'),
      fileInfoText: document.getElementById('fileInfoText'),
      encodingSelect: document.getElementById('encodingSelect'),
      
      // Time Offset Controls
      timeOffsetDisplay: document.getElementById('timeOffsetDisplay'),
      btnTimeMinus1: document.getElementById('btnTimeMinus1'),
      btnTimeMinus05: document.getElementById('btnTimeMinus05'),
      btnTimePlus05: document.getElementById('btnTimePlus05'),
      btnTimePlus1: document.getElementById('btnTimePlus1'),
      btnTimeReset: document.getElementById('btnTimeReset'),
      
      // Buttons
      btnSwapFormat: document.getElementById('btnSwapFormat'),
      btnClear: document.getElementById('btnClear'),
      btnCopy: document.getElementById('btnCopy'),
      btnDownload: document.getElementById('btnDownload'),
      btnSample: document.getElementById('btnSample'),
      btnAssModal: document.getElementById('btnAssModal'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      
      // Views & Tabs
      viewRawBtn: document.getElementById('viewRawBtn'),
      viewTableBtn: document.getElementById('viewTableBtn'),
      viewScreenBtn: document.getElementById('viewScreenBtn'),
      viewRawContainer: document.getElementById('viewRawContainer'),
      viewTableContainer: document.getElementById('viewTableContainer'),
      viewScreenContainer: document.getElementById('viewScreenContainer'),
      tableBody: document.getElementById('tableBody'),
      
      // Screen Preview
      previewScreenText: document.getElementById('previewScreenText'),
      previewCueCounter: document.getElementById('previewCueCounter'),
      previewTimeText: document.getElementById('previewTimeText'),
      btnPrevCue: document.getElementById('btnPrevCue'),
      btnNextCue: document.getElementById('btnNextCue'),
      previewTimelineSlider: document.getElementById('previewTimelineSlider'),
      
      // Batch Mode Elements
      batchContainer: document.getElementById('batchContainer'),
      batchFileList: document.getElementById('batchFileList'),
      btnBatchDownloadAll: document.getElementById('btnBatchDownloadAll'),
      btnExitBatch: document.getElementById('btnExitBatch'),
      
      // Mobile Tab Controls
      tabInputBtn: document.getElementById('tabInputBtn'),
      tabOutputBtn: document.getElementById('tabOutputBtn'),
      tabPreviewBtn: document.getElementById('tabPreviewBtn'),
      mobileInputPane: document.getElementById('mobileInputPane'),
      mobileOutputPane: document.getElementById('mobileOutputPane'),
      
      // ASS Style Modal
      assModal: document.getElementById('assModal'),
      btnSaveAssModal: document.getElementById('btnSaveAssModal'),
      btnCloseAssModal: document.getElementById('btnCloseAssModal'),
      assPresetSelect: document.getElementById('assPresetSelect'),
      assFontName: document.getElementById('assFontName'),
      assFontSize: document.getElementById('assFontSize'),
      assFontColor: document.getElementById('assFontColor'),
      assOutlineColor: document.getElementById('assOutlineColor'),
      assShadowColor: document.getElementById('assShadowColor'),
      assOutlineSize: document.getElementById('assOutlineSize'),
      assAlignment: document.getElementById('assAlignment'),
      
      // Celebration Modal
      successOverlay: document.getElementById('successOverlay'),
      closeSuccessBtn: document.getElementById('closeSuccessBtn')
    };
  }

  bindEvents() {
    // 1. Text input real-time conversion
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
      this.checkAssStyleVisibility();
    });

    // 3. Quick preset format buttons
    document.querySelectorAll('[data-quick-format]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const [src, tgt] = e.currentTarget.dataset.quickFormat.split('->');
        if (src) this.state.sourceFormat = src;
        if (tgt) this.state.targetFormat = tgt;
        this.dom.sourceFormatSelect.value = src;
        this.dom.targetFormatSelect.value = tgt;
        this.processConversion();
        this.checkAssStyleVisibility();
        toast.show(`已切換為 ${src.toUpperCase()} ➔ ${tgt.toUpperCase()} 轉換模式`, 'info');
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

      // Swap contents if target has output
      if (this.dom.targetOutput.value.trim()) {
        this.state.sourceText = this.dom.targetOutput.value;
        this.dom.sourceInput.value = this.state.sourceText;
      }
      this.processConversion();
      this.checkAssStyleVisibility();
      toast.show('已交換來源與目標格式', 'info');
    });

    // 5. Drag and Drop events
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      document.body.addEventListener(evt, preventDefaults, false);
      this.dom.dropZone.addEventListener(evt, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(evt => {
      this.dom.dropZone.addEventListener(evt, () => this.dom.dropZone.classList.add('drop-active'));
    });

    ['dragleave', 'drop'].forEach(evt => {
      this.dom.dropZone.addEventListener(evt, () => this.dom.dropZone.classList.remove('drop-active'));
    });

    this.dom.dropZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        this.handleUploadedFiles(files);
      }
    });

    // 6. Click upload file
    this.dom.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        this.handleUploadedFiles(files);
      }
    });

    // 7. Time offset buttons
    this.dom.btnTimeMinus1.addEventListener('click', () => this.adjustTimeOffset(-1.0));
    this.dom.btnTimeMinus05.addEventListener('click', () => this.adjustTimeOffset(-0.5));
    this.dom.btnTimePlus05.addEventListener('click', () => this.adjustTimeOffset(+0.5));
    this.dom.btnTimePlus1.addEventListener('click', () => this.adjustTimeOffset(+1.0));
    this.dom.btnTimeReset.addEventListener('click', () => this.resetTimeOffset());

    // 8. Action buttons
    this.dom.btnClear.addEventListener('click', () => this.clearAll());
    this.dom.btnCopy.addEventListener('click', () => this.copyToClipboard());
    this.dom.btnDownload.addEventListener('click', () => this.downloadConvertedFile());
    this.dom.btnSample.addEventListener('click', () => this.loadSample());
    this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // 9. View Mode switch (Raw / Table / Screen preview)
    this.dom.viewRawBtn.addEventListener('click', () => this.switchRightView('raw'));
    this.dom.viewTableBtn.addEventListener('click', () => this.switchRightView('table'));
    this.dom.viewScreenBtn.addEventListener('click', () => this.switchRightView('screen'));

    // 10. Screen Preview stepper & slider
    this.dom.btnPrevCue.addEventListener('click', () => this.stepPreviewCue(-1));
    this.dom.btnNextCue.addEventListener('click', () => this.stepPreviewCue(1));
    this.dom.previewTimelineSlider.addEventListener('input', (e) => {
      this.state.currentPreviewCueIndex = parseInt(e.target.value, 10);
      this.updateScreenPreview();
    });

    // 11. ASS Modal events
    this.dom.btnAssModal.addEventListener('click', () => this.openAssModal());
    this.dom.btnCloseAssModal.addEventListener('click', () => this.closeAssModal());
    this.dom.btnSaveAssModal.addEventListener('click', () => this.saveAssModal());
    this.dom.assPresetSelect.addEventListener('change', (e) => this.applyAssPresetToModal(e.target.value));

    // 12. Celebration Modal close
    this.dom.closeSuccessBtn.addEventListener('click', () => celebration.stop());
    this.dom.successOverlay.addEventListener('click', (e) => {
      if (e.target === this.dom.successOverlay) celebration.stop();
    });

    // 13. Mobile Tab switcher
    if (this.dom.tabInputBtn && this.dom.tabOutputBtn) {
      this.dom.tabInputBtn.addEventListener('click', () => this.switchMobileTab('input'));
      this.dom.tabOutputBtn.addEventListener('click', () => this.switchMobileTab('output'));
      if (this.dom.tabPreviewBtn) {
        this.dom.tabPreviewBtn.addEventListener('click', () => this.switchMobileTab('preview'));
      }
    }

    // 14. Batch mode buttons
    if (this.dom.btnExitBatch) {
      this.dom.btnExitBatch.addEventListener('click', () => this.exitBatchMode());
    }
    if (this.dom.btnBatchDownloadAll) {
      this.dom.btnBatchDownloadAll.addEventListener('click', () => this.downloadAllBatchAsZip());
    }

    // 15. Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.downloadConvertedFile();
      }
    });
  }

  loadInitialSample() {
    this.loadSample('srt');
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
    this.checkAssStyleVisibility();
  }

  debounceProcess() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processConversion();
    }, 150);
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

    // Update Raw Output
    this.dom.targetOutput.value = result.output;

    // Update Badges & UI stats
    this.updateBadges(result.stats);

    // Update Table & Screen Preview
    this.renderTableView();
    this.updateScreenPreview();

    // Enable/disable download button
    this.dom.btnDownload.disabled = result.cues.length === 0;
    this.dom.btnCopy.disabled = !result.output || result.output.trim() === '' || result.output.trim() === 'WEBVTT';
  }

  updateBadges(stats) {
    if (!stats || stats.cueCount === 0) {
      this.dom.detectedBadge.textContent = '未檢測到字幕';
      this.dom.detectedBadge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
      this.dom.statsBadge.textContent = '0 條字幕 · 0 字';
      return;
    }

    const fmt = (stats.detectedSourceFormat || 'srt').toUpperCase();
    this.dom.detectedBadge.textContent = `來源: ${fmt} (${stats.cueCount} 句)`;
    this.dom.detectedBadge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300';
    this.dom.statsBadge.textContent = `${stats.charCount} 字 · 時長 ${stats.durationFormatted}`;
  }

  adjustTimeOffset(delta) {
    this.state.timeOffset = Math.round((this.state.timeOffset + delta) * 10) / 10;
    this.updateTimeOffsetDisplay();
    this.processConversion();
    toast.show(`時間軸平移: ${this.state.timeOffset > 0 ? '+' : ''}${this.state.timeOffset} 秒`, 'info');
  }

  resetTimeOffset() {
    if (this.state.timeOffset === 0) return;
    this.state.timeOffset = 0;
    this.updateTimeOffsetDisplay();
    this.processConversion();
    toast.show('時間軸平移已歸零', 'info');
  }

  updateTimeOffsetDisplay() {
    const offset = this.state.timeOffset;
    this.dom.timeOffsetDisplay.textContent = `${offset > 0 ? '+' : ''}${offset.toFixed(1)}s`;
    if (offset !== 0) {
      this.dom.timeOffsetDisplay.className = 'font-mono text-xs px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400';
    } else {
      this.dom.timeOffsetDisplay.className = 'font-mono text-xs px-2 py-0.5 rounded font-medium text-slate-500 dark:text-slate-400';
    }
  }

  async handleUploadedFiles(files) {
    if (files.length === 0) return;

    if (files.length === 1) {
      // Single file mode
      const file = files[0];
      this.state.currentFilename = file.name;
      this.dom.fileInfoText.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      try {
        const buffer = await file.arrayBuffer();
        const { text, encoding } = decodeBuffer(buffer, this.state.encoding);
        
        this.state.sourceText = text;
        this.dom.sourceInput.value = text;

        // Auto-detect format & recommend target
        const detected = detectFormat(text, file.name);
        this.state.sourceFormat = detected;
        this.dom.sourceFormatSelect.value = detected;

        // Smart target selection: if SRT -> VTT; if VTT -> ASS; if ASS -> SRT
        if (detected === 'srt') this.state.targetFormat = 'vtt';
        else if (detected === 'vtt') this.state.targetFormat = 'ass';
        else if (detected === 'ass' || detected === 'ssa') this.state.targetFormat = 'srt';
        else this.state.targetFormat = 'vtt';

        this.dom.targetFormatSelect.value = this.state.targetFormat;
        this.state.timeOffset = 0;
        this.updateTimeOffsetDisplay();
        this.processConversion();
        this.checkAssStyleVisibility();

        celebration.trigger('🎉 檔案載入成功！', `已成功載入 <strong>${file.name}</strong> (${encoding.toUpperCase()})，並自動轉為 <strong>${this.state.targetFormat.toUpperCase()}</strong>！🌟`);
      } catch (err) {
        console.error('File read error:', err);
        toast.show(`讀取檔案失敗: ${err.message}`, 'error');
      }
    } else {
      // Multiple files - Batch mode
      this.setupBatchMode(files);
    }
  }

  async setupBatchMode(files) {
    this.state.isBatchMode = true;
    this.dom.batchContainer.classList.remove('hidden');
    this.dom.viewRawContainer.classList.add('hidden');
    this.dom.viewTableContainer.classList.add('hidden');
    this.dom.viewScreenContainer.classList.add('hidden');

    this.state.batchFiles = [];
    this.dom.batchFileList.innerHTML = '';

    toast.show(`已載入 ${files.length} 個檔案，正在進行批次轉換...`, 'info');

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
    celebration.trigger('🎉 批次轉換完成！', `已成功為您處理 <strong>${files.length}</strong> 個字幕檔案！您可以個別下載或一鍵打包 ZIP 匯出！📦`);
  }

  renderBatchList() {
    this.dom.batchFileList.innerHTML = this.state.batchFiles.map(f => {
      if (f.status === 'done') {
        return `
          <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-700/60 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
            <div class="flex items-center space-x-3 overflow-hidden">
              <span class="text-xl">📄</span>
              <div class="truncate">
                <div class="font-medium text-slate-800 dark:text-slate-100 truncate">${f.name} ➔ <span class="text-indigo-600 dark:text-indigo-400 font-bold">${f.outName}</span></div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${f.cuesCount} 條字幕 · ${(f.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button data-batch-download="${f.id}" class="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow transition">
              下載
            </button>
          </div>
        `;
      }
      return `
        <div class="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/30 rounded-lg border border-rose-200 dark:border-rose-800">
          <div class="text-sm text-rose-700 dark:text-rose-300 font-medium">${f.name}: 轉換失敗 (${f.error})</div>
        </div>
      `;
    }).join('');

    this.dom.batchFileList.querySelectorAll('[data-batch-download]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.batchDownload, 10);
        const item = this.state.batchFiles.find(b => b.id === id);
        if (item) {
          this.downloadSingleBatchFile(item);
        }
      });
    });
  }

  downloadSingleBatchFile(item) {
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

  async downloadAllBatchAsZip() {
    if (!window.JSZip) {
      toast.show('ZIP 工具載入中，請稍候...', 'info');
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
    a.download = 'converted_subtitles.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show('已下載 ZIP 打包檔案！📦', 'success');
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
    toast.show('已清除全部內容', 'info');
  }

  async copyToClipboard() {
    const text = this.dom.targetOutput.value;
    if (!text || text.trim() === '' || text.trim() === 'WEBVTT') {
      toast.show('沒有可複製的內容', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      celebration.trigger('✨ 複製成功！ ✨', '轉換後的字幕已成功複製到剪貼簿，立即貼上使用吧！🚀');
      toast.show('已成功複製到剪貼簿！', 'success');
    } catch (e) {
      console.warn('Clipboard write failed:', e);
      // Fallback
      this.dom.targetOutput.select();
      document.execCommand('copy');
      toast.show('已成功複製到剪貼簿！', 'success');
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

    // Add UTF-8 BOM
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

  checkAssStyleVisibility() {
    const isAss = this.state.targetFormat === 'ass' || this.state.targetFormat === 'ssa';
    if (isAss) {
      this.dom.btnAssModal.classList.remove('hidden');
    } else {
      this.dom.btnAssModal.classList.add('hidden');
    }
  }

  switchRightView(view) {
    this.state.activeRightView = view;
    if (this.state.isBatchMode) {
      this.dom.batchContainer.classList.add('hidden');
      this.state.isBatchMode = false;
    }

    // Toggle button active classes
    const activeClass = 'bg-indigo-600 text-white shadow-sm';
    const inactiveClass = 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';

    this.dom.viewRawBtn.className = `px-3 py-1 text-xs font-semibold rounded-md transition ${view === 'raw' ? activeClass : inactiveClass}`;
    this.dom.viewTableBtn.className = `px-3 py-1 text-xs font-semibold rounded-md transition ${view === 'table' ? activeClass : inactiveClass}`;
    this.dom.viewScreenBtn.className = `px-3 py-1 text-xs font-semibold rounded-md transition ${view === 'screen' ? activeClass : inactiveClass}`;

    // Containers
    this.dom.viewRawContainer.classList.toggle('hidden', view !== 'raw');
    this.dom.viewTableContainer.classList.toggle('hidden', view !== 'table');
    this.dom.viewScreenContainer.classList.toggle('hidden', view !== 'screen');

    if (view === 'screen') {
      this.updateScreenPreview();
    }
  }

  renderTableView() {
    if (!this.dom.tableBody) return;
    const cues = this.state.cues;
    if (cues.length === 0) {
      this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 dark:text-slate-500">尚無字幕資料</td></tr>`;
      return;
    }

    this.dom.tableBody.innerHTML = cues.map((c, i) => `
      <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <td class="p-2.5 text-center font-mono text-xs text-slate-500 dark:text-slate-400">${i + 1}</td>
        <td class="p-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">${formatSecondsToVtt(c.start)}</td>
        <td class="p-2.5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">${formatSecondsToVtt(c.end)}</td>
        <td class="p-2.5 text-sm text-slate-800 dark:text-slate-200">
          <input type="text" data-cue-index="${i}" value="${this.escapeHtml(c.text || '')}" class="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:outline-none px-1 py-0.5 rounded transition">
        </td>
      </tr>
    `).join('');

    // Bind inline edit events
    this.dom.tableBody.querySelectorAll('[data-cue-index]').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.cueIndex, 10);
        if (this.state.cues[idx]) {
          this.state.cues[idx].text = e.target.value;
          // Regenerate
          this.rebuildSourceFromCues();
        }
      });
    });
  }

  rebuildSourceFromCues() {
    // Regenerate from current cues
    const result = convertSubtitle(this.state.sourceText, {
      sourceFormat: this.state.sourceFormat,
      targetFormat: this.state.targetFormat,
      timeOffset: this.state.timeOffset,
      assPreset: this.state.assPreset,
      assCustomStyle: this.state.assCustomStyle
    });
    this.dom.targetOutput.value = result.output;
    this.updateScreenPreview();
  }

  updateScreenPreview() {
    const cues = this.state.cues;
    if (!cues || cues.length === 0) {
      this.dom.previewScreenText.textContent = '尚無字幕內容';
      this.dom.previewCueCounter.textContent = '0 / 0';
      this.dom.previewTimeText.textContent = '--:--.---';
      this.dom.previewTimelineSlider.max = 0;
      this.dom.previewTimelineSlider.value = 0;
      return;
    }

    const idx = Math.min(Math.max(0, this.state.currentPreviewCueIndex), cues.length - 1);
    this.state.currentPreviewCueIndex = idx;
    const cue = cues[idx];

    this.dom.previewScreenText.textContent = cue.text || '';
    this.dom.previewCueCounter.textContent = `${idx + 1} / ${cues.length}`;
    this.dom.previewTimeText.textContent = `${formatSecondsToVtt(cue.start)} ➔ ${formatSecondsToVtt(cue.end)}`;
    this.dom.previewTimelineSlider.max = cues.length - 1;
    this.dom.previewTimelineSlider.value = idx;

    // Apply visual styling to preview text
    const style = this.state.assCustomStyle || ASS_PRESETS.classicYellow;
    this.applyPreviewStyle(style);
  }

  applyPreviewStyle(style) {
    if (!this.dom.previewScreenText) return;
    const el = this.dom.previewScreenText;
    
    // Parse ASS colors (AABBGGRR) or hex
    let textColor = '#FFFF00';
    if (style.primaryColor && style.primaryColor.startsWith('&H')) {
      const hex = style.primaryColor.replace('&H', '').replace('&', '').padStart(8, '0');
      const rr = hex.substring(6, 8);
      const gg = hex.substring(4, 6);
      const bb = hex.substring(2, 4);
      textColor = `#${rr}${gg}${bb}`;
    }

    el.style.color = textColor;
    el.style.fontFamily = style.fontName || 'sans-serif';
    el.style.fontSize = `${Math.min(28, Math.max(16, (style.fontSize || 52) * 0.45))}px`;
    el.style.textShadow = `
      -2px -2px 0 #000,
       2px -2px 0 #000,
      -2px  2px 0 #000,
       2px  2px 0 #000,
       0px  3px 6px rgba(0,0,0,0.8)
    `;
  }

  stepPreviewCue(delta) {
    const newIdx = this.state.currentPreviewCueIndex + delta;
    if (newIdx >= 0 && newIdx < this.state.cues.length) {
      this.state.currentPreviewCueIndex = newIdx;
      this.updateScreenPreview();
    }
  }

  switchMobileTab(tab) {
    this.state.activeMobileTab = tab;
    const activeClass = 'bg-indigo-600 text-white shadow-sm';
    const inactiveClass = 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

    if (this.dom.tabInputBtn) this.dom.tabInputBtn.className = `flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 ${tab === 'input' ? activeClass : inactiveClass}`;
    if (this.dom.tabOutputBtn) this.dom.tabOutputBtn.className = `flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 ${tab === 'output' ? activeClass : inactiveClass}`;

    if (tab === 'input') {
      this.dom.mobileInputPane.classList.remove('hidden');
      this.dom.mobileInputPane.classList.add('flex');
      this.dom.mobileOutputPane.classList.add('hidden');
      this.dom.mobileOutputPane.classList.remove('flex');
    } else {
      this.dom.mobileInputPane.classList.add('hidden');
      this.dom.mobileInputPane.classList.remove('flex');
      this.dom.mobileOutputPane.classList.remove('hidden');
      this.dom.mobileOutputPane.classList.add('flex');
    }
  }

  openAssModal() {
    this.dom.assModal.classList.remove('hidden');
    this.dom.assModal.classList.add('flex');
    // Fill current style into modal inputs
    const style = this.state.assCustomStyle || ASS_PRESETS.classicYellow;
    this.dom.assFontName.value = style.fontName || '微軟正黑體';
    this.dom.assFontSize.value = style.fontSize || 52;
  }

  closeAssModal() {
    this.dom.assModal.classList.add('hidden');
    this.dom.assModal.classList.remove('flex');
  }

  applyAssPresetToModal(presetKey) {
    const preset = ASS_PRESETS[presetKey];
    if (preset) {
      this.dom.assFontName.value = preset.fontName;
      this.dom.assFontSize.value = preset.fontSize;
    }
  }

  saveAssModal() {
    const presetKey = this.dom.assPresetSelect.value;
    const base = ASS_PRESETS[presetKey] || ASS_PRESETS.classicYellow;
    this.state.assPreset = presetKey;
    this.state.assCustomStyle = {
      ...base,
      fontName: this.dom.assFontName.value || base.fontName,
      fontSize: parseInt(this.dom.assFontSize.value, 10) || base.fontSize
    };

    this.closeAssModal();
    this.processConversion();
    toast.show('已套用 ASS 樣式自訂設定！🎨', 'success');
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.subtitleApp = new SubtitleApp();
});
