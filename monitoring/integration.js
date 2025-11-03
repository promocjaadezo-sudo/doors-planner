/**
 * MONITORING INTEGRATION - Integracja systemu monitoringu
 * 
 * Ten plik łączy wszystkie komponenty monitoringu i zapewnia
 * ich prawidłową inicjalizację i współpracę.
 * 
 * @version 1.0.0
 * @created 2025-11-02
 */

(function(window) {
  'use strict';

  console.log('🚀 [Monitoring] Inicjalizacja systemu monitoringu...');

  /**
   * Sprawdzenie zależności
   */
  function checkDependencies() {
    const required = {
      'CentralnyMagazynStanu': window.centralnyMagazyn,
      'MagazynIntegration': window.magazynIntegration,
      'ProductionMonitor': window.productionMonitor,
      'MetricsExporter': window.metricsExporter,
      'LogAggregator': window.logAggregator,
      'Alerting': window.alerting
    };

    const missing = [];
    const loaded = [];

    Object.keys(required).forEach(name => {
      if (required[name]) {
        loaded.push(name);
      } else {
        missing.push(name);
      }
    });

    console.log('✅ [Monitoring] Załadowane moduły:', loaded.join(', '));
    
    if (missing.length > 0) {
      console.warn('⚠️ [Monitoring] Brakujące moduły:', missing.join(', '));
    }

    return missing.length === 0;
  }

  /**
   * Konfiguracja początkowa
   */
  function configureMonitoring() {
    // Metrics Exporter
    if (window.metricsExporter) {
      window.metricsExporter.config.collectionInterval = 15000; // 15s
      window.metricsExporter.config.aggregationWindow = 60000;  // 60s
    }

    // Log Aggregator
    if (window.logAggregator) {
      window.logAggregator.config.batchSize = 50;
      window.logAggregator.config.flushInterval = 10000;        // 10s
      window.logAggregator.config.maxBufferSize = 500;
      window.logAggregator.config.enrichLogs = true;
      // window.logAggregator.config.logstashUrl = 'http://localhost:5044'; // Uncomment dla Logstash
    }

    // Alerting
    if (window.alerting) {
      window.alerting.config.checkInterval = 30000;             // 30s
      window.alerting.config.cooldownPeriod = 300000;           // 5min
      window.alerting.config.maxAlertsPerHour = 10;
      window.alerting.config.notificationMethods = {
        console: true,
        desktop: true,
        email: false,
        webhook: false,
        sound: true
      };
    }

    console.log('⚙️ [Monitoring] Konfiguracja załadowana');
  }

  /**
   * Setup endpoints dla Prometheus scraping
   */
  function setupPrometheusEndpoint() {
    if (!window.metricsExporter) return;

    // PostMessage API dla external scraping
    window.addEventListener('message', (event) => {
      if (event.data.type === 'GET_METRICS') {
        const metrics = window.metricsExporter.export();
        event.source.postMessage({
          type: 'METRICS_RESPONSE',
          data: metrics
        }, event.origin);
      }
    });

    console.log('📡 [Monitoring] Prometheus endpoint (postMessage) gotowy');
  }

  /**
   * Setup periodic exports
   */
  function setupPeriodicExports() {
    // Export metryk co 5 minut do localStorage (backup)
    setInterval(() => {
      if (window.metricsExporter) {
        const metrics = window.metricsExporter.export();
        try {
          localStorage.setItem('monitoring_metrics_backup', metrics);
          localStorage.setItem('monitoring_metrics_backup_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('⚠️ [Monitoring] Nie można zapisać backup metryk:', e);
        }
      }
    }, 5 * 60 * 1000); // 5min

    // Auto-flush logów co 10s (już jest w log-aggregator)
    console.log('📤 [Monitoring] Periodic exports skonfigurowane');
  }

  /**
   * Setup monitoring dashboard link
   */
  function addDashboardLink() {
    // Dodaj link do dashboardu w console
    console.log('%c📊 Production Dashboard', 
      'background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      '\nURL: http://localhost:5500/production-dashboard.html'
    );

    // Dodaj do window dla łatwego dostępu
    window.openDashboard = function() {
      window.open('production-dashboard.html', '_blank');
    };
  }

  /**
   * Setup helper commands
   */
  function setupHelperCommands() {
    // Global monitoring object
    window.monitoring = {
      // Status
      status: () => {
        console.group('📊 Monitoring Status');
        
        if (window.metricsExporter) {
          const metrics = window.metricsExporter.export();
          console.log('📈 Metrics:', metrics.split('\n').filter(l => !l.startsWith('#')).length, 'values');
        }
        
        if (window.logAggregator) {
          const stats = window.logAggregator.getStats();
          console.log('📝 Logs:', stats);
        }
        
        if (window.alerting) {
          const stats = window.alerting.getStats();
          console.log('🔔 Alerts:', stats);
        }
        
        console.groupEnd();
      },

      // Export wszystkich danych
      exportAll: () => {
        const data = {
          timestamp: new Date().toISOString(),
          metrics: window.metricsExporter ? window.metricsExporter.export() : null,
          logs: window.logAggregator ? window.logAggregator.export() : null,
          alerts: window.alerting ? window.alerting.getHistory() : null,
          magazyn: window.centralnyMagazyn ? {
            dane: window.centralnyMagazyn.dane,
            historia: window.centralnyMagazyn.pobierzHistorie()
          } : null
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitoring_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('📥 Export complete');
      },

      // Reset wszystkiego
      resetAll: () => {
        if (confirm('Czy na pewno chcesz zresetować wszystkie dane monitoringu?')) {
          if (window.metricsExporter) window.metricsExporter.resetAll();
          if (window.logAggregator) window.logAggregator.clearLocalLogs();
          if (window.alerting) window.alerting.clearHistory();
          console.log('🔄 Monitoring reset complete');
        }
      },

      // Pokaż konfigurację
      showConfig: () => {
        console.group('⚙️ Monitoring Configuration');
        if (window.metricsExporter) {
          console.log('MetricsExporter:', window.metricsExporter.config);
        }
        if (window.logAggregator) {
          console.log('LogAggregator:', window.logAggregator.config);
        }
        if (window.alerting) {
          console.log('Alerting:', window.alerting.config);
        }
        console.groupEnd();
      },

      // Test alertów
      testAlert: (severity = 'info') => {
        if (!window.centralnyMagazyn) {
          console.error('❌ CentralnyMagazynStanu nie załadowany');
          return;
        }
        
        window.centralnyMagazyn.dodajDoHistorii('TEST_ALERT', {
          severity: severity,
          message: 'Test alert',
          timestamp: Date.now()
        });
        
        console.log(`🔔 Test alert (${severity}) wysłany`);
      },

      // Otwórz dashboard
      openDashboard: () => window.openDashboard(),

      // Help
      help: () => {
        console.log('%cMonitoring Commands', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
        console.log('');
        console.log('monitoring.status()          - Pokaż status monitoringu');
        console.log('monitoring.exportAll()        - Export wszystkich danych do JSON');
        console.log('monitoring.resetAll()         - Reset wszystkich danych');
        console.log('monitoring.showConfig()       - Pokaż konfigurację');
        console.log('monitoring.testAlert(level)   - Wyślij testowy alert');
        console.log('monitoring.openDashboard()    - Otwórz production dashboard');
        console.log('');
        console.log('%cDirect Access', 'font-weight: bold;');
        console.log('window.metricsExporter        - Metrics API');
        console.log('window.logAggregator          - Logs API');
        console.log('window.alerting               - Alerts API');
        console.log('window.productionMonitor      - Production Monitor API');
        console.log('window.centralnyMagazyn       - State Management API');
      }
    };

    console.log('💡 [Monitoring] Helper commands: window.monitoring.help()');
  }

  /**
   * Health check
   */
  function performHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        metricsExporter: !!window.metricsExporter,
        logAggregator: !!window.logAggregator,
        alerting: !!window.alerting,
        productionMonitor: !!window.productionMonitor,
        centralnyMagazyn: !!window.centralnyMagazyn
      }
    };

    const failedChecks = Object.keys(health.checks).filter(k => !health.checks[k]);
    if (failedChecks.length > 0) {
      health.status = 'degraded';
      health.failedChecks = failedChecks;
    }

    console.log('🏥 [Monitoring] Health check:', health.status);
    return health;
  }

  /**
   * Zapisz inicjalizację w magazynie
   */
  function recordInitialization() {
    if (!window.centralnyMagazyn) return;

    window.centralnyMagazyn.dodajDoHistorii('MONITORING_INTEGRATION_INIT', {
      components: {
        metricsExporter: !!window.metricsExporter,
        logAggregator: !!window.logAggregator,
        alerting: !!window.alerting,
        productionMonitor: !!window.productionMonitor
      },
      config: {
        metricsInterval: window.metricsExporter?.config.collectionInterval,
        logsFlushInterval: window.logAggregator?.config.flushInterval,
        alertsCheckInterval: window.alerting?.config.checkInterval
      }
    });
  }

  /**
   * GŁÓWNA FUNKCJA INICJALIZACJI
   */
  function initialize() {
    try {
      // Sprawdź zależności
      const allDependenciesLoaded = checkDependencies();
      if (!allDependenciesLoaded) {
        console.warn('⚠️ [Monitoring] Niektóre moduły nie zostały załadowane');
      }

      // Konfiguracja
      configureMonitoring();

      // Setup endpoints
      setupPrometheusEndpoint();

      // Periodic exports
      setupPeriodicExports();

      // Dashboard link
      addDashboardLink();

      // Helper commands
      setupHelperCommands();

      // Health check
      const health = performHealthCheck();

      // Zapisz inicjalizację
      recordInitialization();

      // Success banner
      console.log(
        '%c✅ MONITORING SYSTEM READY',
        'background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: bold;'
      );
      console.log('');
      console.log('📊 Metrics Exporter:', window.metricsExporter ? '✅' : '❌');
      console.log('📝 Log Aggregator:', window.logAggregator ? '✅' : '❌');
      console.log('🔔 Alerting System:', window.alerting ? '✅' : '❌');
      console.log('');
      console.log('Type: %cmonitoring.help()%c for commands', 'font-weight: bold; color: #3b82f6;', '');

      // Return status
      return health;

    } catch (error) {
      console.error('❌ [Monitoring] Błąd inicjalizacji:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * AUTO-INIT
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // Czekaj aż wszystkie moduły się załadują
    setTimeout(initialize, 100);
  }

})(window);
