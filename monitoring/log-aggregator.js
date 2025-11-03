/**
 * LOG AGGREGATOR - Agregacja i wysyłanie logów do ELK Stack
 * 
 * Zbiera logi z aplikacji i formatuje je dla Logstash/Elasticsearch
 * w formacie JSON kompatybilnym ze standardem ECS (Elastic Common Schema).
 * 
 * @version 1.0.0
 * @created 2025-11-02
 */

(function(window) {
  'use strict';

  if (!window.centralnyMagazyn) {
    console.error('❌ [LogAggregator] CentralnyMagazynStanu nie jest załadowany!');
    return;
  }

  const magazyn = window.centralnyMagazyn;

  /**
   * KONFIGURACJA
   */
  const LOG_CONFIG = {
    enabled: true,
    batchSize: 50,                    // Liczba logów w batchu
    flushInterval: 10000,             // Wysyłaj co 10s
    maxBufferSize: 500,               // Max logów w buforze
    enrichLogs: true,                 // Dodaj kontekst do logów
    logstashUrl: null,                // URL Logstash (null = tylko localStorage)
    indexPattern: 'centralny-magazyn-stanu',
    retryAttempts: 3,
    retryDelay: 1000
  };

  /**
   * POZIOMY LOGÓW (zgodnie z syslog)
   */
  const LogLevel = {
    EMERGENCY: 0,   // System unusable
    ALERT: 1,       // Action must be taken immediately
    CRITICAL: 2,    // Critical conditions
    ERROR: 3,       // Error conditions
    WARNING: 4,     // Warning conditions
    NOTICE: 5,      // Normal but significant
    INFO: 6,        // Informational messages
    DEBUG: 7        // Debug-level messages
  };

  /**
   * Stan agregatora
   */
  const aggregatorState = {
    buffer: [],
    timers: {},
    stats: {
      totalLogs: 0,
      successfulBatches: 0,
      failedBatches: 0,
      droppedLogs: 0
    }
  };

  /**
   * ELASTIC COMMON SCHEMA (ECS) Log Entry
   */
  class ECSLogEntry {
    constructor(magazynEntry) {
      // ECS Base Fields
      this['@timestamp'] = new Date(magazynEntry.timestamp).toISOString();
      this.ecs = { version: '8.0.0' };
      
      // Event
      this.event = {
        dataset: 'centralny-magazyn-stanu',
        module: 'state-management',
        action: this._mapTypToAction(magazynEntry.typ),
        category: this._mapTypToCategory(magazynEntry.typ),
        type: this._mapTypToType(magazynEntry.typ),
        outcome: this._determineOutcome(magazynEntry)
      };

      // Log
      this.log = {
        level: this._mapTypToLogLevel(magazynEntry.typ),
        logger: 'CentralnyMagazynStanu'
      };

      // Message
      this.message = this._createMessage(magazynEntry);

      // Labels
      this.labels = {
        operation_type: magazynEntry.typ,
        session_id: this._getSessionId()
      };

      // Custom fields (magazyn-specific)
      this.magazyn = {
        typ: magazynEntry.typ,
        dane: magazynEntry.dane || {},
        id: magazynEntry.id
      };

      // Error fields (if applicable)
      if (this._isError(magazynEntry)) {
        this.error = this._extractError(magazynEntry);
      }

      // User agent
      this.user_agent = {
        original: navigator.userAgent
      };

      // URL
      this.url = {
        full: window.location.href,
        path: window.location.pathname,
        domain: window.location.hostname
      };

      // Performance metrics (if available)
      if (magazynEntry.dane?.czas_ms) {
        this.event.duration = magazynEntry.dane.czas_ms * 1000000; // Convert to nanoseconds
      }
    }

    /**
     * Mapowanie typu magazynu na akcję ECS
     */
    _mapTypToAction(typ) {
      const mapping = {
        'SYSTEM_INIT': 'initialization',
        'SYSTEM_SAVE': 'save',
        'SYSTEM_LOAD': 'load',
        'SYSTEM_ERROR': 'error',
        'DATA_CHANGE': 'change',
        'USER_ACTION': 'user-action',
        'HEALTH_CHECK': 'health-check',
        'ALERT_FIRED': 'alert',
        'METRICS_COLLECTED': 'metrics-collection'
      };
      return mapping[typ] || 'unknown';
    }

    /**
     * Mapowanie typu na kategorię ECS
     */
    _mapTypToCategory(typ) {
      if (typ.includes('ERROR')) return ['error'];
      if (typ.includes('ALERT')) return ['alert'];
      if (typ.includes('SAVE') || typ.includes('LOAD')) return ['database'];
      if (typ.includes('USER')) return ['user'];
      return ['application'];
    }

    /**
     * Mapowanie typu na type ECS
     */
    _mapTypToType(typ) {
      if (typ.includes('ERROR')) return ['error'];
      if (typ.includes('ALERT')) return ['alert'];
      if (typ.includes('CHANGE')) return ['change'];
      if (typ.includes('INIT')) return ['start'];
      return ['info'];
    }

    /**
     * Określenie wyniku operacji
     */
    _determineOutcome(entry) {
      if (entry.typ.includes('ERROR')) return 'failure';
      if (entry.dane?.status === 'error') return 'failure';
      if (entry.dane?.status === 'success') return 'success';
      return 'unknown';
    }

    /**
     * Mapowanie na poziom loga
     */
    _mapTypToLogLevel(typ) {
      if (typ.includes('CRITICAL')) return 'critical';
      if (typ.includes('ERROR')) return 'error';
      if (typ.includes('ALERT')) return 'alert';
      if (typ.includes('WARNING')) return 'warn';
      if (typ.includes('DEBUG')) return 'debug';
      return 'info';
    }

    /**
     * Tworzenie wiadomości
     */
    _createMessage(entry) {
      const messages = {
        'SYSTEM_INIT': 'System został zainicjalizowany',
        'SYSTEM_SAVE': `Stan zapisany (${entry.dane?.czas_ms || 0}ms)`,
        'SYSTEM_LOAD': 'Stan załadowany',
        'SYSTEM_ERROR': `Błąd systemu: ${entry.dane?.message || 'Unknown'}`,
        'DATA_CHANGE': `Zmiana danych: ${entry.dane?.entity_type || 'unknown'}`,
        'USER_ACTION': `Akcja użytkownika: ${entry.dane?.action || 'unknown'}`,
        'HEALTH_CHECK': `Health check: ${entry.dane?.status || 'unknown'}`,
        'ALERT_FIRED': `Alert: ${entry.dane?.alert_name || 'unknown'}`
      };
      return messages[entry.typ] || `Operacja: ${entry.typ}`;
    }

    /**
     * Czy to wpis błędu
     */
    _isError(entry) {
      return entry.typ.includes('ERROR') || entry.dane?.error;
    }

    /**
     * Ekstrakcja informacji o błędzie
     */
    _extractError(entry) {
      const errorData = entry.dane?.error || {};
      return {
        message: errorData.message || entry.dane?.message || 'Unknown error',
        type: errorData.name || 'Error',
        stack_trace: errorData.stack || null
      };
    }

    /**
     * Pobierz session ID
     */
    _getSessionId() {
      if (!window.sessionStorage) return 'unknown';
      
      let sessionId = sessionStorage.getItem('app_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('app_session_id', sessionId);
      }
      return sessionId;
    }
  }

  /**
   * WZBOGACANIE LOGÓW
   */
  function enrichLog(ecsLog) {
    if (!LOG_CONFIG.enrichLogs) return ecsLog;

    // Dodaj informacje o pamięci
    if (window.performance?.memory) {
      const memory = window.performance.memory;
      ecsLog.host = ecsLog.host || {};
      ecsLog.host.memory = {
        used_bytes: memory.usedJSHeapSize,
        total_bytes: memory.totalJSHeapSize,
        limit_bytes: memory.jsHeapSizeLimit
      };
    }

    // Dodaj informacje o sesji
    if (window.productionMonitor) {
      const stats = window.productionMonitor.getStats();
      ecsLog.process = {
        uptime: stats.uptime_seconds || 0
      };
    }

    // Dodaj metryki
    if (window.metricsExporter) {
      ecsLog.custom = ecsLog.custom || {};
      ecsLog.custom.metrics = {
        operations_count: magazyn.pobierzHistorie().length,
        error_count: magazyn.pobierzHistorie().filter(h => h.typ.includes('ERROR')).length
      };
    }

    return ecsLog;
  }

  /**
   * DODAWANIE LOGA DO BUFORA
   */
  function addLog(magazynEntry) {
    try {
      // Utwórz ECS log
      const ecsLog = new ECSLogEntry(magazynEntry);
      
      // Wzbogać
      const enrichedLog = enrichLog(ecsLog);

      // Dodaj do bufora
      aggregatorState.buffer.push(enrichedLog);
      aggregatorState.stats.totalLogs++;

      // Sprawdź rozmiar bufora
      if (aggregatorState.buffer.length > LOG_CONFIG.maxBufferSize) {
        console.warn('⚠️ [LogAggregator] Bufor pełny, usuwam najstarsze logi');
        const overflow = aggregatorState.buffer.length - LOG_CONFIG.maxBufferSize;
        aggregatorState.buffer.splice(0, overflow);
        aggregatorState.stats.droppedLogs += overflow;
      }

      // Flush jeśli batch size osiągnięty
      if (aggregatorState.buffer.length >= LOG_CONFIG.batchSize) {
        flushLogs();
      }

    } catch (error) {
      console.error('❌ [LogAggregator] Błąd dodawania loga:', error);
    }
  }

  /**
   * FLUSH LOGÓW
   */
  function flushLogs() {
    if (aggregatorState.buffer.length === 0) return;

    const batch = aggregatorState.buffer.splice(0, LOG_CONFIG.batchSize);
    
    if (LOG_CONFIG.logstashUrl) {
      sendToLogstash(batch);
    } else {
      storeLocally(batch);
    }
  }

  /**
   * WYSYŁANIE DO LOGSTASH
   */
  async function sendToLogstash(batch, attempt = 1) {
    try {
      const response = await fetch(LOG_CONFIG.logstashUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batch)
      });

      if (response.ok) {
        aggregatorState.stats.successfulBatches++;
        console.log(`✅ [LogAggregator] Wysłano ${batch.length} logów do Logstash`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      console.error(`❌ [LogAggregator] Błąd wysyłania (attempt ${attempt}):`, error);

      // Retry
      if (attempt < LOG_CONFIG.retryAttempts) {
        setTimeout(() => {
          sendToLogstash(batch, attempt + 1);
        }, LOG_CONFIG.retryDelay * attempt);
      } else {
        aggregatorState.stats.failedBatches++;
        // Fallback do localStorage
        storeLocally(batch);
      }
    }
  }

  /**
   * ZAPISYWANIE LOKALNIE
   */
  function storeLocally(batch) {
    try {
      const key = `logs_${LOG_CONFIG.indexPattern}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify({
        timestamp: new Date().toISOString(),
        count: batch.length,
        logs: batch
      }));
      
      aggregatorState.stats.successfulBatches++;
      console.log(`💾 [LogAggregator] Zapisano ${batch.length} logów lokalnie (${key})`);

      // Czyszczenie starych logów (pozostaw tylko ostatnie 10 batchy)
      cleanupOldLogs();

    } catch (error) {
      console.error('❌ [LogAggregator] Błąd zapisu lokalnego:', error);
      aggregatorState.stats.failedBatches++;
      
      // Jeśli localStorage pełny, usuń najstarsze
      if (error.name === 'QuotaExceededError') {
        cleanupOldLogs(5); // Zostaw tylko 5 ostatnich
        storeLocally(batch); // Spróbuj ponownie
      }
    }
  }

  /**
   * CZYSZCZENIE STARYCH LOGÓW
   */
  function cleanupOldLogs(keepCount = 10) {
    try {
      const prefix = `logs_${LOG_CONFIG.indexPattern}_`;
      const keys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }

      // Sortuj po timestamp (w nazwie klucza)
      keys.sort().reverse();

      // Usuń nadmiarowe
      const toRemove = keys.slice(keepCount);
      toRemove.forEach(key => localStorage.removeItem(key));

      if (toRemove.length > 0) {
        console.log(`🧹 [LogAggregator] Usunięto ${toRemove.length} starych batchy logów`);
      }

    } catch (error) {
      console.error('❌ [LogAggregator] Błąd czyszczenia:', error);
    }
  }

  /**
   * EKSPORT LOGÓW
   */
  function exportLogs() {
    const allLogs = [];
    const prefix = `logs_${LOG_CONFIG.indexPattern}_`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          allLogs.push(...data.logs);
        } catch (e) {
          console.error('❌ [LogAggregator] Błąd parsowania loga:', e);
        }
      }
    }

    return allLogs;
  }

  /**
   * EKSPORT DO PLIKU
   */
  function exportToFile() {
    const logs = exportLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${LOG_CONFIG.indexPattern}_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log(`📥 [LogAggregator] Wyeksportowano ${logs.length} logów`);
  }

  /**
   * PODŁĄCZENIE DO MAGAZYNU
   */
  function connectToMagazyn() {
    // Hook do historii magazynu
    const originalDodajDoHistorii = magazyn.dodajDoHistorii;
    magazyn.dodajDoHistorii = function(typ, dane) {
      const entry = originalDodajDoHistorii.call(magazyn, typ, dane);
      
      // Agreguj log
      if (LOG_CONFIG.enabled) {
        addLog(entry);
      }
      
      return entry;
    };

    console.log('🔗 [LogAggregator] Podłączono do CentralnyMagazynStanu');
  }

  /**
   * INICJALIZACJA
   */
  function initializeAggregator() {
    if (!LOG_CONFIG.enabled) {
      console.log('⏸️ [LogAggregator] Agregator wyłączony');
      return;
    }

    console.log('🚀 [LogAggregator] Inicjalizacja...');

    // Podłącz do magazynu
    connectToMagazyn();

    // Cykliczny flush
    aggregatorState.timers.flush = setInterval(flushLogs, LOG_CONFIG.flushInterval);

    // Zapisz w magazynie
    magazyn.dodajDoHistorii('LOG_AGGREGATOR_INIT', {
      config: LOG_CONFIG
    });

    console.log('✅ [LogAggregator] Zainicjalizowany');
  }

  /**
   * ZATRZYMANIE
   */
  function stopAggregator() {
    if (aggregatorState.timers.flush) {
      clearInterval(aggregatorState.timers.flush);
    }
    
    // Flush remaining logs
    flushLogs();
    
    console.log('⏹️ [LogAggregator] Zatrzymany');
  }

  /**
   * PUBLICZNE API
   */
  window.logAggregator = {
    config: LOG_CONFIG,
    init: initializeAggregator,
    stop: stopAggregator,
    flush: flushLogs,
    export: exportLogs,
    exportToFile: exportToFile,
    getStats: () => aggregatorState.stats,
    clearLocalLogs: () => cleanupOldLogs(0)
  };

  /**
   * AUTO-INIT
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAggregator);
  } else {
    initializeAggregator();
  }

})(window);
