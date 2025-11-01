// js/firebase.js
/* global firebase */

// Debug mode - set to true for verbose logging
let DEBUG_MODE = false;

// Track operation history for debugging
const operationHistory = [];
const MAX_HISTORY = 50;

function logDebug(operation, details) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, operation, ...details };
  
  operationHistory.push(entry);
  // Batch remove old entries when limit is exceeded
  if (operationHistory.length > MAX_HISTORY + 10) {
    operationHistory.splice(0, 10);
  }
  
  if (DEBUG_MODE) {
    console.log(`🔍 [Firebase Debug] ${operation}:`, details);
  }
}

function logError(operation, error, context) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    error: error.message || error,
    code: error.code,
    context,
    isNetworkError: isNetworkError(error),
    isAuthError: isAuthError(error),
    isPermissionError: isPermissionError(error)
  };
  
  console.error(`❌ [Firebase Error] ${operation}:`, errorInfo);
  
  operationHistory.push({
    timestamp,
    operation: `${operation}_ERROR`,
    ...errorInfo
  });
}

// Network error detection
function isNetworkError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  
  return code === 'unavailable' ||
         code === 'deadline-exceeded' ||
         code === 'cancelled' ||
         message.includes('network') ||
         message.includes('offline') ||
         message.includes('connection') ||
         message.includes('timeout') ||
         message.includes('fetch');
}

function isAuthError(error) {
  if (!error) return false;
  const code = error.code || '';
  
  return code.includes('auth') ||
         code === 'unauthenticated' ||
         code === 'permission-denied';
}

function isPermissionError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  
  return code === 'permission-denied' ||
         code === 'insufficient-permissions' ||
         message.includes('permission') ||
         message.includes('access denied');
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

// Retry with exponential backoff
async function retryWithBackoff(operation, operationFn, context = {}) {
  let lastError;
  let delay = RETRY_CONFIG.initialDelay;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      logDebug(`${operation}_ATTEMPT`, { attempt, maxAttempts: RETRY_CONFIG.maxAttempts, ...context });
      
      const result = await operationFn();
      
      if (attempt > 1) {
        console.log(`✅ ${operation} succeeded on attempt ${attempt}`);
        logDebug(`${operation}_RETRY_SUCCESS`, { attempt, ...context });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      const shouldRetry = isNetworkError(error) && attempt < RETRY_CONFIG.maxAttempts;
      
      if (shouldRetry) {
        console.warn(`⚠️ ${operation} failed (attempt ${attempt}/${RETRY_CONFIG.maxAttempts}), retrying in ${delay}ms...`);
        logDebug(`${operation}_RETRY_WAIT`, { 
          attempt, 
          delay, 
          error: error.message,
          isNetworkError: isNetworkError(error),
          ...context 
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
      } else {
        if (!shouldRetry && isNetworkError(error)) {
          console.error(`❌ ${operation} failed after ${attempt} attempts (network error)`);
        }
        logError(operation, error, { attempt, ...context });
        throw error;
      }
    }
  }
  
  throw lastError;
}

async function ensureAuth() {
  const startTime = Date.now();
  const auth = firebase.auth();
  
  try {
    if (!auth.currentUser) {
      console.log('🔐 Brak zalogowanego użytkownika. Próba logowania anonimowego...');
      logDebug('AUTH_START', { method: 'anonymous' });
      
      await auth.signInAnonymously();
      
      const duration = Date.now() - startTime;
      console.log('✅ Zalogowano anonimowo:', auth.currentUser?.uid);
      logDebug('AUTH_SUCCESS', { 
        method: 'anonymous', 
        userId: auth.currentUser?.uid,
        duration 
      });
    } else {
      console.log('✅ Użytkownik już zalogowany:', auth.currentUser?.uid);
      logDebug('AUTH_EXISTING', { userId: auth.currentUser?.uid });
    }
    return auth.currentUser;
  } catch (error) {
    logError('AUTH', error, { method: 'anonymous' });
    throw error;
  }
}

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Nie udało się wczytać ' + src));
    document.head.appendChild(s);
  });
}

