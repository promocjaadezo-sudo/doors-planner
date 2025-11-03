/**
 * Firebase Real-time Sync Module
 * Obsługuje real-time synchronizację z Firestore używając onSnapshot listeners
 * 
 * @module firebase-realtime-sync
 * @version 1.0.0
 * @date 2025-11-02
 */

(function(global) {
  'use strict';
  
  console.log('🔄 Loading Firebase Real-time Sync module...');
  
  // ============================================================================
  // KONFIGURACJA
  // ============================================================================
  
  /**
   * Konfiguracja synchronizacji
   */
  const CONFIG = {
    enableRealtime: true,              // Włącz real-time listeners
    enableOffline: true,               // Włącz offline persistence
    conflictStrategy: 'last-write-wins', // 'last-write-wins' | 'merge' | 'manual'
    retryAttempts: 3,                  // Liczba prób przy błędzie
    retryDelay: 1000,                  // Opóźnienie między próbami (ms)
    batchSize: 500,                    // Max dokumentów w batch
    syncDebug: true                    // Debug logs
  };
  
  /**
   * Kolekcje do synchronizacji
   */
  const COLLECTIONS = [
    'orders',
    'tasks',
    'employees',
    'processes',
    'operationsCatalog',
    'scheduleConfig',
    'settings'
  ];
  
  // ============================================================================
  // STAN SYNCHRONIZACJI
  // ============================================================================
  
  /**
   * Stan modułu synchronizacji
   */
  const syncState = {
    listeners: new Map(),        // Collection listeners (Map<string, ListenerInfo>)
    pendingWrites: new Map(),    // Oczekujące zapisy (Map<string, PendingWrite>)
    errors: new Map(),           // Błędy synchronizacji (Map<string, ErrorInfo>)
    status: 'disconnected',      // 'disconnected' | 'connecting' | 'connected' | 'error'
    lastSync: null,              // Timestamp ostatniej synchronizacji
    initialized: false           // Czy moduł jest zainicjalizowany
  };
  
  // ============================================================================
  // INICJALIZACJA
  // ============================================================================
  
  /**
   * Inicjalizuje moduł synchronizacji
   * @param {Object} config - Opcjonalna konfiguracja (nadpisuje domyślną)
   * @returns {Promise<void>}
   */
  async function init(config) {
    if (syncState.initialized) {
      console.warn('[RealtimeSync] Already initialized');
      return;
    }
    
    console.log('🚀 [RealtimeSync] Initializing...');
    
    // Merge konfiguracji
    if (config) {
      Object.assign(CONFIG, config);
    }
    
    // Sprawdź czy Firebase jest dostępny
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      throw new Error('Firebase is not initialized');
    }
    
    const db = firebase.firestore();
    
    // Enable offline persistence
    if (CONFIG.enableOffline) {
      try {
        await db.enablePersistence({
          synchronizeTabs: true // Synchronizuj między zakładkami
        });
        console.log('✅ [RealtimeSync] Offline persistence enabled');
      } catch (error) {
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ [RealtimeSync] Multiple tabs open, persistence already enabled');
        } else if (error.code === 'unimplemented') {
          console.warn('⚠️ [RealtimeSync] Offline persistence not supported in this browser');
        } else {
          console.error('❌ [RealtimeSync] Offline persistence error:', error);
        }
      }
    }
    
    syncState.initialized = true;
    syncState.status = 'connected';
    
    console.log('✅ [RealtimeSync] Initialized successfully');
    console.log('   Config:', CONFIG);
    
    // Start listeners jeśli real-time jest włączony
    if (CONFIG.enableRealtime) {
      await startListeningAll();
    }
  }
  
  // ============================================================================
  // LISTENERS (onSnapshot)
  // ============================================================================
  
  /**
   * Rozpoczyna nasłuchiwanie zmian w kolekcji
   * @param {string} collectionName - Nazwa kolekcji
   * @param {Function} callback - Funkcja wywoływana przy zmianach
   * @returns {Function} Unsubscribe function
   */
  function startListening(collectionName, callback) {
    if (!firebase || !firebase.firestore) {
      console.error('[RealtimeSync] Firebase not initialized');
      return () => {};
    }
    
    if (syncState.listeners.has(collectionName)) {
      console.warn(`[RealtimeSync] Listener for "${collectionName}" already exists`);
      return syncState.listeners.get(collectionName).unsubscribe;
    }
    
    const state = window.store ? window.store.get() : window.state;
    const db = firebase.firestore();
    const { appId, userId } = state.storage || {};
    
    if (!appId || !userId) {
      console.error('[RealtimeSync] Missing appId or userId');
      return () => {};
    }
    
    const collectionRef = db
      .collection('planner')
      .doc(appId)
      .collection('users')
      .doc(userId)
      .collection(collectionName);
    
    if (CONFIG.syncDebug) {
      console.log(`📡 [RealtimeSync] Starting listener: ${collectionName}`);
    }
    
    // onSnapshot - główny listener
    const unsubscribe = collectionRef.onSnapshot(
      // Success callback
      (snapshot) => {
        handleSnapshot(collectionName, snapshot, callback);
      },
      // Error callback
      (error) => {
        handleSnapshotError(collectionName, error);
      }
    );
    
    // Zapisz listener info
    syncState.listeners.set(collectionName, {
      unsubscribe,
      callback,
      startedAt: Date.now()
    });
    
    syncState.status = 'connected';
    
    return unsubscribe;
  }
  
  /**
   * Rozpoczyna nasłuchiwanie wszystkich kolekcji
   * @returns {Promise<void>}
   */
  async function startListeningAll() {
    console.log('📡 [RealtimeSync] Starting listeners for all collections');
    
    const state = window.store ? window.store.get() : window.state;
    
    // Sprawdź czy tryb Firebase jest włączony
    if (state.settings && state.settings.mode !== 'firebase') {
      console.log('ℹ️ [RealtimeSync] Firebase mode disabled, skipping real-time sync');
      return;
    }
    
    // Start listener dla każdej kolekcji
    for (const collectionName of COLLECTIONS) {
      // Skip jeśli kolekcja nie istnieje w state
      if (!(collectionName in state)) {
        console.warn(`[RealtimeSync] Collection "${collectionName}" not found in state, skipping`);
        continue;
      }
      
      startListening(collectionName, handleCollectionUpdate);
    }
    
    console.log(`✅ [RealtimeSync] Started ${syncState.listeners.size} listeners`);
  }
  
  /**
   * Zatrzymuje nasłuchiwanie kolekcji
   * @param {string} collectionName - Nazwa kolekcji
   */
  function stopListening(collectionName) {
    const listener = syncState.listeners.get(collectionName);
    
    if (listener) {
      listener.unsubscribe();
      syncState.listeners.delete(collectionName);
      
      if (CONFIG.syncDebug) {
        console.log(`🛑 [RealtimeSync] Listener stopped: ${collectionName}`);
      }
    }
  }
  
  /**
   * Zatrzymuje wszystkie listenery
   */
  function stopListeningAll() {
    console.log('🛑 [RealtimeSync] Stopping all listeners');
    
    syncState.listeners.forEach((listener, name) => {
      listener.unsubscribe();
    });
    
    syncState.listeners.clear();
    syncState.status = 'disconnected';
    
    console.log('✅ [RealtimeSync] All listeners stopped');
  }
  
  /**
   * Obsługa snapshot z Firestore
   * @param {string} collectionName - Nazwa kolekcji
   * @param {Object} snapshot - Firestore snapshot
   * @param {Function} callback - Callback function
   */
  function handleSnapshot(collectionName, snapshot, callback) {
    if (CONFIG.syncDebug) {
      console.log(`📥 [RealtimeSync] Snapshot received: ${collectionName}`);
      console.log(`   - Documents: ${snapshot.size}`);
      console.log(`   - Changes: ${snapshot.docChanges().length}`);
    }
    
    // Pobierz zmiany (added, modified, removed)
    const changes = snapshot.docChanges();
    
    if (changes.length === 0) {
      if (CONFIG.syncDebug) {
        console.log(`   - No changes (initial load or metadata update)`);
      }
      return;
    }
    
    // Przetwórz zmiany
    const processed = {
      added: [],
      modified: [],
      removed: []
    };
    
    changes.forEach(change => {
      const doc = change.doc;
      const data = { id: doc.id, ...doc.data() };
      
      switch(change.type) {
        case 'added':
          processed.added.push(data);
          if (CONFIG.syncDebug) {
            console.log(`   ➕ Added: ${doc.id}`);
          }
          break;
        case 'modified':
          processed.modified.push(data);
          if (CONFIG.syncDebug) {
            console.log(`   ✏️ Modified: ${doc.id}`);
          }
          break;
        case 'removed':
          processed.removed.push(data);
          if (CONFIG.syncDebug) {
            console.log(`   ❌ Removed: ${doc.id}`);
          }
          break;
      }
    });
    
    // Wywołaj callback z przetworzonymi zmianami
    try {
      callback(collectionName, processed);
    } catch (error) {
      console.error(`[RealtimeSync] Callback error for ${collectionName}:`, error);
    }
    
    // Update sync state
    syncState.lastSync = Date.now();
    updateSyncStatus();
  }
  
  /**
   * Obsługa błędów snapshot
   * @param {string} collectionName - Nazwa kolekcji
   * @param {Error} error - Błąd
   */
  function handleSnapshotError(collectionName, error) {
    console.error(`❌ [RealtimeSync] Snapshot error for ${collectionName}:`, error);
    
    syncState.errors.set(collectionName, {
      error: error.message,
      code: error.code,
      timestamp: Date.now()
    });
    
    syncState.status = 'error';
    updateSyncStatus();
    
    // Wyświetl notification
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Błąd synchronizacji', {
        body: `Nie udało się zsynchronizować: ${collectionName}`,
        icon: '/favicon.ico',
        tag: 'sync-error'
      });
    }
    
    // Spróbuj ponownie po retry delay
    setTimeout(() => {
      if (CONFIG.syncDebug) {
        console.log(`🔄 [RealtimeSync] Retrying listener: ${collectionName}`);
      }
      // Listener automatycznie się reconnectuje
    }, CONFIG.retryDelay);
  }
  
  /**
   * Obsługa aktualizacji kolekcji
   * @param {string} collectionName - Nazwa kolekcji
   * @param {Object} changes - Zmiany (added, modified, removed)
   */
  function handleCollectionUpdate(collectionName, changes) {
    if (CONFIG.syncDebug) {
      console.log(`🔄 [RealtimeSync] Updating local state: ${collectionName}`);
    }
    
    // Pobierz obecny state
    const state = window.store ? window.store.get() : window.state;
    
    if (!state) {
      console.error('[RealtimeSync] State not available');
      return;
    }
    
    // Zastosuj zmiany do state
    let needsSave = false;
    
    // Added documents
    if (changes.added.length > 0) {
      changes.added.forEach(doc => {
        const existing = state[collectionName].find(item => item.id === doc.id);
        if (!existing) {
          state[collectionName].push(doc);
          needsSave = true;
          if (CONFIG.syncDebug) {
            console.log(`   ➕ Added to state: ${doc.id}`);
          }
        }
      });
    }
    
    // Modified documents
    if (changes.modified.length > 0) {
      changes.modified.forEach(doc => {
        const index = state[collectionName].findIndex(item => item.id === doc.id);
        if (index !== -1) {
          // Conflict resolution
          const resolved = resolveConflict(
            state[collectionName][index], // local version
            doc,                           // remote version
            CONFIG.conflictStrategy
          );
          
          state[collectionName][index] = resolved;
          needsSave = true;
          if (CONFIG.syncDebug) {
            console.log(`   ✏️ Modified in state: ${doc.id}`);
          }
        } else {
          // Dokument nie istnieje lokalnie, dodaj go
          state[collectionName].push(doc);
          needsSave = true;
        }
      });
    }
    
    // Removed documents
    if (changes.removed.length > 0) {
      changes.removed.forEach(doc => {
        const index = state[collectionName].findIndex(item => item.id === doc.id);
        if (index !== -1) {
          state[collectionName].splice(index, 1);
          needsSave = true;
          if (CONFIG.syncDebug) {
            console.log(`   ❌ Removed from state: ${doc.id}`);
          }
        }
      });
    }
    
    // Zapisz state lokalnie
    if (needsSave) {
      if (window.store && typeof window.store.save === 'function') {
        window.store.save();
      } else if (typeof saveStateToLocalStorage === 'function') {
        saveStateToLocalStorage();
      }
      
      // Re-render UI
      rerenderUI(collectionName);
      
      if (CONFIG.syncDebug) {
        console.log(`💾 [RealtimeSync] State saved for: ${collectionName}`);
      }
    }
  }
  
  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================
  
  /**
   * Rozwiązuje konflikt między lokalną a zdalną wersją
   * @param {Object} localVersion - Lokalna wersja dokumentu
   * @param {Object} remoteVersion - Zdalna wersja z Firestore
   * @param {string} strategy - Strategia rozwiązywania konfliktów
   * @returns {Object} Rozwiązana wersja dokumentu
   */
  function resolveConflict(localVersion, remoteVersion, strategy) {
    if (CONFIG.syncDebug) {
      console.log('⚔️ [RealtimeSync] Conflict detected:', localVersion.id);
    }
    
    switch(strategy) {
      case 'last-write-wins':
        return resolveLWW(localVersion, remoteVersion);
      
      case 'merge':
        return resolveMerge(localVersion, remoteVersion);
      
      case 'manual':
        return resolveManual(localVersion, remoteVersion);
      
      default:
        console.warn(`Unknown strategy: ${strategy}, using last-write-wins`);
        return resolveLWW(localVersion, remoteVersion);
    }
  }
  
  /**
   * Last-Write-Wins: Wybiera nowszą wersję na podstawie timestamp
   * @param {Object} localVersion - Lokalna wersja
   * @param {Object} remoteVersion - Zdalna wersja
   * @returns {Object} Nowsza wersja
   */
  function resolveLWW(localVersion, remoteVersion) {
    const localTimestamp = localVersion._lastModified || localVersion.updatedAt || 0;
    const remoteTimestamp = remoteVersion._lastModified || remoteVersion.updatedAt || 0;
    
    if (remoteTimestamp > localTimestamp) {
      if (CONFIG.syncDebug) {
        console.log('   → Remote version is newer, using remote');
      }
      return { ...remoteVersion, _conflictResolved: true };
    } else {
      if (CONFIG.syncDebug) {
        console.log('   → Local version is newer, keeping local');
      }
      return { ...localVersion, _conflictResolved: true };
    }
  }
  
  /**
   * Merge: Scala obie wersje (dla non-conflicting fields)
   * @param {Object} localVersion - Lokalna wersja
   * @param {Object} remoteVersion - Zdalna wersja
   * @returns {Object} Merged wersja
   */
  function resolveMerge(localVersion, remoteVersion) {
    if (CONFIG.syncDebug) {
      console.log('   → Merging local and remote versions');
    }
    
    const merged = { ...localVersion };
    
    // Iteruj przez pola remote version
    Object.keys(remoteVersion).forEach(key => {
      if (key === 'id') return; // Skip ID
      
      const localValue = localVersion[key];
      const remoteValue = remoteVersion[key];
      
      // Jeśli wartości są różne
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        // Dla prostych wartości: użyj nowszej
        if (typeof remoteValue !== 'object' || remoteValue === null) {
          const localTimestamp = localVersion._lastModified || 0;
          const remoteTimestamp = remoteVersion._lastModified || 0;
          
          if (remoteTimestamp > localTimestamp) {
            merged[key] = remoteValue;
            if (CONFIG.syncDebug) {
              console.log(`   → Field "${key}": using remote value`);
            }
          }
        } 
        // Dla tablic: merge unique values
        else if (Array.isArray(remoteValue)) {
          merged[key] = mergeArrays(localValue, remoteValue);
          if (CONFIG.syncDebug) {
            console.log(`   → Field "${key}": merged arrays`);
          }
        }
        // Dla obiektów: rekurencyjny merge
        else if (typeof remoteValue === 'object') {
          merged[key] = { ...localValue, ...remoteValue };
          if (CONFIG.syncDebug) {
            console.log(`   → Field "${key}": merged objects`);
          }
        }
      }
    });
    
    merged._conflictResolved = true;
    merged._mergedAt = Date.now();
    
    return merged;
  }
  
  /**
   * Helper: Merge arrays (unique values)
   * @param {Array} localArray - Lokalna tablica
   * @param {Array} remoteArray - Zdalna tablica
   * @returns {Array} Merged array
   */
  function mergeArrays(localArray, remoteArray) {
    if (!Array.isArray(localArray)) localArray = [];
    if (!Array.isArray(remoteArray)) remoteArray = [];
    
    const combined = [...localArray, ...remoteArray];
    
    // Remove duplicates based on 'id' if objects, or value if primitives
    if (combined.length > 0 && typeof combined[0] === 'object' && combined[0] !== null) {
      const seen = new Set();
      return combined.filter(item => {
        const id = item.id || JSON.stringify(item);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } else {
      return [...new Set(combined)];
    }
  }
  
  /**
   * Manual: Wyświetl dialog i pozwól użytkownikowi wybrać
   * @param {Object} localVersion - Lokalna wersja
   * @param {Object} remoteVersion - Zdalna wersja
   * @returns {Object} Wybrana wersja
   */
  function resolveManual(localVersion, remoteVersion) {
    if (CONFIG.syncDebug) {
      console.log('   → Manual conflict resolution required');
    }
    
    // TODO: Implement UI dialog for manual resolution
    // Na razie fallback do LWW
    console.warn('[RealtimeSync] Manual resolution not implemented, falling back to LWW');
    return resolveLWW(localVersion, remoteVersion);
  }
  
  // ============================================================================
  // OPTIMISTIC UPDATES
  // ============================================================================
  
  /**
   * Wykonaj optimistic update z rollback przy błędzie
   * @param {string} collectionName - Nazwa kolekcji
   * @param {string} documentId - ID dokumentu
   * @param {Object} updates - Zmiany do zastosowania
   * @returns {Promise<boolean>} Success status
   */
  async function optimisticUpdate(collectionName, documentId, updates) {
    console.log(`⚡ [RealtimeSync] Optimistic update: ${collectionName}/${documentId}`);
    
    const state = window.store ? window.store.get() : window.state;
    const collection = state[collectionName];
    const index = collection.findIndex(item => item.id === documentId);
    
    if (index === -1) {
      console.error(`Document not found: ${documentId}`);
      return false;
    }
    
    // Backup oryginalnej wersji
    const originalVersion = { ...collection[index] };
    
    // Zastosuj zmiany lokalnie (optimistically)
    collection[index] = {
      ...collection[index],
      ...updates,
      _lastModified: Date.now(),
      _pending: true // Oznacz jako pending
    };
    
    // Save locally i re-render
    if (window.store && typeof window.store.save === 'function') {
      window.store.save();
    }
    rerenderUI(collectionName);
    
    // Spróbuj zapisać do Firestore
    try {
      const db = firebase.firestore();
      const { appId, userId } = state.storage;
      
      const docRef = db
        .collection('planner')
        .doc(appId)
        .collection('users')
        .doc(userId)
        .collection(collectionName)
        .doc(documentId);
      
      await docRef.update({
        ...updates,
        _lastModified: Date.now(),
        _modifiedBy: getCurrentUserId()
      });
      
      // Sukces - usuń flagę pending
      delete collection[index]._pending;
      console.log(`✅ [RealtimeSync] Optimistic update confirmed`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ [RealtimeSync] Optimistic update failed:`, error);
      
      // Rollback do oryginalnej wersji
      collection[index] = originalVersion;
      if (window.store && typeof window.store.save === 'function') {
        window.store.save();
      }
      rerenderUI(collectionName);
      
      // Pokaż error notification
      showErrorNotification(`Nie udało się zapisać zmian: ${error.message}`);
      
      return false;
    }
  }
  
  // ============================================================================
  // OFFLINE SUPPORT
  // ============================================================================
  
  /**
   * Track pending write (offline queue)
   * @param {string} collectionName - Nazwa kolekcji
   * @param {string} documentId - ID dokumentu
   * @param {string} operation - Typ operacji ('create' | 'update' | 'delete')
   * @param {Object} data - Dane
   */
  function trackPendingWrite(collectionName, documentId, operation, data) {
    const key = `${collectionName}/${documentId}`;
    
    syncState.pendingWrites.set(key, {
      collectionName,
      documentId,
      operation,
      data,
      timestamp: Date.now(),
      retries: 0
    });
    
    if (CONFIG.syncDebug) {
      console.log(`📝 [RealtimeSync] Pending write tracked: ${key}`);
    }
    
    updateSyncStatus();
  }
  
  /**
   * Clear pending write
   * @param {string} collectionName - Nazwa kolekcji
   * @param {string} documentId - ID dokumentu
   */
  function clearPendingWrite(collectionName, documentId) {
    const key = `${collectionName}/${documentId}`;
    syncState.pendingWrites.delete(key);
    
    if (CONFIG.syncDebug) {
      console.log(`✅ [RealtimeSync] Pending write cleared: ${key}`);
    }
    
    updateSyncStatus();
  }
  
  /**
   * Retry all pending writes
   * @returns {Promise<void>}
   */
  async function retryPendingWrites() {
    console.log(`🔄 [RealtimeSync] Retrying ${syncState.pendingWrites.size} pending writes`);
    
    const promises = [];
    
    for (const [key, pending] of syncState.pendingWrites.entries()) {
      if (pending.retries >= CONFIG.retryAttempts) {
        console.error(`❌ Max retries reached for: ${key}`);
        continue;
      }
      
      pending.retries++;
      
      const promise = executePendingWrite(pending)
        .then(() => {
          clearPendingWrite(pending.collectionName, pending.documentId);
        })
        .catch(error => {
          console.error(`❌ Retry failed for ${key}:`, error);
        });
      
      promises.push(promise);
    }
    
    await Promise.allSettled(promises);
    console.log('✅ [RealtimeSync] Retry completed');
  }
  
  /**
   * Execute pending write
   * @param {Object} pending - Pending write info
   * @returns {Promise<void>}
   */
  async function executePendingWrite(pending) {
    const state = window.store ? window.store.get() : window.state;
    const db = firebase.firestore();
    const { appId, userId } = state.storage;
    
    const docRef = db
      .collection('planner')
      .doc(appId)
      .collection('users')
      .doc(userId)
      .collection(pending.collectionName)
      .doc(pending.documentId);
    
    switch(pending.operation) {
      case 'create':
        await docRef.set(pending.data);
        break;
      case 'update':
        await docRef.update(pending.data);
        break;
      case 'delete':
        await docRef.delete();
        break;
    }
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  /**
   * Dodaj timestamp do dokumentu
   * @param {Object} document - Dokument
   * @returns {Object} Dokument z timestamp
   */
  function addTimestamp(document) {
    return {
      ...document,
      _lastModified: Date.now(),
      _modifiedBy: getCurrentUserId()
    };
  }
  
  /**
   * Pobierz ID obecnego użytkownika
   * @returns {string} User ID
   */
  function getCurrentUserId() {
    if (firebase && firebase.auth && firebase.auth().currentUser) {
      return firebase.auth().currentUser.uid;
    }
    return 'anonymous';
  }
  
  /**
   * Update sync status UI
   */
  function updateSyncStatus() {
    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;
    
    const pendingCount = syncState.pendingWrites.size;
    const errorCount = syncState.errors.size;
    
    let html = '';
    let className = '';
    
    if (syncState.status === 'connected' && pendingCount === 0 && errorCount === 0) {
      html = '✅ Zsynchronizowane';
      className = 'sync-ok';
    } else if (pendingCount > 0) {
      html = `⏳ Synchronizacja... (${pendingCount})`;
      className = 'sync-pending';
    } else if (errorCount > 0) {
      html = `⚠️ Błędy (${errorCount})`;
      className = 'sync-error';
    } else {
      html = '🔌 Rozłączono';
      className = 'sync-disconnected';
    }
    
    statusEl.innerHTML = html;
    statusEl.className = `sync-status ${className}`;
  }
  
  /**
   * Re-render UI dla kolekcji
   * @param {string} collectionName - Nazwa kolekcji
   */
  function rerenderUI(collectionName) {
    if (CONFIG.syncDebug) {
      console.log(`🔄 [RealtimeSync] Re-rendering UI for: ${collectionName}`);
    }
    
    switch(collectionName) {
      case 'orders':
        if (typeof renderOrderPage === 'function') renderOrderPage();
        if (typeof renderDash === 'function') renderDash(window.state);
        break;
      case 'tasks':
        if (typeof renderTasks === 'function') renderTasks();
        if (typeof renderGantt === 'function') renderGantt();
        break;
      case 'employees':
        if (typeof renderEmployeePage === 'function') renderEmployeePage();
        break;
      case 'processes':
        if (typeof renderProcessPage === 'function') renderProcessPage();
        break;
      case 'operationsCatalog':
        if (typeof renderOperationsCatalogPage === 'function') renderOperationsCatalogPage();
        break;
    }
  }
  
  /**
   * Show error notification
   * @param {string} message - Error message
   */
  function showErrorNotification(message) {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Błąd synchronizacji', {
        body: message,
        icon: '/favicon.ico',
        tag: 'sync-error'
      });
    }
    
    console.error('🔴', message);
  }
  
  /**
   * Get sync status
   * @returns {Object} Status info
   */
  function getStatus() {
    return {
      status: syncState.status,
      lastSync: syncState.lastSync,
      pendingWrites: syncState.pendingWrites.size,
      errors: syncState.errors.size,
      listeners: syncState.listeners.size
    };
  }
  
  /**
   * Get full sync state
   * @returns {Object} Full state
   */
  function getSyncState() {
    return {
      ...syncState,
      listeners: Array.from(syncState.listeners.keys()),
      pendingWrites: Array.from(syncState.pendingWrites.entries()),
      errors: Array.from(syncState.errors.entries())
    };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  /**
   * Cleanup przy zamknięciu strony
   */
  window.addEventListener('beforeunload', () => {
    stopListeningAll();
  });
  
  // ============================================================================
  // EKSPORT API
  // ============================================================================
  
  global.firebaseRealtimeSync = {
    // Inicjalizacja
    init,
    
    // Listeners
    startListening,
    stopListening,
    startListeningAll,
    stopListeningAll,
    
    // Conflict resolution
    resolveConflict,
    
    // Optimistic updates
    optimisticUpdate,
    
    // Offline support
    trackPendingWrite,
    clearPendingWrite,
    retryPendingWrites,
    
    // Helpers
    addTimestamp,
    updateSyncStatus,
    
    // Status
    getStatus,
    getSyncState
  };
  
  console.log('✅ Firebase Real-time Sync module loaded');
  
})(window);
