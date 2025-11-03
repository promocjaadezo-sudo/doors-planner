# 🚀 SPRINT 1 - SZCZEGÓŁOWE ROZPISANIE ZADAŃ

**Sprint:** Sprint 1 - Critical Features  
**Czas trwania:** 3-4 tygodnie  
**Priorytet:** 🔴 CRITICAL  
**Data rozpoczęcia:** 2 listopada 2025  

---

## 📋 Przegląd zadań Sprint 1

| ID | Zadanie | Czas | Priorytet | Zależności |
|----|---------|------|-----------|------------|
| **S1-T1** | Firebase Real-time Sync | 2-3 tygodnie | 🔴 Critical | Brak |
| **S1-T2** | Detekcja konfliktów zasobów | 1 tydzień | 🔴 Critical | Brak |
| **S1-T3** | Algorytm auto-assign | 2 tygodnie | 🔴 Critical | S1-T2 |
| **S1-T4** | Testy integracyjne E2E | 1 tydzień | 🔴 Critical | S1-T1, S1-T2, S1-T3 |

---

# 📘 ZADANIE S1-T1: Firebase Real-time Sync

**Priorytet:** 🔴 CRITICAL  
**Czas:** 2-3 tygodnie  
**Zespół:** 1-2 developerów  
**Złożoność:** ⭐⭐⭐⭐ (Wysoka)

---

## 1. Opis zadania

### Problem biznesowy

Obecnie aplikacja używa **okresowej synchronizacji** (co 30 sekund), co prowadzi do:
- ❌ Opóźnień w widoczności zmian (max 30s)
- ❌ Konfliktów przy jednoczesnych edycjach
- ❌ Utraty danych przy równoległych zapisach
- ❌ Złego UX (użytkownik nie wie co się dzieje)

### Rozwiązanie

Implementacja **real-time synchronizacji** z Firebase Firestore używając:
- ✅ `onSnapshot` listeners - zmiany propagowane natychmiast
- ✅ Conflict resolution - mechanizm rozwiązywania konfliktów
- ✅ Optimistic updates - natychmiastowy feedback UI
- ✅ Offline support - praca bez internetu

### Cele zadania

1. ✅ **Real-time updates** - Zmiany widoczne w <1s u wszystkich użytkowników
2. ✅ **Conflict resolution** - Automatyczne rozwiązywanie konfliktów
3. ✅ **Offline mode** - Aplikacja działa bez internetu
4. ✅ **Error handling** - Graceful degradation przy problemach
5. ✅ **Performance** - Brak degradacji wydajności

---

## 2. Wymagania funkcjonalne

### FR-1: Real-time Updates
```
GIVEN użytkownik A edytuje zlecenie
WHEN użytkownik B ma otwartą tę samą stronę
THEN użytkownik B widzi zmiany w czasie <1s
```

### FR-2: Conflict Resolution
```
GIVEN użytkownik A i B edytują to samo zlecenie jednocześnie
WHEN oba zapisy trafiają do Firestore
THEN system automatycznie rozwiązuje konflikt według strategii last-write-wins lub merge
```

### FR-3: Offline Support
```
GIVEN użytkownik traci połączenie z internetem
WHEN użytkownik edytuje dane
THEN zmiany są kolejkowane lokalnie i synchronizowane po powrocie online
```

### FR-4: Error Handling
```
GIVEN wystąpił błąd synchronizacji
WHEN aplikacja próbuje ponownie
THEN użytkownik widzi status błędu i może retry manualnie
```

---

## 3. Architektura rozwiązania

### 3.1 Obecna architektura (do zmiany)

```javascript
// js/firebase.js - OBECNY KOD (periodic sync)

setInterval(() => {
  if (window._stateChanged) {
    saveToDB(state);  // Zapisuje wszystko co 30s
    window._stateChanged = false;
  }
}, 30000);
```

**Problemy:**
- ❌ Polling co 30s - opóźnienie
- ❌ Brak real-time updates
- ❌ Race conditions przy równoległych zapisach
- ❌ Brak conflict resolution