export async function ensureFirebase(config) {
  const startTime = Date.now();
  logDebug('INIT_START', { hasConfig: !!config, configKeys: config ? Object.keys(config) : [] });
  
  // If firebase SDK isn't present, try to load compat scripts dynamically (same versions used in index.html)
  if (typeof firebase === 'undefined') {
    try {
      console.log('📦 Firebase SDK nie załadowany. Próba dynamicznego wczytania...');
      logDebug('SDK_LOAD_START', {});
      
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js');
      
      const loadDuration = Date.now() - startTime;
      console.log('✅ Firebase SDK załadowany.');
      logDebug('SDK_LOAD_SUCCESS', { duration: loadDuration });
    } catch (e) {
      logError('SDK_LOAD', e, {});
      throw new Error('Firebase SDK nie jest dostępny: ' + e.message);
    }
  }

  try {
    if (!firebase.apps.length) {
      if (!config || !config.apiKey) {
        const error = new Error('Brak konfiguracji Firebase lub klucza API.');
        logError('INIT_CONFIG', error, { hasConfig: !!config });
        throw error;
      }
      
      console.log('🔧 Inicjalizacja Firebase z konfiguracją...');
      logDebug('INIT_CONFIG', { 
        projectId: config.projectId, 
        authDomain: config.authDomain 
      });
      
      firebase.initializeApp(config);
      logDebug('INIT_APP_SUCCESS', {});
    }
    
    await ensureAuth();
    
    const totalDuration = Date.now() - startTime;
    console.log(`✅ Firebase zainicjalizowany i uwierzytelniony (${totalDuration}ms).`);
    logDebug('INIT_COMPLETE', { duration: totalDuration });
    
    return true;
  } catch (e) {
    logError('INIT', e, { hasConfig: !!config });
    throw e;
  }
}

function getDbRoot(appId, userId) {
  return firebase.firestore()
    .collection('planner')
    .doc(appId)
    .collection('users')
    .doc(userId);
}

const collections = ['employees', 'operationsCatalog', 'processes', 'orders', 'tasks', 'taskProcessMap', 'taskOrderMap', 'after'];

// Expose debugging tools globally
export function enableDebugMode(enabled = true) {
  DEBUG_MODE = enabled;
  console.log(`🔍 Firebase debug mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return DEBUG_MODE;
}

export function getOperationHistory() {
  return [...operationHistory];
}

export function clearOperationHistory() {
  operationHistory.length = 0;
  console.log('🗑️ Operation history cleared');
}

export function printOperationHistory() {
  console.table(operationHistory);
}

export function getRetryConfig() {
  return { ...RETRY_CONFIG };
}

export function setRetryConfig(config) {
  // Validate input
  if (config.maxAttempts !== undefined) {
    if (typeof config.maxAttempts !== 'number' || config.maxAttempts < 1) {
      throw new Error('maxAttempts must be a positive number');
    }
  }
  if (config.initialDelay !== undefined) {
    if (typeof config.initialDelay !== 'number' || config.initialDelay < 0) {
      throw new Error('initialDelay must be a non-negative number');
    }
  }
  if (config.maxDelay !== undefined) {
    if (typeof config.maxDelay !== 'number' || config.maxDelay < 0) {
      throw new Error('maxDelay must be a non-negative number');
    }
  }
  if (config.backoffMultiplier !== undefined) {
    if (typeof config.backoffMultiplier !== 'number' || config.backoffMultiplier < 1) {
      throw new Error('backoffMultiplier must be >= 1');
    }
  }
  
  Object.assign(RETRY_CONFIG, config);
  console.log('🔧 Retry configuration updated:', RETRY_CONFIG);
  return { ...RETRY_CONFIG };
}

export function getNetworkStatus() {
  const recentOps = operationHistory.slice(-20);
  const errors = recentOps.filter(op => op.operation.includes('ERROR'));
  const networkErrors = errors.filter(op => op.isNetworkError);
  const authErrors = errors.filter(op => op.isAuthError);
  
  return {
    recentOperations: recentOps.length,
    totalErrors: errors.length,
    networkErrors: networkErrors.length,
    authErrors: authErrors.length,
    hasRecentNetworkIssues: networkErrors.length > 0,
    lastNetworkError: networkErrors[networkErrors.length - 1] || null,
    online: navigator.onLine
  };
}

export async function compareLocalAndRemoteData(state) {
  const { appId, userId } = state.storage;
  if (!appId || !userId) {
    const error = new Error('Cannot compare: missing appId or userId');
    console.error('❌', error.message);
    throw error;
  }
  
  console.log('🔄 Comparing local vs remote data...');
  const startTime = Date.now();
  
  try {
    const dbRoot = getDbRoot(appId, userId);
    
    // Get remote metadata
    const metadataSnap = await dbRoot.collection('metadata').doc('sync').get();
    const remoteMetadata = metadataSnap.exists ? metadataSnap.data() : null;
    
    // Get remote collection counts
    const remoteCounts = {};
    for (const collName of collections) {
      const snap = await dbRoot.collection(collName).get();
      remoteCounts[collName] = snap.size;
    }
    
    // Get local counts
    const localCounts = {};
    collections.forEach(collName => {
      const data = state[collName];
      if (Array.isArray(data)) {
        localCounts[collName] = data.length;
      } else if (typeof data === 'object' && data !== null) {
        localCounts[collName] = Object.keys(data).length;
      } else {
        localCounts[collName] = 0;
      }
    });
    
    const comparison = {
      appId,
      userId,
      local: {
        timestamp: state.lastModified || 'N/A',
        counts: localCounts
      },
      remote: {
        timestamp: remoteMetadata?.lastModified || 'N/A',
        saveTime: remoteMetadata?.lastSaveTime || 'N/A',
        counts: remoteCounts
      },
      differences: {}
    };
    
    // Find differences
    collections.forEach(collName => {
      const local = localCounts[collName] || 0;
      const remote = remoteCounts[collName] || 0;
      if (local !== remote) {
        comparison.differences[collName] = {
          local,
          remote,
          delta: local - remote
        };
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Comparison complete (${duration}ms)`);
    console.table(comparison.differences);
    console.log('Local timestamp:', new Date(comparison.local.timestamp).toISOString());
    console.log('Remote timestamp:', new Date(comparison.remote.timestamp).toISOString());
    
    return comparison;
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    logError('COMPARE', error, { appId, userId });
    throw error;
  }
}

