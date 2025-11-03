(function(){
  const LEVEL_CONFIG = {
    info: {
      label: 'Info',
      icon: 'ℹ️',
      color: '#2563eb'
    },
    warning: {
      label: 'Ostrzeżenie',
      icon: '⚠️',
      color: '#f59e0b'
    },
    error: {
      label: 'Błąd',
      icon: '⛔',
      color: '#ef4444'
    }
  };

  function createStyles(){
    if(document.getElementById('devlog-panel-styles')) return;
    const style = document.createElement('style');
    style.id = 'devlog-panel-styles';
    style.textContent = `
      .devlog-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 420px;
        max-height: 60vh;
        background: rgba(15, 23, 42, 0.97);
        color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 12px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.4);
        display: flex;
        flex-direction: column;
        z-index: 9999;
        overflow: hidden;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .devlog-panel.collapsed {
        height: 52px;
        max-height: 52px;
      }
      .devlog-panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.9));
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }
      .devlog-panel__title {
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .devlog-panel__controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .devlog-panel__btn {
        background: rgba(148, 163, 184, 0.12);
        color: inherit;
        border: none;
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s ease;
      }
      .devlog-panel__btn:hover {
        background: rgba(148, 163, 184, 0.2);
      }
      .devlog-panel__filters {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.85);
      }
      .devlog-panel__filter-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #cbd5f5;
      }
      .devlog-panel__search {
        grid-column: span 2;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 8px;
        color: inherit;
        padding: 6px 10px;
        font-size: 13px;
      }
      .devlog-panel__actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.85);
        flex-wrap: wrap;
      }
      .devlog-panel__actions .devlog-panel__btn {
        flex: 1 1 calc(50% - 8px);
        justify-content: center;
      }
      .devlog-panel__summary {
        padding: 10px 16px;
        font-size: 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        color: rgba(148, 163, 184, 0.8);
        background: rgba(15, 23, 42, 0.75);
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .devlog-panel__list {
        list-style: none;
        margin: 0;
        padding: 12px 0 0;
        overflow-y: auto;
        flex: 1;
      }
      .devlog-entry {
        margin: 0 0 12px;
        padding: 12px 16px;
        border-left: 3px solid transparent;
      }
      .devlog-entry__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 6px;
      }
      .devlog-entry__meta {
        font-size: 11px;
        color: rgba(148, 163, 184, 0.75);
        display: flex;
        gap: 8px;
      }
      .devlog-entry__message {
        font-size: 13px;
        line-height: 1.45;
        word-break: break-word;
      }
      .devlog-entry__message strong {
        font-weight: 600;
      }
      .devlog-entry__details {
        margin-top: 8px;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 8px;
        padding: 8px;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.9);
        white-space: pre-wrap;
        word-break: break-word;
      }
      .devlog-entry.level-info {
        border-color: rgba(37, 99, 235, 0.7);
        background: rgba(37, 99, 235, 0.08);
      }
      .devlog-entry.level-warning {
        border-color: rgba(245, 158, 11, 0.7);
        background: rgba(245, 158, 11, 0.08);
      }
      .devlog-entry.level-error {
        border-color: rgba(239, 68, 68, 0.7);
        background: rgba(239, 68, 68, 0.08);
      }
      .devlog-empty-state {
        text-align: center;
        font-size: 13px;
        padding: 24px;
        color: rgba(148, 163, 184, 0.8);
      }
      @media (max-width: 1024px){
        .devlog-panel {
          right: 16px;
          bottom: 16px;
          width: min(95vw, 420px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function sanitizeMeta(meta){
    if(meta === null || meta === undefined) return '';
    if(typeof meta === 'string') return meta;
    try{
      return JSON.stringify(meta, null, 2);
    }catch(err){
      return String(meta);
    }
  }

  class DevLogPanel {
    constructor(options = {}){
      this.maxEntries = options.maxEntries || 100;
      this.entries = [];
      this.filters = new Set(options.defaultLevels || Object.keys(LEVEL_CONFIG));
      this.searchTerm = '';
      this.sendLogsUrl = options.sendLogsUrl || null;
      this.sendLogsMethod = options.sendLogsMethod || 'POST';
      this.sendLogsHeaders = options.sendLogsHeaders || { 'Content-Type': 'application/json' };
      this.autoErrorWebhookUrl = options.autoErrorWebhookUrl || null;
      this.autoErrorWebhookHeaders = options.autoErrorWebhookHeaders || { 'Content-Type': 'application/json' };
      this.autoErrorLevels = options.autoErrorLevels || ['error'];
      this.autoErrorSampleRate = typeof options.autoErrorSampleRate === 'number' ? options.autoErrorSampleRate : 1;
      this.sentry = options.sentry || null;
      this.sentryLevelMap = options.sentryLevelMap || { info: 'info', warning: 'warning', error: 'error' };
      this.captureConsoleEnabled = options.captureConsole || false;
      this.monitoringAdapter = options.monitoringAdapter || null;
      this.mountNode = options.mountNode || document.body;
      this.root = null;
      this.listEl = null;
      this.summaryEl = null;
      this.statusEl = null;
      this.filtersForm = null;
      this.searchInput = null;
      this.isCollapsed = false;
      this.lastAutoSendTs = 0;
      this.autoSendCooldownMs = options.autoSendCooldownMs || 2000;
      this.onLogCallbacks = [];
      createStyles();
    }

    init(){
      this.createPanel();
      if(this.captureConsoleEnabled){
        this.captureConsole();
      }
      return this;
    }

    createPanel(){
      if(this.root) return;
      const root = document.createElement('section');
      root.className = 'devlog-panel';
      root.setAttribute('data-testid', 'devlog-panel');

      const header = document.createElement('div');
      header.className = 'devlog-panel__header';

      const title = document.createElement('div');
      title.className = 'devlog-panel__title';
      const titleIcon = document.createElement('span');
      titleIcon.textContent = '🛠️';
      const titleText = document.createElement('span');
      titleText.textContent = 'DevLog Panel';
      title.append(titleIcon, titleText);

      const controls = document.createElement('div');
      controls.className = 'devlog-panel__controls';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'devlog-panel__btn';
      toggleBtn.textContent = 'Zwiń';
      toggleBtn.addEventListener('click', () => {
        this.isCollapsed = !this.isCollapsed;
        root.classList.toggle('collapsed', this.isCollapsed);
        toggleBtn.textContent = this.isCollapsed ? 'Rozwiń' : 'Zwiń';
      });

      controls.appendChild(toggleBtn);
      header.append(title, controls);

      const filters = document.createElement('div');
      filters.className = 'devlog-panel__filters';

      Object.entries(LEVEL_CONFIG).forEach(([level, info]) => {
        const wrapper = document.createElement('label');
        wrapper.className = 'devlog-panel__filter-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = this.filters.has(level);
        cb.dataset.level = level;
        cb.addEventListener('change', () => {
          if(cb.checked){
            this.filters.add(level);
          }else{
            this.filters.delete(level);
          }
          this.render();
        });
        const span = document.createElement('span');
        span.textContent = `${info.icon} ${info.label}`;
        wrapper.append(cb, span);
        filters.appendChild(wrapper);
      });

      const search = document.createElement('input');
      search.type = 'search';
      search.placeholder = 'Szukaj w logach…';
      search.className = 'devlog-panel__search';
      search.addEventListener('input', () => {
        this.searchTerm = search.value.trim().toLowerCase();
        this.render();
      });
      filters.appendChild(search);
      this.searchInput = search;

      const actions = document.createElement('div');
      actions.className = 'devlog-panel__actions';

      const exportTxtBtn = this.createActionButton('📄 TXT', 'export-txt');
      exportTxtBtn.addEventListener('click', () => this.exportLogs('txt'));
      const exportJsonBtn = this.createActionButton('🗃️ JSON', 'export-json');
      exportJsonBtn.addEventListener('click', () => this.exportLogs('json'));
      const sendBtn = this.createActionButton('📤 Prześlij logi', 'send-logs');
      sendBtn.addEventListener('click', () => this.sendLogs());
      const clearBtn = this.createActionButton('🧹 Wyczyść', 'clear-logs');
      clearBtn.addEventListener('click', () => this.clear());

      actions.append(exportTxtBtn, exportJsonBtn, sendBtn, clearBtn);

      const summary = document.createElement('div');
      summary.className = 'devlog-panel__summary';
      const counter = document.createElement('span');
      counter.textContent = 'Brak logów';
      this.summaryEl = counter;
      const status = document.createElement('span');
      status.textContent = this.autoErrorWebhookUrl ? `Auto-monitoring: aktywny` : 'Auto-monitoring: wyłączony';
      this.statusEl = status;
      summary.append(counter, status);

      const list = document.createElement('ul');
      list.className = 'devlog-panel__list';
      list.setAttribute('data-testid', 'devlog-list');
      this.listEl = list;

      root.append(header, filters, actions, summary, list);
      this.mountNode.appendChild(root);
      this.root = root;
      this.filtersForm = filters;
      this.render();
    }

    createActionButton(label, testId){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'devlog-panel__btn';
      btn.textContent = label;
      if(testId){
        btn.setAttribute('data-testid', `devlog-${testId}`);
      }
      return btn;
    }

    captureConsole(){
      const nativeLog = console.log;
      const nativeWarn = console.warn;
      const nativeError = console.error;
      console.log = (...args) => {
        nativeLog.apply(console, args);
        this.info(args.map(String).join(' '));
      };
      console.warn = (...args) => {
        nativeWarn.apply(console, args);
        this.warning(args.map(String).join(' '));
      };
      console.error = (...args) => {
        nativeError.apply(console, args);
        this.error(args.map(String).join(' '));
      };

      this.onLog(() => {}); // ensure callbacks array

      if(typeof window !== 'undefined'){
        window.addEventListener('error', (evt) => {
          this.error(evt.message, { source: evt.filename, line: evt.lineno, col: evt.colno, stack: evt.error && evt.error.stack });
        });
        window.addEventListener('unhandledrejection', (evt) => {
          const reason = evt.reason instanceof Error ? { message: evt.reason.message, stack: evt.reason.stack } : evt.reason;
          this.error('Unhandled promise rejection', { reason });
        });
      }
    }

    onLog(callback){
      if(typeof callback === 'function'){
        this.onLogCallbacks.push(callback);
      }
    }

    log(level, message, meta){
      if(!LEVEL_CONFIG[level]){
        level = 'info';
      }
      const entry = {
        id: Date.now() + Math.random().toString(16).slice(2),
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        meta: meta || null,
        timestamp: new Date()
      };

      this.entries.unshift(entry);
      if(this.entries.length > this.maxEntries){
        this.entries.length = this.maxEntries;
      }
      this.render();
      this.forwardToMonitoring(entry);
      this.onLogCallbacks.forEach(cb => {
        try{ cb(entry); }catch(err){ /* eslint-disable-line no-empty */ }
      });
      return entry.id;
    }

    info(message, meta){ return this.log('info', message, meta); }
    warning(message, meta){ return this.log('warning', message, meta); }
    error(message, meta){ return this.log('error', message, meta); }

    forwardToMonitoring(entry){
      if(this.autoErrorWebhookUrl && this.autoErrorLevels.includes(entry.level)){
        const elapsed = Date.now() - this.lastAutoSendTs;
        if(elapsed >= this.autoSendCooldownMs && Math.random() <= this.autoErrorSampleRate){
          this.lastAutoSendTs = Date.now();
          this.postJson(this.autoErrorWebhookUrl, entry, this.autoErrorWebhookHeaders).catch(err => {
            console.warn('[DevLog] Nie udało się wysłać logu do webhooka:', err);
          });
        }
      }

      if(this.sentry && typeof this.sentry.captureMessage === 'function'){
        try{
          const sentryLevel = this.sentryLevelMap[entry.level] || 'info';
          this.sentry.captureMessage(`[DevLog:${entry.level}] ${entry.message}`, {
            level: sentryLevel,
            extra: entry.meta || {}
          });
        }catch(err){
          console.warn('[DevLog] Sentry integration failed:', err);
        }
      }

      if(this.monitoringAdapter && typeof this.monitoringAdapter === 'function'){
        try{
          this.monitoringAdapter(entry);
        }catch(err){
          console.warn('[DevLog] Monitoring adapter failed:', err);
        }
      }
    }

    render(){
      if(!this.listEl) return;
      const filtered = this.entries.filter(entry => {
        if(this.filters.size && !this.filters.has(entry.level)) return false;
        if(this.searchTerm){
          const metaString = entry.meta ? sanitizeMeta(entry.meta).toLowerCase() : '';
          return entry.message.toLowerCase().includes(this.searchTerm) || metaString.includes(this.searchTerm);
        }
        return true;
      });

      this.listEl.innerHTML = '';
      if(filtered.length === 0){
        const empty = document.createElement('div');
        empty.className = 'devlog-empty-state';
        empty.textContent = 'Brak logów dla wybranych filtrów';
        this.listEl.appendChild(empty);
      }else{
        filtered.forEach(entry => {
          this.listEl.appendChild(this.renderEntry(entry));
        });
      }

      if(this.summaryEl){
        this.summaryEl.textContent = `Wszystkie logi: ${this.entries.length} • Widoczne: ${filtered.length}`;
      }
      if(this.statusEl){
        this.statusEl.textContent = this.autoErrorWebhookUrl ? `Auto-monitoring: ${this.autoErrorWebhookUrl}` : 'Auto-monitoring: wyłączony';
      }
    }

    renderEntry(entry){
      const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.info;
      const li = document.createElement('li');
      li.className = `devlog-entry level-${entry.level}`;
      li.setAttribute('data-level', entry.level);
      li.setAttribute('data-testid', `devlog-entry-${entry.level}`);

      const header = document.createElement('div');
      header.className = 'devlog-entry__header';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';

      const icon = document.createElement('span');
      icon.textContent = config.icon;
      icon.style.fontSize = '18px';

      const message = document.createElement('div');
      message.className = 'devlog-entry__message';
      message.textContent = entry.message;

      left.append(icon, message);

      const meta = document.createElement('div');
      meta.className = 'devlog-entry__meta';
      const levelSpan = document.createElement('span');
      levelSpan.textContent = config.label;
      const timeSpan = document.createElement('span');
      timeSpan.textContent = entry.timestamp.toLocaleString();
      meta.append(levelSpan, timeSpan);

      header.append(left, meta);

      li.appendChild(header);

      if(entry.meta){
        const details = document.createElement('div');
        details.className = 'devlog-entry__details';
        details.textContent = sanitizeMeta(entry.meta);
        li.appendChild(details);
      }
      return li;
    }

    async exportLogs(format = 'json'){
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let blob;
      if(format === 'txt'){
        const lines = this.entries.map(entry => {
          const metaString = entry.meta ? `\n  meta: ${sanitizeMeta(entry.meta)}` : '';
          return `[${entry.timestamp.toISOString()}] (${entry.level.toUpperCase()}) ${entry.message}${metaString}`;
        });
        blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
      }else{
        const payload = this.entries.map(entry => ({
          level: entry.level,
          message: entry.message,
          meta: entry.meta,
          timestamp: entry.timestamp.toISOString()
        }));
        blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `devlog-${timestamp}.${format}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async sendLogs(){
      if(!this.sendLogsUrl){
        alert('⚠️ Brak skonfigurowanego endpointu. Ustaw sendLogsUrl w konfiguracji DevLogPanel.');
        return;
      }
      try{
        const payload = {
          sentAt: new Date().toISOString(),
          build: window.APP_BUILD_VERSION || null,
          userAgent: navigator.userAgent,
          location: window.location.href,
          logs: this.entries.map(entry => ({
            level: entry.level,
            message: entry.message,
            meta: entry.meta,
            timestamp: entry.timestamp.toISOString()
          }))
        };
        const res = await this.postJson(this.sendLogsUrl, payload, this.sendLogsHeaders, this.sendLogsMethod);
        if(!res.ok){
          throw new Error(`HTTP ${res.status}`);
        }
        alert('✅ Logi zostały wysłane do backendu');
        this.info('Wysłano pakiet logów do backendu', { endpoint: this.sendLogsUrl });
      }catch(err){
        this.error('Nie udało się wysłać logów', { error: err.message, endpoint: this.sendLogsUrl });
        alert('❌ Nie udało się wysłać logów. Szczegóły w konsoli.');
      }
    }

    async postJson(url, body, headers = {}, method = 'POST'){
      return fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
      });
    }

    clear(){
      this.entries = [];
      this.render();
      this.info('Logi wyczyszczone lokalnie');
    }

    setAutoErrorWebhook(url, headers){
      this.autoErrorWebhookUrl = url;
      if(headers) this.autoErrorWebhookHeaders = headers;
      this.render();
    }

    setSendLogsEndpoint(url, headers, method){
      this.sendLogsUrl = url;
      if(headers) this.sendLogsHeaders = headers;
      if(method) this.sendLogsMethod = method;
    }

    destroy(){
      if(this.root){
        this.root.remove();
        this.root = null;
      }
    }
  }

  if(typeof window !== 'undefined'){
    window.DevLogPanel = DevLogPanel;
  }
})();
