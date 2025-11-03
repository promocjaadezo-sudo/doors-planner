# 🚀 Instrukcja uruchomienia testów E2E

## Szybki start

### 1. Otwórz aplikację w przeglądarce
```
http://localhost:5500/index.html
```
lub otwórz plik `index.html` bezpośrednio

### 2. Otwórz konsolę deweloperską
- **Chrome/Edge:** `F12` lub `Ctrl+Shift+J`
- **Firefox:** `F12` lub `Ctrl+Shift+K`
- **Safari:** `Cmd+Option+C`

### 3. Uruchom testy

#### Opcja A: Wszystkie testy (zalecane)
```javascript
e2eTests.runAllTests()
```

#### Opcja B: Tylko testy Real-time Sync
```javascript
e2eTests.suites.realtimeSync.run()
```

#### Opcja C: Tylko testy Konfliktów i Auto-assign
```javascript
e2eTests.suites.conflicts.run()
```

#### Opcja D: Tylko test Full Workflow
```javascript
e2eTests.suites.fullWorkflow.run()
```

---

## 📊 Interpretacja wyników

### Format wyniku
Po zakończeniu testów zobaczysz podsumowanie:
```
✅ Test Suite: Real-time Sync Tests
   ✅ Moduły są załadowane
   ✅ Konfiguracja jest poprawna
   ✅ Status synchronizacji jest śledzony
   ⚠️  Rollback działa przy błędzie (SKIPPED - brak Firebase)
   ⚠️  Pending writes są kolejkowane (SKIPPED - brak Firebase)
   
   Results: 3 passed, 0 failed, 2 skipped (100% pass rate)
```

### Znaczenie symboli
- ✅ **Passed** - Test zakończony sukcesem
- ❌ **Failed** - Test nie przeszedł (wymaga naprawy)
- ⚠️ **Skipped** - Test pominięty (np. brak Firebase)
- ⏭️ **Skipped** - Test celowo wyłączony

### Pass rate (wskaźnik sukcesu)
- **100%** - Wszystkie testy przeszły ✨
- **80-99%** - Bardzo dobry wynik ✅
- **60-79%** - Akceptowalny, ale wymaga uwagi ⚠️
- **<60%** - Wymaga naprawy ❌

---

## 🔍 Szczegółowe wyniki testów

### Real-time Sync Tests (5 testów)

**Test 1: Moduły są załadowane**
- Sprawdza: `window.firebaseRealtimeSync` istnieje
- Cel: Weryfikacja że moduł został załadowany

**Test 2: Konfiguracja jest poprawna**
- Sprawdza: `firebaseRealtimeSync.config` ma wymagane pola
- Cel: Walidacja konfiguracji początkowej

**Test 3: Status synchronizacji jest śledzony**
- Sprawdza: `getSyncStatus()` zwraca obiekt ze statusem
- Cel: Weryfikacja UI wskaźnika stanu

**Test 4: Rollback działa przy błędzie**
- Sprawdza: Optimistic update + rollback przy błędzie
- Uwaga: ⚠️ Wymaga Firebase - będzie SKIPPED bez konfiguracji

**Test 5: Pending writes są kolejkowane**
- Sprawdza: Zapisywanie offline + retry po połączeniu
- Uwaga: ⚠️ Wymaga Firebase - będzie SKIPPED bez konfiguracji

---

### Conflicts Tests (9 testów)

**Test 1-2: Moduły załadowane**
- Sprawdza: `resourceConflictDetector` i `autoAssignAlgorithm` istnieją

**Test 3: Time-overlap detection**
- Tworzy 2 nakładające się zadania
- Sprawdza: Konflikt `time-overlap` jest wykryty

**Test 4: Over-capacity detection**
- Przypisuje zadania przekraczające 8h dziennie
- Sprawdza: Konflikt `over-capacity` jest wykryty

**Test 5: Alternative suggestions**
- Sprawdza: System sugeruje alternatywnych pracowników

**Test 6: Score calculation**
- Sprawdza: Score 20-80, składa się z base+skill+workload

**Test 7: autoAssignTask**
- Przypisuje pojedyncze zadanie
- Sprawdza: Pracownik przypisany, score zapisany

**Test 8: autoAssignAll**
- Przypisuje wszystkie nieprzypisane zadania
- Sprawdza: >0 zadań przypisanych, statystyki poprawne