// Verify data consistency after save
export async function verifyDataConsistency(state) {
  console.log('🔍 Verifying data consistency...');
  const comparison = await compareLocalAndRemoteData(state);
  
  if (!comparison) {
    return false;
  }
  
  const hasDifferences = Object.keys(comparison.differences).length > 0;
  
  if (hasDifferences) {
    console.warn('⚠️ Data inconsistencies detected:', comparison.differences);
    return false;
  }
  
  console.log('✅ Data is consistent between local and remote');
  return true;
}

// Funkcja zapisu do Firebase
export async function saveToDB(state) {
  const startTime = Date.now();
  const { appId, userId } = state.storage;
  
  if (!appId || !userId) {
    const msg = 'saveToDB: missing appId or userId in state.storage';
    console.error('❌', msg, state && state.storage);
    logError('SAVE_VALIDATION', new Error(msg), { appId, userId });
    throw new Error(msg);
  }

  const dbRoot = getDbRoot(appId, userId);
  const db = firebase.firestore();
  const batch = db.batch();
  
  // Track what we're saving for debugging
  const saveSummary = {};
  let totalDocuments = 0;

  try {
    console.log(`💾 Rozpoczęcie zapisu do Firebase (appId: ${appId}, userId: ${userId})...`);
    logDebug('SAVE_START', { 
      appId, 
      userId, 
      timestamp: state.lastModified || Date.now() 
    });

    collections.forEach((name) => {
      const arr = state[name] || [];
      let collectionDocCount = 0;
      
      if (typeof arr === 'object' && !Array.isArray(arr)) {
        Object.keys(arr).forEach((key) => {
          const docRef = dbRoot.collection(name).doc(key);
          const dataToSave = { id: key, value: arr[key] };
          batch.set(docRef, JSON.parse(JSON.stringify(dataToSave)), { merge: true });
          collectionDocCount++;
          totalDocuments++;
        });
      } else {
        arr.forEach((item) => {
          const id = item.id || `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
          const docRef = dbRoot.collection(name).doc(id);
          const dataToSave = { ...item, id };
          batch.set(docRef, JSON.parse(JSON.stringify(dataToSave)), { merge: true });
          collectionDocCount++;
          totalDocuments++;
        });
      }
      
      saveSummary[name] = collectionDocCount;
    });
    
    logDebug('SAVE_BATCH_PREPARED', { 
      collections: saveSummary, 
      totalDocuments 
    });
    
    // Save metadata with timestamp
    const metadataRef = dbRoot.collection('metadata').doc('sync');
    const syncMetadata = {
      lastModified: state.lastModified || Date.now(),
      lastSaveTime: Date.now(),
      documentCounts: saveSummary,
      totalDocuments
    };
    batch.set(metadataRef, syncMetadata, { merge: true });
    
    // Commit with retry on network errors
    await retryWithBackoff('SAVE_COMMIT', () => batch.commit(), { 
      appId, 
      userId, 
      totalDocuments 
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Zapisano ${totalDocuments} dokumentów do Firebase (${duration}ms)`);
    logDebug('SAVE_SUCCESS', { 
      duration, 
      collections: saveSummary, 
      totalDocuments,
      timestamp: syncMetadata.lastModified
    });
    
    return true;
  } catch (e) {
    const duration = Date.now() - startTime;
    console.error(`❌ Błąd zapisu do Firebase po ${duration}ms:`, e);
    logError('SAVE_COMMIT', e, { 
      appId, 
      userId, 
      collections: saveSummary, 
      totalDocuments,
      duration 
    });
    throw e;
  }
}

// Funkcja odczytu z Firebase
export async function loadFromDB(state) {
  const startTime = Date.now();
  const { appId, userId } = state.storage;
  
  if (!appId || !userId) {
    const msg = 'loadFromDB: missing appId or userId';
    logError('LOAD_VALIDATION', new Error(msg), { appId, userId });
    throw new Error(msg);
  }
  
  console.log(`📥 Rozpoczęcie wczytywania z Firebase (appId: ${appId}, userId: ${userId})...`);
  logDebug('LOAD_START', { appId, userId });
  
  try {
    const dbRoot = getDbRoot(appId, userId);
    
    // First, load metadata to compare timestamps (with retry)
    let remoteTimestamp = null;
    try {
      const metadataSnap = await retryWithBackoff(
        'LOAD_METADATA',
        () => dbRoot.collection('metadata').doc('sync').get(),
        { appId, userId }
      );
      
      if (metadataSnap.exists) {
        const metadata = metadataSnap.data();
        remoteTimestamp = metadata.lastModified || metadata.lastSaveTime;
        logDebug('LOAD_METADATA', { 
          remoteTimestamp, 
          remoteSaveTime: metadata.lastSaveTime,
          documentCounts: metadata.documentCounts 
        });
      }
    } catch (metaError) {
      console.warn('⚠️ Nie można wczytać metadanych:', metaError.message);
      logDebug('LOAD_METADATA_WARNING', { error: metaError.message });
    }
    
    // Check if we should skip loading due to newer local data
    const localTimestamp = state.lastModified;
    if (localTimestamp && remoteTimestamp && localTimestamp > remoteTimestamp) {
      const timeDiff = localTimestamp - remoteTimestamp;
      console.warn(`⚠️ Lokalne dane nowsze (${timeDiff}ms) - POMIJAM wczytywanie z Firebase`);
      logDebug('LOAD_SKIPPED', { 
        reason: 'local_newer', 
        localTimestamp, 
        remoteTimestamp, 
        timeDiff 
      });
      return null;
    }
    
    // Load collections with retry
    const snaps = await retryWithBackoff(
      'LOAD_COLLECTIONS',
      () => Promise.all(collections.map((name) => dbRoot.collection(name).get())),
      { appId, userId, collectionCount: collections.length }
    );
    
    const data = {};
    const loadSummary = {};
    let totalDocuments = 0;
    
    snaps.forEach((snap, idx) => {
      const coll = collections[idx];
      if (coll === 'taskProcessMap' || coll === 'taskOrderMap') {
        data[coll] = {};
        snap.docs.forEach((d) => {
          data[coll][d.id] = d.data().value;
        });
        loadSummary[coll] = Object.keys(data[coll]).length;
      } else {
        data[coll] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        loadSummary[coll] = data[coll].length;
      }
      totalDocuments += loadSummary[coll];
    });
    
    // Add timestamp to loaded data
    if (remoteTimestamp) {
      data.lastModified = remoteTimestamp;
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Wczytano ${totalDocuments} dokumentów z Firebase (${duration}ms)`);
    logDebug('LOAD_SUCCESS', { 
      duration, 
      collections: loadSummary, 
      totalDocuments,
      remoteTimestamp,
      localTimestamp
    });
    
    return data;
  } catch (e) {
    const duration = Date.now() - startTime;
    console.error(`❌ Błąd wczytywania z Firebase po ${duration}ms:`, e);
    logError('LOAD', e, { appId, userId, duration });
    throw e;
  }
}

// Expose debugging tools globally for console use
if (typeof window !== 'undefined') {
  window.firebaseDebug = {
    enableDebugMode,
    getOperationHistory,
    clearOperationHistory,
    printOperationHistory,
    compareLocalAndRemoteData,
    verifyDataConsistency,
    getRetryConfig,
    setRetryConfig,
    getNetworkStatus
  };
  
  console.log('🔧 Firebase debugging tools available: window.firebaseDebug');
  console.log('  - enableDebugMode(true/false) - Toggle verbose logging');
  console.log('  - getOperationHistory() - Get operation log');
  console.log('  - printOperationHistory() - Print operations as table');
  console.log('  - compareLocalAndRemoteData(state) - Compare local vs remote');
  console.log('  - verifyDataConsistency(state) - Verify data is synced');
  console.log('  - getRetryConfig() - Get retry settings');
  console.log('  - setRetryConfig({maxAttempts, initialDelay, etc}) - Update retry');
  console.log('  - getNetworkStatus() - Check network error status');
}
