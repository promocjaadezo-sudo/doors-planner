# 🧪 Testing - System testów produkcyjnych

**Wersja:** 1.0.0  
**Status:** ✅ Gotowe do wdrożenia  
**Data utworzenia:** 2025-11-02

---

## 📋 Przegląd

Katalog `testing/` zawiera kompletny system automatycznego testowania produkcyjnego dla **CentralnyMagazynStanu**:

- **Production Test Runner** - Automatyczne uruchamianie testów
- **16 testów** (6 smoke + 6 unit + 4 integration)
- **Test Reporter** - Generowanie raportów HTML/JSON
- **Test Analytics** - Analiza trendów i wykrywanie problemów
- **Harmonogram** - Smoke: 15min, Unit: 60min, Integration: 4h

---

## 📁 Struktura

```
testing/
├── production-test-runner.js    ~800 linii   ✅
├── test-reporter.js              ~550 linii   ✅
├── PRODUCTION_TESTING.md         900+ linii   ✅
└── README.md                     Ten plik
```

---

## 🚀 Szybki start

### 1. Dodaj do `index.html`

```html
<!-- Testing Scripts -->
<script src="testing/production-test-runner.js"></script>
<script src="testing/test-reporter.js"></script>
```

### 2. Auto-init

System automatycznie startuje. W console zobaczysz:

```
🧪 [ProductionTestRunner] Inicjalizacja...
📅 Harmonogram skonfigurowany
✅ Zainicjalizowany
```

### 3. Pierwsze testy

Smoke tests uruchomią się po 10 sekundach.

---

## 🧪 Typy testów

### Smoke Tests (6 testów, ~500ms)
Szybkie sprawdzenie czy aplikacja żyje:
- CentralnyMagazynStanu loaded
- Get state works
- Add to history works
- localStorage available
- Monitoring loaded
- Production monitor works

**Częstotliwość:** Co 15 minut

### Unit Tests (6 testów, ~2s)
Testy jednostkowe kluczowych funkcji:
- Export/Import state
- Clear history
- Metrics export
- Logs aggregation
- Alerts checking
- Integration wrapping

**Częstotliwość:** Co godzinę

### Integration Tests (4 testy, ~5s)
Testy całych przepływów:
- Full save/load cycle
- Monitoring integration
- Error handling
- Memory management

**Częstotliwość:** Co 4 godziny

---

## 📊 Raporty

### Generowanie raportów

```javascript
// Otwórz raport HTML w nowym oknie
window.testReporter.openReport();

// Export do pliku
window.testReporter.exportHTML();
window.testReporter.exportJSON();
```

### Raport HTML zawiera:
- 📊 Statystyki (Total, Passed, Failed, Success Rate)
- 📋 Szczegółowe wyniki testów
- 📈 Wykres trendu success rate
- 📊 Analytics (avg success rate, flaky tests)
- ℹ️ Metadane

### Raport JSON zawiera dodatkowo:
- Performance metrics (avg, min, max duration)
- Reliability metrics (consistency score)
- History (recent reports)

---

## 🎯 API Reference

### ProductionTestRunner

```javascript
// Uruchom testy
await productionTestRunner.runSmokeTests()
await productionTestRunner.runUnitTests()
await productionTestRunner.runIntegrationTests()
await productionTestRunner.runAll()

// Raporty
productionTestRunner.getReports()
productionTestRunner.getLatestReport()
productionTestRunner.clearReports()

// Analytics
productionTestRunner.getAnalytics()
// => { totalRuns, avgSuccessRate, flakyTests, trends }

// Harmonogram
productionTestRunner.start()
productionTestRunner.stop()

// Status
productionTestRunner.isRunning()
```

### TestReporter

```javascript
// Generowanie
testReporter.generateHTML(reports?)
testReporter.generateJSON(reports?)

// Export
testReporter.exportHTML()
testReporter.exportJSON()

// Otwórz raport
testReporter.openReport()
```

