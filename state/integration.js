/**
 * INTEGRACJA CENTRALNEGO MAGAZYNU STANU Z PROCESAMI BIZNESOWYMI
 * 
 * Ten moduł dostarcza funkcje integrujące CentralnyMagazynStanu
 * z istniejącymi operacjami biznesowymi aplikacji produkcji drzwi.
 * 
 * @version 1.0.0
 * @created 2025-01-12
 */

(function(window) {
  'use strict';

  // Sprawdź czy magazyn jest dostępny
  if (!window.centralnyMagazyn) {
    console.error('❌ [Integration] CentralnyMagazynStanu nie jest załadowany!');
    return;
  }

  const magazyn = window.centralnyMagazyn;
  
  /**
   * KONFIGURACJA INTEGRACJI
   */
  const CONFIG = {
    enableAutoTracking: true,        // Automatyczne śledzenie operacji
    trackFormSubmits: true,          // Śledzenie wysłanych formularzy
    trackDataChanges: true,          // Śledzenie zmian danych
    trackErrors: true,               // Śledzenie błędów
    trackPerformance: true,          // Śledzenie wydajności
    maxHistorySize: 1000,            // Limit wpisów w historii
    persistToLocalStorage: true,    // Zapisz historię do localStorage
    localStorageKey: 'magazyn_historia',
    enableConsoleLogging: true       // Logi w konsoli
  };

  /**
   * Logger - używa window.logDev jeśli dostępny
   */
  const log = (...args) => {
    if (!CONFIG.enableConsoleLogging) return;
    const logger = window.logDev || console.log;
    logger('📊 [Magazyn]', ...args);
  };

  /**
   * TRACKING FUNKCJI BIZNESOWYCH
   */

  /**
   * Wrapper dla funkcji save()
   * Rejestruje każdy zapis stanu aplikacji
   */
  window.trackSave = function(originalSave) {
    return function(...args) {
      const startTime = performance.now();
      
      try {
        // Wykonaj oryginalny save
        const result = originalSave.apply(this, args);
        
        // Zbierz metryki
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // Pobierz statystyki stanu
        const stats = {
          orders: (window.state?.orders || []).length,
          employees: (window.state?.employees || []).length,
          tasks: (window.state?.tasks || []).length,
          operations: (window.state?.operationsCatalog || []).length,
          processes: (window.state?.processes || []).length
        };
        
        // Dodaj do historii magazynu
        magazyn.dodajDoHistorii('SYSTEM_SAVE', {
          akcja: 'save_state',
          czas_ms: duration,
          statystyki: stats,
          timestamp: new Date().toISOString()
        });
        
        log(`💾 Zapisano stan (${duration}ms)`, stats);
        
        return result;
      } catch (error) {
        // Rejestruj błąd
        magazyn.dodajDoHistorii('SYSTEM_ERROR', {
          akcja: 'save_state_failed',
          blad: error.message,
          stack: error.stack?.substring(0, 200)
        });
        
        console.error('❌ [Magazyn] Błąd podczas save:', error);
        throw error;
      }
    };
  };

  /**
   * Wrapper dla funkcji saveTaskToDB()
   * Rejestruje zapisy pojedynczych zadań
   */
  window.trackSaveTask = function(originalSaveTask) {
    return async function(taskId, ...args) {
      const startTime = performance.now();
      
      try {
        // Znajdź zadanie
        const task = (window.state?.tasks || []).find(t => t.id === taskId);
        
        if (task) {
          magazyn.dodajDoHistorii('TASK_SAVE_START', {
            taskId: taskId,
            taskName: task.opName || 'bez_nazwy',
            status: task.status,
            orderId: task.orderId
          });
        }
        
        // Wykonaj oryginalny saveTaskToDB
        const result = await originalSaveTask.call(this, taskId, ...args);
        
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // Zapisz sukces
        magazyn.dodajDoHistorii('TASK_SAVED', {
          taskId: taskId,
          taskName: task?.opName || 'unknown',
          czas_ms: duration,
          sukces: true
        });
        
        log(`✅ Zapisano zadanie ${taskId} (${duration}ms)`);
        
        return result;
      } catch (error) {
        magazyn.dodajDoHistorii('TASK_SAVE_ERROR', {
          taskId: taskId,
          blad: error.message
        });
        
        console.error('❌ [Magazyn] Błąd zapisu zadania:', taskId, error);
        throw error;
      }
    };
  };

  /**
   * Tracking zmian w kluczowych tablicach stanu
   */
  function trackArrayChange(arrayName, oldLength, newLength, operation) {
    magazyn.dodajDoHistorii('DATA_CHANGE', {
      tablica: arrayName,
      operacja: operation,
      rozmiar_przed: oldLength,
      rozmiar_po: newLength,
      zmiana: newLength - oldLength
    });
    
    log(`📝 ${arrayName}: ${oldLength} → ${newLength} (${operation})`);
  }

  /**
   * MONITORING GLOBALNY
   */

  /**
   * Obserwator zmian w state.orders
   */
  function watchOrders() {
    if (!window.state || !Array.isArray(window.state.orders)) return;
    
    let lastLength = window.state.orders.length;
    
    setInterval(() => {
      const currentLength = (window.state?.orders || []).length;
      if (currentLength !== lastLength) {
        const operation = currentLength > lastLength ? 'ADD' : 'REMOVE';
        trackArrayChange('orders', lastLength, currentLength, operation);
        lastLength = currentLength;
      }
    }, 2000); // Sprawdzaj co 2s
  }

  /**
   * Obserwator zmian w state.tasks
   */
  function watchTasks() {
    if (!window.state || !Array.isArray(window.state.tasks)) return;
    
    let lastLength = window.state.tasks.length;
    
    setInterval(() => {
      const currentLength = (window.state?.tasks || []).length;
      if (currentLength !== lastLength) {
        const operation = currentLength > lastLength ? 'ADD' : 'REMOVE';
        trackArrayChange('tasks', lastLength, currentLength, operation);
        lastLength = currentLength;
      }
    }, 2000);
  }

  /**
   * Obserwator zmian w state.employees
   */
  function watchEmployees() {
    if (!window.state || !Array.isArray(window.state.employees)) return;
    
    let lastLength = window.state.employees.length;
    
    setInterval(() => {
      const currentLength = (window.state?.employees || []).length;
      if (currentLength !== lastLength) {
        const operation = currentLength > lastLength ? 'ADD' : 'REMOVE';
        trackArrayChange('employees', lastLength, currentLength, operation);
        lastLength = currentLength;
      }
    }, 2000);
  }

  /**
   * TRACKING BŁĘDÓW
   */
  function setupErrorTracking() {
    if (!CONFIG.trackErrors) return;
    
    // Przechwytuj nieobsłużone błędy
    window.addEventListener('error', (event) => {
      magazyn.dodajDoHistorii('GLOBAL_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error_type: 'runtime_error'
      });
      
      log('❌ Błąd globalny:', event.message);
    });
    
    // Przechwytuj nieobsłużone promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      magazyn.dodajDoHistorii('PROMISE_REJECTION', {
        reason: event.reason?.toString() || 'unknown',
        promise: 'unhandled_rejection'
      });
      
      log('❌ Odrzucone Promise:', event.reason);
    });
  }

  /**
   * TRACKING WYDAJNOŚCI
   */
  function setupPerformanceTracking() {
    if (!CONFIG.trackPerformance) return;
    
    // Monitoruj wydajność co 30 sekund
    setInterval(() => {
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        
        magazyn.dodajDoHistorii('PERFORMANCE_CHECK', {
          used_heap_mb: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total_heap_mb: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit_heap_mb: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
          wykorzystanie_procent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
        });
      }
    }, 30000); // Co 30s
  }

  /**
   * TRACKING SESJI UŻYTKOWNIKA
   */
  function setupSessionTracking() {
    // Start sesji
    const sessionId = 'session_' + Date.now();
    magazyn.ustawSesje(sessionId);
    
    magazyn.dodajDoHistorii('SESSION_START', {
      sessionId: sessionId,
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    });
    
    // Koniec sesji (przed zamknięciem)
    window.addEventListener('beforeunload', () => {
      magazyn.dodajDoHistorii('SESSION_END', {
        sessionId: sessionId,
        duration_ms: Date.now() - parseInt(sessionId.split('_')[1]),
        final_state: {
          orders: (window.state?.orders || []).length,
          tasks: (window.state?.tasks || []).length
        }
      });
      
      // Zapisz historię do localStorage
      if (CONFIG.persistToLocalStorage) {
        try {
          const historia = magazyn.pobierzHistorie();
          localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(historia));
          log('💾 Historia zapisana do localStorage');
        } catch (e) {
          console.error('❌ Nie udało się zapisać historii:', e);
        }
      }
    });
    
    log('🚀 Sesja rozpoczęta:', sessionId);
  }

  /**
   * TRACKING FORMULARZY
   */
  function setupFormTracking() {
    if (!CONFIG.trackFormSubmits) return;
    
    // Śledź wszystkie submity formularzy
    document.addEventListener('submit', (event) => {
      const form = event.target;
      const formId = form.id || form.name || 'unnamed_form';
      
      magazyn.dodajDoHistorii('FORM_SUBMIT', {
        formId: formId,
        action: form.action || 'none',
        method: form.method || 'get'
      });
      
      log('📋 Wysłano formularz:', formId);
    });
    
    log('📋 Form tracking aktywny');
  }

  /**
   * INICJALIZACJA INTEGRACJI
   */
  function initializeIntegration() {
    console.log('🔧 [Magazyn] Inicjalizacja integracji...');
    
    // 1. Wrap funkcji save() jeśli istnieje
    if (typeof window.save === 'function') {
      const originalSave = window.save;
      window.save = trackSave(originalSave);
      log('✅ Funkcja save() opakowana');
    } else {
      console.warn('⚠️ [Magazyn] Funkcja save() nie znaleziona');
    }
    
    // 2. Wrap funkcji saveTaskToDB() jeśli istnieje
    if (typeof window.saveTaskToDB === 'function') {
      const originalSaveTask = window.saveTaskToDB;
      window.saveTaskToDB = trackSaveTask(originalSaveTask);
      log('✅ Funkcja saveTaskToDB() opakowana');
    }
    
    // 3. Uruchom obserwatory
    if (CONFIG.trackDataChanges) {
      setTimeout(() => {
        watchOrders();
        watchTasks();
        watchEmployees();
        log('✅ Obserwatory danych aktywne');
      }, 1000); // Start po 1s (daj czas na załadowanie state)
    }
    
    // 4. Setup error tracking
    setupErrorTracking();
    log('✅ Error tracking aktywny');
    
    // 5. Setup performance tracking
    setupPerformanceTracking();
    log('✅ Performance tracking aktywny');
    
    // 6. Setup session tracking
    setupSessionTracking();
    
    // 7. Setup form tracking
    setupFormTracking();
    
    // 8. Zarejestruj inicjalizację
    magazyn.dodajDoHistorii('INTEGRATION_INIT', {
      config: CONFIG,
      state_available: !!window.state,
      functions_wrapped: {
        save: typeof window.save === 'function',
        saveTaskToDB: typeof window.saveTaskToDB === 'function'
      }
    });
    
    console.log('✅ [Magazyn] Integracja zakończona pomyślnie!');
  }

  /**
   * PUBLICZNE API
   */
  window.magazynIntegration = {
    config: CONFIG,
    init: initializeIntegration,
    getHistory: () => magazyn.pobierzHistorie(),
    getStats: () => ({
      total_entries: magazyn.pobierzHistorie().length,
      session_id: magazyn._sesjaId,
      status: magazyn.pobierzStatus()
    }),
    exportHistory: () => magazyn.exportujDoJSON(),
    clearHistory: () => {
      magazyn.resetujStan();
      log('🗑️ Historia wyczyszczona');
    }
  };

  /**
   * AUTO-INIT po załadowaniu DOM
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIntegration);
  } else {
    // DOM już załadowany
    initializeIntegration();
  }

})(window);
