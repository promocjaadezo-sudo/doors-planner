/**
 * Firebase Sync Queue - Niezawodna synchronizacja z Firebase
 * 
 * Cechy:
 * - Kolejka operacji
 * - Retry przy błędach
 * - Automatyczna synchronizacja
 * - Logowanie dla debugowania
 */

class FirebaseSyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1s
    this.isEnabled = false;
    
    console.log('🔄 [SyncQueue] Zainicjalizowano');
  }
  
  /**
   * Włącz synchronizację Firebase
   */
  enable() {
    const wasDisabled = !this.isEnabled;
    this.isEnabled = true;
    console.log('✅ [SyncQueue] Synchronizacja włączona');
    if (wasDisabled && this.queue.length) {
      console.log(`🔁 [SyncQueue] Wznawiam przetwarzanie oczekujących operacji (${this.queue.length})`);
    }
    this.processQueue();
  }
  
  /**
   * Wyłącz synchronizację Firebase
   */
  disable() {
    this.isEnabled = false;
    if (this.queue.length) {
      console.log(`⏸️ [SyncQueue] Synchronizacja wyłączona (oczekuje: ${this.queue.length})`);
    } else {
      console.log('⏸️ [SyncQueue] Synchronizacja wyłączona');
    }
  }
  
  /**
   * Dodaj operację do kolejki
   * @param {string} type - Typ operacji: 'save' | 'delete' | 'update'
   * @param {object} data - Dane do synchronizacji
   * @param {number} priority - Priorytet (wyższy = ważniejsze)
   */
  enqueue(type, data, priority = 0) {
    if (!this.isEnabled) {
      console.warn(`⏸️ [SyncQueue] Kolejka wyłączona – automatyczne anulowanie operacji: ${type}`);
      return;
    }

    let payload = data;
    if (data && typeof data === 'object' && data.state) {
      try {
        payload = { ...data, state: JSON.parse(JSON.stringify(data.state)) };
      } catch (cloneErr) {
        console.warn('⚠️ [SyncQueue] Nie udało się sklonować state, używam referencji bezpośredniej', cloneErr && cloneErr.message);
      }
    }
    
    const operation = {
      id: Date.now() + Math.random(),
      type,
      data: payload,
      priority,
      attempts: 0,
      timestamp: Date.now()
    };
    
    this.queue.push(operation);
    this.queue.sort((a, b) => b.priority - a.priority); // Sortuj po priorytecie

    console.log(`➕ [SyncQueue] Dodano operację: ${type}`, {
      queue_length: this.queue.length,
      priority
    });

    // Rozpocznij przetwarzanie jeśli nie jest aktywne
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  /**
   * Przetwarzaj kolejkę operacji
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (!this.isEnabled) {
      console.log('⏸️ [SyncQueue] Kolejka wyłączona – oczekuję na ponowne włączenie');
      return;
    }
    
    this.processing = true;
    console.log(`🔄 [SyncQueue] Rozpoczynam przetwarzanie (${this.queue.length} operacji)`);
    
    while (this.queue.length > 0) {
      if (!this.isEnabled) {
        console.log('⏸️ [SyncQueue] Przerywam przetwarzanie – synchronizacja wyłączona');
        break;
      }
      const operation = this.queue[0]; // Pobierz pierwszą operację
      
      try {
        console.log(`⏳ [SyncQueue] Przetwarzam: ${operation.type}`, {
          id: operation.id,
          attempt: operation.attempts + 1
        });
        
        await this.executeOperation(operation);
        
        console.log(`✅ [SyncQueue] Sukces: ${operation.type}`, {
          id: operation.id
        });
        
        // Usuń operację z kolejki po sukcesie
        this.queue.shift();
        
      } catch (error) {
        operation.attempts++;
        console.error(`❌ [SyncQueue] Błąd: ${operation.type}`, {
          id: operation.id,
          attempt: operation.attempts,
          error: error.message
        });
        
        // Retry jeśli nie przekroczono limitu
        if (operation.attempts < this.retryAttempts) {
          console.log(`🔄 [SyncQueue] Retry za ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay);
        } else {
          console.error(`💥 [SyncQueue] Przekroczono limit prób - usuwam operację`, {
            id: operation.id,
            type: operation.type
          });
          this.queue.shift(); // Usuń po przekroczeniu limitu
        }
      }
    }
    
    this.processing = false;
    if (this.queue.length > 0 && !this.isEnabled) {
      console.log(`⏸️ [SyncQueue] Kolejka zatrzymana – ${this.queue.length} operacji czeka na włączenie`);
    } else {
      console.log('✅ [SyncQueue] Zakończono przetwarzanie kolejki');
    }
  }
  
  /**
   * Wykonaj pojedynczą operację
   */
  async executeOperation(operation) {
    // Sprawdź czy Firebase jest gotowy
    if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
      throw new Error('Firebase nie jest zainicjalizowany');
    }
    
    // Sprawdź czy użytkownik zalogowany
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    switch (operation.type) {
      case 'save':
        await this.executeSave(operation.data);
        break;
        
      case 'delete':
        await this.executeDelete(operation.data);
        break;
        
      case 'update':
        await this.executeUpdate(operation.data);
        break;
        
      default:
        throw new Error(`Nieznany typ operacji: ${operation.type}`);
    }
  }
  
  /**
   * Zapisz wszystkie kolekcje do Firebase
   */
  async executeSave(data) {
    const snapshot = data && data.state ? data.state : null;
    const stateRef = snapshot || window.state;
    if (!stateRef) {
      throw new Error('Brak obiektu state');
    }
    
    console.log('💾 [SyncQueue] Zapisuję do Firebase...', {
      orders: stateRef.orders?.length || 0,
      tasks: stateRef.tasks?.length || 0
    });
    
    // Użyj istniejącej funkcji saveToDB jeśli istnieje
    if (typeof window.saveToDB === 'function') {
      await window.saveToDB(snapshot);
    } else {
      throw new Error('Funkcja saveToDB nie istnieje');
    }
  }
  
  /**
   * Usuń dokument z Firebase
   */
  async executeDelete(data) {
    const { collection, documentId } = data;
    
    if (!collection || !documentId) {
      throw new Error('Brak wymaganych danych: collection, documentId');
    }
    
    console.log(`🗑️ [SyncQueue] Usuwam z Firebase: ${collection}/${documentId}`);
    
    const db = firebase.firestore();
    const appId = window.state?.storage?.appId || 'doors-demo';
    const userId = window.state?.storage?.userId || 'hala-1';
    
    await db.collection('planner')
      .doc(appId)
      .collection('users')
      .doc(userId)
      .collection(collection)
      .doc(documentId)
      .delete();
    
    console.log(`✅ [SyncQueue] Usunięto: ${collection}/${documentId}`);
  }
  
  /**
   * Aktualizuj dokument w Firebase
   */
  async executeUpdate(data) {
    const { collection, documentId, updates } = data;
    
    if (!collection || !documentId || !updates) {
      throw new Error('Brak wymaganych danych: collection, documentId, updates');
    }
    
    console.log(`📝 [SyncQueue] Aktualizuję w Firebase: ${collection}/${documentId}`);
    
    const db = firebase.firestore();
    const appId = window.state?.storage?.appId || 'doors-demo';
    const userId = window.state?.storage?.userId || 'hala-1';
    
    await db.collection('planner')
      .doc(appId)
      .collection('users')
      .doc(userId)
      .collection(collection)
      .doc(documentId)
      .set(updates, { merge: true });
    
    console.log(`✅ [SyncQueue] Zaktualizowano: ${collection}/${documentId}`);
  }
  
  /**
   * Helper: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Wyczyść kolejkę
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    console.log(`🧹 [SyncQueue] Wyczyszczono kolejkę (${count} operacji)`);
  }
  
  /**
   * Pobierz status kolejki
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      processing: this.processing,
      queueLength: this.queue.length,
      queue: this.queue.map(op => ({
        type: op.type,
        priority: op.priority,
        attempts: op.attempts,
        timestamp: new Date(op.timestamp).toLocaleString()
      }))
    };
  }
}

// Export jako singleton
if (typeof window !== 'undefined') {
  window.FirebaseSyncQueue = new FirebaseSyncQueue();
  console.log('✅ [SyncQueue] Załadowano - dostępne jako window.FirebaseSyncQueue');
}

// Export dla Node.js (testy)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseSyncQueue;
}
