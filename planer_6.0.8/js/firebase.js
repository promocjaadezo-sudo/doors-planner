// js/firebase.js

async function ensureAuth() {
  const auth = firebase.auth();
  if (!auth.currentUser) {
    console.log('Brak zalogowanego użytkownika. Próba logowania anonimowego...');
    await auth.signInAnonymously();
    console.log('Zalogowano anonimowo:', auth.currentUser);
  } else {
    console.log('Użytkownik już zalogowany:', auth.currentUser);
  }
  return auth.currentUser;
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
  // If firebase SDK isn't present, try to load compat scripts dynamically (same versions used in index.html)
  if (typeof firebase === 'undefined') {
    try {
      console.log('Firebase SDK nie załadowany. Próba dynamicznego wczytania...');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js');
      console.log('Firebase SDK załadowany.');
    } catch (e) {
      console.error('Błąd podczas ładowania Firebase SDK:', e);
      throw new Error('Firebase SDK nie jest dostępny: ' + e.message);
    }
  }

  try {
    if (!firebase.apps.length) {
      if (!config || !config.apiKey) {
        throw new Error('Brak konfiguracji Firebase lub klucza API.');
      }
      console.log('Inicjalizacja Firebase z konfiguracją:', config);
      firebase.initializeApp(config);
    }
    await ensureAuth();
    console.log('Firebase zainicjalizowany i uwierzytelniony.');
    return true;
  } catch (e) {
    console.error('Błąd inicjalizacji Firebase:', e);
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

// Funkcja zapisu do Firebase
export async function saveToDB(state) {
  const { appId, userId } = state.storage;
  if (!appId || !userId) {
    const msg = 'saveToDB: missing appId or userId in state.storage';
    console.error(msg, state && state.storage);
    throw new Error(msg);
  }

  const dbRoot = getDbRoot(appId, userId);
  const db = firebase.firestore();
  const batch = db.batch();

  try {
    collections.forEach((name) => {
      const arr = state[name] || [];
      if (typeof arr === 'object' && !Array.isArray(arr)) {
        Object.keys(arr).forEach((key) => {
          const docRef = dbRoot.collection(name).doc(key);
          const dataToSave = { id: key, value: arr[key] };
          batch.set(docRef, JSON.parse(JSON.stringify(dataToSave)), { merge: true });
        });
      } else {
        arr.forEach((item) => {
          const id = item.id || `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
          const docRef = dbRoot.collection(name).doc(id);
          const dataToSave = { ...item, id };
          batch.set(docRef, JSON.parse(JSON.stringify(dataToSave)), { merge: true });
        });
      }
    });
    await batch.commit();
    return true;
  } catch (e) {
    console.error('saveToDB commit error:', e);
    throw e;
  }
}

// Funkcja odczytu z Firebase
export async function loadFromDB(state) {
  const { appId, userId } = state.storage;
  const dbRoot = getDbRoot(appId, userId);
  const snaps = await Promise.all(collections.map((name) => dbRoot.collection(name).get()));

  const data = {};
  snaps.forEach((snap, idx) => {
    const coll = collections[idx];
    if (coll === 'taskProcessMap' || coll === 'taskOrderMap') {
      data[coll] = {};
      snap.docs.forEach((d) => {
        data[coll][d.id] = d.data().value;
      });
    } else {
      data[coll] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  });
  return data;
}
