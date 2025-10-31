(function (window, document) {
  'use strict';

  const FILTER_ALL = '__ALL__';
  const filterState = { model: FILTER_ALL, process: FILTER_ALL, status: FILTER_ALL };
  let cached = {
    entries: [],
    models: [],
    processes: [],
    statuses: [],
    totals: { entries: 0, models: 0, processes: 0, orders: 0 },
  };
  let controlsReady = false;
  let html2canvasLoader = null;

  function getEl(id) {
    return document.getElementById(id);
  }

  function setupControls() {
    if (controlsReady) return true;
    const modelEl = getEl('map-filter-model');
    const processEl = getEl('map-filter-process');
    const statusEl = getEl('map-filter-status');
    const jsonBtn = getEl('map-export-json');
    const pngBtn = getEl('map-export-png');

    if (!modelEl || !processEl || !statusEl || !jsonBtn || !pngBtn) {
      return false;
    }

    modelEl.addEventListener('change', () => {
      filterState.model = modelEl.value || FILTER_ALL;
      renderFiltered();
    });
    processEl.addEventListener('change', () => {
      filterState.process = processEl.value || FILTER_ALL;
      renderFiltered();
    });
    statusEl.addEventListener('change', () => {
      filterState.status = statusEl.value || FILTER_ALL;
      renderFiltered();
    });
    jsonBtn.addEventListener('click', handleExportJSON);
    pngBtn.addEventListener('click', handleExportPNG);
    controlsReady = true;
    return true;
  }

  function buildProductionMap(state) {
    const processes = new Map();
    (state?.processes || []).forEach(proc => {
      const key = proc?.id || proc?.name || `proc-${Math.random().toString(36).slice(2, 8)}`;
      processes.set(key, proc);
    });

    const operationsCatalog = new Map();
    (state?.operationsCatalog || []).forEach(op => {
      const key = op?.id || op?.name;
      if (key) operationsCatalog.set(key, op);
    });

    const modelsSet = new Set();
    const processNamesSet = new Set();
    const statusesSet = new Set();
    let totalOrders = 0;
    const entriesByKey = new Map();

    (state?.orders || []).forEach(order => {
      totalOrders += 1;
      const modelName = normaliseName(order?.model) || 'Brak modelu';
      modelsSet.add(modelName);

      const processId = order?.processId;
      const matchedProcess = processId && processes.has(processId) ? processes.get(processId) : null;
      const processName = normaliseName(matchedProcess?.name || processId) || 'Nieprzypisany proces';
      processNamesSet.add(processName);

      const entryKey = `${modelName}__${processName}`;
      if (!entriesByKey.has(entryKey)) {
        entriesByKey.set(entryKey, createEmptyEntry({ modelName, processId: matchedProcess?.id || processId || null, processName }));
      }

      const entry = entriesByKey.get(entryKey);
      const status = extractStatus(order);
      statusesSet.add(status);
      entry.statusesSet.add(status);

      const quantity = Number(order?.quantity) || 0;
      entry.totalQuantity += quantity;
      entry.orderCount += 1;
      entry.orders.push({
        id: order?.id || '',
        name: order?.name || order?.orderName || 'Bez nazwy',
        client: order?.client || order?.customer || '',
        status,
        startDate: order?.startDate || '',
        endDate: order?.endDate || '',
      });

      if (entry.operations.length === 0) {
        const operations = extractOperations(matchedProcess, operationsCatalog);
        entry.operations = operations;
        entry.operationCount = operations.length;
        operations.forEach(op => {
          if (Array.isArray(op.defaultWorkers)) {
            op.defaultWorkers.filter(Boolean).forEach(worker => entry.employees.add(worker));
          }
          if (Array.isArray(op.skills)) {
            op.skills.filter(Boolean).forEach(skill => entry.skills.add(skill));
          }
        });
      }

      entry.estimatedMinutes += estimateProcessDuration(entry.operations, quantity);
    });

    const entries = Array.from(entriesByKey.values()).map(entry => ({
      model: entry.model,
      processId: entry.processId,
      processName: entry.processName,
      orders: entry.orders,
      orderCount: entry.orderCount,
      totalQuantity: entry.totalQuantity,
      operations: entry.operations,
      operationCount: entry.operationCount,
      statuses: Array.from(entry.statusesSet).sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })),
      employees: Array.from(entry.employees).sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })),
      skills: Array.from(entry.skills).sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })),
      estimatedMinutes: Math.round(entry.estimatedMinutes),
    })).sort((a, b) => {
      const modelCompare = a.model.localeCompare(b.model, 'pl', { sensitivity: 'base' });
      if (modelCompare !== 0) return modelCompare;
      return a.processName.localeCompare(b.processName, 'pl', { sensitivity: 'base' });
    });

    return {
      entries,
      models: Array.from(modelsSet).sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })),
      processes: Array.from(processNamesSet).sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })),
      statuses: Array.from(statusesSet).sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })),
      totals: {
        entries: entries.length,
        models: modelsSet.size,
        processes: processNamesSet.size,
        orders: totalOrders,
      },
    };
  }

  function createEmptyEntry({ modelName, processId, processName }) {
    return {
      model: modelName,
      processId: processId || null,
      processName,
      orders: [],
      orderCount: 0,
      totalQuantity: 0,
      operations: [],
      operationCount: 0,
      employees: new Set(),
      skills: new Set(),
      statusesSet: new Set(),
      estimatedMinutes: 0,
    };
  }

  function normaliseName(value) {
    if (!value && value !== 0) return '';
    return String(value).trim();
  }

  function extractStatus(order) {
    const candidates = [
      order?.status,
      order?.state,
      order?.progress,
      order?.stage,
      order?.phase,
      order?.lifecycle,
    ];
    const found = candidates.find(val => typeof val === 'string' && val.trim());
    if (found) return found.trim();
    const numeric = candidates.find(val => typeof val === 'number');
    if (typeof numeric === 'number') return String(numeric);
    return 'Planowane';
  }

  function extractOperations(process, operationsCatalog) {
    if (!process) return [];
    const raw = Array.isArray(process?.operations)
      ? process.operations
      : Array.isArray(process?.operationsSequence)
        ? process.operationsSequence
        : Array.isArray(process?.steps)
          ? process.steps
          : [];
    const result = [];
    raw.forEach(item => {
      const op = normaliseOperation(item, operationsCatalog);
      if (op) result.push(op);
    });
    return result;
  }

  function normaliseOperation(source, operationsCatalog) {
    if (!source && source !== 0) return null;
    if (typeof source === 'string') {
      const catalog = operationsCatalog.get(source);
      if (catalog) return normaliseOperation(catalog, operationsCatalog);
      return {
        id: source,
        name: source,
        timePerUnit: 0,
        durationTotal: 0,
        defaultWorkers: [],
        skills: [],
      };
    }

    const base = source?.id && operationsCatalog.has(source.id)
      ? { ...operationsCatalog.get(source.id), ...source }
      : source;

    const id = base?.id || base?.operationId || base?.name || `op-${Math.random().toString(36).slice(2, 6)}`;
    const name = normaliseName(base?.name || base?.title || id || 'Operacja');
    const timePerUnit = Number(
      base?.time ??
      base?.timePerUnit ??
      base?.duration ??
      base?.durationMinutes ??
      base?.estMin ??
      base?.estMinutes ??
      base?.minutes ??
      0
    ) || 0;
    const durationTotal = Number(base?.totalDuration ?? base?.totalMinutes ?? 0) || 0;
    const workers =
      (Array.isArray(base?.defaultWorkers) && base.defaultWorkers) ||
      (Array.isArray(base?.workers) && base.workers) ||
      (Array.isArray(base?.assignees) && base.assignees) ||
      [];
    const skills = Array.isArray(base?.skills)
      ? base.skills
      : typeof base?.skills === 'string'
        ? base.skills.split(';').map(s => s.trim()).filter(Boolean)
        : [];

    return {
      id,
      name,
      timePerUnit,
      durationTotal,
      defaultWorkers: workers.filter(Boolean),
      skills: skills.filter(Boolean),
    };
  }

  function estimateProcessDuration(operations, quantity) {
    if (!Array.isArray(operations) || operations.length === 0) return 0;
    const qty = quantity && quantity > 0 ? quantity : 1;
    return operations.reduce((total, op) => {
      if (!op) return total;
      if (op.durationTotal && op.durationTotal > 0) return total + op.durationTotal;
      if (op.timePerUnit && op.timePerUnit > 0) return total + op.timePerUnit * qty;
      return total;
    }, 0);
  }

  function updateFilters(data) {
    updateSelect('model', data.models, 'Wszystkie modele');
    updateSelect('process', data.processes, 'Wszystkie procesy');
    updateSelect('status', data.statuses, 'Wszystkie statusy');
  }

  function updateSelect(type, values, label) {
    const element = getEl(`map-filter-${type}`);
    if (!element) return;
    const previous = filterState[type];

    element.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = FILTER_ALL;
    defaultOption.textContent = label;
    element.appendChild(defaultOption);

    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      element.appendChild(option);
    });

    if (previous !== FILTER_ALL && values.includes(previous)) {
      element.value = previous;
    } else {
      element.value = FILTER_ALL;
      filterState[type] = FILTER_ALL;
    }
  }

  function updateStats(data, filteredCount) {
    const container = getEl('map-stats');
    if (!container) return;
    const stats = [
      { value: filteredCount ?? data.totals.entries, label: 'Widok (filtry)' },
      { value: data.totals.entries, label: 'Model × Proces' },
      { value: data.totals.orders, label: 'Zlecenia' },
      { value: data.totals.models, label: 'Modele' },
      { value: data.totals.processes, label: 'Procesy' },
    ];
    container.innerHTML = stats.map(stat => `
      <div class="map-stat">
        <span class="map-stat-value">${stat.value}</span>
        <span class="map-stat-label">${stat.label}</span>
      </div>
    `).join('');
  }

  function updateCards(entries) {
    const container = getEl('map-canvas');
    if (!container) return;
    if (!entries || entries.length === 0) {
      container.innerHTML = '<div class="map-empty">Brak dopasowanych map. Zmień filtry lub przypisz procesy do modeli.</div>';
      return;
    }

    container.innerHTML = entries.map(entry => {
      const operationsHtml = entry.operations.length
        ? `<ul class="map-list">${entry.operations.map(op => `
            <li>
              <span>${escapeHtml(op.name)}</span>
              ${renderOperationMeta(op)}
            </li>`).join('')}</ul>`
        : '<div class="map-empty" style="padding:16px">Brak zdefiniowanych operacji dla procesu.</div>';

      const ordersHtml = entry.orders.length
        ? `<ul class="map-list">${entry.orders.map(order => `
            <li>
              <span>${escapeHtml(order.name)}${order.client ? ` — ${escapeHtml(order.client)}` : ''}</span>
              <span class="map-order-meta">
                Status: ${escapeHtml(order.status)}${renderOrderDates(order)}
              </span>
            </li>`).join('')}</ul>`
        : '<div class="map-empty" style="padding:16px">Brak zleceń powiązanych z tym modelem.</div>';

      const employees = entry.employees.length
        ? entry.employees.map(emp => `<span class="map-chip">👷 ${escapeHtml(emp)}</span>`).join(' ')
        : '<span class="map-card-subtitle">Brak przypisanych pracowników</span>';

      const statusChips = entry.statuses.map(status => `<span class="map-chip" style="background:rgba(16, 185, 129, 0.18);border-color:rgba(16,185,129,0.35)">📌 ${escapeHtml(status)}</span>`).join(' ');

      return `
        <div class="map-card">
          <div class="map-card-header">
            <div>
              <p class="map-card-title">Model: ${escapeHtml(entry.model)}</p>
              <span class="map-card-subtitle">Proces: ${escapeHtml(entry.processName)}</span>
              <div class="map-card-meta" style="margin-top:8px">
                <span class="map-chip">📦 ${entry.orderCount} zleceń</span>
                <span class="map-chip">⚙️ ${entry.operationCount} operacji</span>
                <span class="map-chip">⏱️ ${formatMinutes(entry.estimatedMinutes)}</span>
                ${statusChips}
              </div>
            </div>
          </div>
          <div class="map-section">
            <div class="map-section-title">Operacje procesowe</div>
            ${operationsHtml}
          </div>
          <div class="map-section">
            <div class="map-section-title">Zlecenia</div>
            ${ordersHtml}
          </div>
          <div class="map-section">
            <div class="map-section-title">Zespół / kompetencje</div>
            <div class="map-card-meta">${employees}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderOperationMeta(op) {
    const parts = [];
    if (op.timePerUnit && op.timePerUnit > 0) {
      parts.push(`⏱️ ${formatMinutes(op.timePerUnit)} / szt.`);
    }
    if (op.durationTotal && op.durationTotal > 0) {
      parts.push(`🕒 ${formatMinutes(op.durationTotal)} łącznie`);
    }
    if (op.skills && op.skills.length) {
      parts.push(`🧰 ${op.skills.map(escapeHtml).join(', ')}`);
    }
    return parts.length ? `<span class="map-order-meta">${parts.join(' • ')}</span>` : '';
  }

  function renderOrderDates(order) {
    const start = safeFormatDate(order.startDate);
    const end = safeFormatDate(order.endDate);
    const parts = [];
    if (start) parts.push(`Start: ${start}`);
    if (end) parts.push(`Termin: ${end}`);
    return parts.length ? ` • ${parts.join(' | ')}` : '';
  }

  function safeFormatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL');
  }

  function formatMinutes(minutes) {
    if (!minutes || minutes <= 0) return 'brak danych';
    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes % 60);
    if (hours === 0) return `${rest} min`;
    if (rest === 0) return `${hours} h`;
    return `${hours} h ${rest} min`;
  }

  function escapeHtml(value) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return String(value ?? '').replace(/[&<>'"]/g, ch => map[ch] || ch);
  }

  function applyFilters(entries) {
    return entries.filter(entry => {
      if (filterState.model !== FILTER_ALL && entry.model !== filterState.model) return false;
      if (filterState.process !== FILTER_ALL && entry.processName !== filterState.process) return false;
      if (filterState.status !== FILTER_ALL && !entry.statuses.includes(filterState.status)) return false;
      return true;
    });
  }

  function renderFiltered() {
    const filtered = applyFilters(cached.entries);
    updateStats(cached, filtered.length);
    updateCards(filtered);
  }

  function handleExportJSON() {
    if (!cached.entries.length) {
      alert('Brak danych do eksportu.');
      return;
    }
    const blob = new Blob([
      JSON.stringify({ generatedAt: new Date().toISOString(), filters: filterState, data: cached.entries }, null, 2),
    ], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mapy-procesow-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function ensureHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!html2canvasLoader) {
      html2canvasLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('Nie udało się załadować html2canvas'));
        document.head.appendChild(script);
      });
    }
    return html2canvasLoader;
  }

  function handleExportPNG() {
    const canvasRoot = getEl('map-canvas');
    if (!canvasRoot) {
      alert('Brak kontenera mapy do eksportu.');
      return;
    }
    if (!cached.entries.length) {
      alert('Brak danych do eksportu.');
      return;
    }
    ensureHtml2Canvas()
      .then(html2canvas => html2canvas(canvasRoot, { backgroundColor: '#0f172a', scale: 2 }))
      .then(canvas => {
        canvas.toBlob(blob => {
          if (!blob) {
            alert('Nie udało się wygenerować obrazka.');
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mapy-procesow-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 'image/png');
      })
      .catch(err => {
        console.error('Błąd eksportu PNG:', err);
        alert('Nie udało się wyeksportować mapy do PNG.');
      });
  }

  function renderMapView(state) {
    const controlsAvailable = setupControls();
    if (!controlsAvailable) {
      document.addEventListener('DOMContentLoaded', () => renderMapView(state), { once: true });
      return;
    }
    const resolvedState = state || window.state || {};
    cached = buildProductionMap(resolvedState);
    updateFilters(cached);
    renderFiltered();
  }

  window.renderMapView = renderMapView;

  document.addEventListener('DOMContentLoaded', () => {
    setupControls();
    if (window.state) {
      renderMapView(window.state);
    }
  });
})(window, document);