### 3.2 Docelowa architektura (nowa)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI Layer   │  │ State Layer  │  │  Sync Layer  │     │
│  │              │  │              │  │              │     │
│  │ - Renders    │→ │ - localStorage│→│ - onSnapshot │     │
│  │ - User input │  │ - state mgmt │  │ - Firestore  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↑                  ↑                  ↑             │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                   Real-time updates                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
                    FIRESTORE BACKEND
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    OTHER CLIENTS                             │
│  User B, User C, User D... (synchronized in real-time)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Krytyczne kroki implementacji

### Krok 1: Przygotowanie struktury (Dzień 1-2)

#### 4.1.1 Utwórz nowy moduł sync

```javascript
// js/firebase-realtime-sync.js
// NOWY PLIK

/**
 * Firebase Real-time Sync Module
 * Obsługuje real-time synchronizację z Firestore
 */

(function(global) {
  'use strict';
  
  // Konfiguracja
  const CONFIG = {
    enableRealtime: true,
    enableOffline: true,
    conflictStrategy: 'last-write-wins', // lub 'merge'
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 500 // max dokumentów w batch
  };
  
  // Stan synchronizacji
  const syncState = {
    listeners: new Map(),        // Collection listeners
    pendingWrites: new Map(),    // Oczekujące zapisy
    errors: new Map(),           // Błędy synchronizacji
    status: 'disconnected',      // disconnected | connecting | connected
    lastSync: null               // Timestamp ostatniej synchronizacji
  };
  
  // Eksport API
  global.firebaseRealtimeSync = {
    init,
    startListening,
    stopListening,
    getStatus,
    getSyncState,
    retry
  };
  
})(window);

console.log('✅ Firebase Real-time Sync module loaded');
```

#### 4.1.2 Zdefiniuj interfejsy TypeScript (dla dokumentacji)

```typescript
// types/firebase-sync.d.ts
// PLIK POMOCNICZY (opcjonalny)

interface SyncConfig {
  enableRealtime: boolean;
  enableOffline: boolean;
  conflictStrategy: 'last-write-wins' | 'merge' | 'manual';
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
}

interface SyncStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastSync: number | null;
  pendingWrites: number;
  errors: number;
}

interface ConflictResolution {
  localVersion: any;
  remoteVersion: any;
  resolvedVersion: any;
  strategy: string;
  timestamp: number;
}

interface FirebaseRealtimeSync {
  init(config?: Partial<SyncConfig>): Promise<void>;
  startListening(collection: string, callback: Function): () => void;
  stopListening(collection: string): void;
  getStatus(): SyncStatus;
  getSyncState(): object;
  retry(): Promise<void>;
}
```

---

### Krok 2: Implementacja onSnapshot Listeners (Dzień 3-5)

#### 4.2.1 Listener dla pojedynczej kolekcji

