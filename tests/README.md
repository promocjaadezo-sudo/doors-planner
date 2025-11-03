# 🧪 Tests Directory

Testy E2E dla Sprint 1 - Production Planning System

## 📁 Zawartość

### 🔬 Test Framework
- **e2e-test-suite.js** - Framework testów automatycznych
  - 15 testów E2E
  - Custom TestSuite class
  - Assert library
  - Test utilities

### 🚀 Test Runner
- **test-runner.html** - Graficzny interfejs do uruchamiania testów
  - Otwórz w przeglądarce
  - Kliknij przycisk aby uruchomić testy
  - Zobacz wyniki w czasie rzeczywistym

### 📚 Dokumentacja
- **RUN_TESTS.md** - Instrukcje uruchomienia testów automatycznych
- **MANUAL_TESTING_GUIDE.md** - 13 scenariuszy testów ręcznych

## 🚀 Szybki start

### Opcja 1: Test Runner (zalecane)
```bash
# Otwórz w przeglądarce:
tests/test-runner.html

# Kliknij "Uruchom wszystkie" 🚀
```

### Opcja 2: Konsola przeglądarki
```javascript
// W index.html otwórz konsolę (F12):
e2eTests.runAllTests()
```

### Opcja 3: Testy ręczne
```bash
# Otwórz dokumentację:
tests/MANUAL_TESTING_GUIDE.md

# Postępuj zgodnie z instrukcjami
```

## 📊 Test Suites

### 1. Real-time Sync Tests (5 testów)
- ✅ Module loading
- ✅ Configuration validation
- ✅ Sync status tracking
- ⚠️ Optimistic updates (wymaga Firebase)
- ⚠️ Pending writes (wymaga Firebase)

### 2. Conflicts Tests (9 testów)
- ✅ Module loading
- ✅ Time-overlap detection
- ✅ Over-capacity detection
- ✅ Alternative suggestions
- ✅ Score calculation
- ✅ Auto-assign single task
- ✅ Auto-assign all tasks
- ✅ Performance test (50 tasks < 2s)

### 3. Full Workflow Test (1 test)
- ✅ Complete E2E: Order → Tasks → Auto-assign → Conflicts

## 🎯 Oczekiwane wyniki

### Z Firebase
```
✅ 15/15 tests passed (100%)
```

### Bez Firebase (LocalStorage)
```
✅ 13/15 tests passed, 2 skipped (100% of runnable)
```

## 📖 Dodatkowe zasoby

- **API Documentation:** Zobacz komentarze w `e2e-test-suite.js`
- **Sprint 1 Summary:** `../SPRINT_1_SUMMARY.md`
- **Main Application:** `../index.html`

## 🐛 Troubleshooting

### Problem: "e2eTests is not defined"
**Rozwiązanie:** Przeładuj stronę (Ctrl+F5)

### Problem: Test timeout
**Rozwiązanie:** Sprawdź konsolę na błędy, wydłuż timeout

### Problem: Wszystkie testy failed
**Rozwiązanie:** Sprawdź czy wszystkie moduły są załadowane:
```javascript
console.log('Modules:', {
  firebaseSync: !!window.firebaseRealtimeSync,
  conflicts: !!window.resourceConflictDetector,
  autoAssign: !!window.autoAssignAlgorithm,
  tests: !!window.e2eTests
});
```

## ✅ Status

**Sprint 1:** ✅ COMPLETED  
**Tests:** ✅ READY  
**Documentation:** ✅ COMPLETE  

Ostatnia aktualizacja: 2 listopada 2025
