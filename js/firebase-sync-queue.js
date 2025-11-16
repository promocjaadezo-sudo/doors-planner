// js/firebase-sync-queue.js
// Kolejka synchronizacji Firebase z obsługą priorytetów i retry logic

(function() {
  'use strict';

  class FirebaseSyncQueue {
    constructor() {
      this.queue = [];
      this.isProcessing = false;
      this.isEnabled = false;
      this.maxRetries = 3;
      this.retryDelay = 1000; // 1 second base delay
      this.processing = null;
      
      console.log('[FirebaseSyncQueue] Initialized');
    }

    /**
     * Włącza kolejkę synchronizacji
     */
    enable() {
      if (!this.isEnabled) {
        this.isEnabled = true;
        console.log('[FirebaseSyncQueue] Enabled');
        // Start processing if queue has items
        if (this.queue.length > 0 && !this.isProcessing) {
          this.processQueue();
        }
      }
    }

    /**
     * Wyłącza kolejkę synchronizacji
     */
    disable() {
      this.isEnabled = false;
      console.log('[FirebaseSyncQueue] Disabled');
    }

    /**
     * Dodaje operację do kolejki
     * @param {string} operation - Typ operacji: 'save' lub 'delete'
     * @param {Object} data - Dane dla operacji
     * @param {number} priority - Priorytet (wyższy = większy priorytet)
     */
    enqueue(operation, data, priority = 10) {
      const item = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        data,
        priority,
        retries: 0,
        timestamp: Date.now()
      };

      this.queue.push(item);
      
      // Sortuj kolejkę według priorytetu (malejąco)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      console.log(`[FirebaseSyncQueue] Enqueued ${operation} operation (priority: ${priority}, queue size: ${this.queue.length})`);

      // Start processing if enabled and not already processing
      if (this.isEnabled && !this.isProcessing) {
        this.processQueue();
      }
    }

    /**
     * Przetwarza kolejkę operacji
     */
    async processQueue() {
      if (this.isProcessing || !this.isEnabled || this.queue.length === 0) {
        return;
      }

      this.isProcessing = true;

      while (this.queue.length > 0 && this.isEnabled) {
        const item = this.queue.shift();
        this.processing = item;

        try {
          console.log(`[FirebaseSyncQueue] Processing ${item.operation} (id: ${item.id}, priority: ${item.priority})`);
          
          await this.executeOperation(item);
          
          console.log(`[FirebaseSyncQueue] Successfully completed ${item.operation} (id: ${item.id})`);
          
        } catch (error) {
          console.error(`[FirebaseSyncQueue] Error processing ${item.operation}:`, error.message);
          
          // Retry logic
          if (item.retries < this.maxRetries) {
            item.retries++;
            const delay = this.retryDelay * Math.pow(2, item.retries - 1); // Exponential backoff
            
            console.log(`[FirebaseSyncQueue] Retrying ${item.operation} in ${delay}ms (attempt ${item.retries}/${this.maxRetries})`);
            
            // Re-add to queue with same priority
            setTimeout(() => {
              this.queue.push(item);
              this.queue.sort((a, b) => b.priority - a.priority);
            }, delay);
          } else {
            console.error(`[FirebaseSyncQueue] Max retries reached for ${item.operation}, skipping`);
          }
        }

        this.processing = null;
      }

      this.isProcessing = false;
      console.log('[FirebaseSyncQueue] Queue processing completed');
    }

    /**
     * Wykonuje pojedynczą operację
     * @param {Object} item - Element kolejki do wykonania
     */
    async executeOperation(item) {
      const { operation, data } = item;

      switch (operation) {
        case 'save':
          await this.executeSave(data);
          break;
        
        case 'delete':
          await this.executeDelete(data);
          break;
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }

    /**
     * Wykonuje operację zapisu do Firebase
     * @param {Object} data - Dane do zapisu
     */
    async executeSave(data) {
      if (!data.state) {
        throw new Error('Save operation requires state data');
      }

      // Check if saveToDB is available
      if (typeof window.saveToDB !== 'function') {
        throw new Error('saveToDB function not available');
      }

      // Check if Firebase is initialized
      if (typeof firebase === 'undefined' || !firebase.apps.length) {
        throw new Error('Firebase not initialized');
      }

      // Execute the save
      await window.saveToDB(data.state);
    }

    /**
     * Wykonuje operację usunięcia z Firebase
     * @param {Object} data - Dane operacji usunięcia
     */
    async executeDelete(data) {
      const { collection, documentId } = data;

      if (!collection || !documentId) {
        throw new Error('Delete operation requires collection and documentId');
      }

      // Upewnij się, że Firebase jest gotowy zanim spróbujemy usunąć dokument
      if (typeof window !== 'undefined' && typeof window.ensureFirebase === 'function') {
        const ready = await window.ensureFirebase();
        if (!ready) {
          throw new Error('Firebase not ready');
        }
      }

      // Check if Firebase is initialized
      if (typeof firebase === 'undefined' || !firebase.apps.length) {
        throw new Error('Firebase not initialized');
      }

      // Get the current state to find appId and userId
      const state = window.state;
      if (!state || !state.storage || !state.storage.appId || !state.storage.userId) {
        throw new Error('Missing appId or userId in state.storage');
      }

      const { appId, userId } = state.storage;

      // Get Firestore reference
      const db = firebase.firestore();
      const docRef = db
        .collection('planner')
        .doc(appId)
        .collection('users')
        .doc(userId)
        .collection(collection)
        .doc(documentId);

      // Delete the document
      await docRef.delete();
      
      console.log(`[FirebaseSyncQueue] Deleted document ${documentId} from ${collection}`);

      if (collection === 'processes') {
        try {
          const currentState = window.state;
          if (currentState && Array.isArray(currentState.deletedProcesses)) {
            currentState.deletedProcesses = currentState.deletedProcesses.filter(id => id !== documentId);
          }
        } catch (cleanupErr) {
          console.warn('[FirebaseSyncQueue] Failed to prune deletedProcesses list:', cleanupErr && cleanupErr.message);
        }
      }
    }

    /**
     * Czyści kolejkę
     */
    clear() {
      this.queue = [];
      console.log('[FirebaseSyncQueue] Queue cleared');
    }

    /**
     * Zwraca rozmiar kolejki
     */
    size() {
      return this.queue.length;
    }

    /**
     * Zwraca status kolejki
     */
    getStatus() {
      return {
        enabled: this.isEnabled,
        processing: this.isProcessing,
        queueSize: this.queue.length,
        currentOperation: this.processing ? this.processing.operation : null
      };
    }
  }

  // Create global instance
  window.FirebaseSyncQueue = new FirebaseSyncQueue();
  
  console.log('[FirebaseSyncQueue] Global instance created');

})();