---

## ⚙️ Konfiguracja

```javascript
productionTestRunner.config = {
  enabled: true,
  autoStart: true,
  schedule: {
    smokeTests: 15 * 60 * 1000,      // 15min
    unitTests: 60 * 60 * 1000,       // 60min
    integrationTests: 4 * 60 * 60 * 1000  // 4h
  },
  reporting: {
    enabled: true,
    format: 'html',
    storageKey: 'production_test_reports',
    maxReports: 50,
    autoAnalyze: true
  },
  alerts: {
    enabled: true,
    onFailure: true,
    onFlaky: true,
    threshold: 0.8  // 80% minimum
  }
};
```

---

## 📈 Analytics

### Success Rate Tracking

```javascript
const analytics = productionTestRunner.getAnalytics();

console.log('Total Runs:', analytics.totalRuns);
console.log('Avg Success Rate:', analytics.avgSuccessRate + '%');
```

**Interpretation:**
- 100% - Perfekcyjnie
- 95-99% - Bardzo dobrze
- 90-94% - Dobrze
- 80-89% - Uwaga
- <80% - 🚨 Krytyczne

### Flaky Tests Detection

```javascript
const flaky = analytics.flakyTests;
console.log('Flaky tests:', Array.from(flaky));
```

**Flaky test** = test który czasami passa, czasami faila.

Wykrywane automatycznie gdy test ma:
- ≥3 uruchomienia w historii
- Zarówno passed jak i failed wyniki

### Trends

```javascript
const trends = analytics.trends;
trends.forEach(t => {
  console.log(
    new Date(t.timestamp).toLocaleTimeString(),
    t.successRate + '%',
    t.duration + 'ms'
  );
});
```

---

## 🔔 Alerty

### Typy alertów

1. **Test failure** - Desktop notification
2. **Low success rate** (<80%)
3. **Flaky tests detected**

### Console alerts

```
🚨 [TestAlert] 2 testów nie powiodło się!
⚠️ [TestAlert] 3 niestabilnych testów
```

### Desktop notification

Dla test failures:
- Title: "Tests Failed"
- Body: "X/Y tests failed in [Suite]"
- Icon: /favicon.ico

---

## 📅 Harmonogram

### Timeline (8h sesja)

```
08:00  ➤ Smoke Tests (pierwsz uruchomienie po 10s)
08:15  ➤ Smoke Tests
08:30  ➤ Smoke Tests
08:45  ➤ Smoke Tests
09:00  ➤ Smoke Tests + Unit Tests
09:15  ➤ Smoke Tests
...
12:00  ➤ Smoke + Unit + Integration
...
16:00  ➤ Smoke + Unit + Integration
```

**W 8h sesji:**
- Smoke: 32x (~16s total)
- Unit: 8x (~16s total)
- Integration: 2x (~10s total)

**Total overhead: ~42s / 8h = 0.015%**

---

## 🛠️ Troubleshooting

### Testy nie uruchamiają się

```javascript
// Sprawdź config
console.log(productionTestRunner.config.enabled);
console.log(productionTestRunner.config.autoStart);

// Uruchom manualnie
productionTestRunner.start();
```

### Wszystkie testy failują

```javascript
// Sprawdź magazyn
console.log(window.centralnyMagazyn);

// Sprawdź localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('localStorage:', e);
}
```

### QuotaExceededError

```javascript
// Wyczyść raporty
productionTestRunner.clearReports();

// Zmniejsz maxReports
productionTestRunner.config.reporting.maxReports = 20;
```

### Testy spowalniają

```javascript
// Zwiększ intervale
productionTestRunner.config.schedule.smokeTests = 30 * 60 * 1000;
productionTestRunner.stop();
productionTestRunner.start();
```

---

## 📝 Przykłady użycia

### Szybka weryfikacja