```javascript
// js/firebase-realtime-sync.js - ciąg dalszy

/**
 * Rozpoczyna nasłuchiwanie zmian w kolekcji
 * @param {string} collectionName - Nazwa kolekcji (np. 'orders', 'tasks')
 * @param {Function} callback - Funkcja wywoływana przy zmianach
 * @returns {Function} Unsubscribe function
 */
function startListening(collectionName, callback) {
  if (!firebase || !firebase.firestore) {
    console.error('[RealtimeSync] Firebase nie zainicjalizowany');
    return () => {};
  }
  
  if (syncState.listeners.has(collectionName)) {
    console.warn(`[RealtimeSync] Listener dla "${collectionName}" już istnieje`);
    return syncState.listeners.get(collectionName).unsubscribe;
  }
  
  const db = firebase.firestore();
  const { appId, userId } = state.storage;
  
  if (!appId || !userId) {
    console.error('[RealtimeSync] Brak appId lub userId');
    return () => {};
  }
  
  const collectionRef = db
    .collection('planner')
    .doc(appId)
    .collection('users')
    .doc(userId)
    .collection(collectionName);
  
  console.log(`📡 [RealtimeSync] Starting listener for: ${collectionName}`);
  
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
  
  // Zapisz listener
  syncState.listeners.set(collectionName, {
    unsubscribe,
    callback,
    startedAt: Date.now()
  });
  
  syncState.status = 'connected';
  
  return unsubscribe;
}

/**
 * Obsługa snapshot z Firestore
 */
function handleSnapshot(collectionName, snapshot, callback) {
  console.log(`📥 [RealtimeSync] Received snapshot for: ${collectionName}`);
  console.log(`   - Documents: ${snapshot.size}`);
  console.log(`   - Changes: ${snapshot.docChanges().length}`);
  
  // Pobierz zmiany (added, modified, removed)
  const changes = snapshot.docChanges();
  
  if (changes.length === 0) {
    console.log(`   - No changes (initial load or metadata update)`);
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
        console.log(`   ➕ Added: ${doc.id}`);
        break;
      case 'modified':
        processed.modified.push(data);
        console.log(`   ✏️ Modified: ${doc.id}`);
        break;
      case 'removed':
        processed.removed.push(data);
        console.log(`   ❌ Removed: ${doc.id}`);
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
}

/**
 * Obsługa błędów snapshot
 */
function handleSnapshotError(collectionName, error) {
  console.error(`❌ [RealtimeSync] Snapshot error for ${collectionName}:`, error);
  
  syncState.errors.set(collectionName, {
    error: error.message,
    code: error.code,
    timestamp: Date.now()
  });
  
  syncState.status = 'error';
  
  // Wyświetl notification
  if (window.Notification && Notification.permission === 'granted') {
    new Notification('Błąd synchronizacji', {
      body: `Nie udało się zsynchronizować: ${collectionName}`,
      icon: '/favicon.ico'
    });
  }
  
  // Spróbuj ponownie po retry delay
  setTimeout(() => {
    console.log(`🔄 [RealtimeSync] Retrying listener for: ${collectionName}`);
    // Listener automatycznie się reconnectuje
  }, CONFIG.retryDelay);
}
```

#### 4.2.2 Listener dla wszystkich kolekcji

```javascript
/**
 * Rozpoczyna nasłuchiwanie wszystkich kolekcji
 */
function startListeningAll() {
  const collections = [
    'orders',
    'tasks', 
    'employees',
    'processes',
    'operationsCatalog'
  ];
  
  console.log('📡 [RealtimeSync] Starting listeners for all collections');
  
  collections.forEach(collectionName => {
    startListening(collectionName, handleCollectionUpdate);
  });
}

/**
 * Obsługa aktualizacji kolekcji
 */
function handleCollectionUpdate(collectionName, changes) {
  console.log(`🔄 [RealtimeSync] Updating local state: ${collectionName}`);
  
  // Pobierz obecny state
  const state = window.store ? window.store.get() : window.state;
  
  if (!state) {
    console.error('[RealtimeSync] State nie jest dostępny');
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
        console.log(`   ➕ Added to state: ${doc.id}`);
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
        console.log(`   ✏️ Modified in state: ${doc.id}`);
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
        console.log(`   ❌ Removed from state: ${doc.id}`);
      }
    });
  }
  
  // Zapisz state lokalnie
  if (needsSave) {
    if (window.store && typeof window.store.save === 'function') {
      window.store.save();
    }
    
    // Re-render UI
    rerenderUI(collectionName);
    
    console.log(`💾 [RealtimeSync] State saved for: ${collectionName}`);
  }
}
```

---

### Krok 3: Conflict Resolution (Dzień 6-8)

#### 4.3.1 Strategia Last-Write-Wins (LWW)