**Test 9: Performance test**
- Przypisuje 50 zadań
- Sprawdza: Czas < 2 sekundy ⚡

---

### Full Workflow Test (1 test)

**Test: Complete production workflow**
8-krokowy test E2E:
1. 📝 Utworzenie testowego zamówienia
2. 🔧 Utworzenie testowego procesu
3. ✅ Generowanie zadań z procesu
4. 👷 Utworzenie testowych pracowników
5. 🤖 Auto-assign wszystkich zadań
6. ⚠️ Sprawdzenie czy są konflikty
7. 📊 Generowanie raportu konfliktów
8. 🧹 Cleanup (usunięcie danych testowych)

**Sprawdza:**
- Pełny przepływ od zamówienia do przypisania
- Integrację wszystkich modułów
- Brak błędów w całym procesie

---

## 🐛 Co zrobić gdy test nie przechodzi?

### Krok 1: Sprawdź szczegóły błędu
```javascript
// Uruchom test z pełnym logowaniem
e2eTests.runAllTests().then(results => {
  console.log('Detailed results:', results);
});
```

### Krok 2: Sprawdź stan aplikacji
```javascript
// Sprawdź czy wszystkie moduły są załadowane
console.log('Firebase Sync:', !!window.firebaseRealtimeSync);
console.log('Conflicts:', !!window.resourceConflictDetector);
console.log('Auto-assign:', !!window.autoAssignAlgorithm);
console.log('E2E Tests:', !!window.e2eTests);

// Sprawdź stan danych
console.log('Tasks:', state.tasks.length);
console.log('Employees:', state.employees.length);
console.log('Operations:', state.operationsCatalog.length);
```

### Krok 3: Uruchom pojedynczy test
```javascript
// Przykład: Test time-overlap
const task1 = {
  id: 'test1',
  opName: 'Task 1',
  startPlanned: Date.now(),
  endPlanned: Date.now() + 3600000,
  assignees: ['emp1']
};

const task2 = {
  id: 'test2',
  opName: 'Task 2',
  startPlanned: Date.now() + 1800000, // 30 min później - nakłada się!
  endPlanned: Date.now() + 5400000,
  assignees: []
};

state.tasks.push(task1);
const conflicts = resourceConflictDetector.detectConflicts(task2, 'emp1', state.tasks);
console.table(conflicts);
```

### Krok 4: Sprawdź konfigurację Firebase
```javascript
// Jeśli testy Firebase są SKIPPED
console.log('Firebase initialized:', firebase?.apps?.length > 0);
console.log('Firestore:', !!db);

// Sprawdź czy persistence jest włączona
if (db) {
  db.enablePersistence()
    .then(() => console.log('✅ Persistence enabled'))
    .catch(err => console.warn('⚠️ Persistence error:', err));
}
```

---

## 📋 Checklist przed uruchomieniem testów

- [ ] Aplikacja jest załadowana (`index.html` otwarty)
- [ ] Konsola deweloperska jest otwarta (F12)
- [ ] Nie ma błędów w konsoli przed testem
- [ ] Wszystkie skrypty są załadowane:
  - [ ] `firebase-realtime-sync.js`
  - [ ] `resource-conflict-detector.js`
  - [ ] `auto-assign-algorithm.js`
  - [ ] `e2e-test-suite.js`

---

## 🎯 Oczekiwane wyniki

### Scenariusz 1: Z Firebase (pełna konfiguracja)
```
Real-time Sync Tests: 5/5 passed (100%)
Conflicts Tests: 9/9 passed (100%)
Full Workflow: 1/1 passed (100%)
─────────────────────────────────
TOTAL: 15/15 passed (100%) ✨
```

### Scenariusz 2: Bez Firebase (LocalStorage tylko)
```
Real-time Sync Tests: 3/5 passed, 2 skipped (100% of runnable)
Conflicts Tests: 9/9 passed (100%)
Full Workflow: 1/1 passed (100%)
─────────────────────────────────
TOTAL: 13/15 passed, 2 skipped (100% of runnable) ✅
```

**Uwaga:** Testy Firebase będą SKIPPED jeśli nie ma konfiguracji. To jest OK! ✅

---

## 🔬 Zaawansowane testowanie

