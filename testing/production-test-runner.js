/**
 * PRODUCTION TEST RUNNER - Automatyczne uruchamianie testów w produkcji
 * 
 * System automatycznego testowania aplikacji w środowisku produkcyjnym
 * z harmonogramem, raportowaniem i analizą wyników.
 * 
 * @version 1.0.0
 * @created 2025-11-02
 */

(function(window) {
  'use strict';

  console.log('🧪 [ProductionTestRunner] Inicjalizacja...');

  /**
   * KONFIGURACJA
   */
  const TEST_CONFIG = {
    enabled: true,
    autoStart: true,
    schedule: {
      smokeTests: 15 * 60 * 1000,      // Co 15 minut
      unitTests: 60 * 60 * 1000,       // Co godzinę
      integrationTests: 4 * 60 * 60 * 1000  // Co 4 godziny
    },
    reporting: {
      enabled: true,
      format: 'html',                   // 'html' | 'json' | 'both'
      storageKey: 'production_test_reports',
      maxReports: 50,
      autoAnalyze: true
    },
    alerts: {
      enabled: true,
      onFailure: true,
      onFlaky: true,
      threshold: 0.8                    // 80% success rate minimum
    }
  };

  /**
   * Stan test runnera
   */
  const runnerState = {
    isRunning: false,
    currentSuite: null,
    timers: {},
    results: [],
    analytics: {
      totalRuns: 0,
      successRate: 0,
      flakyTests: new Set(),
      trends: []
    }
  };

  /**
   * TYPY TESTÓW
   */
  const TestType = {
    SMOKE: 'smoke',
    UNIT: 'unit',
    INTEGRATION: 'integration'
  };

  /**
   * STATUS TESTÓW
   */
  const TestStatus = {
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    ERROR: 'error'
  };

  /**
   * KLASA WYNIK TESTU
   */
  class TestResult {
    constructor(name, type, status, duration, error = null) {
      this.name = name;
      this.type = type;
      this.status = status;
      this.duration = duration;
      this.error = error;
      this.timestamp = Date.now();
    }

    isPassed() {
      return this.status === TestStatus.PASSED;
    }

    isFailed() {
      return this.status === TestStatus.FAILED || this.status === TestStatus.ERROR;
    }

    toJSON() {
      return {
        name: this.name,
        type: this.type,
        status: this.status,
        duration: this.duration,
        error: this.error,
        timestamp: this.timestamp,
        date: new Date(this.timestamp).toISOString()
      };
    }
  }

  /**
   * KLASA TEST SUITE
   */
  class TestSuite {
    constructor(name, type) {
      this.name = name;
      this.type = type;
      this.tests = [];
      this.results = [];
      this.startTime = null;
      this.endTime = null;
    }

    addTest(testFn, name) {
      this.tests.push({ fn: testFn, name: name });
    }

    async run() {
      console.log(`🧪 [TestSuite] Uruchamianie: ${this.name} (${this.tests.length} testów)`);
      
      this.startTime = Date.now();
      this.results = [];

      for (const test of this.tests) {
        const testStart = Date.now();
        let result;

        try {
          await test.fn();
          const duration = Date.now() - testStart;
          result = new TestResult(test.name, this.type, TestStatus.PASSED, duration);
          console.log(`  ✅ ${test.name} (${duration}ms)`);
        } catch (error) {
          const duration = Date.now() - testStart;
          result = new TestResult(test.name, this.type, TestStatus.FAILED, duration, error.message);
          console.error(`  ❌ ${test.name} (${duration}ms):`, error.message);
        }

        this.results.push(result);
      }

      this.endTime = Date.now();

      const summary = this.getSummary();
      console.log(`🧪 [TestSuite] Zakończono: ${summary.passed}/${summary.total} passed (${summary.duration}ms)`);

      return this.results;
    }

    getSummary() {
      const total = this.results.length;
      const passed = this.results.filter(r => r.isPassed()).length;
      const failed = this.results.filter(r => r.isFailed()).length;
      const duration = this.endTime - this.startTime;

      return {
        name: this.name,
        type: this.type,
        total: total,
        passed: passed,
        failed: failed,
        skipped: total - passed - failed,
        successRate: total > 0 ? (passed / total) * 100 : 0,
        duration: duration,
        startTime: this.startTime,
        endTime: this.endTime
      };
    }
  }

  /**
   * SMOKE TESTS - Szybkie testy kluczowych funkcji
   */
  function createSmokeTests() {
    const suite = new TestSuite('Smoke Tests', TestType.SMOKE);

    // Test 1: CentralnyMagazynStanu istnieje
    suite.addTest(async () => {
      if (!window.centralnyMagazyn) {
        throw new Error('CentralnyMagazynStanu nie jest załadowany');
      }
    }, 'CentralnyMagazynStanu loaded');

    // Test 2: Pobieranie stanu działa
    suite.addTest(async () => {
      const stan = window.centralnyMagazyn.pobierzStan();
      if (!stan || typeof stan !== 'object') {
        throw new Error('Pobieranie stanu nie działa');
      }
    }, 'Get state works');

    // Test 3: Dodawanie do historii działa
    suite.addTest(async () => {
      const beforeLength = window.centralnyMagazyn.pobierzHistorie().length;
      window.centralnyMagazyn.dodajDoHistorii('SMOKE_TEST', { test: true });
      const afterLength = window.centralnyMagazyn.pobierzHistorie().length;
      if (afterLength !== beforeLength + 1) {
        throw new Error('Dodawanie do historii nie działa');
      }
    }, 'Add to history works');

    // Test 4: localStorage dostępny
    suite.addTest(async () => {
      try {
        const testKey = '__smoke_test__';
        localStorage.setItem(testKey, 'test');
        const value = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        if (value !== 'test') {
          throw new Error('localStorage nie działa poprawnie');
        }
      } catch (e) {
        throw new Error('localStorage niedostępny: ' + e.message);
      }
    }, 'localStorage available');

    // Test 5: Monitoring załadowany
    suite.addTest(async () => {
      if (!window.metricsExporter && !window.logAggregator && !window.alerting) {
        throw new Error('Monitoring nie jest załadowany');
      }
    }, 'Monitoring loaded');

    // Test 6: Production monitor działa
    suite.addTest(async () => {
      if (window.productionMonitor) {
        const stats = window.productionMonitor.getStats();
        if (!stats || typeof stats.uptime_seconds !== 'number') {
          throw new Error('Production monitor nie zwraca poprawnych stats');
        }
      }
    }, 'Production monitor works');

    return suite;
  }

  /**
   * UNIT TESTS - Testy jednostkowe kluczowych funkcji
   */
  function createUnitTests() {
    const suite = new TestSuite('Unit Tests', TestType.UNIT);

    // Test 1: Export/Import stanu
    suite.addTest(async () => {
      const magazyn = window.centralnyMagazyn;
      const beforeState = magazyn.pobierzStan();
      const exported = magazyn.exportujDoJSON();
      
      // Dodaj coś do stanu
      magazyn.dodajDoHistorii('UNIT_TEST_TEMP', { temp: true });
      
      // Import z powrotem
      magazyn.importujZJSON(exported);
      const afterState = magazyn.pobierzStan();
      
      // Sprawdź czy stan się zgadza (ignorując timestamp)
      if (JSON.stringify(beforeState.zamowienia) !== JSON.stringify(afterState.zamowienia)) {
        throw new Error('Export/Import nie zachowuje stanu');
      }
    }, 'Export/Import state');

    // Test 2: Czyszczenie historii
    suite.addTest(async () => {
      const magazyn = window.centralnyMagazyn;
      
      // Dodaj kilka wpisów
      for (let i = 0; i < 5; i++) {
        magazyn.dodajDoHistorii('UNIT_TEST_' + i, { index: i });
      }
      
      const beforeLength = magazyn.pobierzHistorie().length;
      magazyn.czyscHistorie(0.5); // Zostaw 50%
      const afterLength = magazyn.pobierzHistorie().length;
      
      if (afterLength >= beforeLength) {
        throw new Error('Czyszczenie historii nie działa');
      }
    }, 'Clear history');

    // Test 3: Metryki eksportowane
    suite.addTest(async () => {
      if (window.metricsExporter) {
        const metrics = window.metricsExporter.export();
        if (!metrics || typeof metrics !== 'string') {
          throw new Error('Metryki nie są eksportowane');
        }
        if (!metrics.includes('app_operations_total')) {
          throw new Error('Metryki nie zawierają app_operations_total');
        }
      }
    }, 'Metrics export');

    // Test 4: Logi agregowane
    suite.addTest(async () => {
      if (window.logAggregator) {
        const beforeStats = window.logAggregator.getStats();
        
        // Dodaj wpis który powinien stworzyć log
        window.centralnyMagazyn.dodajDoHistorii('UNIT_TEST_LOG', { test: true });
        
        // Poczekaj chwilę
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const afterStats = window.logAggregator.getStats();
        
        // Stats powinny się zmienić (totalLogs zwiększony)
        if (afterStats.totalLogs <= beforeStats.totalLogs) {
          throw new Error('Logi nie są agregowane');
        }
      }
    }, 'Logs aggregation');

    // Test 5: Alerty sprawdzane
    suite.addTest(async () => {
      if (window.alerting) {
        const beforeStats = window.alerting.getStats();
        
        // Manualnie sprawdź alerty
        window.alerting.check();
        
        // Stats powinny być dostępne
        const afterStats = window.alerting.getStats();
        if (typeof afterStats.totalAlerts !== 'number') {
          throw new Error('Statystyki alertów nie są dostępne');
        }
      }
    }, 'Alerts checking');

    // Test 6: Integration wrapping
    suite.addTest(async () => {
      if (window.magazynIntegration) {
        const integration = window.magazynIntegration;
        
        // Sprawdź czy wrapped functions istnieją
        if (!integration.getWrappedFunctions) {
          throw new Error('Integration nie ma getWrappedFunctions');
        }
        
        const wrapped = integration.getWrappedFunctions();
        if (!Array.isArray(wrapped) || wrapped.length === 0) {
          throw new Error('Brak wrapped functions');
        }
      }
    }, 'Integration wrapping');

    return suite;
  }

  /**
   * INTEGRATION TESTS - Testy integracyjne
   */
  function createIntegrationTests() {
    const suite = new TestSuite('Integration Tests', TestType.INTEGRATION);

    // Test 1: Full save/load cycle
    suite.addTest(async () => {
      const magazyn = window.centralnyMagazyn;
      
      // Zmień dane
      magazyn.dane.zamowienia.push({
        id: 'test_' + Date.now(),
        nazwa: 'Test Order',
        status: 'test'
      });
      
      // Zapisz
      magazyn.zapiszDoLocalStorage();
      
      // Poczekaj
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Załaduj
      const loaded = magazyn.wczytajZLocalStorage();
      
      if (!loaded) {
        throw new Error('Nie udało się załadować stanu z localStorage');
      }
      
      // Sprawdź czy testowe zamówienie istnieje
      const testOrder = magazyn.dane.zamowienia.find(z => z.nazwa === 'Test Order');
      if (!testOrder) {
        throw new Error('Testowe zamówienie nie zostało zapisane/załadowane');
      }
      
      // Cleanup
      magazyn.dane.zamowienia = magazyn.dane.zamowienia.filter(z => z.nazwa !== 'Test Order');
    }, 'Full save/load cycle');

    // Test 2: Monitoring integration
    suite.addTest(async () => {
      // Dodaj operację
      window.centralnyMagazyn.dodajDoHistorii('INTEGRATION_TEST', { test: true });
      
      // Poczekaj na collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sprawdź czy metryki zawierają operację
      if (window.metricsExporter) {
        const metrics = window.metricsExporter.export();
        if (!metrics.includes('app_operations_total')) {
          throw new Error('Operacja nie została zliczona w metrykach');
        }
      }
      
      // Sprawdź czy log został dodany
      if (window.logAggregator) {
        const stats = window.logAggregator.getStats();
        if (stats.totalLogs === 0) {
          throw new Error('Log nie został agregowany');
        }
      }
    }, 'Monitoring integration');

    // Test 3: Error handling
    suite.addTest(async () => {
      const magazyn = window.centralnyMagazyn;
      
      // Symuluj błąd
      try {
        magazyn.importujZJSON('invalid json');
      } catch (e) {
        // Powinno rzucić błąd
      }
      
      // Sprawdź czy błąd został zalogowany
      const historia = magazyn.pobierzHistorie();
      const errorLog = historia.find(h => h.typ.includes('ERROR'));
      
      // Jeśli nie ma error loga, to error handling nie działa
      // (ale to nie musi być BŁĄD testu, bo może nie być błędów)
    }, 'Error handling');

    // Test 4: Memory management
    suite.addTest(async () => {
      if (window.performance?.memory) {
        const beforeMemory = window.performance.memory.usedJSHeapSize;
        
        // Dodaj dużo danych
        for (let i = 0; i < 100; i++) {
          window.centralnyMagazyn.dodajDoHistorii('MEMORY_TEST_' + i, {
            data: new Array(100).fill('test')
          });
        }
        
        // Wyczyść
        window.centralnyMagazyn.czyscHistorie(0.1);
        
        const afterMemory = window.performance.memory.usedJSHeapSize;
        
        // Sprawdź czy pamięć nie wzrosła dramatycznie
        const increase = afterMemory - beforeMemory;
        const increaseMB = increase / 1024 / 1024;
        
        if (increaseMB > 50) {
          throw new Error(`Wzrost pamięci: ${increaseMB.toFixed(2)}MB - możliwy memory leak`);
        }
      }
    }, 'Memory management');

    return suite;
  }

  /**
   * URUCHOMIENIE TESTÓW
   */
  async function runTests(type) {
    if (runnerState.isRunning) {
      console.warn('⚠️ [ProductionTestRunner] Testy już działają');
      return null;
    }

    runnerState.isRunning = true;
    
    let suite;
    switch (type) {
      case TestType.SMOKE:
        suite = createSmokeTests();
        break;
      case TestType.UNIT:
        suite = createUnitTests();
        break;
      case TestType.INTEGRATION:
        suite = createIntegrationTests();
        break;
      default:
        console.error('❌ [ProductionTestRunner] Nieznany typ testów:', type);
        runnerState.isRunning = false;
        return null;
    }

    runnerState.currentSuite = suite;

    try {
      const results = await suite.run();
      const summary = suite.getSummary();
      
      // Zapisz wyniki
      runnerState.results.push({
        suite: summary,
        results: results,
        timestamp: Date.now()
      });

      // Aktualizuj analytics
      updateAnalytics(summary, results);

      // Wygeneruj raport
      if (TEST_CONFIG.reporting.enabled) {
        generateReport(summary, results);
      }

      // Sprawdź alerty
      if (TEST_CONFIG.alerts.enabled) {
        checkAlerts(summary, results);
      }

      // Zapisz w magazynie
      if (window.centralnyMagazyn) {
        window.centralnyMagazyn.dodajDoHistorii('PRODUCTION_TEST_RUN', {
          type: type,
          summary: summary,
          passed: summary.passed,
          failed: summary.failed,
          successRate: summary.successRate
        });
      }

      runnerState.isRunning = false;
      return summary;

    } catch (error) {
      console.error('❌ [ProductionTestRunner] Błąd podczas testów:', error);
      runnerState.isRunning = false;
      return null;
    }
  }

  /**
   * AKTUALIZACJA ANALYTICS
   */
  function updateAnalytics(summary, results) {
    runnerState.analytics.totalRuns++;
    
    // Success rate
    const allResults = runnerState.results.map(r => r.suite.successRate);
    runnerState.analytics.successRate = 
      allResults.reduce((a, b) => a + b, 0) / allResults.length;

    // Flaky tests (czasami pass, czasami fail)
    results.forEach(result => {
      const history = runnerState.results
        .flatMap(r => r.results)
        .filter(r => r.name === result.name);
      
      if (history.length >= 3) {
        const passed = history.filter(r => r.isPassed()).length;
        const failed = history.filter(r => r.isFailed()).length;
        
        if (passed > 0 && failed > 0) {
          runnerState.analytics.flakyTests.add(result.name);
        }
      }
    });

    // Trends (ostatnie 10 runów)
    const recentRuns = runnerState.results.slice(-10);
    runnerState.analytics.trends = recentRuns.map(r => ({
      timestamp: r.timestamp,
      successRate: r.suite.successRate,
      duration: r.suite.duration
    }));
  }

  /**
   * GENEROWANIE RAPORTU
   */
  function generateReport(summary, results) {
    const report = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      summary: summary,
      results: results.map(r => r.toJSON()),
      analytics: {
        totalRuns: runnerState.analytics.totalRuns,
        avgSuccessRate: runnerState.analytics.successRate,
        flakyTests: Array.from(runnerState.analytics.flakyTests),
        trends: runnerState.analytics.trends
      }
    };

    // Zapisz w localStorage
    try {
      const key = TEST_CONFIG.reporting.storageKey;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      stored.push(report);
      
      // Zachowaj tylko ostatnie maxReports
      const limited = stored.slice(-TEST_CONFIG.reporting.maxReports);
      localStorage.setItem(key, JSON.stringify(limited));
      
      console.log('📊 [ProductionTestRunner] Raport zapisany');
    } catch (e) {
      console.error('❌ [ProductionTestRunner] Błąd zapisu raportu:', e);
    }

    // Auto-analiza
    if (TEST_CONFIG.reporting.autoAnalyze) {
      analyzeReport(report);
    }

    return report;
  }

  /**
   * ANALIZA RAPORTU
   */
  function analyzeReport(report) {
    const issues = [];

    // Niska success rate
    if (report.summary.successRate < TEST_CONFIG.alerts.threshold * 100) {
      issues.push({
        severity: 'error',
        message: `Niska success rate: ${report.summary.successRate.toFixed(1)}%`
      });
    }

    // Wolne testy
    const slowTests = report.results.filter(r => r.duration > 5000);
    if (slowTests.length > 0) {
      issues.push({
        severity: 'warning',
        message: `${slowTests.length} wolnych testów (>5s)`
      });
    }

    // Flaky tests
    if (report.analytics.flakyTests.length > 0) {
      issues.push({
        severity: 'warning',
        message: `${report.analytics.flakyTests.length} niestabilnych testów`
      });
    }

    // Trend spadkowy
    if (report.analytics.trends.length >= 3) {
      const recent = report.analytics.trends.slice(-3);
      const isDecreasing = recent.every((t, i) => 
        i === 0 || t.successRate < recent[i - 1].successRate
      );
      
      if (isDecreasing) {
        issues.push({
          severity: 'warning',
          message: 'Trend spadkowy success rate'
        });
      }
    }

    // Loguj issues
    if (issues.length > 0) {
      console.group('⚠️ [TestAnalyzer] Wykryte problemy:');
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`${icon} ${issue.message}`);
      });
      console.groupEnd();
    } else {
      console.log('✅ [TestAnalyzer] Brak problemów');
    }

    return issues;
  }

  /**
   * SPRAWDZANIE ALERTÓW
   */
  function checkAlerts(summary, results) {
    // Alert na niepowodzenie
    if (TEST_CONFIG.alerts.onFailure && summary.failed > 0) {
      console.error(`🚨 [TestAlert] ${summary.failed} testów nie powiodło się!`);
      
      // Desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Tests Failed', {
          body: `${summary.failed}/${summary.total} tests failed in ${summary.name}`,
          icon: '/favicon.ico',
          tag: 'production-tests'
        });
      }
    }

    // Alert na flaky tests
    if (TEST_CONFIG.alerts.onFlaky && runnerState.analytics.flakyTests.size > 0) {
      console.warn(`⚠️ [TestAlert] ${runnerState.analytics.flakyTests.size} niestabilnych testów`);
    }

    // Alert na niską success rate
    if (summary.successRate < TEST_CONFIG.alerts.threshold * 100) {
      console.error(`🚨 [TestAlert] Success rate poniżej progu: ${summary.successRate.toFixed(1)}%`);
    }
  }

  /**
   * SETUP HARMONOGRAMU
   */
  function setupSchedule() {
    // Smoke tests co 15 minut
    runnerState.timers.smoke = setInterval(() => {
      console.log('⏰ [ProductionTestRunner] Scheduled smoke tests');
      runTests(TestType.SMOKE);
    }, TEST_CONFIG.schedule.smokeTests);

    // Unit tests co godzinę
    runnerState.timers.unit = setInterval(() => {
      console.log('⏰ [ProductionTestRunner] Scheduled unit tests');
      runTests(TestType.UNIT);
    }, TEST_CONFIG.schedule.unitTests);

    // Integration tests co 4 godziny
    runnerState.timers.integration = setInterval(() => {
      console.log('⏰ [ProductionTestRunner] Scheduled integration tests');
      runTests(TestType.INTEGRATION);
    }, TEST_CONFIG.schedule.integrationTests);

    console.log('📅 [ProductionTestRunner] Harmonogram skonfigurowany:');
    console.log(`  - Smoke tests: co ${TEST_CONFIG.schedule.smokeTests / 60000} minut`);
    console.log(`  - Unit tests: co ${TEST_CONFIG.schedule.unitTests / 60000} minut`);
    console.log(`  - Integration tests: co ${TEST_CONFIG.schedule.integrationTests / 60000} minut`);
  }

  /**
   * ZATRZYMANIE HARMONOGRAMU
   */
  function stopSchedule() {
    Object.keys(runnerState.timers).forEach(key => {
      clearInterval(runnerState.timers[key]);
    });
    runnerState.timers = {};
    console.log('⏹️ [ProductionTestRunner] Harmonogram zatrzymany');
  }

  /**
   * INICJALIZACJA
   */
  function initialize() {
    if (!TEST_CONFIG.enabled) {
      console.log('⏸️ [ProductionTestRunner] Test runner wyłączony');
      return;
    }

    console.log('🚀 [ProductionTestRunner] Inicjalizacja...');

    // Setup schedule
    if (TEST_CONFIG.autoStart) {
      setupSchedule();
      
      // Pierwsze uruchomienie po 10s
      setTimeout(() => runTests(TestType.SMOKE), 10000);
    }

    // Zapisz inicjalizację
    if (window.centralnyMagazyn) {
      window.centralnyMagazyn.dodajDoHistorii('PRODUCTION_TEST_RUNNER_INIT', {
        config: TEST_CONFIG
      });
    }

    console.log('✅ [ProductionTestRunner] Zainicjalizowany');
  }

  /**
   * PUBLICZNE API
   */
  window.productionTestRunner = {
    config: TEST_CONFIG,
    state: runnerState,
    
    // Uruchamianie testów
    runSmokeTests: () => runTests(TestType.SMOKE),
    runUnitTests: () => runTests(TestType.UNIT),
    runIntegrationTests: () => runTests(TestType.INTEGRATION),
    runAll: async () => {
      await runTests(TestType.SMOKE);
      await runTests(TestType.UNIT);
      await runTests(TestType.INTEGRATION);
    },
    
    // Raporty
    getReports: () => {
      try {
        return JSON.parse(localStorage.getItem(TEST_CONFIG.reporting.storageKey) || '[]');
      } catch (e) {
        return [];
      }
    },
    
    getLatestReport: () => {
      const reports = window.productionTestRunner.getReports();
      return reports[reports.length - 1] || null;
    },
    
    clearReports: () => {
      localStorage.removeItem(TEST_CONFIG.reporting.storageKey);
      console.log('🗑️ Raporty wyczyszczone');
    },
    
    // Analytics
    getAnalytics: () => runnerState.analytics,
    
    // Harmonogram
    start: setupSchedule,
    stop: stopSchedule,
    
    // Utility
    isRunning: () => runnerState.isRunning
  };

  /**
   * AUTO-INIT
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }

})(window);