```javascript
// Uruchom smoke tests
await productionTestRunner.runSmokeTests();

// Sprawdź wynik
const report = productionTestRunner.getLatestReport();
console.log(`${report.summary.passed}/${report.summary.total} passed`);
```

### Raport dzienny

```javascript
// Na koniec dnia
await productionTestRunner.runAll();

// Export
testReporter.exportHTML();

// Analytics
const analytics = productionTestRunner.getAnalytics();
console.log('=== DAILY REPORT ===');
console.log('Total Runs:', analytics.totalRuns);
console.log('Success Rate:', analytics.avgSuccessRate + '%');
console.log('Flaky Tests:', analytics.flakyTests.size);
```

### Debugging failures

```javascript
await productionTestRunner.runUnitTests();

const report = productionTestRunner.getLatestReport();
const failed = report.results.filter(r => r.status === 'failed');

failed.forEach(test => {
  console.group(`❌ ${test.name}`);
  console.log('Error:', test.error);
  console.log('Duration:', test.duration + 'ms');
  console.groupEnd();
});
```

---

## 🎯 Best Practices

### 1. Regularnie sprawdzaj raporty
```javascript
// Co tydzień
const analytics = productionTestRunner.getAnalytics();
console.log('Success:', analytics.avgSuccessRate);
testReporter.exportJSON();  // Archiwum
```

### 2. Monitoruj trendy
```javascript
const trends = analytics.trends;
const isDecreasing = /* check if dropping */;
if (isDecreasing) console.warn('⚠️ Success rate spada!');
```

### 3. Napraw flaky tests natychmiast
```javascript
const flaky = analytics.flakyTests;
if (flaky.size > 0) {
  console.warn(`⚠️ ${flaky.size} flaky tests - fix!`);
}
```

### 4. Dostosuj harmonogram
```javascript
// Development (częste)
config.schedule = { smokeTests: 5*60*1000, ... };

// Production (rzadsze)
config.schedule = { smokeTests: 30*60*1000, ... };
```

### 5. Archiwizuj
```javascript
// Co miesiąc
testReporter.exportJSON();
productionTestRunner.clearReports();
```

---

## 📊 Metryki sukcesu

| Metryka | Target | Warning | Critical |
|---------|--------|---------|----------|
| Success Rate | 100% | <95% | <80% |
| Smoke Duration | <500ms | >1s | >2s |
| Unit Duration | <2s | >5s | >10s |
| Integration Duration | <5s | >10s | >30s |
| Flaky Tests | 0 | >2 | >5 |

---

## 🔗 Integracja

### Z CentralnyMagazynStanu
- Testy używają `window.centralnyMagazyn` API
- Sprawdzają stan, historię, export/import
- Weryfikują localStorage persistence

### Z Production Monitor
- Testy sprawdzają `window.productionMonitor.getStats()`
- Weryfikują uptime tracking
- Sprawdzają health checks

### Z Monitoring
- Testy weryfikują metrics export
- Sprawdzają logs aggregation
- Testują alerting system

---

## 📚 Dokumentacja

**Pełna instrukcja:**
- `PRODUCTION_TESTING.md` - 900+ linii kompleksowej dokumentacji

**Zawiera:**
- Szczegółowy opis wszystkich testów
- Konfiguracja i harmonogram
- API Reference
- Troubleshooting guide
- Best practices
- Przykłady użycia
- Integracja z CI/CD

---

## 🎉 Podsumowanie

System testów produkcyjnych zapewnia:

✅ **16 testów** automatycznych  
✅ **Harmonogram** (15min / 1h / 4h)  
✅ **Raporty** HTML/JSON z wizualizacjami  
✅ **Analytics** (success rate, flaky tests, trends)  
✅ **Alerty** desktop notifications  
✅ **Overhead** <0.02% w 8h sesji  
✅ **Zero-config** auto-init  

---

**Autor:** AI Assistant  
**Data:** 2025-11-02  
**Status:** ✅ PRODUCTION READY
