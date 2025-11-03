/**
 * METRICS EXPORTER - Format Prometheus
 * 
 * Eksportuje metryki z Centralnego Magazynu Stanu w formacie
 * kompatybilnym z Prometheus/Grafana.
 * 
 * @version 1.0.0
 * @created 2025-11-02
 */

(function(window) {
  'use strict';

  if (!window.centralnyMagazyn) {
    console.error('❌ [MetricsExporter] CentralnyMagazynStanu nie jest załadowany!');
    return;
  }

  const magazyn = window.centralnyMagazyn;

  /**
   * KONFIGURACJA EXPORTERA
   */
  const EXPORTER_CONFIG = {
    enabled: true,
    exportInterval: 15000,        // Export co 15 sekund
    endpoint: '/metrics',          // Endpoint dla Prometheus
    includeLabels: true,           // Dodaj labels do metryk
    aggregationWindow: 60000,      // Okno agregacji: 1 minuta
    maxMetrics: 1000              // Limit przechowywanych metryk
  };

  /**
   * Stan exportera
   */
  const exporterState = {
    lastExport: null,
    exportCount: 0,
    metrics: {},
    timers: {}
  };

  /**
   * TYPY METRYK PROMETHEUS
   */
  const MetricType = {
    COUNTER: 'counter',      // Licznik (tylko rośnie)
    GAUGE: 'gauge',          // Wartość zmiennna
    HISTOGRAM: 'histogram',  // Rozkład wartości
    SUMMARY: 'summary'       // Podsumowanie percentyli
  };

  /**
   * DEFINICJE METRYK
   */
  const METRICS_DEFINITIONS = {
    // COUNTERS - liczniki
    'app_operations_total': {
      type: MetricType.COUNTER,
      help: 'Całkowita liczba operacji w aplikacji',
      labels: ['operation_type', 'status']
    },
    'app_errors_total': {
      type: MetricType.COUNTER,
      help: 'Całkowita liczba błędów',
      labels: ['error_type', 'severity']
    },
    'app_saves_total': {
      type: MetricType.COUNTER,
      help: 'Liczba zapisów stanu',
      labels: ['save_type']
    },
    'app_tasks_total': {
      type: MetricType.COUNTER,
      help: 'Liczba operacji na zadaniach',
      labels: ['task_status']
    },

    // GAUGES - wartości zmienne
    'app_memory_usage_bytes': {
      type: MetricType.GAUGE,
      help: 'Użycie pamięci RAM w bajtach',
      labels: ['heap_type']
    },
    'app_history_size': {
      type: MetricType.GAUGE,
      help: 'Rozmiar historii magazynu',
      labels: []
    },
    'app_uptime_seconds': {
      type: MetricType.GAUGE,
      help: 'Czas działania aplikacji w sekundach',
      labels: []
    },
    'app_active_users': {
      type: MetricType.GAUGE,
      help: 'Liczba aktywnych użytkowników',
      labels: []
    },
    'app_data_counts': {
      type: MetricType.GAUGE,
      help: 'Liczba encji danych',
      labels: ['entity_type']
    },

    // HISTOGRAMY - rozkłady wartości
    'app_operation_duration_seconds': {
      type: MetricType.HISTOGRAM,
      help: 'Czas wykonania operacji',
      labels: ['operation_name'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    },
    'app_save_duration_seconds': {
      type: MetricType.HISTOGRAM,
      help: 'Czas zapisu stanu',
      labels: [],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2]
    },

    // SUMMARIES - percentyle
    'app_response_time_seconds': {
      type: MetricType.SUMMARY,
      help: 'Czasy odpowiedzi operacji',
      labels: ['endpoint'],
      quantiles: [0.5, 0.9, 0.95, 0.99]
    }
  };

  /**
   * KLASA METRYKI
   */
  class Metric {
    constructor(name, definition) {
      this.name = name;
      this.type = definition.type;
      this.help = definition.help;
      this.labels = definition.labels || [];
      this.buckets = definition.buckets || [];
      this.quantiles = definition.quantiles || [];
      this.values = new Map(); // key: labels_string, value: metric_value
    }

    /**
     * Ustawia wartość (dla GAUGE)
     */
    set(value, labels = {}) {
      const key = this._labelsToKey(labels);
      this.values.set(key, { value, labels, timestamp: Date.now() });
    }

    /**
     * Inkrementuje wartość (dla COUNTER)
     */
    inc(amount = 1, labels = {}) {
      const key = this._labelsToKey(labels);
      const current = this.values.get(key);
      const newValue = (current?.value || 0) + amount;
      this.values.set(key, { value: newValue, labels, timestamp: Date.now() });
    }

    /**
     * Obserwuje wartość (dla HISTOGRAM/SUMMARY)
     */
    observe(value, labels = {}) {
      const key = this._labelsToKey(labels);
      const current = this.values.get(key) || { observations: [] };
      
      if (!current.observations) {
        current.observations = [];
      }
      
      current.observations.push({ value, timestamp: Date.now() });
      current.labels = labels;
      
      // Ogranicz rozmiar tablicy obserwacji
      if (current.observations.length > 1000) {
        current.observations.shift();
      }
      
      this.values.set(key, current);
    }

    /**
     * Resetuje metrykę
     */
    reset() {
      this.values.clear();
    }

    /**
     * Konwertuje labels na klucz
     */
    _labelsToKey(labels) {
      if (Object.keys(labels).length === 0) return '__default__';
      
      const sorted = Object.keys(labels).sort();
      return sorted.map(k => `${k}="${labels[k]}"`).join(',');
    }

    /**
     * Eksportuje w formacie Prometheus
     */
    toPrometheusFormat() {
      let output = [];
      
      // Header
      output.push(`# HELP ${this.name} ${this.help}`);
      output.push(`# TYPE ${this.name} ${this.type}`);

      // Values
      this.values.forEach((data, key) => {
        const labelsStr = key === '__default__' ? '' : `{${key}}`;
        
        if (this.type === MetricType.HISTOGRAM) {
          // Histogram buckets
          const observations = data.observations || [];
          this.buckets.forEach(bucket => {
            const count = observations.filter(o => o.value <= bucket).length;
            output.push(`${this.name}_bucket${labelsStr.replace('}', `,le="${bucket}"}`)} ${count}`);
          });
          output.push(`${this.name}_bucket${labelsStr.replace('}', ',le="+Inf"}')} ${observations.length}`);
          output.push(`${this.name}_sum${labelsStr} ${observations.reduce((sum, o) => sum + o.value, 0)}`);
          output.push(`${this.name}_count${labelsStr} ${observations.length}`);
        } else if (this.type === MetricType.SUMMARY) {
          // Summary quantiles
          const observations = data.observations || [];
          const sorted = observations.map(o => o.value).sort((a, b) => a - b);
          
          this.quantiles.forEach(q => {
            const index = Math.floor(sorted.length * q);
            const value = sorted[index] || 0;
            output.push(`${this.name}${labelsStr.replace('}', `,quantile="${q}"`)} ${value}`);
          });
          output.push(`${this.name}_sum${labelsStr} ${observations.reduce((sum, o) => sum + o.value, 0)}`);
          output.push(`${this.name}_count${labelsStr} ${observations.length}`);
        } else {
          // Counter or Gauge
          output.push(`${this.name}${labelsStr} ${data.value}`);
        }
      });

      return output.join('\n');
    }
  }

  /**
   * REGISTRY METRYK
   */
  class MetricsRegistry {
    constructor() {
      this.metrics = new Map();
      this._initializeMetrics();
    }

    /**
     * Inicjalizacja wszystkich metryk
     */
    _initializeMetrics() {
      Object.keys(METRICS_DEFINITIONS).forEach(name => {
        const definition = METRICS_DEFINITIONS[name];
        this.metrics.set(name, new Metric(name, definition));
      });
      
      console.log(`📊 [MetricsExporter] Zainicjalizowano ${this.metrics.size} metryk`);
    }

    /**
     * Pobiera metrykę
     */
    getMetric(name) {
      return this.metrics.get(name);
    }

    /**
     * Eksportuje wszystkie metryki
     */
    exportAll() {
      const lines = [];
      
      this.metrics.forEach(metric => {
        lines.push(metric.toPrometheusFormat());
        lines.push(''); // Pusta linia między metrykami
      });

      return lines.join('\n');
    }

    /**
     * Resetuje wszystkie metryki
     */
    resetAll() {
      this.metrics.forEach(metric => metric.reset());
    }
  }

  // Instancja registry
  const registry = new MetricsRegistry();

  /**
   * ZBIERANIE METRYK Z MAGAZYNU
   */
  function collectMetricsFromHistory() {
    try {
      const historia = magazyn.pobierzHistorie();
      const now = Date.now();
      const windowStart = now - EXPORTER_CONFIG.aggregationWindow;

      // Filtruj do okna agregacji
      const recent = historia.filter(h => h.timestamp >= windowStart);

      // === COUNTERS ===

      // Operations total
      recent.forEach(entry => {
        const status = entry.typ.includes('ERROR') ? 'error' : 'success';
        registry.getMetric('app_operations_total').inc(1, {
          operation_type: entry.typ,
          status: status
        });
      });

      // Errors total
      recent.filter(h => h.typ.includes('ERROR')).forEach(entry => {
        const severity = entry.typ.includes('CRITICAL') ? 'critical' : 'error';
        registry.getMetric('app_errors_total').inc(1, {
          error_type: entry.typ,
          severity: severity
        });
      });

      // Saves total
      recent.filter(h => h.typ === 'SYSTEM_SAVE').forEach(() => {
        registry.getMetric('app_saves_total').inc(1, { save_type: 'state' });
      });

      // Tasks total
      recent.filter(h => h.typ === 'TASK_SAVED').forEach(entry => {
        const status = entry.dane?.status || 'unknown';
        registry.getMetric('app_tasks_total').inc(1, { task_status: status });
      });

      // === GAUGES ===

      // Memory usage
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        registry.getMetric('app_memory_usage_bytes').set(memory.usedJSHeapSize, { heap_type: 'used' });
        registry.getMetric('app_memory_usage_bytes').set(memory.totalJSHeapSize, { heap_type: 'total' });
        registry.getMetric('app_memory_usage_bytes').set(memory.jsHeapSizeLimit, { heap_type: 'limit' });
      }

      // History size
      registry.getMetric('app_history_size').set(historia.length);

      // Uptime
      if (window.productionMonitor) {
        const stats = window.productionMonitor.getStats();
        registry.getMetric('app_uptime_seconds').set(stats.uptime_seconds || 0);
      }

      // Active users (simplified - zawsze 1 dla single-user app)
      registry.getMetric('app_active_users').set(1);

      // Data counts
      if (window.state) {
        const counts = {
          orders: (window.state.orders || []).length,
          tasks: (window.state.tasks || []).length,
          employees: (window.state.employees || []).length,
          operations: (window.state.operationsCatalog || []).length,
          processes: (window.state.processes || []).length
        };

        Object.keys(counts).forEach(type => {
          registry.getMetric('app_data_counts').set(counts[type], { entity_type: type });
        });
      }

      // === HISTOGRAMS ===

      // Save duration
      recent.filter(h => h.typ === 'SYSTEM_SAVE' && h.dane?.czas_ms).forEach(entry => {
        const seconds = entry.dane.czas_ms / 1000;
        registry.getMetric('app_save_duration_seconds').observe(seconds);
      });

      // Operation duration
      recent.filter(h => h.typ === 'OPERATION_TIMING' && h.dane?.duration_ms).forEach(entry => {
        const seconds = entry.dane.duration_ms / 1000;
        registry.getMetric('app_operation_duration_seconds').observe(seconds, {
          operation_name: entry.dane.operation || 'unknown'
        });
      });

      // === SUMMARIES ===

      // Response times (z różnych operacji)
      recent.filter(h => h.dane?.czas_ms).forEach(entry => {
        const seconds = entry.dane.czas_ms / 1000;
        registry.getMetric('app_response_time_seconds').observe(seconds, {
          endpoint: entry.typ
        });
      });

      console.log(`📊 [MetricsExporter] Zebrano metryki z ${recent.length} wpisów`);

    } catch (error) {
      console.error('❌ [MetricsExporter] Błąd zbierania metryk:', error);
    }
  }

  /**
   * EKSPORT METRYK
   */
  function exportMetrics() {
    try {
      const output = registry.exportAll();
      exporterState.lastExport = Date.now();
      exporterState.exportCount++;

      console.log(`📤 [MetricsExporter] Export #${exporterState.exportCount}`);
      console.log(output);

      // Możesz wysłać metryki do serwera Prometheus
      // fetch('/metrics', { method: 'POST', body: output });

      return output;
    } catch (error) {
      console.error('❌ [MetricsExporter] Błąd eksportu:', error);
      return null;
    }
  }

  /**
   * ENDPOINT DLA PROMETHEUS
   */
  function setupMetricsEndpoint() {
    // Symulacja endpointu - w prawdziwej aplikacji to byłby serwer
    window.addEventListener('message', (event) => {
      if (event.data.type === 'GET_METRICS') {
        collectMetricsFromHistory();
        const metrics = exportMetrics();
        event.source.postMessage({ type: 'METRICS_RESPONSE', data: metrics }, '*');
      }
    });

    console.log('📡 [MetricsExporter] Endpoint metryk gotowy');
  }

  /**
   * INICJALIZACJA EXPORTERA
   */
  function initializeExporter() {
    if (!EXPORTER_CONFIG.enabled) {
      console.log('⏸️ [MetricsExporter] Exporter wyłączony');
      return;
    }

    console.log('🚀 [MetricsExporter] Inicjalizacja...');

    // Setup endpoint
    setupMetricsEndpoint();

    // Cykliczne zbieranie i eksport
    exporterState.timers.collect = setInterval(() => {
      collectMetricsFromHistory();
      exportMetrics();
    }, EXPORTER_CONFIG.exportInterval);

    // Pierwszy export po 5s
    setTimeout(() => {
      collectMetricsFromHistory();
      exportMetrics();
    }, 5000);

    console.log('✅ [MetricsExporter] Gotowy');
  }

  /**
   * ZATRZYMANIE EXPORTERA
   */
  function stopExporter() {
    if (exporterState.timers.collect) {
      clearInterval(exporterState.timers.collect);
    }
    console.log('⏹️ [MetricsExporter] Zatrzymany');
  }

  /**
   * PUBLICZNE API
   */
  window.metricsExporter = {
    config: EXPORTER_CONFIG,
    registry: registry,
    init: initializeExporter,
    stop: stopExporter,
    collect: collectMetricsFromHistory,
    export: exportMetrics,
    getMetric: (name) => registry.getMetric(name),
    resetAll: () => registry.resetAll(),
    getStats: () => ({
      last_export: exporterState.lastExport,
      export_count: exporterState.exportCount,
      metrics_count: registry.metrics.size
    })
  };

  /**
   * AUTO-INIT
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExporter);
  } else {
    initializeExporter();
  }

})(window);