```javascript
/**
 * Rozwiązuje konflikt między lokalną a zdalną wersją
 * @param {Object} localVersion - Lokalna wersja dokumentu
 * @param {Object} remoteVersion - Zdalna wersja z Firestore
 * @param {string} strategy - Strategia rozwiązywania konfliktów
 * @returns {Object} Rozwiązana wersja dokumentu
 */
function resolveConflict(localVersion, remoteVersion, strategy) {
  console.log('⚔️ [RealtimeSync] Conflict detected:', localVersion.id);
  
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
 */
function resolveLWW(localVersion, remoteVersion) {
  const localTimestamp = localVersion._lastModified || localVersion.updatedAt || 0;
  const remoteTimestamp = remoteVersion._lastModified || remoteVersion.updatedAt || 0;
  
  if (remoteTimestamp > localTimestamp) {
    console.log('   → Remote version is newer, using remote');
    return { ...remoteVersion, _conflictResolved: true };
  } else {
    console.log('   → Local version is newer, keeping local');
    return { ...localVersion, _conflictResolved: true };
  }
}

/**
 * Merge: Scala obie wersje (dla non-conflicting fields)
 */
function resolveMerge(localVersion, remoteVersion) {
  console.log('   → Merging local and remote versions');
  
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
          console.log(`   → Field "${key}": using remote value`);
        }
      } 
      // Dla tablic: merge unique values
      else if (Array.isArray(remoteValue)) {
        merged[key] = mergeArrays(localValue, remoteValue);
        console.log(`   → Field "${key}": merged arrays`);
      }
      // Dla obiektów: rekurencyjny merge
      else if (typeof remoteValue === 'object') {
        merged[key] = { ...localValue, ...remoteValue };
        console.log(`   → Field "${key}": merged objects`);
      }
    }
  });
  
  merged._conflictResolved = true;
  merged._mergedAt = Date.now();
  
  return merged;
}

/**
 * Helper: Merge arrays (unique values)
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
 */
function resolveManual(localVersion, remoteVersion) {
  console.log('   → Showing manual conflict resolution dialog');
  
  // TODO: Implement UI dialog
  // Na razie fallback do LWW
  return resolveLWW(localVersion, remoteVersion);
}
```

#### 4.3.2 Timestamp tracking

```javascript
/**
 * Dodaj timestamp do dokumentu przed zapisem
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
 */
function getCurrentUserId() {
  if (firebase && firebase.auth && firebase.auth().currentUser) {
    return firebase.auth().currentUser.uid;
  }
  return 'anonymous';
}
```

---

### Krok 4: Optimistic Updates (Dzień 9-10)

#### 4.4.1 Optimistic update pattern

```javascript
/**
 * Wykonaj optimistic update z rollback przy błędzie
 * @param {string} collectionName - Nazwa kolekcji
 * @param {string} documentId - ID dokumentu
 * @param {Object} updates - Zmiany do zastosowania
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

/**
 * Helper: Show error notification
 */
function showErrorNotification(message) {
  if (window.Notification && Notification.permission === 'granted') {
    new Notification('Błąd synchronizacji', {
      body: message,
      icon: '/favicon.ico',
      tag: 'sync-error'
    });
  }
  
  // Fallback: console
  console.error('🔴', message);
}
```

---

### Krok 5: Offline Support (Dzień 11-12)

#### 4.5.1 Enable Firestore offline persistence

```javascript
/**
 * Inicjalizacja Firebase z offline support
 */
async function init(config = {}) {
  console.log('🚀 [RealtimeSync] Initializing...');
  
  // Merge config
  Object.assign(CONFIG, config);
  
  if (!firebase || !firebase.firestore) {
    throw new Error('Firebase nie jest zainicjalizowany');
  }
  
  const db = firebase.firestore();
  
  // Enable offline persistence
  if (CONFIG.enableOffline) {
    try {
      await db.enablePersistence({
        synchronizeTabs: true // Sync across tabs
      });
      console.log('✅ [RealtimeSync] Offline persistence enabled');
    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Offline persistence: Multiple tabs open');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Offline persistence: Not supported in this browser');
      } else {
        console.error('❌ Offline persistence error:', error);
      }
    }
  }
  
  // Start listening
  if (CONFIG.enableRealtime) {
    startListeningAll();
  }
  
  syncState.status = 'connected';
  console.log('✅ [RealtimeSync] Initialized');
}
```

#### 4.5.2 Pending writes tracking

