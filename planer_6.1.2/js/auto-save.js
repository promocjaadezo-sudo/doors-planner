// js/auto-save.js
// Lekki menedzer autozapisu, ktory pilnuje stanu aplikacji i tworzy kopie bez udzialu uzytkownika
(function(window, document){
  if (!window) return;

  var AUTO_SAVE_INTERVAL = 20000; // 20 sekund miedzy kolejnymi kontrolami
  var BACKUP_INTERVAL = 5 * 60 * 1000; // co 5 minut dopuszczamy dodatkowy backup
  var lastSnapshot = null;
  var lastBackupTime = 0;
  var manualDirty = false;

  function resolveStoreState(){
    var storeRef = window.store;
    if (!storeRef) return null;

    try {
      if (typeof storeRef.get === 'function') return storeRef.get();
      if (typeof storeRef.getState === 'function') return storeRef.getState();
    } catch(err) {
      console.warn('[auto-save] Nie udalo sie pobrac stanu ze store', err);
    }

    return storeRef;
  }

  function resolveCentralState(){
    var central = window.centralnyMagazyn;
    if (!central) return null;
    try {
      if (typeof central.getStan === 'function') return central.getStan();
    } catch(err) {
      console.warn('[auto-save] Nie udalo sie pobrac stanu z Centralnego Magazynu', err);
    }
    return null;
  }

  function buildSnapshot(){
    var snapshot = { version: window.APP_VERSION || 'auto' };

    var storeState = resolveStoreState();
    if (storeState) {
      snapshot.store = {
        orders: storeState.orders || [],
        tasks: storeState.tasks || [],
        processes: storeState.processes || [],
        after: storeState.after || [],
        employees: storeState.employees || [],
        scheduleConfig: storeState.scheduleConfig || {}
      };
    }

    var centralState = resolveCentralState();
    if (centralState) {
      snapshot.central = centralState;
    }

    try {
      return JSON.stringify(snapshot);
    } catch(err) {
      console.warn('[auto-save] Serializacja stanu nie powiodla sie', err);
      return null;
    }
  }

  function runSave(reason){
    if (typeof window.saveState === 'function') {
      try {
        window.saveState(true);
      } catch(err) {
        console.error('[auto-save] Blad podczas zapisu glownego store', err);
      }
    }

    if (window.centralnyMagazyn && typeof window.centralnyMagazyn.save === 'function') {
      try {
        window.centralnyMagazyn.save();
      } catch(err) {
        console.warn('[auto-save] Nie udalo sie zapisac centralnego magazynu', err);
      }
    }

    if (window.BackupManager && Date.now() - lastBackupTime > BACKUP_INTERVAL) {
      try {
        window.BackupManager.create(reason || 'auto-save');
        lastBackupTime = Date.now();
      } catch(err) {
        console.warn('[auto-save] Nie udalo sie stworzyc kopii zapasowej', err);
      }
    }
  }

  function checkAndSave(force){
    var snapshot = buildSnapshot();
    if (!snapshot) return;

    if (force || manualDirty || snapshot !== lastSnapshot) {
      lastSnapshot = snapshot;
      manualDirty = false;
      runSave(force ? 'auto-save-forced' : 'auto-save');
      console.log('[auto-save] Stan zapisany automatycznie', { force: !!force });
    }
  }

  function tick(){
    try {
      checkAndSave(false);
    } finally {
      schedule();
    }
  }

  function schedule(){
    window.setTimeout(tick, AUTO_SAVE_INTERVAL);
  }

  function bootstrap(){
    // Poczekaj az store zostanie zainicjalizowany
    if (!resolveStoreState()) {
      window.setTimeout(bootstrap, 1000);
      return;
    }
    lastSnapshot = buildSnapshot();
    schedule();
  }

  // Publiczne API do recznego oznaczenia zmian
  window.AutoSaveManager = {
    trigger: function(){ checkAndSave(true); },
    markDirty: function(){ manualDirty = true; }
  };

  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') {
      checkAndSave(true);
    }
  });

  window.addEventListener('beforeunload', function(){
    checkAndSave(true);
  });

  bootstrap();

})(window, document);
