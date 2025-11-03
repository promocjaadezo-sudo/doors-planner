# 🎯 Sprint 1 - Quick Reference Card

## 🚀 Uruchom testy w 30 sekund

### 1. Otwórz aplikację
```
http://localhost:5500/index.html
```

### 2. Otwórz konsolę (F12)

### 3. Wpisz komendę
```javascript
e2eTests.runAllTests()
```

### 4. Czekaj ~5 sekund

### 5. Sprawdź wyniki
- **✅ Zielone** = OK
- **❌ Czerwone** = Problem
- **⚠️ Żółte** = Pominięte

---

## 📦 Nowe moduły

### Firebase Real-time Sync
```javascript
firebaseRealtimeSync.startListeningAll()
firebaseRealtimeSync.getSyncStatus()
```

### Conflict Detector
```javascript
resourceConflictDetector.detectConflicts(task, empId, tasks)
resourceConflictDetector.suggestAlternatives(task, empId, emps, tasks)
```

### Auto-assign
```javascript
autoAssignAlgorithm.autoAssignTask(task, options)
autoAssignAlgorithm.autoAssignAll(options)
autoAssignAlgorithm.rebalanceWorkload(options)
```

---

## 🎮 Kontrolki UI

### Przyciski w zakładce "Zadania"
- **🤖 Auto-assign wszystkie** - Automatyczne przypisanie
- **⚖️ Rebalansuj** - Wyrównanie obciążenia

### Wskaźniki
- **✔️ Połączono** - Sync aktywny
- **🔌 Rozłączono** - Tryb offline
- **⚠️ Błąd** - Problem z połączeniem

### Badge'e zadań
- **🟢 Score 70+** - Doskonałe dopasowanie
- **🟡 Score 50-69** - Dobre dopasowanie
- **🟠 Score 30-49** - Słabe dopasowanie
- **🔴 Score <30** - Bardzo słabe

---

## 🧪 Testy - Cheat Sheet

### Wszystkie testy
```javascript
e2eTests.runAllTests()
```

### Tylko Real-time Sync
```javascript
e2eTests.suites.realtimeSync.run()
```

### Tylko Konflikty
```javascript
e2eTests.suites.conflicts.run()
```

### Tylko Full Workflow
```javascript
e2eTests.suites.fullWorkflow.run()
```

### Sprawdź moduły
```javascript
console.log({
  sync: !!window.firebaseRealtimeSync,
  conflicts: !!window.resourceConflictDetector,
  autoAssign: !!window.autoAssignAlgorithm,
  tests: !!window.e2eTests
});
```

---

## 🔧 Konfiguracja Express

### Real-time Sync
```javascript
firebaseRealtimeSync.config.enableRealtime = true;
firebaseRealtimeSync.config.enableOffline = true;
```

### Conflicts
```javascript
resourceConflictDetector.config.workdayLengthHours = 8;
resourceConflictDetector.config.overloadThreshold = 1.2; // 120%
```

### Auto-assign
```javascript
autoAssignAlgorithm.config.baseScore = 50;
autoAssignAlgorithm.config.sortStrategy = 'duration'; // lub 'priority', 'date'
```

---

## 🐛 Debug

### Sprawdź status sync
```javascript
firebaseRealtimeSync.getSyncStatus()
```

### Sprawdź konflikty dla zadania
```javascript
const task = state.tasks[0];
const conflicts = resourceConflictDetector.detectConflicts(
  task, 
  'emp-id', 
  state.tasks
);
console.table(conflicts);
```

### Oblicz score dla pracownika
```javascript
const emp = state.employees[0];
const task = state.tasks[0];
const score = autoAssignAlgorithm.calculateAssignmentScore(emp, task, state.tasks);
console.log('Score:', score.score, 'Breakdown:', score.breakdown);
```

### Sprawdź obciążenie pracownika
```javascript
const empId = state.employees[0].id;
const date = new Date();
const workload = autoAssignAlgorithm.calculateDailyWorkload(empId, date, state.tasks);
console.log(`${workload.hours}h / 8h (${Math.round(workload.ratio * 100)}%)`);
```

---

## 📊 Przykładowe scenariusze

### Scenariusz 1: Auto-assign z dry-run
```javascript
const result = autoAssignAlgorithm.autoAssignAll({
  dryRun: true,        // Nie zapisuj
  minScore: 30,        // Min 30 punktów
  sortBy: 'duration'   // Najdłuższe pierwsze
});

console.log('Would assign:', result.stats.assigned);
console.table(result.details);

// Jeśli OK, uruchom bez dry-run
autoAssignAlgorithm.autoAssignAll({ dryRun: false });
```

### Scenariusz 2: Sprawdź alternatywy
```javascript
const task = state.tasks.find(t => t.assignees?.length > 0);
const currentEmp = task.assignees[0];

const alternatives = resourceConflictDetector.suggestAlternatives(
  task,
  currentEmp,
  state.employees,
  state.tasks
);

console.table(alternatives.map(a => ({
  name: a.employeeName,
  score: a.score,
  available: a.availability ? '✅' : '❌',
  capacity: a.remaining + 'h'
})));
```

### Scenariusz 3: Rebalansuj obciążenie
```javascript
const result = autoAssignAlgorithm.rebalanceWorkload({
  dryRun: false,
  targetUtilization: 0.8,  // Cel: 80%
  maxIterations: 50
});

console.log(`Przesunięto ${result.stats.moves} zadań`);
console.log(`Przed: ${result.stats.overloaded} przeciążonych`);
console.log(`Po: Lepsze rozłożenie!`);
```

---

## ✅ Checklist przed wdrożeniem

- [ ] Uruchom `e2eTests.runAllTests()` → Pass rate > 80%
- [ ] Sprawdź konsolę na błędy (0 errors)
- [ ] Test multi-user w 2 przeglądarkach
- [ ] Test offline mode (Network throttling)
- [ ] Test auto-assign z prawdziwymi danymi
- [ ] Test rebalance z przeciążonym pracownikiem
- [ ] Sprawdź czy przyciski działają
- [ ] Sprawdź czy score się wyświetla
- [ ] Sprawdź czy konflikty są pokazywane
- [ ] Backup danych produkcyjnych

---

## 📞 Pomoc

### 📖 Dokumentacja
- `tests/RUN_TESTS.md` - Instrukcje testów
- `tests/MANUAL_TESTING_GUIDE.md` - Testy ręczne
- `SPRINT_1_SUMMARY.md` - Pełne podsumowanie

### 🚀 Test Runner
- Otwórz: `tests/test-runner.html`
- Kliknij: "Uruchom wszystkie"

### 🐛 Issues
- GitHub: https://github.com/promocjaadezo-sudo/doors-planner/issues

---

**Sprint 1 Status:** ✅ **COMPLETED**  
**Wersja:** 1.0.0  
**Data:** 2 listopada 2025

**Gotowe do UAT! 🎉**