```javascript
/**
 * Track pending writes (offline queue)
 */
function trackPendingWrite(collectionName, documentId, operation, data) {
  const key = `${collectionName}/${documentId}`;
  
  syncState.pendingWrites.set(key, {
    collectionName,
    documentId,
    operation, // 'create' | 'update' | 'delete'
    data,
    timestamp: Date.now(),
    retries: 0
  });
  
  console.log(`📝 [RealtimeSync] Pending write tracked: ${key}`);
  
  // Update UI status
  updateSyncStatus();
}

/**
 * Clear pending write
 */
function clearPendingWrite(collectionName, documentId) {
  const key = `${collectionName}/${documentId}`;
  syncState.pendingWrites.delete(key);
  
  console.log(`✅ [RealtimeSync] Pending write cleared: ${key}`);
  updateSyncStatus();
}

/**
 * Retry all pending writes
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
 */
async function executePendingWrite(pending) {
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
```

---

### Krok 6: UI Integration (Dzień 13-14)

#### 4.6.1 Sync status indicator

```javascript
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
 */
function rerenderUI(collectionName) {
  console.log(`🔄 [RealtimeSync] Re-rendering UI for: ${collectionName}`);
  
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
```

#### 4.6.2 Dodaj sync status do HTML

```html
<!-- index.html - Dodaj w header -->

<header class="wrap">
  <div class="row" style="gap:8px">
    <!-- ... existing buttons ... -->
    
    <!-- NOWY: Sync Status Indicator -->
    <div id="sync-status" class="sync-status sync-disconnected">
      🔌 Rozłączono
    </div>
  </div>
</header>

<!-- NOWY: CSS dla sync status -->
<style>
.sync-status {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
}

.sync-status.sync-ok {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.sync-status.sync-pending {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
  animation: pulse 2s infinite;
}

.sync-status.sync-error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.sync-status.sync-disconnected {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
```

---

## 5. Przykładowy kod - Full Integration

### 5.1 Inicjalizacja w index.html

```html
<!-- index.html - dodaj przed </body> -->

<!-- Firebase Real-time Sync -->
<script src="js/firebase-realtime-sync.js"></script>

<script>
// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicjalizacja Real-time Sync...');
  
  // Sprawdź czy Firebase jest dostępny
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase nie jest załadowany');
    return;
  }
  
  // Sprawdź czy Firebase jest zainicjalizowany
  if (!firebase.apps.length) {
    console.warn('⚠️ Firebase nie jest zainicjalizowany, czekam...');
    // Poczekaj na inicjalizację Firebase
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Sprawdź czy tryb Firebase jest włączony
  const state = window.store ? window.store.get() : window.state;
  if (state.settings && state.settings.mode !== 'firebase') {
    console.log('ℹ️ Firebase mode wyłączony, pomijam real-time sync');
    return;
  }
  
  // Inicjalizuj real-time sync
  try {
    await window.firebaseRealtimeSync.init({
      enableRealtime: true,
      enableOffline: true,
      conflictStrategy: 'last-write-wins',
      retryAttempts: 3,
      retryDelay: 1000
    });
    
    console.log('✅ Real-time Sync zainicjalizowany');
    
    // Update UI status co 5 sekund
    setInterval(() => {
      window.firebaseRealtimeSync.updateSyncStatus();
    }, 5000);
    
  } catch (error) {
    console.error('❌ Błąd inicjalizacji Real-time Sync:', error);
  }
});
</script>
```

---

## 6. Najlepsze praktyki

### ✅ DO:

1. **Zawsze używaj timestamp**
   ```javascript
   // Dodaj timestamp do każdej zmiany
   document._lastModified = Date.now();
   document._modifiedBy = getCurrentUserId();
   ```

2. **Graceful degradation**
   ```javascript
   // Fallback gdy Firebase nie działa
   if (!firebase || !firebase.firestore) {
     console.warn('Firebase niedostępny, używam localStorage');
     return saveToLocalStorage(data);
   }
   ```

3. **Debounce częste zmiany**
   ```javascript
   // Nie zapisuj co keystroke, użyj debounce
   const debouncedSave = debounce(saveToDB, 500);
   ```

4. **Validate before save**
   ```javascript
   // Zawsze waliduj dane przed zapisem
   if (!validateOrder(order)) {
     throw new Error('Invalid order data');
   }
   ```

