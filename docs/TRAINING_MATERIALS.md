# 🎓 MATERIAŁY SZKOLENIOWE - System Monitoringu i Wdrożeń

**Program szkolenia:** 3 dni (6 godzin)  
**Poziom:** Początkujący → Zaawansowany  
**Format:** Teoria + Hands-on  
**Data przygotowania:** 2 listopada 2025

---

## 📋 Spis treści

1. [Przegląd programu](#przegląd-programu)
2. [Dzień 1: Production Monitoring](#dzień-1-production-monitoring)
3. [Dzień 2: Automated Testing](#dzień-2-automated-testing)
4. [Dzień 3: Safe Deployments](#dzień-3-safe-deployments)
5. [Ćwiczenia praktyczne](#ćwiczenia-praktyczne)
6. [Quiz i certyfikacja](#quiz-i-certyfikacja)
7. [Materiały dodatkowe](#materiały-dodatkowe)

---

## Przegląd programu

### Cele szkolenia

Po ukończeniu szkolenia każdy uczestnik będzie potrafił:

✅ **Monitoring:**
- Zainstalować i skonfigurować production monitor
- Interpretować metryki (uptime, errors, performance)
- Reagować na alerty
- Korzystać z auto-recovery

✅ **Testing:**
- Uruchomić testy produkcyjne
- Czytać raporty testów
- Analizować trendy success rate
- Diagnozować failed tests

✅ **Deployment:**
- Utworzyć backup przed wdrożeniem
- Wykonać bezpieczne wdrożenie
- Bump version z changelog
- Wykonać rollback w razie problemów
- Używać Deployment Panel (Ctrl+Shift+D)

### Harmonogram

| Dzień | Temat | Czas | Format |
|-------|-------|------|--------|
| **Dzień 1** | Production Monitoring | 2h | 30min teoria + 1h hands-on + 30min advanced |
| **Dzień 2** | Automated Testing | 2h | 30min teoria + 1h hands-on + 30min advanced |
| **Dzień 3** | Safe Deployments | 3h | 45min teoria + 1h30 hands-on + 45min panel |
| **Podsumowanie** | Quiz + Q&A | 1h | Test wiedzy + dyskusja |

**Total:** 8 godzin (można rozłożyć na 3 dni po 2.5h lub intensywnie 2 dni po 4h)

---

## Dzień 1: Production Monitoring

### Część 1: Teoria (30 minut)

#### Co to jest Production Monitoring?

**Definicja:**
> System śledzący w czasie rzeczywistym stan aplikacji w środowisku produkcyjnym, wykrywający problemy i automatycznie je naprawiający.

**Dlaczego potrzebujemy monitoringu?**

❌ **Bez monitoringu:**
- Nie wiemy czy aplikacja działa
- Użytkownicy zgłaszają błędy zanim my je zauważymy
- Brak danych o performance
- Trudno zdiagnozować problemy

✅ **Z monitoringiem:**
- Real-time visibility co się dzieje
- Błędy wykrywane automatycznie
- Performance tracked
- Alerty przed problemami
- Auto-recovery

#### Jakie metryki śledzimy?

**1. Uptime (Czas działania)**
```
Uptime = (Total time - Downtime) / Total time × 100%

Przykład:
- Aplikacja działa 24h
- Była 5 minut down
- Uptime = (1440 - 5) / 1440 × 100% = 99.65%
```

**Target:** >99.9% (mniej niż 43 minuty downtime miesięcznie)

**2. Error Rate (Częstość błędów)**
```
Error Rate = (Errors / Total operations) × 100%

Przykład:
- 10,000 operacji
- 5 błędów
- Error Rate = 5 / 10000 × 100% = 0.05%
```

**Target:** <0.1% (mniej niż 1 błąd na 1000 operacji)

**3. Performance (Wydajność)**

**FPS (Frames Per Second):**
- Jak płynnie działa interfejs
- Target: >55 FPS
- Warning: <45 FPS
- Critical: <30 FPS

**Memory Usage:**
- Ile pamięci zajmuje aplikacja
- Target: <100 MB
- Warning: >200 MB
- Critical: >300 MB

**Load Time:**
- Jak szybko ładuje się aplikacja
- Target: <2s
- Warning: >3s
- Critical: >5s

**4. Health Checks (Sprawdzenia zdrowia)**

Regularne sprawdzanie czy kluczowe komponenty działają:
- ✅ localStorage dostępny?
- ✅ CentralnyMagazynStanu załadowany?
- ✅ API responsywne?
- ✅ Brak memory leaks?

#### Jak działa Auto-Recovery?

```
Problem detected
    ↓
Try to fix automatically
    ↓
    ├─→ localStorage full? → Clear old data
    ├─→ Memory leak? → Reload component
    ├─→ API timeout? → Retry request
    └─→ State corrupted? → Restore from backup
    ↓
Log the fix
    ↓
Notify user (if needed)
```

**Przykłady auto-recovery:**
- localStorage full → Automatycznie czyści stare dane
- High memory usage → Sugeruje reload
- Błąd state → Przywraca z localStorage

---

### Część 2: Hands-on (60 minut)

#### Ćwiczenie 1: Instalacja (10 min)

**Krok 1:** Otwórz `index.html`

**Krok 2:** Dodaj przed `</body>`:

```html
<!-- Monitoring Script -->
<script src="monitoring/production-monitor.js"></script>
```

**Krok 3:** Zapisz i odśwież stronę (F5)

**Krok 4:** Otwórz Console (F12)

Powinieneś zobaczyć:
```
📊 [ProductionMonitor] Inicjalizacja...
✅ [ProductionMonitor] Zainicjalizowany
🚀 Monitoring started
```

**✅ Checkpoint:** Jeśli widzisz te komunikaty, instalacja OK!

---

#### Ćwiczenie 2: Pierwsze metryki (15 min)

**Krok 1:** W Console wpisz:

```javascript
productionMonitor.getStats()
```

Powinieneś zobaczyć:
```javascript
{
  uptime: 120000,              // 2 minuty w ms
  errors: 0,                   // Brak błędów
  performance: {
    fps: 60,                   // 60 FPS
    memory: 45.5,              // 45.5 MB
    loadTime: 1234             // 1.2s load
  },
  health: {
    overall: 'healthy',
    lastCheck: 1730553600000
  }
}
```

**Zadanie:** 
- Sprawdź uptime co 30 sekund (3 razy)
- Zanotuj wartości
- Oblicz ile to w minutach

**Krok 2:** Historia metryk

```javascript
productionMonitor.getHistory()
```

Zobaczysz tablicę obiektów:
```javascript
[
  {
    timestamp: 1730553600000,
    uptime: 120000,
    errors: 0,
    fps: 60,
    memory: 45.5
  },
  // ... więcej wpisów co 5 sekund
]
```

**Zadanie:**
- Ile wpisów jest w historii?
- Jaki jest średni FPS z ostatnich 10 wpisów?

**✅ Checkpoint:** Potrafisz pobrać i zinterpretować stats!

---

#### Ćwiczenie 3: Symulacja błędu (15 min)

**Krok 1:** Wywołaj błąd celowo

W Console:
```javascript
// Symuluj błąd
throw new Error('Test error - to jest celowy błąd!');
```

**Krok 2:** Sprawdź czy monitor wychwycił

```javascript
productionMonitor.getStats()
```

Powinieneś zobaczyć:
```javascript
{
  errors: 1,  // ← Zwiększyło się!
  // ...
}
```

**Krok 3:** Sprawdź error log

```javascript
productionMonitor.errorLog
```

Zobaczysz:
```javascript
[
  {
    message: 'Test error - to jest celowy błąd!',
    timestamp: 1730553600000,
    stack: '...'
  }
]
```

**Krok 4:** Sprawdź czy otrzymałeś desktop notification

- Powinno pojawić się powiadomienie: "JavaScript Error"
- Jeśli nie → sprawdź czy pozwoliłeś na notifications w przeglądarce

**✅ Checkpoint:** Monitor wykrywa błędy automatycznie!

---

#### Ćwiczenie 4: Health Checks (10 min)

**Krok 1:** Uruchom health check

```javascript
productionMonitor.checkHealth()
```

Wynik:
```javascript
{
  overall: 'healthy',  // lub 'warning' lub 'critical'
  checks: [
    { name: 'localStorage', status: 'healthy', message: 'OK' },
    { name: 'centralnyMagazyn', status: 'healthy', message: 'Loaded' },
    { name: 'memoryUsage', status: 'healthy', message: '45.5 MB' }
  ],
  timestamp: 1730553600000
}
```

**Krok 2:** Symuluj problem z localStorage

```javascript
// Tymczasowo zablokuj localStorage
const originalSetItem = localStorage.setItem;
localStorage.setItem = () => { throw new Error('localStorage full!'); };

// Sprawdź health
productionMonitor.checkHealth();

// Przywróć
localStorage.setItem = originalSetItem;
```

Powinieneś zobaczyć `warning` w health check!

**✅ Checkpoint:** Health checks wykrywają problemy!

---

#### Ćwiczenie 5: Auto-Recovery (10 min)

**Krok 1:** Symuluj pełny localStorage

```javascript
// Monitor wykryje problem i zaproponuje fix
// Zobaczysz w console:
// ⚠️ [ProductionMonitor] localStorage problém detected
// 🔧 [ProductionMonitor] Attempting auto-recovery...
```

**Krok 2:** Obserwuj auto-recovery

Monitor automatycznie:
1. Wykryje problem
2. Spróbuje naprawić
3. Zloguje akcję
4. Wyśle notification

**Krok 3:** Sprawdź logs

```javascript
productionMonitor.getHistory().filter(entry => entry.recovery)
```

**✅ Checkpoint:** Auto-recovery działa!

---

### Część 3: Zaawansowane (30 minut)

#### Custom Configuration

**Domyślna konfiguracja:**
```javascript
productionMonitor.config = {
  enabled: true,
  errorTracking: true,
  performanceTracking: true,
  healthChecks: true,
  autoRecovery: true,
  statsUpdateInterval: 5000,  // 5s
  notificationsEnabled: true
};
```

**Ćwiczenie:** Zmień interval na 10s

```javascript
productionMonitor.config.statsUpdateInterval = 10000;
productionMonitor.stop();
productionMonitor.start();
```

#### Custom Metrics

**Dodawanie własnych metryk:**

```javascript
// Przykład: Śledź liczbę operacji użytkownika
let userOperations = 0;

document.addEventListener('click', () => {
  userOperations++;
});

// Co 5s dodaj do metryk
setInterval(() => {
  productionMonitor.customMetrics = {
    userOperations: userOperations
  };
}, 5000);
```

#### Alerts Configuration

**Setup custom alerts:**

```javascript
// Alert gdy FPS < 30
setInterval(() => {
  const stats = productionMonitor.getStats();
  if (stats.performance.fps < 30) {
    alert('⚠️ Low FPS detected! Application may be slow.');
  }
}, 10000);
```

---

### Podsumowanie Dzień 1

**Co przećwiczyliśmy:**
✅ Instalacja production-monitor.js  
✅ Pobieranie i interpretacja stats  
✅ Symulacja i wykrywanie błędów  
✅ Health checks  
✅ Auto-recovery  
✅ Custom configuration  

**Zadanie domowe:**
1. Zostaw monitor działający przez noc
2. Rano sprawdź uptime i error rate
3. Przeanalizuj performance metrics

**Pytania sprawdzające:**
1. Jaki jest target dla uptime? (>99.9%)
2. Co to jest FPS? (Frames Per Second)
3. Kiedy uruchamia się auto-recovery? (Gdy wykryty problem)
4. Jak sprawdzić stats? (`productionMonitor.getStats()`)

---

## Dzień 2: Automated Testing

### Część 1: Teoria (30 minut)

#### Dlaczego testy w produkcji?

❌ **Typowe myślenie:**
> "Przetestowaliśmy przed wdrożeniem, nie potrzebujemy testów w produkcji"

✅ **Rzeczywistość:**
- Produkcja ≠ development environment
- Różne dane, różne obciążenie
- Problemy pojawiają się tylko w produkcji
- Potrzebujemy regularnej weryfikacji

**Przykłady problemów tylko w produkcji:**
- localStorage full (w dev był pusty)
- Duże dane spowalniają (w dev były testowe małe dane)
- Race conditions (w dev mniejsze obciążenie)
- Browser-specific bugs (w dev tylko Chrome, w prod różne)

#### Rodzaje testów

**1. Smoke Tests (Szybkie, często)**
- **Cel:** Sprawdzić czy aplikacja "żyje"
- **Czas:** ~500ms (bardzo szybkie)
- **Częstość:** Co 15 minut
- **Przykłady:**
  - CentralnyMagazynStanu załadowany?
  - Get state działa?
  - localStorage dostępny?

**2. Unit Tests (Średnie, regularnie)**
- **Cel:** Sprawdzić konkretne funkcje
- **Czas:** ~2s
- **Częstość:** Co godzinę
- **Przykłady:**
  - Export/Import state
  - Clear history
  - Metrics export

**3. Integration Tests (Wolne, rzadko)**
- **Cel:** Sprawdzić całe przepływy
- **Czas:** ~5s
- **Częstość:** Co 4 godziny
- **Przykłady:**
  - Full save/load cycle
  - Monitoring integration
  - Error handling

#### Harmonogram testów

```
08:00  ➤ Smoke Tests (start po 10s)
08:15  ➤ Smoke Tests
08:30  ➤ Smoke Tests
08:45  ➤ Smoke Tests
09:00  ➤ Smoke Tests + Unit Tests
09:15  ➤ Smoke Tests
09:30  ➤ Smoke Tests
09:45  ➤ Smoke Tests
10:00  ➤ Smoke Tests + Unit Tests
...
12:00  ➤ Smoke + Unit + Integration Tests
```

**W 8h sesji:**
- Smoke: 32x (~16s total overhead)
- Unit: 8x (~16s total overhead)
- Integration: 2x (~10s total overhead)
- **Total: ~42s overhead / 8h = 0.015%** ✅

#### Success Rate

```
Success Rate = (Passed tests / Total tests) × 100%

Interpretacja:
- 100%: Perfekcyjnie ✅
- 95-99%: Bardzo dobrze
- 90-94%: Dobrze
- 80-89%: Uwaga ⚠️
- <80%: Krytyczne 🚨
```

#### Flaky Tests

**Definicja:**
> Test który czasami passa, czasami faila bez zmiany kodu

**Przykład:**
```
Run 1: ✅ PASSED
Run 2: ✅ PASSED
Run 3: ❌ FAILED
Run 4: ✅ PASSED  ← FLAKY!
```

**Przyczyny:**
- Race conditions
- Timing issues
- External dependencies
- Random data

**Jak wykrywamy:**
System automatycznie wykrywa flaky tests gdy test ma ≥3 uruchomienia i zarówno passed jak i failed wyniki.

---

### Część 2: Hands-on (60 minut)

#### Ćwiczenie 1: Instalacja (10 min)

**Krok 1:** Dodaj do `index.html`:

```html
<!-- Testing Scripts -->
<script src="testing/production-test-runner.js"></script>
<script src="testing/test-reporter.js"></script>
```

**Krok 2:** Odśwież stronę (F5)

**Krok 3:** Console pokaże:

```
🧪 [ProductionTestRunner] Inicjalizacja...
📅 Harmonogram skonfigurowany:
   - Smoke tests: co 15 minut
   - Unit tests: co 60 minut
   - Integration tests: co 240 minut
✅ Zainicjalizowany
```

**Krok 4:** Po 10 sekundach pierwsze testy:

```
🧪 Running smoke tests...
✅ Test 1/6: CentralnyMagazynStanu loaded - PASSED
✅ Test 2/6: Get state works - PASSED
...
📊 Smoke tests: 6/6 passed (100%)
```

**✅ Checkpoint:** Testy uruchomiły się automatycznie!

---

#### Ćwiczenie 2: Manualne uruchomienie (15 min)

**Krok 1:** Smoke tests

```javascript
await productionTestRunner.runSmokeTests()
```

Zobaczysz progress w console:
```
🧪 Running smoke tests...
✅ CentralnyMagazynStanu loaded (50ms)
✅ Get state works (30ms)
✅ Add to history works (40ms)
✅ localStorage available (10ms)
✅ Monitoring loaded (20ms)
✅ Production monitor works (25ms)

📊 Results: 6/6 passed (100%) in 175ms
```

**Krok 2:** Unit tests

```javascript
await productionTestRunner.runUnitTests()
```

**Krok 3:** Integration tests

```javascript
await productionTestRunner.runIntegrationTests()
```

**Krok 4:** Wszystkie razem

```javascript
await productionTestRunner.runAll()
```

**Zadanie:**
- Uruchom każdy typ testów
- Zanotuj czasy wykonania
- Sprawdź success rate

**✅ Checkpoint:** Potrafisz uruchomić testy manualnie!

---

#### Ćwiczenie 3: Raporty (15 min)

**Krok 1:** Pobierz ostatni raport

```javascript
const report = productionTestRunner.getLatestReport();
console.log(report);
```

Struktura:
```javascript
{
  id: "report_123",
  timestamp: 1730553600000,
  type: "smoke",
  summary: {
    total: 6,
    passed: 6,
    failed: 0,
    skipped: 0,
    duration: 175,
    successRate: 100
  },
  results: [
    {
      name: "CentralnyMagazynStanu loaded",
      status: "passed",
      duration: 50,
      error: null
    },
    // ... więcej testów
  ]
}
```

**Krok 2:** Otwórz raport HTML

```javascript
testReporter.openReport();
```

Otworzy się nowe okno z:
- 📊 Statystyki (Total, Passed, Failed, Success Rate)
- 📋 Lista testów z ikonami ✅❌
- 📈 Wykres trendu success rate
- 📊 Analytics (avg success rate, flaky tests)

**Krok 3:** Export do pliku

```javascript
testReporter.exportHTML();
```

Pobierze plik `test-report-[date].html`

**Zadanie:**
- Otwórz raport HTML
- Sprawdź wszystkie sekcje
- Export i otwórz w przeglądarce

**✅ Checkpoint:** Potrafisz czytać i eksportować raporty!

---

#### Ćwiczenie 4: Analytics (10 min)

**Krok 1:** Pobierz analytics

```javascript
const analytics = productionTestRunner.getAnalytics();
console.log(analytics);
```

Wynik:
```javascript
{
  totalRuns: 15,
  avgSuccessRate: 98.5,
  flakyTests: Set(['Test X', 'Test Y']),
  trends: [
    { timestamp: 1730553600000, successRate: 100, duration: 175 },
    { timestamp: 1730557200000, successRate: 100, duration: 180 },
    { timestamp: 1730560800000, successRate: 83.3, duration: 200 },
    // ...
  ]
}
```

**Krok 2:** Analiza trendów

```javascript
// Success rate trend
analytics.trends.forEach(t => {
  const date = new Date(t.timestamp).toLocaleTimeString();
  console.log(`${date}: ${t.successRate}%`);
});
```

**Krok 3:** Flaky tests

```javascript
if (analytics.flakyTests.size > 0) {
  console.warn('⚠️ Flaky tests detected:');
  analytics.flakyTests.forEach(test => {
    console.log(`  - ${test}`);
  });
}
```

**✅ Checkpoint:** Potrafisz analizować trendy testów!

---

#### Ćwiczenie 5: Failed Test Diagnosis (10 min)

**Krok 1:** Symuluj failed test

Tymczasowo zepsuj CentralnyMagazynStanu:
```javascript
window.centralnyMagazyn = null;
```

**Krok 2:** Uruchom testy

```javascript
await productionTestRunner.runSmokeTests();
```

Zobaczysz failures:
```
❌ CentralnyMagazynStanu loaded - FAILED
   Error: CentralnyMagazynStanu is null
✅ Get state works - PASSED
...
📊 Results: 5/6 passed (83.3%)
```

**Krok 3:** Diagnoza

```javascript
const report = productionTestRunner.getLatestReport();
const failed = report.results.filter(r => r.status === 'failed');

failed.forEach(test => {
  console.group(`❌ ${test.name}`);
  console.log('Error:', test.error);
  console.log('Duration:', test.duration + 'ms');
  console.groupEnd();
});
```

**Krok 4:** Naprawa

```javascript
// Reload strony aby przywrócić CentralnyMagazynStanu
location.reload();
```

**✅ Checkpoint:** Potrafisz diagnozować failed tests!

---

### Część 3: Zaawansowane (30 minut)

#### Custom Test Configuration

**Zmiana harmonogramu:**

```javascript
productionTestRunner.config.schedule = {
  smokeTests: 30 * 60 * 1000,      // 30min zamiast 15min
  unitTests: 120 * 60 * 1000,      // 2h zamiast 1h
  integrationTests: 8 * 60 * 60 * 1000  // 8h zamiast 4h
};

// Restart
productionTestRunner.stop();
productionTestRunner.start();
```

#### Dodawanie własnego testu

```javascript
// Przykład: Dodaj test sprawdzający wielkość localStorage
function testLocalStorageSize() {
  const size = new Blob(Object.values(localStorage)).size;
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return {
    name: 'localStorage size check',
    passed: size < maxSize,
    duration: 10,
    error: size >= maxSize ? `localStorage too large: ${size} bytes` : null
  };
}

// Użyj w smoke tests
// (wymaga modyfikacji production-test-runner.js)
```

#### Integration z CI/CD

**GitHub Actions example:**

```yaml
name: Production Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Co 6h

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          # Start app
          npm start &
          # Wait for app
          sleep 10
          # Run tests
          node run-tests.js
```

---

### Podsumowanie Dzień 2

**Co przećwiczyliśmy:**
✅ Instalacja test-runner i test-reporter  
✅ Uruchamianie testów (manual + auto)  
✅ Czytanie raportów HTML/JSON  
✅ Analiza trendów i flaky tests  
✅ Diagnozowanie failed tests  
✅ Custom configuration  

**Zadanie domowe:**
1. Zostaw testy działające przez noc
2. Rano sprawdź:
   - Ile testów się uruchomiło?
   - Jaki jest avg success rate?
   - Czy są flaky tests?
3. Export raportów

**Pytania sprawdzające:**
1. Jak często uruchamiają się smoke tests? (co 15min)
2. Co to jest flaky test? (Test który czasami passa, czasami faila)
3. Jaki jest target success rate? (100%)
4. Jak uruchomić wszystkie testy? (`productionTestRunner.runAll()`)

---

## Dzień 3: Safe Deployments

### Część 1: Teoria (45 minut)

#### Dlaczego potrzebujemy Backup & Rollback?

**Scenariusz bez backup:**
```
1. Wdrażasz nową wersję
2. Coś się psuje
3. Aplikacja nie działa
4. Dane użytkowników zgubione
5. Panika! 😱
6. Trzeba wszystko rebuilować od zera
7. Downtime: godziny
```

**Scenariusz z backup:**
```
1. Tworzysz backup
2. Wdrażasz nową wersję
3. Coś się psuje
4. Rollback (1 przycisk)
5. Aplikacja działa znowu
6. Dane bezpieczne
7. Downtime: <1 minuta ✅
```

#### Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

**MAJOR (1.0.0 → 2.0.0):**
- Breaking changes
- Incompatible API changes
- Requires migration
- **Przykład:** Zmiana struktury localStorage

**MINOR (1.0.0 → 1.1.0):**
- New features
- Backwards-compatible
- No breaking changes
- **Przykład:** Dodanie export to Excel

**PATCH (1.0.0 → 1.0.1):**
- Bug fixes
- Backwards-compatible
- No new features
- **Przykład:** Fix typo in button

**Przykłady:**
```
1.0.0 → 1.0.1  (bug fix)
1.0.1 → 1.1.0  (new feature)
1.1.0 → 2.0.0  (breaking change)
2.0.0 → 2.0.1  (bug fix after major)
2.0.1 → 2.1.0  (new feature in v2)
```

#### Deployment Workflow

```
┌─────────────────┐
│ 1. DEVELOPMENT  │  Implementacja feature/fix
└────────┬────────┘
         ↓
┌─────────────────┐
│ 2. PRE-CHECKS   │  Testy passed? Brak błędów?
└────────┬────────┘
         ↓
┌─────────────────┐
│ 3. BACKUP       │  Backup danych
└────────┬────────┘
         ↓
┌─────────────────┐
│ 4. VERSION BUMP │  Zwiększ wersję + changelog
└────────┬────────┘
         ↓
┌─────────────────┐
│ 5. DEPLOY       │  Wdrożenie
└────────┬────────┘
         ↓
┌─────────────────┐
│ 6. VERIFY       │  Sprawdź czy działa
└────────┬────────┘
         ↓
    ┌────┴────┐
    │ Success?│
    └────┬────┘
      YES│ NO
         │  │
         │  ↓
         │ ┌──────────┐
         │ │ ROLLBACK │ <1min
         │ └──────────┘
         ↓
    ┌─────────┐
    │  DONE   │
    └─────────┘
```

#### Co zawiera backup?

```javascript
{
  id: "backup_123",
  timestamp: 1730553600000,
  version: "1.2.3",
  environment: "production",
  type: "pre-deployment",
  data: {
    localStorage: {
      /* wszystkie klucze localStorage */
    },
    centralnyMagazyn: {
      /* pełny state aplikacji */
    },
    testReports: [
      /* historia testów */
    ],
    configuration: {
      /* ustawienia managerów */
    }
  },
  checksum: "a1b2c3d4",  // Weryfikacja integralności
  size: 524288           // Rozmiar w bajtach
}
```

---

### Część 2: Hands-on Backup (45 minut)

#### Ćwiczenie 1: Instalacja (10 min)

**Krok 1:** Dodaj do `index.html`:

```html
<!-- Deployment Scripts -->
<script src="deployment/backup-manager.js"></script>
<script src="deployment/rollback-manager.js"></script>
<script src="deployment/version-manager.js"></script>
<script src="deployment/deployment-panel.js"></script>
```

**Krok 2:** Odśwież (F5)

Console:
```
🔒 [BackupManager] Inicjalizacja...
✅ Zainicjalizowany
📦 0 backupów w storage

🔄 [RollbackManager] Inicjalizacja...
✅ Zainicjalizowany
📜 0 operacji w historii

📌 [VersionManager] Inicjalizacja...
✅ Zainicjalizowany
📌 Current version: 1.0.0

🚀 [DeploymentPanel] Inicjalizacja...
✅ Zainicjalizowany
```

**✅ Checkpoint:** Wszystkie managery załadowane!

---

#### Ćwiczenie 2: Pierwszy backup (15 min)

**Krok 1:** Utwórz backup manualnie

```javascript
const backup = backupManager.createBackup('manual', 'Mój pierwszy backup');
```

Console:
```
📦 [BackupManager] Tworzenie backupu...
✅ [BackupManager] Backup utworzony: backup_123
📊 Size: 245.67 KB
```

**Krok 2:** Sprawdź backup

```javascript
console.log(backup);
```

Wynik:
```javascript
{
  id: "backup_1730553600000_abc123",
  timestamp: 1730553600000,
  version: "1.0.0",
  environment: "production",
  type: "manual",
  data: { /* ... */ },
  checksum: "a1b2c3d4",
  size: 251576
}
```

**Krok 3:** Lista backupów

```javascript
const backups = backupManager.getBackups();
console.log(`Liczba backupów: ${backups.length}`);
```

**Krok 4:** Export do pliku

```javascript
backupManager.exportBackup(backup.id);
```

Pobierze się plik JSON. Otwórz go i zobacz strukturę!

**Zadanie:**
- Utwórz 3 backupy z różnymi opisami
- Export każdego do pliku
- Sprawdź rozmiary plików

**✅ Checkpoint:** Potrafisz tworzyć i eksportować backupy!

---

#### Ćwiczenie 3: Auto-backup (10 min)

**Krok 1:** Sprawdź konfigurację

```javascript
console.log(backupManager.config);
```

```javascript
{
  enabled: true,
  autoBackup: true,  // ← Auto-backup włączony
  maxBackups: 10,
  // ...
}
```

**Krok 2:** Poczekaj godzinę

Auto-backup uruchomi się automatycznie.

**LUB symuluj:**

```javascript
// Wywołaj ręcznie funkcję auto-backup
backupManager.createBackup('auto', 'Auto-backup (co godzinę)');
```

**Krok 3:** Sprawdź backupy

```javascript
const autoBackups = backupManager.getBackups({ type: 'auto' });
console.log(`Auto-backupy: ${autoBackups.length}`);
```

**✅ Checkpoint:** Auto-backup działa!

---

#### Ćwiczenie 4: Backup stats (10 min)

**Krok 1:** Statystyki

```javascript
const stats = backupManager.getStats();
console.log(stats);
```

Wynik:
```javascript
{
  total: 5,
  totalSize: 1228800,
  totalSizeFormatted: "1.17 MB",
  byType: {
    manual: 3,
    auto: 2
  },
  oldest: 1730553600000,
  newest: 1730560800000
}
```

**Krok 2:** Zadanie

- Ile backupów masz total?
- Jaki jest total size?
- Ile jest manual vs auto?

**✅ Checkpoint:** Rozumiesz backup stats!

---

### Część 3: Hands-on Rollback (45 minut)

#### Ćwiczenie 1: Test rollback (dry run) (15 min)

**Krok 1:** Przygotuj backup

```javascript
// Utwórz backup obecnego stanu
const beforeBackup = backupManager.createBackup('before-test', 'Przed testem rollback');
```

**Krok 2:** Zmień coś w aplikacji

```javascript
// Dodaj testowy wpis do historii
centralnyMagazyn.dodajDoHistorii('Test rollback', { test: true });

// Sprawdź że jest
const state = centralnyMagazyn.pobierzStan();
console.log(state.historiaCzatu.length);  // np. 5
```

**Krok 3:** Dry run rollback

```javascript
await rollbackManager.rollback(beforeBackup.id, { dryRun: true });
```

Console:
```
🔄 [RollbackManager] Starting rollback...
📦 Backup: backup_123
🎯 Type: full
🧪 Dry run: true

🔄 Restoring localStorage...
✅ localStorage restored (dry run)

🔄 Restoring CentralnyMagazynStanu...
✅ CentralnyMagazynStanu restored (dry run)

✅ [RollbackManager] Rollback completed (dry run)
```

**Krok 4:** Sprawdź że nic się nie zmieniło

```javascript
const state2 = centralnyMagazyn.pobierzStan();
console.log(state2.historiaCzatu.length);  // nadal 5
```

Dry run nie zmienia danych! ✅

**✅ Checkpoint:** Dry run testuje rollback bez zmian!

---

#### Ćwiczenie 2: Prawdziwy rollback (15 min)

**UWAGA:** To faktycznie zmieni dane i przeładuje stronę!

**Krok 1:** Utwórz backup

```javascript
const checkpoint = backupManager.createBackup('checkpoint', 'Punkt kontrolny');
```

**Krok 2:** Zmień dane

```javascript
// Dodaj wiele wpisów
for (let i = 0; i < 10; i++) {
  centralnyMagazyn.dodajDoHistorii(`Test ${i}`, { index: i });
}

console.log('Dodano 10 wpisów');
```

**Krok 3:** Wykonaj rollback

```javascript
await rollbackManager.rollback(checkpoint.id);
```

Zobaczysz confirmation dialog:
```
Czy na pewno wykonać rollback do:

Backup ID: backup_123
Data: 2.11.2025 10:30:00
Wersja: 1.0.0
Size: 245.67 KB

To zastąpi obecny stan aplikacji!
```

Kliknij OK.

Console:
```
🔄 [RollbackManager] Starting rollback...
📦 Creating pre-rollback backup...
✅ Pre-rollback backup created

🔄 Restoring localStorage...
✅ localStorage restored

🔄 Restoring CentralnyMagazynStanu...
✅ CentralnyMagazynStanu restored

🔍 Verifying rollback...
✅ Verification passed

✅ [RollbackManager] Rollback completed in 1234ms
🔄 Reloading page...
```

Strona się przeładuje automatycznie.

**Krok 4:** Sprawdź po reload

```javascript
const state = centralnyMagazyn.pobierzStan();
console.log(state.historiaCzatu.length);  // Powinno być jak było przed dodaniem 10 wpisów
```

**✅ Checkpoint:** Rollback przywrócił poprzedni stan!

---

#### Ćwiczenie 3: Emergency Rollback (15 min)

**Krok 1:** Symuluj kryzys

```javascript
// "Zepsuj" aplikację
window.centralnyMagazyn = null;
console.log('💥 Aplikacja "zepsuta"');
```

**Krok 2:** Emergency Rollback

```javascript
await rollbackManager.emergencyRollback();
```

**BEZ confirmation dialog** - od razu wykonuje rollback!

Console:
```
🚨 [RollbackManager] EMERGENCY ROLLBACK
🔄 Rolling back to: backup_456 (2.11.2025 10:25:00)
🔄 [RollbackManager] Starting rollback...
... (jak normalny rollback ale bez potwierdzenia)
✅ [RollbackManager] Rollback completed
🔄 Reloading page...
```

**Krok 3:** Po reload

Aplikacja działa znowu! ✅

**Zadanie:**
- Ile czasu zajął emergency rollback?
- Sprawdź w rollbackManager.getHistory()

**✅ Checkpoint:** Emergency rollback ratuje sytuację <1min!

---

### Część 4: Deployment Panel (45 minut)

#### Ćwiczenie 1: Otwieranie panelu (5 min)

**Metoda 1:** Hotkey

```
Naciśnij: Ctrl+Shift+D
```

**Metoda 2:** Programowo

```javascript
window.deploymentPanel.show();
```

Pojawi się panel w prawym dolnym rogu! 🎉

**Zakładki:**
- 📋 Checklist
- 💾 Backup
- 📌 Version
- 🔄 Rollback

**✅ Checkpoint:** Panel się otworzył!

---

#### Ćwiczenie 2: Pre-deployment Checklist (15 min)

**Krok 1:** Zakładka Checklist

Zobaczysz 6 checksów:
- ⚪ Testy zakończone sukcesem
- ⚪ Backup utworzony
- ⚪ Wersja zaktualizowana
- ⚪ Changelog zaktualizowany
- ⚪ Brak błędów w console
- ⚪ localStorage dostępny

**Krok 2:** Run All Checks

Kliknij przycisk **"🔍 Run All Checks"**

Zobaczysz progress:
```
⏳ Testy zakończone sukcesem (checking...)
⏳ Backup utworzony (checking...)
...
```

Po chwili:
```
✅ Testy zakończone sukcesem (100% success rate)
❌ Backup utworzony (Brak backupu pre-deployment)
⚪ Wersja zaktualizowana (pending)
...
```

**Krok 3:** Fix failed checks

Jeśli backup failed:
1. Przejdź do zakładki Backup
2. Wpisz opis: "Pre-deployment v1.1.0"
3. Kliknij "💾 Create Backup"
4. Wróć do Checklist
5. Run All Checks again
6. Teraz powinno być ✅

**Zadanie:**
- Spraw aby wszystkie checki były ✅
- Screenshot panelu z wszystkimi ✅

**✅ Checkpoint:** Wszystkie pre-checks passed!

---

#### Ćwiczenie 3: Version Management (15 min)

**Krok 1:** Zakładka Version

Zobaczysz:
- Current Version: **1.0.0**
- 3 przyciski: Major, Minor, Patch
- Release Notes textarea
- Version History

**Krok 2:** Bump Patch (1.0.0 → 1.0.1)

1. Wpisz Release Notes:
```
Fixed:
- Critical bug in save function
- Typo in UI
```

2. Kliknij **Patch**

Console:
```
📌 [VersionManager] Creating patch release...
📦 Creating pre-release backup...
✅ Backup created: backup_789
✅ Release created: 1.0.1
```

Current Version zmieni się na: **1.0.1**

**Krok 3:** Bump Minor (1.0.1 → 1.1.0)

1. Release Notes:
```
Added:
- Export to Excel feature
- Dark mode toggle

Improved:
- Performance +20%
```

2. Kliknij **Minor**

Current Version: **1.1.0**

**Krok 4:** Version History

Zobaczysz listę:
```
1.1.0 - 2.11.2025 10:45:00
  Added: Export to Excel...

1.0.1 - 2.11.2025 10:40:00
  Fixed: Critical bug...

1.0.0 - 2.11.2025 10:00:00
  Initial release
```

**Zadanie:**
- Bump version 3 razy (patch, minor, patch)
- Każdy raz z różnymi release notes
- Sprawdź history

**✅ Checkpoint:** Potrafisz zarządzać wersjami!

---

#### Ćwiczenie 4: Full Deployment Workflow (10 min)

**Scenario:** Wdrażamy wersję 1.2.0 z nową funkcją

**Krok 1:** Checklist

```
Ctrl+Shift+D → Zakładka Checklist → Run All Checks
```

Wszystkie ✅? Dobrze!

**Krok 2:** Backup

```
Zakładka Backup → Opis: "Pre-deployment v1.2.0" → Create Backup
```

**Krok 3:** Version

```
Zakładka Version → Release Notes: "Added new feature X" → Kliknij Minor
```

Wersja: 1.1.0 → 1.2.0

**Krok 4:** Final Check

```
Zakładka Checklist → Run All Checks (wszystkie ✅)
```

**Krok 5:** Deploy

```
Kliknij wielki zielony przycisk: "🚀 Deploy to Production"
```

**Krok 6:** Post-deployment

- Monitor errors (production monitor)
- Run smoke tests
- Verify w aplikacji że działa

**✅ Checkpoint:** Wykonałeś pełen workflow wdrożenia!

---

### Podsumowanie Dzień 3

**Co przećwiczyliśmy:**
✅ Backup creation (manual + auto)  
✅ Backup export/import  
✅ Rollback (dry run + real)  
✅ Emergency rollback  
✅ Version management (semantic versioning)  
✅ Deployment Panel (Ctrl+Shift+D)  
✅ Full deployment workflow  

**Zadanie certyfikacyjne:**
1. Utwórz backup "Przed certyfikacją"
2. Dodaj 5 wpisów do historii
3. Bump version do 1.3.0 z release notes
4. Export backup do pliku
5. Wykonaj rollback do backupu z kroku 1
6. Verify że 5 wpisów zniknęło
7. Screenshot deployment panel

**Pytania sprawdzające:**
1. Co to jest semantic versioning? (MAJOR.MINOR.PATCH)
2. Jak szybko działa emergency rollback? (<1min)
3. Co zawiera backup? (localStorage, state, config, test reports)
4. Jak otworzyć deployment panel? (Ctrl+Shift+D)
5. Ile kroków ma deployment workflow? (6: checks, backup, version, verify, deploy, post-check)

---

## Ćwiczenia praktyczne

### Ćwiczenie końcowe: Symulacja produkcji (60 min)

**Scenario:** Dzień w życiu dev ops

#### Morning (9:00)

1. **Check production health**
```javascript
productionMonitor.getStats()
productionMonitor.checkHealth()
```

2. **Review test reports from night**
```javascript
const reports = productionTestRunner.getReports();
const analytics = productionTestRunner.getAnalytics();
console.log('Success rate z ostatnich 24h:', analytics.avgSuccessRate);
```

3. **Check backup status**
```javascript
const backups = backupManager.getBackups();
console.log('Liczba backupów:', backups.length);
const latest = backupManager.getLatestBackup();
console.log('Ostatni backup:', latest.getFormattedTimestamp());
```

#### Midday (12:00) - Deployment

4. **Prepare deployment v1.5.0**

```
Ctrl+Shift+D
Checklist → Run All Checks → All ✅
Backup → "Pre-deployment v1.5.0" → Create
Version → Release Notes → Minor bump
Checklist → Final check
Deploy!
```

5. **Post-deployment monitoring**
```javascript
// Monitor przez 15 min
setInterval(() => {
  const stats = productionMonitor.getStats();
  console.log('Errors:', stats.errors);
  console.log('FPS:', stats.performance.fps);
}, 60000);

// Run smoke tests
await productionTestRunner.runSmokeTests();
```

#### Afternoon (15:00) - Problem!

6. **Simulate production issue**

```javascript
// Coś poszło nie tak!
throw new Error('Critical error in new feature');
```

7. **Quick response**

```
Option 1: Fix forward (jeśli łatwy fix)
  - Napraw kod
  - Bump patch (1.5.0 → 1.5.1)
  - Deploy fix

Option 2: Rollback (jeśli trudny problem)
  Ctrl+Shift+D → Rollback → Emergency Rollback
  (powrót do 1.4.0)
```

#### Evening (18:00) - Wrap up

8. **Daily report**

```javascript
// Summary
const monitor = productionMonitor.getStats();
const tests = productionTestRunner.getAnalytics();
const backups = backupManager.getStats();
const version = versionManager.getCurrentVersionString();

console.log('=== DAILY REPORT ===');
console.log('Uptime:', monitor.uptime);
console.log('Errors:', monitor.errors);
console.log('Test success rate:', tests.avgSuccessRate);
console.log('Backups created:', backups.total);
console.log('Current version:', version);
```

9. **Export important data**

```javascript
// Export today's backups
const todayBackups = backupManager.getBackups({
  from: new Date().setHours(0,0,0,0)
});
todayBackups.forEach(b => {
  backupManager.exportBackup(b.id);
});

// Export test reports
testReporter.exportJSON();

// Export changelog
versionManager.exportChangelog();
```

---

## Quiz i certyfikacja

### Quiz końcowy (20 pytań)

**Monitoring (Dzień 1):**

1. Co to jest uptime?
   - [ ] Liczba błędów
   - [x] Procent czasu gdy aplikacja działa
   - [ ] Szybkość aplikacji

2. Jaki jest target dla uptime?
   - [ ] >50%
   - [ ] >90%
   - [x] >99.9%

3. Co robi auto-recovery?
   - [ ] Restartuje serwer
   - [x] Automatycznie naprawia typowe problemy
   - [ ] Wysyła email do admina

4. Jak często update'ują się stats domyślnie?
   - [ ] Co sekundę
   - [x] Co 5 sekund
   - [ ] Co minutę

**Testing (Dzień 2):**

5. Jak często uruchamiają się smoke tests?
   - [x] Co 15 minut
   - [ ] Co godzinę
   - [ ] Co 4 godziny

6. Co to jest flaky test?
   - [ ] Test który zawsze faila
   - [x] Test który czasami passa, czasami faila
   - [ ] Test który jest wolny

7. Jaki jest overhead testów w 8h sesji?
   - [x] <0.02%
   - [ ] ~5%
   - [ ] ~10%

8. Co zawiera test report?
   - [ ] Tylko liczbę passed/failed
   - [x] Szczegóły każdego testu + analytics
   - [ ] Tylko czas wykonania

**Deployment (Dzień 3):**

9. Co to jest semantic versioning?
   - [ ] Losowe numery
   - [x] MAJOR.MINOR.PATCH format
   - [ ] Data wydania

10. Kiedy bump'ujemy MAJOR version?
    - [ ] Bug fix
    - [ ] New feature
    - [x] Breaking changes

11. Co zawiera backup?
    - [ ] Tylko localStorage
    - [ ] Tylko state
    - [x] localStorage + state + config + test reports

12. Jak szybko działa emergency rollback?
    - [x] <1 minuta
    - [ ] ~5 minut
    - [ ] ~15 minut

13. Jaki hotkey otwiera deployment panel?
    - [ ] Ctrl+D
    - [x] Ctrl+Shift+D
    - [ ] Alt+D

14. Ile checksów jest w pre-deployment checklist?
    - [ ] 3
    - [x] 6
    - [ ] 10

**Advanced:**

15. Co to jest checksum w backupie?
    - [ ] Wielkość pliku
    - [x] Hash do weryfikacji integralności
    - [ ] Data utworzenia

16. Co to jest dry run rollback?
    - [x] Test rollback bez faktycznych zmian
    - [ ] Szybszy rollback
    - [ ] Rollback tylko części danych

17. Ile backupów jest domyślnie max?
    - [ ] 5
    - [x] 10
    - [ ] 50

18. Co się dzieje po rollback?
    - [ ] Nic
    - [ ] Pokazuje alert
    - [x] Auto-reload strony

19. Gdzie są zapisane backupy?
    - [ ] Na serwerze
    - [x] W localStorage
    - [ ] W cookies

20. Co to jest auto-backup?
    - [ ] Backup przed każdą akcją
    - [x] Backup co godzinę automatycznie
    - [ ] Backup po każdym błędzie

**Odpowiedzi:** 1-x, 2-x, 3-x, 4-x, 5-x, 6-x, 7-x, 8-x, 9-x, 10-x, 11-x, 12-x, 13-x, 14-x, 15-x, 16-x, 17-x, 18-x, 19-x, 20-x

**Wynik do certyfikacji:** ≥16/20 (80%)

---

## Materiały dodatkowe

### Cheat Sheet

```javascript
// === MONITORING ===
productionMonitor.getStats()
productionMonitor.checkHealth()
productionMonitor.getHistory()

// === TESTING ===
await productionTestRunner.runSmokeTests()
await productionTestRunner.runUnitTests()
await productionTestRunner.runIntegrationTests()
productionTestRunner.getLatestReport()
productionTestRunner.getAnalytics()
testReporter.openReport()

// === BACKUP ===
backupManager.createBackup('manual', 'opis')
backupManager.getBackups()
backupManager.getLatestBackup()
backupManager.exportBackup(id)
backupManager.getStats()

// === ROLLBACK ===
await rollbackManager.rollback(backupId)
await rollbackManager.emergencyRollback()
rollbackManager.getHistory()
rollbackManager.getStats()

// === VERSION ===
versionManager.getCurrentVersionString()
versionManager.createRelease('patch', { releaseNotes: '...' })
versionManager.getHistory()
versionManager.exportChangelog()

// === DEPLOYMENT PANEL ===
Ctrl+Shift+D
deploymentPanel.show()
deploymentPanel.runChecklist()
deploymentPanel.createBackup()
```

### Links do dokumentacji

- **Monitoring:** `monitoring/MONITORING_GUIDE.md`
- **Testing:** `testing/PRODUCTION_TESTING.md`
- **Deployment:** `deployment/DEPLOYMENT_GUIDE.md`
- **Quick Start:** `*/README.md`
- **Comprehensive Report:** `docs/COMPREHENSIVE_REPORT.md`

### FAQ

**Q: Czy testy spowalniają aplikację?**
A: Nie, overhead <0.02% w 8h sesji.

**Q: Co jeśli localStorage się zapełni?**
A: Zmniejsz `maxBackups` i `maxReports`, lub exportuj do plików i wyczyść.

**Q: Czy mogę dodać własne testy?**
A: Tak, modyfikuj `production-test-runner.js`.

**Q: Jak często robić backup?**
A: Auto-backup co godzinę + manual przed każdym wdrożeniem.

**Q: Co jeśli emergency rollback nie działa?**
A: Manual: `rollbackManager.rollback(backupManager.getLatestBackup().id)`

**Q: Czy mogę zmienić hotkey panelu?**
A: Tak, `deploymentPanelConfig.hotkey = 'Ctrl+Alt+D'`

---

## ✅ Certyfikat ukończenia

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│         🎓 CERTYFIKAT UKOŃCZENIA SZKOLENIA          │
│                                                     │
│  System Monitoringu i Wdrożeń - Production Ready   │
│                                                     │
│  Niniejszym potwierdzam, że:                        │
│                                                     │
│  ________________________________________           │
│            (imię i nazwisko)                        │
│                                                     │
│  ukończył/a z wynikiem ____/20 (___%)              │
│                                                     │
│  3-dniowe szkolenie obejmujące:                     │
│  ✅ Production Monitoring                           │
│  ✅ Automated Testing                               │
│  ✅ Safe Deployments                                │
│                                                     │
│  Data: 2 listopada 2025                             │
│                                                     │
│  Szkoleniowiec: AI Assistant                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

**Materiały przygotowane:** 2 listopada 2025  
**Autor:** AI Assistant  
**Wersja:** 1.0.0  
**Status:** ✅ READY FOR TRAINING
