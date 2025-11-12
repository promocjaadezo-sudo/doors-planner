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
  const normalizedDeleted = Array.isArray(state._deletedOrderIds)
    ? Array.from(new Set(state._deletedOrderIds.filter(Boolean)))
    : [];

  try {
    for (const name of collections) {
      const source = state[name];
      const collRef = dbRoot.collection(name);
      const keepIds = new Set();

      if (Array.isArray(source)) {
        source.forEach((item) => {
          if (!item) return;
          if (!item.id) {
            item.id = `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
          }
          keepIds.add(item.id);
          batch.set(collRef.doc(item.id), JSON.parse(JSON.stringify({ ...item, id: item.id })), { merge: true });
        });
      } else if (source && typeof source === 'object') {
        Object.entries(source).forEach(([key, value]) => {
          if (!key) return;
          keepIds.add(key);
          const payload = { id: key, value };
          batch.set(collRef.doc(key), JSON.parse(JSON.stringify(payload)), { merge: true });
        });
      }

      const snapshot = await collRef.get();
      snapshot.forEach((doc) => {
        if (!keepIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
    }

    const metadataRef = dbRoot.collection('metadata').doc('sync');
    const nowTs = Date.now();
    const lastModifiedTs = state.lastModified || nowTs;
    batch.set(
      metadataRef,
      {
        lastModified: lastModifiedTs,
        lastSync: nowTs,
        source: 'planner',
        deletedOrderIds: normalizedDeleted
      },
      { merge: true }
    );

    await batch.commit();
    state._deletedOrderIds = normalizedDeleted;
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
  const metadataDoc = await dbRoot.collection('metadata').doc('sync').get();
  const metadata = metadataDoc.exists ? metadataDoc.data() || {} : {};
  const deletedIds = Array.isArray(metadata.deletedOrderIds) ? metadata.deletedOrderIds.filter(Boolean) : [];
  const deletedSet = new Set(deletedIds);
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
      const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (coll === 'orders') {
        data[coll] = mapped.filter((item) => item && !deletedSet.has(item.id));
      } else if (coll === 'tasks') {
        data[coll] = mapped.filter((item) => item && !deletedSet.has(item.orderId));
      } else if (coll === 'after') {
        data[coll] = mapped.filter((item) => item && !deletedSet.has(item.order));
      } else {
        data[coll] = mapped;
      }
    }
  });
  data._deletedOrderIds = deletedIds;
  return data;
}
