// js/schedule.js
// Szkielet modułu planowania (Faza 1 - kroki A/B)
// Cel: generowanie zadań z procesów oraz przypisanie im wstępnych czasów start/end.
// Ten moduł jest celowo prosty i pozbawiony zależności od DOM.

(function(global){
  'use strict';

  /**
   * Struktura docelowa taska (po rozszerzeniu):
   * {
   *   id: string,
   *   orderId: string,
   *   processId: string,
   *   operationId: string,
   *   name: string,
   *   duration: number (minuty),
   *   startPlanned: number|null (timestamp ms),
   *   endPlanned: number|null (timestamp ms),
   *   dependsOn: string[] (lista taskId),
   *   critical: boolean,
   *   seq: number (kolejność w procesie),
   *   qty: number
   * }
   */

  /** Utility: generuje losowy id jeśli brak globalnego uid */
  function genId(prefix){
    if(global.uid) return global.uid(prefix||'t');
    return (prefix||'t') + '-' + Math.random().toString(36).slice(2,9);
  }

  /** Oblicza duration dla operacji
   * Na razie: operation.time * (order.quantity || 1)
   * TODO: uwzględnić liczbę pracowników, równoległość, kalendarz.
   */
  function computeDuration(operation, order){
    if(!operation) return 0;
    const base = Number(operation.time)||0; // zakładam pole time (min)
    const qty = Number(order && order.quantity)||1;
    return base * qty;
  }

  /** Generuje taski z process sequence.
   * Założenie: process ma pole operationsSequence (array operationId) ALBO
   * fallback: bierz wszystkie operationsCatalog które nie mają filtera.
   * Na teraz: jeśli processId wskazuje brak dedykowanej listy, generuj 1 task pseudo-procesu.
   */
  function generateTasksForOrder(order, state){
    if(!order || !order.id) return [];
    const list = [];
    const processId = order.processId || null;
    const operationsCatalog = state.operationsCatalog || [];

    // Jeśli nie ma procesu, zwróć pustą listę
    if (!processId) return [];
    
    // Znajdź proces
    const process = (state.processes || []).find(p => p.id === processId);
    if (!process || !process.operations || !process.operations.length) return [];
    
    // Generuj zadania tylko z operacji w procesie
    let seq = 1;
    process.operations.forEach(op => {
      const task = {
        id: genId('task'),
        orderId: order.id,
        processId: processId,
        operationId: op.id,
        name: op.name,
        duration: computeDuration(op, order),
        startPlanned: null,
        endPlanned: null,
        dependsOn: [], // w prostym modelu liniowym wypełnimy później
        critical: false,
        seq: seq++,
        qty: order.quantity || 1,
        // Pola kompatybilności z UI
        status: 'todo',
        opName: op.name,
        estMin: computeDuration(op, order),
        assignees: op.assignee ? [op.assignee] : []
      };
      list.push(task);
    });

    // Dodaj zależności liniowe (task i zależy od i-1)
    for(let i=1; i<list.length; i++) {
      list[i].dependsOn.push(list[i-1].id);
    }
    
    return list;
  }

  /**
   * Prosta heurystyka: układa liniowo wg seq w czasie ciągłym od teraz.
   * startTime = max(ready poprzedników), end = start + duration*60000.
   */
  function scheduleSequential(tasks, state){
    // Filtruj tylko zadania bez czasów
    tasks = tasks.filter(t => !t.startPlanned || !t.endPlanned);
    if(!tasks.length) return;
    
    const byId = Object.fromEntries(tasks.map(t=>[t.id,t]));
    const cfg = (state && state.scheduleConfig) || { workdayStartHour:8, workdayLengthHours:8 };
    console.log('[scheduleSequential] cfg:', cfg, 'tasks count:', tasks.length);
    // Domyślnie weekend (6=sobota, 0=niedziela) jeśli nie zdefiniowano dni wolnych
    const offWeekdays = cfg.offWeekdays ? cfg.offWeekdays.map(Number) : [6,0]; // 0=Nd ... 6=So
    const holidays = Array.isArray(cfg.holidays) ? cfg.holidays : [];
    const dayMs = 24*3600*1000;
    const startHour = Number(cfg.workdayStartHour)||8;
    const lenH = Number(cfg.workdayLengthHours)||8;
    const endHour = startHour + lenH;

    function isHolidayDate(d){
      const y = d.getFullYear();
      const m = (d.getMonth()+1).toString().padStart(2,'0');
      const day = d.getDate().toString().padStart(2,'0');
      const key = `${y}-${m}-${day}`;
      return holidays.indexOf(key) !== -1;
    }

    function nextWorkingDay(d){
      while(true){
        // Sprawdź czy dzień jest wolny tylko jeśli jest w konfiguracji offWeekdays
        const wd = d.getDay();
        const isWorkingDay = (
          // Jeśli offWeekdays jest puste - wszystkie dni są pracujące
          !offWeekdays.length || 
          // Inaczej - sprawdź czy dzień nie jest w liście dni wolnych
          offWeekdays.indexOf(wd) === -1
        );
        
        // Sprawdź święta niezależnie od konfiguracji dni tygodnia
        if(isWorkingDay && !isHolidayDate(d)) return d;
        
        // Przejdź do następnego dnia
        d.setDate(d.getDate()+1);
        d.setHours(startHour,0,0,0);
      }
    }

    function alignToWorkday(ts){
      const d = new Date(ts);
      // Jeśli przed startem – ustaw początek
      if(d.getHours() < startHour){ d.setHours(startHour,0,0,0); }
      // Jeśli po końcu – przeskocz na kolejny dzień start
      if(d.getHours() >= endHour){ d.setDate(d.getDate()+1); d.setHours(startHour,0,0,0); }
      // Jeśli dzień wolny / święto – iteruj
      nextWorkingDay(d);
      return d.getTime();
    }

    let cursor = alignToWorkday(Date.now());
    const debug = [];
    tasks.forEach(t=>{
      if(t.dependsOn && t.dependsOn.length){
        let ready = 0;
        t.dependsOn.forEach(did=>{ const dt = byId[did]; if(dt && dt.endPlanned) ready = Math.max(ready, dt.endPlanned); });
        cursor = Math.max(cursor, ready);
      }
      cursor = alignToWorkday(cursor);
      let remaining = (t.duration||0) * 60000; // ms
      let start = cursor;
      let end = start;
      while(remaining > 0){
        const blockEnd = (()=>{ const d=new Date(end); d.setHours(endHour,0,0,0); return d.getTime(); })();
        // Jeżeli koniec dnia wpada w dzień wolny kolejny – i tak skok zrobi alignToWorkday
        const capacity = blockEnd - end; // ms left in current workday
        if(remaining <= capacity){ end += remaining; remaining = 0; }
        else { end = blockEnd; remaining -= capacity; // jump to next day start
          const nd = new Date(end); nd.setDate(nd.getDate()+1); nd.setHours(startHour,0,0,0); nextWorkingDay(nd); end = nd.getTime(); }
      }
      t.startPlanned = start;
      t.endPlanned = end;
      cursor = end;
      debug.push({id:t.id.slice(-4), start:new Date(start).toISOString().slice(0,10), wd:new Date(start).getDay(), off: offWeekdays.includes(new Date(start).getDay()), holiday: holidays.includes(new Date(start).toISOString().slice(0,10))});
    });
    if(debug.length){ try{ console.log('[scheduleSequential]', {cfg, first:debug[0], sample:debug.slice(0,5)}); }catch(_){} }
    return tasks;
  }

  /** Główna funkcja harmonogramu.
   * - Pobiera wszystkie tasks bez startPlanned
   * - Nadaje czasy sekwencyjnie
   * (Później: per pracownik, równoległość, krytyczna ścieżka)
   */
  function generateSchedule(state, opts){
    console.log('[generateSchedule] start');
    try {
      if(!state || !Array.isArray(state.tasks)) {
        console.warn('[generateSchedule] no state or tasks array');
        return;
      }

      opts = opts || {};
      const force = !!opts.force;
      const onlyOrderId = opts.onlyOrderId || null;
      
      // Upewnij się, że pracujemy na kopii zadań
      const tasks = [...state.tasks];
      
      // Dodaj szczegółowe logowanie
      console.log('[generateSchedule] initial state:', {
        totalTasks: tasks.length,
        taskIds: tasks.map(t => t.id),
        force: force,
        onlyOrderId: onlyOrderId
      });

      // Filtruj zadania
      let target = tasks;
      if (onlyOrderId) {
        target = target.filter(t => t.orderId === onlyOrderId);
        console.log(`[generateSchedule] filtered for order ${onlyOrderId}:`, target.length, 'tasks');
      }

      // Zresetuj planowanie jeśli wymuszono
      if (force) {
        console.log('[generateSchedule] force reset planning for', target.length, 'tasks');
        target.forEach(t => {
          t.startPlanned = null;
          t.endPlanned = null;
        });
      }

      // Znajdź zadania do zaplanowania
      const pending = target.filter(t => !t.startPlanned || force);
      
      console.log('[generateSchedule] tasks to schedule:', {
        targetTasks: target.length,
        pendingTasks: pending.length,
        pendingIds: pending.map(t => t.id)
      });
      // Przelicz tylko jeśli są zadania do zaplanowania
      if (pending.length > 0) {
        const scheduled = scheduleSequential(pending, state);
        
        // Zaktualizuj oryginalne zadania w state
        scheduled.forEach(newTask => {
          const index = state.tasks.findIndex(t => t.id === newTask.id);
          if (index !== -1) {
            // Aktualizuj tylko daty planowania, zachowaj resztę
            state.tasks[index].startPlanned = newTask.startPlanned;
            state.tasks[index].endPlanned = newTask.endPlanned;
          }
        });
        
        console.log('[generateSchedule] scheduling complete:', {
          scheduledTasks: scheduled.length,
          scheduledIds: scheduled.map(t => t.id)
        });
      }

      computeCriticalPath(state);
      return pending.length;
    } catch(e) {
      console.error('[generateSchedule] error:', e);
      return 0;
    }
  }

  // Prosty algorytm krytycznej ścieżki dla liniowej/sekwencyjnej zależności
  function computeCriticalPath(state){
    try{
      const tasks = (state.tasks||[]).slice().filter(t=>t.startPlanned && t.endPlanned);
      if(!tasks.length){ return; }
      // Latest finish = max end
      const projectEnd = Math.max(...tasks.map(t=>t.endPlanned));
      // Slack = (projectEnd - endPlanned) w liniowym modelu (bo brak równoległości na razie)
      tasks.forEach(t=>{
        t.slackMs = projectEnd - t.endPlanned;
        t.critical = (t.slackMs === 0);
      });
    }catch(e){ /* ignore */ }
  }

  /** Migracja istniejących tasków – dodaje brakujące pola */
  function migrateTasks(state){
    if(!state || !Array.isArray(state.tasks)) return;
    state.tasks.forEach(t=>{
      if(typeof t.startPlanned === 'undefined') t.startPlanned = null;
      if(typeof t.endPlanned === 'undefined') t.endPlanned = null;
      if(!Array.isArray(t.dependsOn)) t.dependsOn = [];
      if(typeof t.critical === 'undefined') t.critical = false;
      if(typeof t.seq === 'undefined') t.seq = 0;
    });
  }

  // Public API
  const api = { computeDuration, generateTasksForOrder, generateSchedule, migrateTasks, scheduleSequential, computeCriticalPath };
  global.scheduleCore = api;
  console.log('schedule.js loaded, window.scheduleCore:', !!global.scheduleCore);

})(window);
