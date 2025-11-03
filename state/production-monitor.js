/**
 * MONITORING PRODUKCYJNY - CENTRALNY MAGAZYN STANU
 * 
 * Moduł zapewniający ciągły monitoring działania aplikacji
 * i automatyczne logowanie kluczowych metryk do magazynu.
 * 
 * @version 1.0.0
 * @created 2025-01-12
 */

(function(window) {
  'use strict';

  if (!window.centralnyMagazyn) {
    console.error('❌ [Monitor] CentralnyMagazynStanu nie jest załadowany!');
    return;
  }

  const magazyn = window.centralnyMagazyn;

  /**
   * KONFIGURACJA MONITORINGU
   */
  const MONITOR_CONFIG = {
    enabled: true,
    intervals: {
      health_check: 60000,      // Co 1 minutę
      metrics_collection: 30000, // Co 30 sekund
      data_snapshot: 300000      // Co 5 minut
    },
    thresholds: {
      memory_warning_mb: 100,
      memory_critical_mb: 200,
      response_time_warning_ms: 1000,
      response_time_critical_ms: 3000
    }
  };

  /**
   * Stan monitoringu
   */
  const monitorState = {
    startTime: Date.now(),
    checks: 0,
    errors: 0,
    warnings: 0,
    lastSnapshot: null,
    timers: {}
  };

  /**
   * HEALTH CHECK - sprawdzenie stanu aplikacji
   */
  function performHealthCheck() {
    const startTime = performance.now();
    const health = {
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - monitorState.startTime) / 1000),
      checks_performed: ++monitorState.checks
    };

    try {
      // Sprawdź dostępność state
      health.state_available = !!window.state;
      health.state_valid = !!(window.state?.orders && window.state?.tasks);
      
      // Sprawdź rozmiary danych
      if (window.state) {
        health.data_counts = {
          orders: (window.state.orders || []).length,
          employees: (window.state.employees || []).length,
          tasks: (window.state.tasks || []).length,
          operations: (window.state.operationsCatalog || []).length,
          processes: (window.state.processes || []).length
        };
      }

      // Sprawdź localStorage
      try {
        const testKey = '__health_test__';
        localStorage.setItem(testKey, 'ok');
        health.localStorage_available = localStorage.getItem(testKey) === 'ok';
        localStorage.removeItem(testKey);
      } catch (e) {
        health.localStorage_available = false;
        health.localStorage_error = e.message;
      }

      // Sprawdź pamięć
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        health.memory_mb = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        health.memory_limit_mb = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        health.memory_usage_percent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        // Ostrzeżenia o pamięci
        if (health.memory_mb > MONITOR_CONFIG.thresholds.memory_critical_mb) {
          health.memory_status = 'CRITICAL';
          monitorState.errors++;
        } else if (health.memory_mb > MONITOR_CONFIG.thresholds.memory_warning_mb) {
          health.memory_status = 'WARNING';
          monitorState.warnings++;
        } else {
          health.memory_status = 'OK';
        }
      }

      // Sprawdź historię magazynu
      const historia = magazyn.pobierzHistorie();
      health.magazyn_entries = historia.length;
      health.magazyn_size_kb = Math.round(JSON.stringify(historia).length / 1024);

      // Czas wykonania health check
      const endTime = performance.now();
      health.check_duration_ms = Math.round(endTime - startTime);

      // Zapisz do magazynu
      magazyn.dodajDoHistorii('HEALTH_CHECK', health);

      // Log jeśli są problemy
      if (health.memory_status !== 'OK' || !health.state_valid || !health.localStorage_available) {
        console.warn('⚠️ [Monitor] Health check wykrył problemy:', health);
      }

      return health;
    } catch (error) {
      monitorState.errors++;
      magazyn.dodajDoHistorii('HEALTH_CHECK_ERROR', {
        error: error.message,
        stack: error.stack?.substring(0, 200)
      });
      console.error('❌ [Monitor] Błąd podczas health check:', error);
      return { error: error.message };
    }
  }

  /**
   * ZBIERANIE METRYK - wydajność i statystyki
   */
  function collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - monitorState.startTime) / 1000)
    };

    try {
      // Performance Navigation Timing API
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;
        
        metrics.page_load_ms = timing.loadEventEnd - navigationStart;
        metrics.dom_ready_ms = timing.domContentLoadedEventEnd - navigationStart;
        metrics.dom_interactive_ms = timing.domInteractive - navigationStart;
      }

      // Resource Timing API
      if (window.performance && window.performance.getEntriesByType) {
        const resources = window.performance.getEntriesByType('resource');
        metrics.resources_loaded = resources.length;
        
        if (resources.length > 0) {
          const durations = resources.map(r => r.duration);
          metrics.avg_resource_duration_ms = Math.round(
            durations.reduce((sum, d) => sum + d, 0) / durations.length
          );
        }
      }

      // Statystyki zadań
      if (window.state && window.state.tasks) {
        const tasks = window.state.tasks;
        const statusCounts = {};
        
        tasks.forEach(task => {
          const status = task.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        metrics.task_stats = {
          total: tasks.length,
          by_status: statusCounts
        };
      }

      // Zapisz do magazynu
      magazyn.dodajDoHistorii('METRICS_COLLECTED', metrics);

    } catch (error) {
      console.error('❌ [Monitor] Błąd zbierania metryk:', error);
    }
  }

  /**
   * SNAPSHOT DANYCH - pełny obraz stanu aplikacji
   */
  function takeDataSnapshot() {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.round((Date.now() - monitorState.startTime) / 1000),
        monitor_stats: {
          checks: monitorState.checks,
          errors: monitorState.errors,
          warnings: monitorState.warnings
        }
      };

      // Pełne statystyki stanu
      if (window.state) {
        snapshot.state_snapshot = {
          orders: {
            count: (window.state.orders || []).length,
            total_quantity: (window.state.orders || []).reduce((sum, o) => sum + (o.quantity || 0), 0)
          },
          employees: {
            count: (window.state.employees || []).length,
            total_capacity: (window.state.employees || []).reduce((sum, e) => sum + (e.cap || 0), 0)
          },
          tasks: {
            count: (window.state.tasks || []).length,
            statuses: {}
          },
          operations: {
            count: (window.state.operationsCatalog || []).length
          },
          processes: {
            count: (window.state.processes || []).length
          }
        };

        // Grupowanie tasków po statusie
        (window.state.tasks || []).forEach(task => {
          const status = task.status || 'unknown';
          if (!snapshot.state_snapshot.tasks.statuses[status]) {
            snapshot.state_snapshot.tasks.statuses[status] = 0;
          }
          snapshot.state_snapshot.tasks.statuses[status]++;
        });
      }

      // Historia magazynu
      const historia = magazyn.pobierzHistorie();
      snapshot.magazyn_stats = {
        total_entries: historia.length,
        size_kb: Math.round(JSON.stringify(historia).length / 1024),
        oldest_entry: historia[0]?.timestamp || null,
        newest_entry: historia[historia.length - 1]?.timestamp || null
      };

      // Grupowanie wpisów po typie
      const typeCounts = {};
      historia.forEach(entry => {
        const typ = entry.typ || 'unknown';
        typeCounts[typ] = (typeCounts[typ] || 0) + 1;
      });
      snapshot.magazyn_stats.entries_by_type = typeCounts;

      // Zapisz snapshot
      magazyn.dodajDoHistorii('DATA_SNAPSHOT', snapshot);
      monitorState.lastSnapshot = snapshot;

      console.log('📸 [Monitor] Snapshot utworzony:', {
        orders: snapshot.state_snapshot?.orders?.count,
        tasks: snapshot.state_snapshot?.tasks?.count,
        magazyn_entries: snapshot.magazyn_stats?.total_entries
      });

    } catch (error) {
      console.error('❌ [Monitor] Błąd tworzenia snapshot:', error);
    }
  }

  /**
   * MONITORING WYDAJNOŚCI OPERACJI
   */
  function trackOperation(operationName, startTime) {
    const duration = performance.now() - startTime;
    
    magazyn.dodajDoHistorii('OPERATION_TIMING', {
      operation: operationName,
      duration_ms: Math.round(duration),
      timestamp: new Date().toISOString()
    });

    // Ostrzeżenie o wolnej operacji
    if (duration > MONITOR_CONFIG.thresholds.response_time_critical_ms) {
      console.warn(`⚠️ [Monitor] Wolna operacja: ${operationName} (${Math.round(duration)}ms)`);
      monitorState.warnings++;
    }

    return duration;
  }

  /**
   * TRACKING AKCJI UŻYTKOWNIKA
   */
  function setupUserActionTracking() {
    // Tracking kliknięć (throttled)
    let lastClickTime = 0;
    document.addEventListener('click', (event) => {
      const now = Date.now();
      if (now - lastClickTime < 5000) return; // Max 1 co 5s
      lastClickTime = now;

      const target = event.target;
      const action = {
        element: target.tagName,
        id: target.id || null,
        class: target.className || null,
        text: target.textContent?.substring(0, 30) || null
      };

      magazyn.dodajDoHistorii('USER_CLICK', action);
    }, true);

    // Tracking nawigacji
    let lastPage = window.state?.page;
    setInterval(() => {
      if (window.state && window.state.page !== lastPage) {
        magazyn.dodajDoHistorii('NAVIGATION', {
          from: lastPage,
          to: window.state.page
        });
        lastPage = window.state.page;
      }
    }, 1000);
  }

  /**
   * INICJALIZACJA MONITORINGU
   */
  function initializeMonitoring() {
    if (!MONITOR_CONFIG.enabled) {
      console.log('⏸️ [Monitor] Monitoring wyłączony');
      return;
    }

    console.log('🚀 [Monitor] Inicjalizacja monitoringu produkcyjnego...');

    // Zapisz start monitoringu
    magazyn.dodajDoHistorii('MONITOR_START', {
      config: MONITOR_CONFIG,
      timestamp: new Date().toISOString()
    });

    // Uruchom health checks
    monitorState.timers.healthCheck = setInterval(
      performHealthCheck,
      MONITOR_CONFIG.intervals.health_check
    );

    // Uruchom zbieranie metryk
    monitorState.timers.metrics = setInterval(
      collectMetrics,
      MONITOR_CONFIG.intervals.metrics_collection
    );

    // Uruchom snapshoty
    monitorState.timers.snapshot = setInterval(
      takeDataSnapshot,
      MONITOR_CONFIG.intervals.data_snapshot
    );

    // Setup user action tracking
    setupUserActionTracking();

    // Pierwszy health check natychmiast
    setTimeout(performHealthCheck, 100);

    // Pierwszy snapshot po 5s
    setTimeout(takeDataSnapshot, 5000);

    console.log('✅ [Monitor] Monitoring aktywny');
  }

  /**
   * ZATRZYMANIE MONITORINGU
   */
  function stopMonitoring() {
    console.log('⏹️ [Monitor] Zatrzymywanie monitoringu...');

    // Zatrzymaj wszystkie timery
    Object.values(monitorState.timers).forEach(timer => clearInterval(timer));
    monitorState.timers = {};

    // Zapisz event
    magazyn.dodajDoHistorii('MONITOR_STOP', {
      total_checks: monitorState.checks,
      total_errors: monitorState.errors,
      total_warnings: monitorState.warnings,
      uptime_seconds: Math.round((Date.now() - monitorState.startTime) / 1000)
    });

    console.log('✅ [Monitor] Monitoring zatrzymany');
  }

  /**
   * PUBLICZNE API
   */
  window.productionMonitor = {
    config: MONITOR_CONFIG,
    state: monitorState,
    init: initializeMonitoring,
    stop: stopMonitoring,
    healthCheck: performHealthCheck,
    collectMetrics: collectMetrics,
    takeSnapshot: takeDataSnapshot,
    trackOperation: trackOperation,
    getStats: () => ({
      uptime_seconds: Math.round((Date.now() - monitorState.startTime) / 1000),
      checks: monitorState.checks,
      errors: monitorState.errors,
      warnings: monitorState.warnings,
      last_snapshot: monitorState.lastSnapshot
    })
  };

  /**
   * AUTO-INIT po załadowaniu
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMonitoring);
  } else {
    initializeMonitoring();
  }

})(window);