5. **Log wszystko**
   ```javascript
   // Szczegółowe logi ułatwiają debugging
   console.log('[RealtimeSync] Operation:', operation);
   console.log('[RealtimeSync] Data:', data);
   ```

### ❌ DON'T:

1. **Nie zapisuj za często**
   ```javascript
   // ❌ ZŁE: Zapis co keystroke
   input.addEventListener('keyup', () => saveToDB(state));
   
   // ✅ DOBRE: Debounce
   input.addEventListener('keyup', debounce(() => saveToDB(state), 500));
   ```

2. **Nie ignoruj błędów**
   ```javascript
   // ❌ ZŁE: Ignorowanie błędów
   try { await saveToDB(state); } catch(e) {}
   
   // ✅ DOBRE: Obsługa błędów
   try {
     await saveToDB(state);
   } catch(error) {
     handleSaveError(error);
     showErrorNotification(error.message);
   }
   ```

3. **Nie sync'uj wszystkiego**
   ```javascript
   // ❌ ZŁE: Sync całego state co sekundę
   setInterval(() => saveToDB(state), 1000);
   
   // ✅ DOBRE: Sync tylko co się zmieniło
   if (hasChanges(state, previousState)) {
     saveChangedCollections(state, previousState);
   }
   ```

4. **Nie blokuj UI**
   ```javascript
   // ❌ ZŁE: Czekaj na zapis przed update UI
   await saveToDB(state);
   updateUI();
   
   // ✅ DOBRE: Optimistic update
   updateUI(); // Od razu
   saveToDB(state); // W tle
   ```

---

## 7. Możliwe pułapki

### 🐛 Pułapka 1: Race Conditions

**Problem:**
```javascript
// User A i User B edytują to samo zlecenie jednocześnie
// Oba zapisy trafiają do Firestore prawie w tym samym czasie
// Jeden zapis nadpisuje drugi
```

**Rozwiązanie:**
```javascript
// Używaj transactions dla atomic updates
const db = firebase.firestore();
await db.runTransaction(async (transaction) => {
  const docRef = db.collection('orders').doc(orderId);
  const doc = await transaction.get(docRef);
  
  if (!doc.exists) {
    throw new Error('Document does not exist!');
  }
  
  const currentVersion = doc.data()._version || 0;
  const newVersion = currentVersion + 1;
  
  transaction.update(docRef, {
    ...updates,
    _version: newVersion,
    _lastModified: Date.now()
  });
});
```

### 🐛 Pułapka 2: Memory Leaks

**Problem:**
```javascript
// Listener nie został unsubscribed
// Powoduje memory leak
```

**Rozwiązanie:**
```javascript
// Zawsze cleanupuj listeners
function stopListening(collectionName) {
  const listener = syncState.listeners.get(collectionName);
  if (listener) {
    listener.unsubscribe(); // ← WAŻNE!
    syncState.listeners.delete(collectionName);
    console.log(`🛑 Listener stopped: ${collectionName}`);
  }
}

// Cleanup przy navigation away
window.addEventListener('beforeunload', () => {
  syncState.listeners.forEach((listener, name) => {
    listener.unsubscribe();
  });
});
```

### 🐛 Pułapka 3: Quota Exceeded

**Problem:**
```javascript
// Offline persistence cache się zapełnia
// QuotaExceededError
```

**Rozwiązanie:**
```javascript
// Monitoruj rozmiar cache
db.getAll().then(docs => {
  const size = new Blob([JSON.stringify(docs)]).size;
  console.log('Cache size:', size, 'bytes');
  
  if (size > 50 * 1024 * 1024) { // 50MB
    console.warn('Cache too large, clearing...');
    db.clearPersistence();
  }
});
```

### 🐛 Pułapka 4: Infinite Loop

**Problem:**
```javascript
// onSnapshot wywołuje update, który wywołuje onSnapshot...
```

