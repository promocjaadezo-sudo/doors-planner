# 🧪 PRODUCTION TESTING - Testy produkcyjne z automatycznym raportowaniem

**Wersja:** 1.0.0  
**Status:** ✅ Gotowe do wdrożenia  
**Data utworzenia:** 2025-11-02

---

## 📋 Spis treści

1. [Przegląd](#przegląd)
2. [Typy testów](#typy-testów)
3. [Harmonogram](#harmonogram)
4. [Instalacja](#instalacja)
5. [Konfiguracja](#konfiguracja)
6. [Uruchamianie testów](#uruchamianie-testów)
7. [Raporty](#raporty)
8. [Analytics](#analytics)
9. [Alerty](#alerty)
10. [API Reference](#api-reference)
11. [Troubleshooting](#troubleshooting)

---

## Przegląd

System automatycznego testowania produkcyjnego dla **CentralnyMagazynStanu** składa się z:

- **Production Test Runner** - Automatyczne uruchamianie testów według harmonogramu
- **3 typy testów**: Smoke Tests, Unit Tests, Integration Tests
- **Test Reporter** - Generowanie raportów HTML/JSON
- **Test Analytics** - Analiza trendów, wykrywanie flaky tests, performance regression
- **Alerting** - Powiadomienia o niepowodzeniach

```
┌─────────────────────────────────────────────────┐
│         Production Test Runner                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Scheduler                                │  │
│  │  • Smoke Tests: co 15min                  │  │
│  │  • Unit Tests: co 60min                   │  │
│  │  │  Integration Tests: co 4h              │  │
│  └──────────┬────────────────────────────────┘  │
│             │                                    │
│  ┌──────────▼──────────┐  ┌──────────────────┐  │
│  │   Test Suites       │  │   Test Reporter   │  │
│  │  • Smoke (6 tests)  │  │  • HTML Reports   │  │
│  │  • Unit (6 tests)   │──▶  • JSON Reports   │  │
│  │  • Integration (4)  │  │  • Analytics      │  │
│  └─────────────────────┘  └──────────────────┘  │
│             │                        │           │
│  ┌──────────▼────────────────────────▼────────┐  │
│  │         Analytics & Alerting               │  │
│  │  • Success rate tracking                   │  │
│  │  • Flaky tests detection                   │  │
│  │  • Performance regression                  │  │
│  │  • Desktop notifications                   │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Typy testów

### 1. **Smoke Tests** (6 testów, ~500ms)

Szybkie testy sprawdzające czy kluczowe funkcje działają:

| Test | Sprawdza | Czas |
|------|----------|------|
| `CentralnyMagazynStanu loaded` | Czy magazyn jest załadowany | ~10ms |
| `Get state works` | Czy pobieranie stanu działa | ~5ms |
| `Add to history works` | Czy dodawanie do historii działa | ~50ms |
| `localStorage available` | Czy localStorage jest dostępny | ~10ms |
| `Monitoring loaded` | Czy monitoring jest załadowany | ~5ms |
| `Production monitor works` | Czy production monitor działa | ~20ms |

**Cel:** Szybkie sprawdzenie czy aplikacja jest żywa i podstawowe funkcje działają.

**Częstotliwość:** Co 15 minut

---

### 2. **Unit Tests** (6 testów, ~2s)

Testy jednostkowe kluczowych funkcji:

| Test | Sprawdza | Czas |
|------|----------|------|
| `Export/Import state` | Czy export i import zachowują stan | ~300ms |
| `Clear history` | Czy czyszczenie historii działa | ~100ms |
| `Metrics export` | Czy metryki są eksportowane | ~200ms |
| `Logs aggregation` | Czy logi są agregowane | ~500ms |
| `Alerts checking` | Czy alerty są sprawdzane | ~200ms |
| `Integration wrapping` | Czy integration wrapping działa | ~100ms |

**Cel:** Weryfikacja poprawności działania poszczególnych funkcji.

**Częstotliwość:** Co godzinę

---

### 3. **Integration Tests** (4 testy, ~5s)

Testy integracyjne całych przepływów:

| Test | Sprawdza | Czas |
|------|----------|------|
| `Full save/load cycle` | Pełny cykl zapisu i ładowania | ~1s |
| `Monitoring integration` | Integracja z monitoringiem | ~2s |
| `Error handling` | Obsługa błędów | ~500ms |
| `Memory management` | Zarządzanie pamięcią | ~1.5s |

**Cel:** Weryfikacja że wszystkie komponenty współpracują poprawnie.

**Częstotliwość:** Co 4 godziny

---

## Harmonogram

### Automatyczne uruchamianie

```javascript
// Domyślny harmonogram
{
  smokeTests: 15 * 60 * 1000,      // Co 15 minut
  unitTests: 60 * 60 * 1000,       // Co godzinę
  integrationTests: 4 * 60 * 60 * 1000  // Co 4 godziny
}
```

### Timeline przykładowy (8h sesja)

```
08:00  ➤ Smoke Tests
08:15  ➤ Smoke Tests
08:30  ➤ Smoke Tests
08:45  ➤ Smoke Tests
09:00  ➤ Smoke Tests + Unit Tests
09:15  ➤ Smoke Tests
09:30  ➤ Smoke Tests
09:45  ➤ Smoke Tests
10:00  ➤ Smoke Tests + Unit Tests
...
12:00  ➤ Smoke Tests + Unit Tests + Integration Tests
...
16:00  ➤ Smoke Tests + Unit Tests + Integration Tests
```

**Łącznie w 8h sesji:**
- Smoke Tests: **32 razy** (~16s total)
- Unit Tests: **8 razy** (~16s total)
- Integration Tests: **2 razy** (~10s total)

**Total overhead: ~42s / 8h = 0.015%**

---

## Instalacja

### Krok 1: Dodaj skrypty do `index.html`

```html
<!-- TESTING SCRIPTS (po monitoring) -->
<script src="testing/production-test-runner.js"></script>
<script src="testing/test-reporter.js"></script>
```

**Pełna kolejność:**
```html
<!-- State Management -->
<script src="state/CentralnyMagazynStanu.js"></script>
<script src="state/integration.js"></script>
<script src="state/production-monitor.js"></script>

<!-- Monitoring -->
<script src="monitoring/metrics-exporter.js"></script>
<script src="monitoring/log-aggregator.js"></script>
<script src="monitoring/alerts.js"></script>
<script src="monitoring/integration.js"></script>

<!-- Testing -->
<script src="testing/production-test-runner.js"></script>
<script src="testing/test-reporter.js"></script>
```

### Krok 2: Auto-init

System automatycznie inicjalizuje się przy `DOMContentLoaded`.

W console zobaczysz:
```
🧪 [ProductionTestRunner] Inicjalizacja...
📅 [ProductionTestRunner] Harmonogram skonfigurowany:
  - Smoke tests: co 15 minut
  - Unit tests: co 60 minut
  - Integration tests: co 240 minut
✅ [ProductionTestRunner] Zainicjalizowany
📊 [TestReporter] Zainicjalizowany
```

### Krok 3: Pierwsze testy

Pierwsze smoke tests uruchomią się automatycznie po 10 sekundach.

---

## Konfiguracja

### Production Test Runner

```javascript
window.productionTestRunner.config = {
  enabled: true,
  autoStart: true,
  schedule: {
    smokeTests: 15 * 60 * 1000,      // 15 min
    unitTests: 60 * 60 * 1000,       // 60 min
    integrationTests: 4 * 60 * 60 * 1000  // 4h
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
```

### Dostosowanie harmonogramu

```javascript
// Zmień częstotliwość smoke tests na co 30 minut
window.productionTestRunner.config.schedule.smokeTests = 30 * 60 * 1000;

// Zatrzymaj i uruchom ponownie
window.productionTestRunner.stop();
window.productionTestRunner.start();
```

### Wyłączenie auto-start

```javascript
window.productionTestRunner.config.autoStart = false;

// Uruchom manualnie
window.productionTestRunner.start();
```

---

## Uruchamianie testów

### Manualne uruchamianie

```javascript
// Smoke tests
await window.productionTestRunner.runSmokeTests();

// Unit tests
await window.productionTestRunner.runUnitTests();

// Integration tests
await window.productionTestRunner.runIntegrationTests();

// Wszystkie testy
await window.productionTestRunner.runAll();
```

### Console output

```
🧪 [TestSuite] Uruchamianie: Smoke Tests (6 testów)
  ✅ CentralnyMagazynStanu loaded (8ms)
  ✅ Get state works (3ms)
  ✅ Add to history works (45ms)
  ✅ localStorage available (7ms)
  ✅ Monitoring loaded (2ms)
  ✅ Production monitor works (15ms)
🧪 [TestSuite] Zakończono: 6/6 passed (80ms)
📊 [ProductionTestRunner] Raport zapisany
✅ [TestAnalyzer] Brak problemów
```

### Sprawdzanie statusu

```javascript
// Czy testy obecnie działają?
window.productionTestRunner.isRunning();  // true/false

// Status harmonogramu
window.productionTestRunner.state;
```

---

## Raporty

### Pobieranie raportów

```javascript
// Wszystkie raporty
const reports = window.productionTestRunner.getReports();

// Ostatni raport
const latest = window.productionTestRunner.getLatestReport();
```

### Struktura raportu

```javascript
{
  timestamp: 1730556000000,
  date: "2025-11-02T10:00:00.000Z",
  summary: {
    name: "Smoke Tests",
    type: "smoke",
    total: 6,
    passed: 6,
    failed: 0,
    skipped: 0,
    successRate: 100,
    duration: 80,
    startTime: 1730556000000,
    endTime: 1730556000080
  },
  results: [
    {
      name: "CentralnyMagazynStanu loaded",
      type: "smoke",
      status: "passed",
      duration: 8,
      error: null,
      timestamp: 1730556000010,
      date: "2025-11-02T10:00:00.010Z"
    },
    // ... więcej wyników
  ],
  analytics: {
    totalRuns: 45,
    avgSuccessRate: 98.5,
    flakyTests: ["Test name"],
    trends: [
      {
        timestamp: 1730555100000,
        successRate: 100,
        duration: 75
      },
      // ... więcej trendów
    ]
  }
}
```

### Generowanie raportów HTML

```javascript
// Wygeneruj HTML
const html = window.testReporter.generateHTML();

// Otwórz w nowym oknie
window.testReporter.openReport();

// Export do pliku
window.testReporter.exportHTML();
```

**Raport HTML zawiera:**
- 📊 Statystyki: Total, Passed, Failed, Success Rate, Duration, Total Runs
- 📋 Szczegółowe wyniki testów
- 📈 Wykres trendu success rate (ostatnie 10 runów)
- 📊 Analytics: Avg success rate, flaky tests, test type distribution
- ℹ️ Metadane raportu

### Generowanie raportów JSON

```javascript
// Wygeneruj JSON
const json = window.testReporter.generateJSON();

// Export do pliku
window.testReporter.exportJSON();
```

**Raport JSON zawiera dodatkowo:**
- Performance metrics (avg, min, max duration, slow tests)
- Reliability metrics (consistency score, failure rate)
- History (recent reports summary)

---

## Analytics

### Success Rate Tracking

```javascript
const analytics = window.productionTestRunner.getAnalytics();

console.log(analytics.totalRuns);      // 45
console.log(analytics.successRate);    // 98.5
```

**Interpretation:**
- **100%** - Perfekcyjnie
- **95-99%** - Bardzo dobrze
- **90-94%** - Dobrze
- **80-89%** - Uwaga, możliwe problemy
- **<80%** - 🚨 Krytyczne problemy

### Flaky Tests Detection

**Flaky test** = test który czasami passa, czasami faila.

```javascript
const flakyTests = analytics.flakyTests;
// Set(['Test name 1', 'Test name 2'])
```

System automatycznie wykrywa flaky tests gdy:
- Test ma przynajmniej 3 uruchomienia w historii
- Test ma zarówno passed jak i failed wyniki

**Rozwiązanie flaky tests:**
1. Dodaj `await` dla async operations
2. Zwiększ timeout
3. Dodaj retry mechanism
4. Napraw race conditions

### Performance Regression

```javascript
const trends = analytics.trends;

// Sprawdź czy duration rośnie
const isSlowingDown = trends.slice(-3).every((t, i) => 
  i === 0 || t.duration > trends[trends.length - 3 + i - 1].duration
);

if (isSlowingDown) {
  console.warn('⚠️ Testy zwalniają - możliwa performance regression');
}
```

### Trendy

```javascript
trends.forEach(trend => {
  console.log(
    new Date(trend.timestamp).toLocaleTimeString(),
    `${trend.successRate.toFixed(1)}%`,
    `${trend.duration}ms`
  );
});
```

---

## Alerty

### Typy alertów

1. **Test failure** - Gdy jakiś test nie przejdzie
2. **Low success rate** - Gdy success rate <80%
3. **Flaky tests detected** - Gdy wykryto niestabilne testy

### Desktop notifications

Włączone automatycznie dla test failures:

```javascript
// Poproś o pozwolenie (jeśli jeszcze nie ma)
Notification.requestPermission();
```

Notification shows:
- Tytuł: "Tests Failed"
- Body: "X/Y tests failed in [Suite Name]"
- Icon: /favicon.ico

### Console alerts

```
🚨 [TestAlert] 2 testów nie powiodło się!
⚠️ [TestAlert] 3 niestabilnych testów
🚨 [TestAlert] Success rate poniżej progu: 75.0%
```

### Konfiguracja alertów

```javascript
window.productionTestRunner.config.alerts = {
  enabled: true,
  onFailure: true,      // Alert gdy test faila
  onFlaky: true,        // Alert gdy wykryto flaky test
  threshold: 0.8        // Min 80% success rate
};
```

---

## API Reference

### ProductionTestRunner

```javascript
// Uruchamianie testów
window.productionTestRunner.runSmokeTests(): Promise<Summary>
window.productionTestRunner.runUnitTests(): Promise<Summary>
window.productionTestRunner.runIntegrationTests(): Promise<Summary>
window.productionTestRunner.runAll(): Promise<void>

// Raporty
window.productionTestRunner.getReports(): Report[]
window.productionTestRunner.getLatestReport(): Report | null
window.productionTestRunner.clearReports(): void

// Analytics
window.productionTestRunner.getAnalytics(): Analytics

// Harmonogram
window.productionTestRunner.start(): void
window.productionTestRunner.stop(): void

// Status
window.productionTestRunner.isRunning(): boolean

// Konfiguracja
window.productionTestRunner.config: Config
window.productionTestRunner.state: State
```

### TestReporter

```javascript
// Generowanie raportów
window.testReporter.generateHTML(reports?: Report[]): string
window.testReporter.generateJSON(reports?: Report[]): string

// Export
window.testReporter.exportHTML(): void
window.testReporter.exportJSON(): void

// Otwórz raport
window.testReporter.openReport(): void
```

### Types

```typescript
interface Report {
  timestamp: number;
  date: string;
  summary: Summary;
  results: TestResult[];
  analytics: Analytics;
}

interface Summary {
  name: string;
  type: 'smoke' | 'unit' | 'integration';
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
  duration: number;
  startTime: number;
  endTime: number;
}

interface TestResult {
  name: string;
  type: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  error: string | null;
  timestamp: number;
  date: string;
}

interface Analytics {
  totalRuns: number;
  avgSuccessRate: number;
  flakyTests: Set<string>;
  trends: Trend[];
}

interface Trend {
  timestamp: number;
  successRate: number;
  duration: number;
}
```

---

## Troubleshooting

### Problem: Testy nie uruchamiają się automatycznie

**Rozwiązanie:**
```javascript
// Sprawdź config
console.log(window.productionTestRunner.config.enabled);
console.log(window.productionTestRunner.config.autoStart);

// Uruchom manualnie
window.productionTestRunner.start();

// Sprawdź czy harmonogram działa
console.log(window.productionTestRunner.state.timers);
```

---

### Problem: Wszystkie testy failują

**Rozwiązanie:**
```javascript
// Sprawdź czy magazyn jest załadowany
console.log(window.centralnyMagazyn);

// Sprawdź localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('localStorage problem:', e);
}

// Uruchom smoke tests manualnie i sprawdź errors
await window.productionTestRunner.runSmokeTests();
```

---

### Problem: Flaky tests

**Rozwiązanie:**
```javascript
// Znajdź flaky tests
const flaky = window.productionTestRunner.getAnalytics().flakyTests;
console.log('Flaky tests:', Array.from(flaky));

// Dla każdego flaky test:
// 1. Dodaj await dla async operations
// 2. Zwiększ timeouts
// 3. Usuń race conditions
// 4. Dodaj retry logic
```

---

### Problem: "QuotaExceededError" przy zapisie raportów

**Rozwiązanie:**
```javascript
// Wyczyść stare raporty
window.productionTestRunner.clearReports();

// Zmniejsz maxReports
window.productionTestRunner.config.reporting.maxReports = 20;

// Wyłącz raportowanie (tymczasowo)
window.productionTestRunner.config.reporting.enabled = false;
```

---

### Problem: Testy spowalniają aplikację

**Rozwiązanie:**
```javascript
// Zwiększ intervale
window.productionTestRunner.config.schedule = {
  smokeTests: 30 * 60 * 1000,      // Co 30min zamiast 15min
  unitTests: 2 * 60 * 60 * 1000,   // Co 2h zamiast 1h
  integrationTests: 8 * 60 * 60 * 1000  // Co 8h zamiast 4h
};

// Restart
window.productionTestRunner.stop();
window.productionTestRunner.start();
```

---

### Problem: Nie mogę otworzyć raportu HTML

**Rozwiązanie:**
```javascript
// Sprawdź czy są raporty
const reports = window.productionTestRunner.getReports();
console.log('Reports count:', reports.length);

// Jeśli brak raportów, uruchom testy
await window.productionTestRunner.runSmokeTests();

// Spróbuj ponownie
window.testReporter.openReport();

// Alternatywnie - export do pliku
window.testReporter.exportHTML();
```

---

## Best Practices

### 1. Regularnie sprawdzaj raporty

```javascript
// Co tydzień
const reports = window.productionTestRunner.getReports();
const analytics = window.productionTestRunner.getAnalytics();

console.log('Success rate:', analytics.avgSuccessRate);
console.log('Flaky tests:', analytics.flakyTests.size);

// Export dla archiwum
window.testReporter.exportJSON();
```

### 2. Monitoruj trendy

```javascript
// Sprawdź trend success rate
const trends = analytics.trends;
const isDecreasing = trends.slice(-5).every((t, i) => 
  i === 0 || t.successRate < trends[trends.length - 5 + i - 1].successRate
);

if (isDecreasing) {
  console.warn('⚠️ Success rate spada - wymagana akcja!');
}
```

### 3. Napraw flaky tests natychmiast

```javascript
// Codziennie
const flaky = analytics.flakyTests;
if (flaky.size > 0) {
  console.warn(`⚠️ ${flaky.size} flaky tests - priorytet fix!`);
  console.log('Flaky:', Array.from(flaky));
}
```

### 4. Dostosuj harmonogram do użycia

```javascript
// Development (częste testy)
config.schedule = {
  smokeTests: 5 * 60 * 1000,       // Co 5min
  unitTests: 30 * 60 * 1000,       // Co 30min
  integrationTests: 2 * 60 * 60 * 1000  // Co 2h
};

// Production (rzadsze testy)
config.schedule = {
  smokeTests: 30 * 60 * 1000,      // Co 30min
  unitTests: 2 * 60 * 60 * 1000,   // Co 2h
  integrationTests: 8 * 60 * 60 * 1000  // Co 8h
};
```

### 5. Archiwizuj raporty

```javascript
// Co miesiąc
window.testReporter.exportJSON();

// Następnie wyczyść
window.productionTestRunner.clearReports();
```

---

## Przykłady użycia

### Szybka weryfikacja stanu

```javascript
// Uruchom smoke tests
await window.productionTestRunner.runSmokeTests();

// Sprawdź wynik
const report = window.productionTestRunner.getLatestReport();
console.log(`${report.summary.passed}/${report.summary.total} passed`);

// Jeśli OK - kontynuuj pracę
// Jeśli nie OK - sprawdź szczegóły
if (report.summary.failed > 0) {
  report.results
    .filter(r => r.status === 'failed')
    .forEach(r => console.error(r.name, r.error));
}
```

### Raport dzienny

```javascript
// Na koniec dnia
await window.productionTestRunner.runAll();

// Wygeneruj raport
window.testReporter.exportHTML();

// Sprawdź analytics
const analytics = window.productionTestRunner.getAnalytics();
console.log('=== DAILY REPORT ===');
console.log('Total Runs:', analytics.totalRuns);
console.log('Avg Success Rate:', analytics.avgSuccessRate.toFixed(1) + '%');
console.log('Flaky Tests:', analytics.flakyTests.size);
```

### Debugging test failures

```javascript
// Uruchom konkretny typ testów
await window.productionTestRunner.runUnitTests();

// Sprawdź które testy failują
const report = window.productionTestRunner.getLatestReport();
const failed = report.results.filter(r => r.status === 'failed');

failed.forEach(test => {
  console.group(`❌ ${test.name}`);
  console.log('Error:', test.error);
  console.log('Duration:', test.duration + 'ms');
  console.log('Timestamp:', new Date(test.timestamp).toLocaleString());
  console.groupEnd();
});
```

---

## Integracja z CI/CD

### GitHub Actions example

```yaml
# .github/workflows/production-tests.yml
name: Production Tests

on:
  schedule:
    - cron: '0 */4 * * *'  # Co 4 godziny

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Run Production Tests
        run: |
          npm install
          npm run test:production
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-report
          path: test-report.html
```

---

## Metryki sukcesu

### Docelowe wartości

| Metryka | Target | Warning | Critical |
|---------|--------|---------|----------|
| Success Rate | 100% | <95% | <80% |
| Smoke Tests Duration | <500ms | >1s | >2s |
| Unit Tests Duration | <2s | >5s | >10s |
| Integration Tests Duration | <5s | >10s | >30s |
| Flaky Tests Count | 0 | >2 | >5 |

### Jak mierzyć

```javascript
const report = window.productionTestRunner.getLatestReport();
const analytics = window.productionTestRunner.getAnalytics();

// Success Rate
console.log('Success Rate:', report.summary.successRate + '%');
// Target: 100%

// Duration
console.log('Duration:', report.summary.duration + 'ms');
// Target: Zależy od typu testów

// Flaky Tests
console.log('Flaky Tests:', analytics.flakyTests.size);
// Target: 0
```

---

## 📊 Podsumowanie

System automatycznego testowania produkcyjnego zapewnia:

✅ **16 testów** (6 smoke + 6 unit + 4 integration)  
✅ **Automatyczne uruchamianie** według harmonogramu  
✅ **Raporty HTML/JSON** z wizualizacjami  
✅ **Analytics** (success rate, flaky tests, trends)  
✅ **Alerty** przy niepowodzeniach  
✅ **Minimal overhead** (<0.02% w 8h sesji)  
✅ **Production-ready** - zero-config, auto-init  

---

**Autor:** AI Assistant  
**Wersja dokumentu:** 1.0.0  
**Ostatnia aktualizacja:** 2025-11-02