### Debug mode
```javascript
// Włącz szczegółowe logi
window.debugMode = true;
e2eTests.runAllTests();
```

### Tylko failed tests
```javascript
// Uruchom tylko testy które nie przeszły
e2eTests.runAllTests().then(results => {
  if (results.failed > 0) {
    console.log('Failed tests:');
    results.details
      .filter(t => t.status === 'failed')
      .forEach(t => console.log(`❌ ${t.description}:`, t.error));
  }
});
```

### Custom test
```javascript
// Utwórz własny test
const myTest = new TestSuite('My Custom Test');

myTest.test('Mój test', async () => {
  const result = 2 + 2;
  assert.equal(result, 4, 'Matematyka działa!');
});

await myTest.run();
myTest.printResults();
```

---

## 📊 Raportowanie wyników

### Kopia wyników do schowka
```javascript
// Uruchom testy i skopiuj wyniki
e2eTests.runAllTests().then(results => {
  const report = `
Sprint 1 E2E Tests - ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ${results.total} tests
Passed: ${results.passed} ✅
Failed: ${results.failed} ❌
Skipped: ${results.skipped} ⚠️
Pass rate: ${Math.round(results.passed / (results.total - results.skipped) * 100)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  copy(report); // Kopiuje do schowka
  console.log('Skopiowano raport do schowka!');
});
```

### Eksport do pliku
```javascript
// Zapisz wyniki jako JSON
e2eTests.runAllTests().then(results => {
  const blob = new Blob([JSON.stringify(results, null, 2)], 
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `e2e-test-results-${Date.now()}.json`;
  a.click();
});
```

---

## ✅ Sprint 1 - Acceptance Criteria

Aby uznać Sprint 1 za ukończony, wymagane jest:

1. ✅ **Wszystkie moduły załadowane** (3/3)
   - firebase-realtime-sync.js
   - resource-conflict-detector.js
   - auto-assign-algorithm.js

2. ✅ **Pass rate > 80%** (dla testów które mogą być uruchomione)
   - Wyklucza testy SKIPPED z powodu braku Firebase

3. ✅ **Brak krytycznych błędów**
   - Żadnych błędów JavaScript w konsoli
   - Wszystkie API funkcje dostępne

4. ✅ **UI funkcjonalny**
   - Przyciski Auto-assign działają
   - Konflikty są pokazywane
   - Score jest widoczny

5. ✅ **Performance OK**
   - Auto-assign 50 zadań < 2s
   - Aplikacja responsywna

---

## 🎉 Po zakończeniu testów

Jeśli wszystkie testy przeszły:

1. ✅ Zaktualizuj TODO list - oznacz zadania 12-14 jako **completed**
2. 📸 Zrób screenshot wyników
3. 📝 Zapisz raport (kopia do schowka lub JSON)
4. 🚀 Sprint 1 jest **UKOŃCZONY!**

Następne kroki:
- Testy ręczne według `MANUAL_TESTING_GUIDE.md`
- User Acceptance Testing (UAT)
- Deployment do produkcji
- Planowanie Sprint 2

---

## 🆘 Pomoc

### Problem: "e2eTests is not defined"
**Rozwiązanie:**
```javascript
// Sprawdź czy skrypt jest załadowany
console.log(document.querySelector('script[src*="e2e-test-suite"]'));

// Jeśli null, przeładuj stronę
location.reload();
```

### Problem: "state is not defined"
**Rozwiązanie:**
```javascript
// Zainicjuj state jeśli nie istnieje
if (typeof state === 'undefined') {
  console.warn('State nie istnieje, inicjalizuję...');
  load(); // Załaduj z localStorage
}
```

### Problem: "Test timeout"
**Rozwiązanie:**
```javascript
// Zwiększ timeout dla wolniejszych maszyn
e2eTests.suites.conflicts.tests[8].options.timeout = 5000; // 5s zamiast 2s
```

### Problem: Wszystkie testy FAILED
**Rozwiązanie:**
1. Sprawdź console na błędy
2. Przeładuj stronę (Ctrl+F5)
3. Sprawdź czy pliki JS są poprawnie załadowane
4. Spróbuj w trybie incognito

---

**Powodzenia z testami! 🚀**

Dokumentacja utworzona: 2 listopada 2025
Sprint 1 - E2E Test Suite v1.0.0