**Rozwiązanie:**
```javascript
// Flag aby ignorować własne zmiany
let isUpdating = false;

function handleSnapshot(snapshot) {
  if (isUpdating) {
    console.log('Ignoring own update');
    return;
  }
  
  // Process changes...
}

async function updateDocument(docId, updates) {
  isUpdating = true;
  await docRef.update(updates);
  setTimeout(() => { isUpdating = false; }, 1000);
}
```

---

## 8. Testowanie

### 8.1 Unit Tests

```javascript
// tests/firebase-realtime-sync.test.js

describe('Firebase Real-time Sync', () => {
  
  test('should resolve conflict with last-write-wins', () => {
    const local = {
      id: 'order1',
      name: 'Order A',
      _lastModified: 1000
    };
    
    const remote = {
      id: 'order1',
      name: 'Order B',
      _lastModified: 2000
    };
    
    const resolved = resolveConflict(local, remote, 'last-write-wins');
    
    expect(resolved.name).toBe('Order B'); // Remote is newer
    expect(resolved._conflictResolved).toBe(true);
  });
  
  test('should merge arrays without duplicates', () => {
    const local = [
      { id: '1', name: 'Task A' },
      { id: '2', name: 'Task B' }
    ];
    
    const remote = [
      { id: '2', name: 'Task B' },
      { id: '3', name: 'Task C' }
    ];
    
    const merged = mergeArrays(local, remote);
    
    expect(merged).toHaveLength(3);
    expect(merged.map(t => t.id)).toEqual(['1', '2', '3']);
  });
  
  test('should track pending writes', () => {
    trackPendingWrite('orders', 'order1', 'update', { name: 'New Name' });
    
    expect(syncState.pendingWrites.size).toBe(1);
    expect(syncState.pendingWrites.has('orders/order1')).toBe(true);
    
    clearPendingWrite('orders', 'order1');
    
    expect(syncState.pendingWrites.size).toBe(0);
  });
});
```

### 8.2 Integration Tests

```javascript
// tests/firebase-sync-integration.test.js

describe('Firebase Sync Integration', () => {
  
  test('should sync order changes between clients', async () => {
    // Client A creates order
    const orderA = {
      id: 'order1',
      name: 'Test Order',
      quantity: 10
    };
    
    await clientA.createOrder(orderA);
    
    // Wait for sync
    await waitForSync();
    
    // Client B should see the order
    const orderB = await clientB.getOrder('order1');
    
    expect(orderB).toBeDefined();
    expect(orderB.name).toBe('Test Order');
    expect(orderB.quantity).toBe(10);
  });
  
  test('should handle offline mode', async () => {
    // Go offline
    await goOffline();
    
    // Update order offline
    await updateOrder('order1', { quantity: 20 });
    
    // Changes should be queued
    expect(syncState.pendingWrites.size).toBe(1);
    
    // Go online
    await goOnline();
    await waitForSync();
    
    // Changes should be synced
    expect(syncState.pendingWrites.size).toBe(0);
    
    const order = await getOrder('order1');
    expect(order.quantity).toBe(20);
  });
  
  test('should resolve conflicts correctly', async () => {
    // Client A updates
    await clientA.updateOrder('order1', { 
      name: 'Name from A',
      _lastModified: 1000
    });
    
    // Client B updates (newer)
    await clientB.updateOrder('order1', { 
      name: 'Name from B',
      _lastModified: 2000
    });
    
    await waitForSync();
    
    // Both clients should have the newer version
    const orderA = await clientA.getOrder('order1');
    const orderB = await clientB.getOrder('order1');
    
    expect(orderA.name).toBe('Name from B');
    expect(orderB.name).toBe('Name from B');
  });
});
```

### 8.3 E2E Tests (Playwright)

