// js/store.js
// Minimalny store API dla modularnej i inline wersji aplikacji
(function(){
  const PRIMARY_STORE_KEY = window.storeKey || 'door_v50_state';
  const LEGACY_STORE_KEYS = Array.from(new Set([
    'door_v5627_state',
    'production_planner_backups',
    'door_final_test_state'
  ])).filter(key => key && key !== PRIMARY_STORE_KEY);

  const ORDER_FIELD_SYNONYMS = {
    name: ['orderName'],
    client: ['customer', 'customerName'],
    model: ['product', 'productName'],
    phone: ['tel', 'phoneNumber', 'contactPhone', 'orderPhone'],
    postalCode: ['post', 'zip', 'zipCode', 'postal_code', 'placeCode', 'placecode'],
    notes: ['desc', 'description', 'comment', 'remarks'],
    address: ['addr', 'installAddress', 'installationAddress'],
    startDate: ['createdAt', 'orderDate'],
    endDate: ['deadline', 'dueDate'],
    installDate: ['installationDate', 'montazDate'],
    leadEmployeeId: ['lead', 'leadId', 'salesRepId', 'handlowiecId'],
    processId: ['process', 'process_id']
  };

  const AFTER_FIELD_SYNONYMS = {
    phone: ['tel', 'phoneNumber', 'contactPhone'],
    postalCode: ['post', 'zip', 'zipCode', 'postal_code', 'placeCode', 'placecode'],
    desc: ['description', 'notes', 'comment', 'remarks'],
    leadEmployeeId: ['lead', 'leadId', 'salesRepId', 'handlowiecId'],
    installDate: ['installationDate', 'montazDate'],
    status: ['state']
  };

  function isEmptyValue(value){
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return false;
    return false;
  }

  function firstNonEmpty(obj, keys){
    if (!obj) return undefined;
    for (const key of keys){
      if (!key || !(key in obj)) continue;
      const value = obj[key];
      if (value === undefined || value === null) continue;
      if (typeof value === 'string'){
        const trimmed = value.trim();
        if (trimmed) return trimmed;
        continue;
      }
      if (Array.isArray(value) && value.length === 0) continue;
      return value;
    }
    return undefined;
  }

  function normalizeOrderShape(order){
    if (!order || typeof order !== 'object') return order;
    if (!order.id){
      const idCandidate = firstNonEmpty(order, ['orderId', 'orderID', 'uuid', 'guid', 'ID']);
      if (idCandidate) order.id = idCandidate;
    }
    Object.entries(ORDER_FIELD_SYNONYMS).forEach(([canonical, variants]) => {
      if (isEmptyValue(order[canonical])){
        const value = firstNonEmpty(order, variants);
        if (value !== undefined){
          order[canonical] = typeof value === 'string' ? value.trim() : value;
        }
      }
    });
    return order;
  }

  function normalizeAfterEntry(entry){
    if (!entry || typeof entry !== 'object') return entry;
    if (!entry.id){
      const idCandidate = firstNonEmpty(entry, ['afterId', 'entryId', 'uuid', 'guid', 'ID']);
      if (idCandidate) entry.id = idCandidate;
    }
    if (!entry.order){
      const orderIdCandidate = firstNonEmpty(entry, ['order', 'orderId', 'orderID', 'orderUuid', 'order_id']);
      if (orderIdCandidate) entry.order = orderIdCandidate;
    }
    Object.entries(AFTER_FIELD_SYNONYMS).forEach(([canonical, variants]) => {
      if (isEmptyValue(entry[canonical])){
        const value = firstNonEmpty(entry, variants);
        if (value !== undefined){
          entry[canonical] = typeof value === 'string' ? value.trim() : value;
        }
      }
    });
    if (!Array.isArray(entry.employeeIds)){
      if (Array.isArray(entry.employees) && entry.employees.length){
        entry.employeeIds = entry.employees.slice();
      } else if (!isEmptyValue(entry.employeeId)){
        entry.employeeIds = [entry.employeeId];
      } else {
        entry.employeeIds = [];
      }
    }
    return entry;
  }

  function safeStringify(data){
    const seen = new WeakSet();
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'function') {
        return undefined;
      }
      if (typeof Node !== 'undefined' && value instanceof Node) {
        return undefined;
      }
      if (typeof value === 'object' && value !== null) {
        if (value === window) {
          return undefined;
        }
        if (seen.has(value)) {
          return undefined;
        }
        seen.add(value);
      }
      if (typeof value === 'number' && !Number.isFinite(value)) {
        return null;
      }
      return value;
    });
  }

  function migrateLegacyStore(){
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(PRIMARY_STORE_KEY)) return;
    for (const legacyKey of LEGACY_STORE_KEYS){
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      try {
        JSON.parse(legacyRaw);
        localStorage.setItem(PRIMARY_STORE_KEY, legacyRaw);
        console.log(`[store-migrate] skopiowano stan z ${legacyKey} do ${PRIMARY_STORE_KEY}`);
        break;
      } catch(err){
        console.warn('[store-migrate] niepoprawny JSON w', legacyKey, err && err.message);
      }
    }
  }

  migrateLegacyStore();
  try { window.storeKey = PRIMARY_STORE_KEY; } catch(_){ /* ignore */ }

  const defaultState = {
    storage: { mode: 'firebase', appId: 'doors-demo', userId: 'hala-1', fbConfig: {} },
    employees: [],
    operationsCatalog: [],
    processes: [],
    orders: [],
    tasks: [],
    taskProcessMap: {}, // Nowe powiązanie między zadaniami a procesami
    taskOrderMap: {},   // Nowe powiązanie między zadaniami a zleceniami
    after: [],
    page: 'dash',
    _timers: {},
    _resourceConflicts: [],
    scheduleConfig: {
      mode: 'perEmployee',
      workdayStartHour: 8,
      workdayLengthHours: 8,
      offWeekdays: [0, 6],
      holidays: [],
      autoAssignEmployees: true,
      allowOvertime: false
    }
  };
  const storeKey = PRIMARY_STORE_KEY;
  let state = {};

  function extractLegacyStateCandidates(raw, legacyKey){
    const candidates = [];
    const pushCandidate = (candidate)=>{
      if (candidate && typeof candidate === 'object') {
        candidates.push(candidate);
      }
    };

    const maybeParseString = (value)=>{
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch(_){ return null; }
      }
      return value;
    };

    const handleEntry = (entry)=>{
      if (!entry || typeof entry !== 'object') return;
      if (entry.data !== undefined) {
        let data = entry.data;
        if (entry.compressed && typeof data === 'string' && window.LZString && typeof window.LZString.decompressFromUTF16 === 'function'){
          try {
            data = window.LZString.decompressFromUTF16(data);
          } catch(decompressErr){
            console.warn('[store-migrate] decompress failed for', legacyKey, decompressErr && decompressErr.message);
            data = null;
          }
        }
        data = maybeParseString(data);
        if (data && typeof data === 'object') {
          pushCandidate(data);
        }
      } else {
        pushCandidate(entry);
      }
    };

    const parsed = maybeParseString(raw);
    if (!parsed) return candidates;

    if (Array.isArray(parsed)){
      parsed.forEach(handleEntry);
    } else {
      handleEntry(parsed);
    }

    return candidates;
  }

  function mergeLegacyState(targetState){
    const orders = Array.isArray(targetState.orders) ? targetState.orders : (targetState.orders = []);
    const afterList = Array.isArray(targetState.after) ? targetState.after : (targetState.after = []);
    const orderMap = new Map();
    orders.forEach(order => {
      if (!order) return;
      normalizeOrderShape(order);
      if (order.id) orderMap.set(order.id, order);
    });
    const afterIdMap = new Map();
    afterList.forEach(entry => {
      if (!entry) return;
      normalizeAfterEntry(entry);
      if (entry.id) afterIdMap.set(entry.id, entry);
    });

    let mergedOrders = 0;
    let updatedOrders = 0;
    let mergedAfter = 0;
    let updatedAfter = 0;

    const importantOrderFields = ['phone','postalCode','leadEmployeeId','notes','client','model','address','startDate','endDate','installDate','processId'];
    const importantAfterFields = ['phone','postalCode','desc','leadEmployeeId','installDate','departTime','visitTime','hours','status','employeeIds'];

    LEGACY_STORE_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      let legacyStates;
      try {
        legacyStates = extractLegacyStateCandidates(raw, key);
      } catch(parseErr){
        console.warn('[store-migrate] nie można odczytać danych z', key, parseErr && parseErr.message);
        legacyStates = [];
      }
      legacyStates.forEach(legacyState => {
          (Array.isArray(legacyState?.orders) ? legacyState.orders : []).forEach(ord => {
          const normalizedOrder = normalizeOrderShape(ord ? Object.assign({}, ord) : ord);
          if (!normalizedOrder || !normalizedOrder.id) return;
          const current = orderMap.get(normalizedOrder.id);
        if (!current){
            const inserted = normalizeOrderShape(Object.assign({}, normalizedOrder));
            orders.push(inserted);
            orderMap.set(inserted.id, inserted);
          mergedOrders++;
          return;
        }
          normalizeOrderShape(current);
        let changed = false;
        importantOrderFields.forEach(field => {
            if ((!current[field] || (typeof current[field] === 'string' && !current[field].trim())) && normalizedOrder[field]){
              current[field] = normalizedOrder[field];
            changed = true;
          }
        });
        if (changed) updatedOrders++;
      });
          (Array.isArray(legacyState?.after) ? legacyState.after : []).forEach(entry => {
            const normalizedEntry = normalizeAfterEntry(entry ? Object.assign({}, entry) : entry);
            if (!normalizedEntry || !normalizedEntry.id) return;
            const current = afterIdMap.get(normalizedEntry.id);
          if (!current){
              const insertedAfter = normalizeAfterEntry(Object.assign({}, normalizedEntry));
              afterList.push(insertedAfter);
              afterIdMap.set(insertedAfter.id, insertedAfter);
            mergedAfter++;
            return;
          }
            normalizeAfterEntry(current);
          let changed = false;
          importantAfterFields.forEach(field => {
              if ((!current[field] || (typeof current[field] === 'string' && !current[field].trim())) && normalizedEntry[field]){
                current[field] = normalizedEntry[field];
              changed = true;
            }
          });
            if (Array.isArray(normalizedEntry.employeeIds) && (!Array.isArray(current.employeeIds) || current.employeeIds.length === 0)){
              current.employeeIds = normalizedEntry.employeeIds.slice();
            changed = true;
          }
          if (changed) updatedAfter++;
        });
      });
    });

    return { mergedOrders, updatedOrders, mergedAfter, updatedAfter };
  }

  function hydrateAfterFromOrders(targetState){
    const orders = Array.isArray(targetState.orders) ? targetState.orders : [];
    const afterList = Array.isArray(targetState.after) ? targetState.after : [];
    if (!orders.length || !afterList.length) return 0;
    
    const orderMap = new Map();
    orders.forEach(order => {
      if (!order) return;
      normalizeOrderShape(order);
      if (order.id) orderMap.set(order.id, order);
    });
    
    let updated = 0;
    afterList.forEach(entry => {
      if (!entry) return;
      normalizeAfterEntry(entry);
      if (!entry.order) return;
      
      const order = orderMap.get(entry.order);
      if (!order) return;
      
      let changed = false;
      
      const phoneVal = order.phone || firstNonEmpty(order, ['tel', 'phoneNumber', 'contactPhone']);
      if ((!entry.phone || (typeof entry.phone === 'string' && !entry.phone.trim())) && phoneVal){ 
        entry.phone = typeof phoneVal === 'string' ? phoneVal : String(phoneVal); 
        changed = true; 
      }
      
      const postalVal = order.postalCode || firstNonEmpty(order, ['post', 'zip', 'zipCode', 'postal_code', 'placeCode', 'placecode']);
      if ((!entry.postalCode || (typeof entry.postalCode === 'string' && !entry.postalCode.trim())) && postalVal){ 
        entry.postalCode = typeof postalVal === 'string' ? postalVal : String(postalVal); 
        changed = true; 
      }
      
      const leadVal = order.leadEmployeeId || firstNonEmpty(order, ['lead', 'leadId', 'salesRepId', 'handlowiecId']);
      if ((!entry.leadEmployeeId || (typeof entry.leadEmployeeId === 'string' && !entry.leadEmployeeId.trim())) && leadVal){ 
        entry.leadEmployeeId = leadVal; 
        changed = true; 
      }
      
      const notesVal = order.notes || firstNonEmpty(order, ['description', 'desc', 'comment', 'remarks']);
      if ((!entry.desc || (typeof entry.desc === 'string' && !entry.desc.trim())) && notesVal){ 
        entry.desc = typeof notesVal === 'string' ? notesVal : String(notesVal); 
        changed = true; 
      }
      
      if (changed) updated++;
    });
    
    return updated;
  }

  function hydrateOrdersFromAfter(targetState){
    const orders = Array.isArray(targetState.orders) ? targetState.orders : [];
    const afterList = Array.isArray(targetState.after) ? targetState.after : [];
    if (!orders.length || !afterList.length) return 0;
    const afterMap = new Map();
    afterList.forEach(entry => {
      if (!entry) return;
      normalizeAfterEntry(entry);
      if (entry.order && !afterMap.has(entry.order)){
        afterMap.set(entry.order, entry);
      }
    });
    let updated = 0;
    orders.forEach(order => {
      if (!order) return;
      normalizeOrderShape(order);
      if (!order.id) return;
      const ref = afterMap.get(order.id);
      if (!ref) return;
      let changed = false;
      const phoneVal = ref.phone || firstNonEmpty(ref, ['tel', 'phoneNumber', 'contactPhone']);
      if ((!order.phone || !order.phone.trim()) && phoneVal){ order.phone = typeof phoneVal === 'string' ? phoneVal : String(phoneVal); changed = true; }
      const postalVal = ref.postalCode || firstNonEmpty(ref, ['post', 'zip', 'zipCode', 'postal_code', 'placeCode', 'placecode']);
      if ((!order.postalCode || !order.postalCode.trim()) && postalVal){ order.postalCode = typeof postalVal === 'string' ? postalVal : String(postalVal); changed = true; }
      const leadVal = ref.leadEmployeeId || firstNonEmpty(ref, ['lead', 'leadId', 'salesRepId', 'handlowiecId']);
      if ((!order.leadEmployeeId || !order.leadEmployeeId.trim()) && leadVal){ order.leadEmployeeId = leadVal; changed = true; }
      const notesVal = ref.desc || ref.notes || firstNonEmpty(ref, ['description', 'comment', 'remarks']);
      if ((!order.notes || !order.notes.trim()) && notesVal){ order.notes = typeof notesVal === 'string' ? notesVal : String(notesVal); changed = true; }
      if (changed) updated++;
    });
    return updated;
  }
  function loadState(){ 
    try{ 
      const raw = localStorage.getItem(storeKey); 
      state = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultState));
      // Upewnij się że kluczowe tablice istnieją
      if (!Array.isArray(state.tasks)) state.tasks = [];
      if (!Array.isArray(state.orders)) state.orders = [];
      if (!Array.isArray(state.processes)) state.processes = [];
      if (!Array.isArray(state.after)) state.after = [];
    if (!Array.isArray(state._resourceConflicts)) state._resourceConflicts = [];
      if (!state.scheduleConfig) {
        state.scheduleConfig = JSON.parse(JSON.stringify(defaultState.scheduleConfig));
      } else {
        state.scheduleConfig = Object.assign(
          JSON.parse(JSON.stringify(defaultState.scheduleConfig)),
          state.scheduleConfig
        );
        if (!Array.isArray(state.scheduleConfig.offWeekdays)) state.scheduleConfig.offWeekdays = [0, 6];
        if (!Array.isArray(state.scheduleConfig.holidays)) state.scheduleConfig.holidays = [];
      }
      console.log('[store-migrate] rozpoczynam migrację danych...');
      const mergeStats = mergeLegacyState(state);
      console.log('[store-migrate] mergeLegacyState done:', mergeStats);
      const hydratedAfter = hydrateAfterFromOrders(state);
      console.log('[store-migrate] hydrateAfterFromOrders done:', hydratedAfter);
      const hydratedOrders = hydrateOrdersFromAfter(state);
      console.log('[store-migrate] hydrateOrdersFromAfter done:', hydratedOrders);
      const shouldPersist = (mergeStats.mergedOrders + mergeStats.updatedOrders + mergeStats.mergedAfter + mergeStats.updatedAfter + hydratedAfter + hydratedOrders) > 0;
      if (shouldPersist){
        try {
          localStorage.setItem(storeKey, safeStringify(state));
          console.log('[store-migrate] zmiany po inicjalizacji', {
            mergedOrders: mergeStats.mergedOrders,
            updatedOrders: mergeStats.updatedOrders,
            mergedAfter: mergeStats.mergedAfter,
            updatedAfter: mergeStats.updatedAfter,
            hydratedAfter,
            hydratedOrders
          });
        } catch(syncErr){
          console.warn('[store-migrate] błąd zapisu po uzupełnieniu danych', syncErr && syncErr.message);
        }
      }
      console.log('Stan załadowany:', {
        tasksLength: state.tasks.length,
        ordersLength: state.orders.length,
        processesLength: state.processes.length
      });
    } catch(e){ 
      console.error('Błąd ładowania stanu:', e);
      state = JSON.parse(JSON.stringify(defaultState)); 
    } 
    return state;
  }
  
  function saveState(shouldSaveToDb = false){ 
    try{ 
      // Sprawdź czy kluczowe pola są tablicami
      if (!Array.isArray(state.tasks)) {
        console.error('state.tasks nie jest tablicą przed zapisem!', state.tasks);
        state.tasks = [];
      }
      
  localStorage.setItem(storeKey, safeStringify(state));
      console.log('Stan zapisany:', {
        tasksLength: state.tasks.length,
        ordersLength: (state.orders || []).length
      });
    } catch(e){ 
      console.error('Błąd zapisu stanu:', e);
    };
    
    if(shouldSaveToDb && state.storage && state.storage.mode === 'firebase'){
      clearTimeout(state._dbSaveTimeout);
      state._dbSaveTimeout = setTimeout(()=>{ 
        if(window.handleSaveToDB) window.handleSaveToDB(); 
      }, 1200);
    }
  }
  function getState(){ return state; }
  function setState(s){ state = s || {}; saveState(); }
  function updateTaskMappings(taskId, processId, orderId) {
    if (!state.taskProcessMap) state.taskProcessMap = {};
    if (!state.taskOrderMap) state.taskOrderMap = {};

    state.taskProcessMap[taskId] = processId;
    state.taskOrderMap[taskId] = orderId;
    saveState(true); // Zapisz zmiany w Firebase
  }

  function autoSyncTasks() {
    setInterval(() => {
      if (state.storage.mode === 'firebase') {
        saveState(true);
      }
    }, 5000); // Synchronizacja co 5 sekund
  }

  // Funkcja generowania danych testowych
  function createTestData() {
    // Nie resetuj całkowicie stanu - tylko dodaj brakujące dane
    if (!state.employees || state.employees.length === 0) {
      state.employees = [
        { id: 'emp1', name: 'Jan', role: 'operator' },
        { id: 'emp2', name: 'Anna', role: 'operator' }
      ];
    }
    
    if (!state.operationsCatalog || state.operationsCatalog.length === 0) {
      state.operationsCatalog = [
        { id: 'op1', name: 'Cięcie', time: 30 },
        { id: 'op2', name: 'Montaż', time: 45 }
      ];
    }
    
    if (!state.processes || state.processes.length === 0) {
      state.processes = [
        { 
          id: 'proc1', 
          name: 'Standardowy montaż',
          operations: [
            { id: 'op1', name: 'Cięcie', time: 30, assignee: 'emp1' },
            { id: 'op2', name: 'Montaż', time: 45, assignee: 'emp2' }
          ]
        }
      ];
    }
    
    if (!state.orders || state.orders.length === 0) {
      state.orders = [
        {
          id: 'ord1',
          name: 'Zamówienie testowe #1',
          processId: 'proc1',
          quantity: 2,
          tasksGenerated: true // Oznacz jako wygenerowane, żeby nie można było duplikować
        }
      ];
    }
    
    // Konfiguracja harmonogramu
    if (!state.scheduleConfig) {
      state.scheduleConfig = JSON.parse(JSON.stringify(defaultState.scheduleConfig));
    } else {
      state.scheduleConfig = Object.assign(
        JSON.parse(JSON.stringify(defaultState.scheduleConfig)),
        state.scheduleConfig
      );
      if (!Array.isArray(state.scheduleConfig.offWeekdays)) state.scheduleConfig.offWeekdays = [0, 6];
      if (!Array.isArray(state.scheduleConfig.holidays)) state.scheduleConfig.holidays = [];
    }

    // Generuj zadania tylko jeśli nie ma żadnych zadań
    if ((!state.tasks || state.tasks.length === 0) && window.scheduleCore) {
      console.log('Generuję zadania z zamówień...');
      
      // Najpierw wygeneruj zadania z zamówień
      state.orders.forEach(order => {
        if (!order.tasksGenerated) {
          const tasksForOrder = window.scheduleCore.generateTasksForOrder(order, state);
          if (!state.tasks) state.tasks = [];
          state.tasks.push(...tasksForOrder);
          order.tasksGenerated = true;
        }
      });
      
      console.log('Generuję harmonogram...');
      window.scheduleCore.generateSchedule(state, {force: true});

      // Upewnij się że zadania mają daty
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      (state.tasks || []).forEach((task, i) => {
        if (!task.startPlanned) {
          task.startPlanned = now + (i * dayMs);
          task.endPlanned = task.startPlanned + (task.estMin * 60 * 1000);
        }
      });
    }

    saveState(true);
    
    console.log('Dane testowe zaktualizowane:', {
      employees: state.employees.length,
      operations: state.operationsCatalog.length,
      processes: state.processes.length,
      orders: state.orders.length,
      tasks: (state.tasks||[]).length
    });

    // Odśwież UI zamiast strony
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof renderOrderPage === 'function') renderOrderPage();
    if (typeof renderDash === 'function') renderDash(window.state || state);
    if (typeof renderGantt === 'function') renderGantt();
  }

  // expose
  // keep compatibility: window.store is the state object, but also provide helper methods
  window.store = state;
  // attach helper methods directly onto the state object (backwards + forwards compatibility)
  try{ 
    window.store.load = loadState; 
    window.store.save = saveState; 
    window.store.get = getState; 
    window.store.set = setState;
    window.store.createTestData = createTestData; // Dodaj do store
  }catch(e){ /* ignore */ }
  // also provide global aliases
  window.loadState = loadState;
  window.saveState = saveState;

  // initialize
  loadState();
  // Uruchom automatyczną synchronizację
  autoSyncTasks();
})();
