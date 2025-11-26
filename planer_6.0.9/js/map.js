(function(){
  const ALL_VALUE = '__ALL__';
  const FILTER_CONFIG = {
    model: { id: 'map-filter-model', label: 'Wszystkie modele' },
    process: { id: 'map-filter-process', label: 'Wszystkie procesy' },
    status: { id: 'map-filter-status', label: 'Wszystkie statusy' }
  };

  let lastStateRef = null;

  function byId(id){
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  function getSelectValue(id){
    const el = byId(id);
    if(!el) return ALL_VALUE;
    return el.value || ALL_VALUE;
  }

  function titleCase(value){
    if(!value) return '—';
    return String(value)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, ch => ch.toUpperCase());
  }

  function ensureOptions(select, values, label){
    if(!select) return;
    const existing = Array.from(select.options).map(opt => opt.value);
    const desired = [ALL_VALUE, ...values];
    const rebuilt = desired.length !== existing.length || desired.some((val, idx) => val !== existing[idx]);
    if(!rebuilt) return;
    const currentValue = select.value;
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = ALL_VALUE;
    allOption.textContent = label;
    select.appendChild(allOption);
    values.forEach(val => {
      const option = document.createElement('option');
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    });
    if(desired.includes(currentValue)){
      select.value = currentValue;
    }
  }

  function collectMappings(state){
    const safeState = state && typeof state === 'object' ? state : {};
    const tasks = Array.isArray(safeState.tasks) ? safeState.tasks : [];
    const orders = Array.isArray(safeState.orders) ? safeState.orders : [];
    const processes = Array.isArray(safeState.processes) ? safeState.processes : [];

    const orderById = new Map();
    orders.forEach(order => {
      if(order && order.id) orderById.set(order.id, order);
    });

    const processById = new Map();
    processes.forEach(proc => {
      if(proc && proc.id) processById.set(proc.id, proc);
    });

    const taskOrderMap = safeState.taskOrderMap && typeof safeState.taskOrderMap === 'object' ? safeState.taskOrderMap : {};
    const taskProcessMap = safeState.taskProcessMap && typeof safeState.taskProcessMap === 'object' ? safeState.taskProcessMap : {};

    return tasks.map(task => {
      const taskId = task && task.id ? task.id : null;
      const rawProcess = taskId ? taskProcessMap[taskId] : null;
      const rawOrder = taskId ? taskOrderMap[taskId] : null;

      const processId = Array.isArray(rawProcess) ? rawProcess[0] : rawProcess;
      const orderId = Array.isArray(rawOrder) ? rawOrder[0] : rawOrder;

      const process = processId ? (processById.get(processId) || null) : null;
      const order = orderId ? (orderById.get(orderId) || null) : null;

      const taskName = task && task.name ? task.name : (task && task.title ? task.title : 'Bez nazwy');
      const taskStatus = titleCase(task && task.status ? task.status : 'unknown');
      const modelName = order && order.model ? order.model : (task && task.model ? task.model : '—');
      const processName = process && process.name ? process.name : (processId ? String(processId) : '—');
      const orderLabel = order && (order.no || order.number || order.name) ? (order.no || order.number || order.name) : (orderId || '—');

      return {
        taskId: taskId || null,
        taskName,
        status: taskStatus,
        rawStatus: String(task && task.status ? task.status : 'unknown').toLowerCase(),
        model: modelName,
        processName,
        processId: processId || null,
        orderId: orderId || null,
        orderLabel,
        assignees: Array.isArray(task && task.assignees) ? task.assignees : []
      };
    });
  }

  function applyFilters(mappings){
    const modelFilter = getSelectValue(FILTER_CONFIG.model.id);
    const processFilter = getSelectValue(FILTER_CONFIG.process.id);
    const statusFilter = getSelectValue(FILTER_CONFIG.status.id);

    return mappings.filter(mapping => {
      if(modelFilter !== ALL_VALUE && mapping.model !== modelFilter) return false;
      if(processFilter !== ALL_VALUE && mapping.processName !== processFilter) return false;
      if(statusFilter !== ALL_VALUE && mapping.rawStatus !== statusFilter) return false;
      return true;
    });
  }

  function renderStats(allMappings, filteredMappings){
    const statsEl = byId('map-stats');
    if(!statsEl) return;
    const models = new Set(filteredMappings.map(m => m.model));
    const processes = new Set(filteredMappings.map(m => m.processName));
    const statuses = new Set(filteredMappings.map(m => m.status));

    statsEl.innerHTML = '';

    const createStat = (label, value)=>{
      const wrapper = document.createElement('div');
      wrapper.style.padding = '8px 12px';
      wrapper.style.borderRadius = '10px';
      wrapper.style.background = 'rgba(15,23,42,0.6)';
      wrapper.style.border = '1px solid rgba(148,163,184,0.2)';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.minWidth = '140px';

      const labelEl = document.createElement('span');
      labelEl.style.fontSize = '12px';
      labelEl.style.color = '#94a3b8';
      labelEl.textContent = label;

      const valueEl = document.createElement('strong');
      valueEl.style.fontSize = '16px';
      valueEl.style.color = '#e2e8f0';
      valueEl.textContent = value;

      wrapper.appendChild(labelEl);
      wrapper.appendChild(valueEl);
      return wrapper;
    };

    statsEl.appendChild(createStat('Zadania', `${filteredMappings.length}/${allMappings.length}`));
    statsEl.appendChild(createStat('Modele', String(models.size)));
    statsEl.appendChild(createStat('Procesy', String(processes.size)));
    statsEl.appendChild(createStat('Statusy', String(statuses.size)));
  }

  function renderRows(mappings){
    const host = byId('map-canvas');
    if(!host) return;
    host.innerHTML = '';

    if(!mappings.length){
      const empty = document.createElement('div');
      empty.className = 'map-empty';
      empty.textContent = 'Brak wyników dla wybranych filtrów.';
      host.appendChild(empty);
      return;
    }

    mappings.forEach(mapping => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '12px';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.style.fontSize = '15px';
      title.textContent = mapping.taskName;

      const meta = document.createElement('div');
      meta.className = 'muted';
      meta.textContent = `Proces: ${mapping.processName} • Status: ${mapping.status}`;

      const orderLine = document.createElement('div');
      orderLine.className = 'muted';
      orderLine.textContent = `Zlecenie: ${mapping.orderLabel}`;

      if(mapping.assignees.length){
        const assigneesLine = document.createElement('div');
        assigneesLine.className = 'muted';
        assigneesLine.textContent = `Przypisano: ${mapping.assignees.join(', ')}`;
        card.appendChild(assigneesLine);
      }

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(orderLine);
      host.appendChild(card);
    });
  }

  function syncFilters(mappings){
    const models = Array.from(new Set(mappings.map(m => m.model))).filter(Boolean).sort();
    const processes = Array.from(new Set(mappings.map(m => m.processName))).filter(Boolean).sort();
    const statuses = Array.from(new Set(mappings.map(m => m.rawStatus))).filter(Boolean).sort();

    ensureOptions(byId(FILTER_CONFIG.model.id), models, FILTER_CONFIG.model.label);
    ensureOptions(byId(FILTER_CONFIG.process.id), processes, FILTER_CONFIG.process.label);
    ensureOptions(byId(FILTER_CONFIG.status.id), statuses.map(s => titleCase(s)), FILTER_CONFIG.status.label);

    const statusSelect = byId(FILTER_CONFIG.status.id);
    if(statusSelect){
      Array.from(statusSelect.options).forEach(option => {
        if(option.value === ALL_VALUE) return;
        option.value = option.value.toLowerCase();
      });
    }
  }

  function handleFilterChange(){
    if(!lastStateRef) return;
    try {
      window.renderMapView(lastStateRef);
    } catch(err){
      console.warn('[map-view] filter change render failed', err && err.message);
    }
  }

  function attachFilterListeners(){
    Object.values(FILTER_CONFIG).forEach(cfg => {
      const select = byId(cfg.id);
      if(select && !select.__mapViewListenerAttached){
        select.addEventListener('change', handleFilterChange);
        select.__mapViewListenerAttached = true;
      }
    });
  }

  function render(state){
    const mappings = collectMappings(state);
    syncFilters(mappings);

    const statusSelect = byId(FILTER_CONFIG.status.id);
    if(statusSelect){
      Array.from(statusSelect.options).forEach(option => {
        if(option.value === ALL_VALUE) return;
        option.textContent = titleCase(option.value);
      });
    }

    const filtered = applyFilters(mappings);
    renderRows(filtered);
    renderStats(mappings, filtered);
  }

  window.renderMapView = function(state){
    lastStateRef = state && typeof state === 'object' ? state : (window.state || {});
    try {
      attachFilterListeners();
      render(lastStateRef);
      window.__renderMapViewExported = true;
    } catch(err){
      console.warn('[map-view] render failed', err && err.message);
    }
  };

  if(typeof document !== 'undefined'){
    document.addEventListener('DOMContentLoaded', () => {
      attachFilterListeners();
      if(lastStateRef){
        window.renderMapView(lastStateRef);
      }
    });
  }
})();
