// js/store.js
// Minimalny store API dla modularnej i inline wersji aplikacji
(function(){
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
    _timers: {}
  };
  const storeKey = window.storeKey || 'door_v5627_state';
  let state = {};
  function loadState(){ 
    try{ 
      const raw = localStorage.getItem(storeKey); 
      state = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultState));
      // Upewnij się, że kluczowe tablice istnieją
      if (!Array.isArray(state.tasks)) state.tasks = [];
      if (!Array.isArray(state.orders)) state.orders = [];
      if (!Array.isArray(state.processes)) state.processes = [];
      
      // Migracja: upewnij się, że taskProcessMap i taskOrderMap istnieją
      if (!state.taskProcessMap) state.taskProcessMap = {};
      if (!state.taskOrderMap) state.taskOrderMap = {};
      
      // Migracja: wypełnij taskProcessMap i taskOrderMap z istniejących zadań
      state.tasks.forEach(task => {
        if (task.processId && !state.taskProcessMap[task.id]) {
          state.taskProcessMap[task.id] = task.processId;
        }
        if (task.orderId && !state.taskOrderMap[task.id]) {
          state.taskOrderMap[task.id] = task.orderId;
        }
      });
      
      console.log('Stan załadowany:', {
        tasksLength: state.tasks.length,
        ordersLength: state.orders.length,
        processesLength: state.processes.length,
        taskMappingsCount: Object.keys(state.taskProcessMap).length
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
      
      localStorage.setItem(storeKey, JSON.stringify(state));
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
    // Validate inputs
    if (!taskId) {
      console.warn('[updateTaskMappings] taskId is required');
      return;
    }
    
    if (!state.taskProcessMap) state.taskProcessMap = {};
    if (!state.taskOrderMap) state.taskOrderMap = {};

    // Only update if values are provided
    if (processId) {
      state.taskProcessMap[taskId] = processId;
    }
    if (orderId) {
      state.taskOrderMap[taskId] = orderId;
    }
    
    // Note: Don't call saveState here to avoid performance issues with batch operations.
    // Caller must call saveState() after batch updates.
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
      state.scheduleConfig = {
        workdayStartHour: 8,
        workdayLengthHours: 8,
        offWeekdays: [0,6] // niedziela, sobota
      };
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
    window.store.updateTaskMappings = updateTaskMappings; // Export updateTaskMappings
  }catch(e){ /* ignore */ }
  // also provide global aliases
  window.loadState = loadState;
  window.saveState = saveState;
  window.updateTaskMappings = updateTaskMappings;

  // initialize
  loadState();
  // Uruchom automatyczną synchronizację
  autoSyncTasks();
})();