```javascript
// tests/e2e/realtime-sync.spec.js

import { test, expect } from '@playwright/test';

test('real-time sync between two browser contexts', async ({ browser }) => {
  // Create two contexts (two users)
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  
  // Login both users
  await pageA.goto('http://localhost:5500');
  await pageB.goto('http://localhost:5500');
  
  // User A creates order
  await pageA.click('button[data-nav="order"]');
  await pageA.fill('#o-name', 'Test Order 123');
  await pageA.fill('#o-qty', '5');
  await pageA.click('button[type="submit"]');
  
  // Wait for sync
  await pageA.waitForTimeout(2000);
  
  // User B should see the order
  await pageB.click('button[data-nav="order"]');
  
  const orderRow = await pageB.locator('text=Test Order 123');
  await expect(orderRow).toBeVisible();
  
  await contextA.close();
  await contextB.close();
});

test('offline mode with sync recovery', async ({ page }) => {
  await page.goto('http://localhost:5500');
  
  // Go offline
  await page.context().setOffline(true);
  
  // Create order offline
  await page.click('button[data-nav="order"]');
  await page.fill('#o-name', 'Offline Order');
  await page.click('button[type="submit"]');
  
  // Check sync status shows pending
  const syncStatus = await page.locator('#sync-status');
  await expect(syncStatus).toContainText('Synchronizacja');
  
  // Go online
  await page.context().setOffline(false);
  await page.waitForTimeout(3000);
  
  // Check sync status shows synced
  await expect(syncStatus).toContainText('Zsynchronizowane');
});
```

---

## 9. Metryki sukcesu

### KPI do śledzenia:

| Metryka | Target | Jak mierzyć |
|---------|--------|-------------|
| **Sync latency** | <1s | Timestamp różnica remote vs local |
| **Conflict rate** | <1% | Liczba konfliktów / total updates |
| **Offline queue size** | <100 | syncState.pendingWrites.size |
| **Error rate** | <0.1% | syncState.errors.size / total operations |
| **Unsubscribe leaks** | 0 | syncState.listeners.size przy cleanup |

### Monitoring:

```javascript
// Dodaj do production-monitor.js

function getRealtimeSyncMetrics() {
  const metrics = {
    status: window.firebaseRealtimeSync.getStatus(),
    listeners: window.firebaseRealtimeSync.getSyncState().listeners.size,
    pendingWrites: window.firebaseRealtimeSync.getSyncState().pendingWrites.size,
    errors: window.firebaseRealtimeSync.getSyncState().errors.size,
    lastSync: window.firebaseRealtimeSync.getSyncState().lastSync,
    latency: Date.now() - (window.firebaseRealtimeSync.getSyncState().lastSync || 0)
  };
  
  console.log('📊 Real-time Sync Metrics:', metrics);
  
  return metrics;
}

// Monitor co 30 sekund
setInterval(() => {
  const metrics = getRealtimeSyncMetrics();
  
  // Alert jeśli latency > 5s
  if (metrics.latency > 5000) {
    console.warn('⚠️ High sync latency:', metrics.latency, 'ms');
  }
  
  // Alert jeśli pending writes > 50
  if (metrics.pendingWrites > 50) {
    console.warn('⚠️ Too many pending writes:', metrics.pendingWrites);
  }
}, 30000);
```

---

## 10. Definition of Done

Zadanie jest ukończone gdy:

- ✅ Kod zaimplementowany zgodnie z wymaganiami
- ✅ onSnapshot listeners działają dla wszystkich kolekcji
- ✅ Conflict resolution (LWW + Merge) działa poprawnie
- ✅ Optimistic updates z rollback przy błędzie
- ✅ Offline persistence enabled
- ✅ Pending writes tracking
- ✅ UI sync status indicator
- ✅ Unit tests (coverage >80%)
- ✅ Integration tests (E2E scenarios)
- ✅ Performance tests (latency <1s)
- ✅ Dokumentacja zaktualizowana
- ✅ Code review przeprowadzony
- ✅ QA testing completed
- ✅ Production deployment successful

---

## 11. Kolejne kroki (po S1-T1)

Po ukończeniu Real-time Sync:

1. **S1-T2:** Detekcja konfliktów zasobów
2. **S1-T3:** Algorytm auto-assign
3. **S1-T4:** Testy E2E

---

**Przygotował:** AI Assistant  
**Data:** 2 listopada 2025  
**Sprint:** Sprint 1  
**Zadanie:** S1-T1 - Firebase Real-time Sync  
**Status:** 📋 Gotowe do implementacji

