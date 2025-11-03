# 🧪 Manual Testing Guide - Sprint 1

Przewodnik testowania ręcznego dla funkcjonalności Sprint 1.

## 📋 Spis treści

1. [Firebase Real-time Sync Tests](#firebase-real-time-sync-tests)
2. [Resource Conflict Detection Tests](#resource-conflict-detection-tests)
3. [Auto-assign Algorithm Tests](#auto-assign-algorithm-tests)
4. [Full Workflow Test](#full-workflow-test)

---

## Firebase Real-time Sync Tests

### Test 1: Multi-user Concurrent Edits

**Cel:** Sprawdzenie synchronizacji zmian między wieloma użytkownikami.

**Kroki:**

1. **Przygotowanie:**
   - Otwórz aplikację w 2 różnych przeglądarkach (Chrome + Firefox) lub 2 kartach incognito
   - Zaloguj się jako ten sam użytkownik (`hala-1`)
   - Przejdź do zakładki "Zadania" w obu przeglądarkach

2. **Test edycji:**
   - W przeglądarce A: Kliknij "Start" na jednym zadaniu
   - W przeglądarce B: Obserwuj - zadanie powinno automatycznie zmienić status na "run"
   - W przeglądarce B: Kliknij "Zamknij" na tym zadaniu
   - W przeglądarce A: Obserwuj - status powinien zmienić się na "done"

3. **Oczekiwany wynik:**
   - ✅ Zmiany widoczne w <1s w drugiej przeglądarce
   - ✅ Wskaźnik sync-status pokazuje "✔️ Połączono"
   - ✅ Brak błędów w konsoli

**Uwagi debugowania:**
```javascript
// W konsoli sprawdź status sync
window.firebaseRealtimeSync.getSyncStatus()

// Sprawdź ostatnią synchronizację
console.log('Last sync:', window.firebaseRealtimeSync.lastSync)
```

---

### Test 2: Offline Mode

**Cel:** Weryfikacja działania aplikacji bez połączenia z internetem.

**Kroki:**

1. **Przygotowanie:**
   - Otwórz aplikację
   - Sprawdź że sync-status pokazuje "✔️ Połączono"

2. **Tryb offline:**
   - Otwórz DevTools (F12)
   - Przejdź do zakładki "Network"
   - Ustaw throttling na "Offline"
   - Obserwuj sync-status - powinien zmienić się na "🔌 Rozłączono"

3. **Edycja offline:**
   - Zmień status zadania (Start → Zamknij)
   - Dodaj nowe zadanie (jeśli możliwe)
   - Zanotuj które zmiany zostały wykonane

4. **Powrót online:**
   - Ustaw throttling z powrotem na "Online"
   - Obserwuj sync-status - powinien zmienić się na "✔️ Połączono"
   - Sprawdź czy zmiany zostały zapisane w Firebase

5. **Oczekiwany wynik:**
   - ✅ Aplikacja działa offline (localStorage)
   - ✅ Zmiany są kolejkowane (pending writes)
   - ✅ Po reconnect zmiany są synchronizowane automatycznie
   - ✅ Sync-status poprawnie pokazuje stan połączenia

**Sprawdzenie w konsoli:**
```javascript
// Sprawdź pending writes
window.firebaseRealtimeSync.getPendingWrites()

// Sprawdź retry queue
console.log('Pending:', window.firebaseRealtimeSync.pendingWrites?.size)
```

---

### Test 3: Conflict Resolution

**Cel:** Test rozwiązywania konfliktów przy jednoczesnej edycji.

**Kroki:**

1. **Przygotowanie:**
   - Otwórz aplikację w 2 przeglądarkach
   - Znajdź to samo zadanie w obu

2. **Symulacja konfliktu:**
   - W przeglądarce A: Zmień status zadania na "run" ale **NIE ZAPISUJ** (użyj DevTools Console)
   - W przeglądarce B: Zmień status tego samego zadania na "done" i zapisz
   - W przeglądarce A: Teraz zapisz swoją zmianę

3. **Oczekiwany wynik:**
   - ✅ Strategia Last-Write-Wins: Ostatnia zmiana (A) wygrywa
   - ✅ Timestamp `_lastModified` jest używany do resolucji
   - ✅ W konsoli widać log o rozwiązaniu konfliktu

**Test w konsoli:**
```javascript
// Symuluj konflikt
const task = state.tasks[0];
const localVersion = { ...task, status: 'run', _lastModified: Date.now() };
const remoteVersion = { ...task, status: 'done', _lastModified: Date.now() - 1000 };

// Sprawdź który wygrywa (lokalny bo nowszy)
console.log('Winner:', localVersion._lastModified > remoteVersion._lastModified ? 'local' : 'remote');
```

---

### Test 4: Kolejka synchronizacji przed połączeniem

**Cel:** Upewnić się, że operacje dodane, gdy kolejka jest tymczasowo wyłączona, zostaną wykonane po ponownym włączeniu (brak utraty usunięć zleceń).

**Kroki:**

1. **Przygotowanie:**
   - Przełącz aplikację w tryb Firebase (`state.storage.mode === 'firebase'`)
   - Otwórz DevTools → Console

2. **Wyłącz kolejkę:**
   ```javascript
   window.FirebaseSyncQueue.disable();
   ```

3. **Usuń zlecenie w UI:**
   - Kliknij przycisk „Usuń” przy dowolnym zleceniu
   - Sprawdź konsolę – pojawi się log `⏸️ [SyncQueue] Kolejka wyłączona – operacja delete oczekuje na włączenie`

4. **Ponownie włącz kolejkę:**
   ```javascript
   window.FirebaseSyncQueue.enable();
   ```
   - W konsoli pojawi się `🔁 [SyncQueue] Wznawiam przetwarzanie oczekujących operacji (1)` następnie standardowe logi `✅ [SyncQueue] Sukces: delete` oraz `✅ [SyncQueue] Sukces: save`

5. **Weryfikacja:**
   - Odśwież stronę (F5)
   - Zlecenie nie powinno wrócić na listę
   - `window.FirebaseSyncQueue.getStatus()` zwraca `queueLength: 0`

**Oczekiwany wynik:**
- ✅ Operacje nie przepadają gdy kolejka jest wyłączona
- ✅ Po ponownym włączeniu są przetwarzane w poprawnej kolejności (delete → save)
- ✅ Po F5 zlecenie wciąż jest usunięte

---

## Resource Conflict Detection Tests

### Test 4: Time-Overlap Detection

**Cel:** Wykrywanie nakładających się zadań dla tego samego pracownika.

**Kroki:**

1. **Przygotowanie:**
   - Przejdź do zakładki "Zadania"
   - Upewnij się że masz kilka zadań z różnymi datami

2. **Stworzenie konfliktu:**
   ```javascript
   // W konsoli:
   const emp1 = state.employees[0].id;
   
   // Zadanie 1: 10:00-12:00 dziś
   const today = new Date();
   today.setHours(10, 0, 0, 0);
   
   const task1 = {
     id: 'test_task1',
     opName: 'Task 1',
     startPlanned: today.getTime(),
     endPlanned: today.getTime() + (2 * 3600000),
     assignees: [emp1]
   };
   
   // Zadanie 2: 11:00-13:00 dziś (nakłada się!)
   const task2 = {
     id: 'test_task2',
     opName: 'Task 2',
     startPlanned: today.getTime() + 3600000,
     endPlanned: today.getTime() + (4 * 3600000),
     assignees: []
   };
   
   state.tasks.push(task1);
   
   // Sprawdź konflikty
   const conflicts = resourceConflictDetector.detectConflicts(task2, emp1, state.tasks);
   console.table(conflicts);
   ```

3. **Oczekiwany wynik:**
   - ✅ Wykryto konflikt typu `time-overlap`
   - ✅ Severity: `high` lub `critical`
   - ✅ Message zawiera informację o nakładaniu się

---

### Test 5: Over-Capacity Detection

**Cel:** Wykrywanie przeciążenia pracownika (>8h dziennie).

**Kroki:**

1. **Setup w konsoli:**
   ```javascript
   const emp1 = state.employees[0].id;
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   
   // Dodaj operacje do katalogu
   state.operationsCatalog.push(
     { name: 'Heavy Task 1', time: 300 }, // 5h
     { name: 'Heavy Task 2', time: 240 }, // 4h
     { name: 'Heavy Task 3', time: 120 }  // 2h - przekroczenie!
   );
   
   // Dodaj zadania
   state.tasks.push(
     {
       id: 'heavy1',
       opName: 'Heavy Task 1',
       startPlanned: today.getTime(),
       assignees: [emp1]
     },
     {
       id: 'heavy2',
       opName: 'Heavy Task 2',
       startPlanned: today.getTime() + 3600000,
       assignees: [emp1]
     }
   );
   
   // Sprawdź capacity dla nowego zadania
   const newTask = {
     id: 'heavy3',
     opName: 'Heavy Task 3',
     startPlanned: today.getTime() + 7200000,
     assignees: []
   };
   
   const conflicts = resourceConflictDetector.detectConflicts(newTask, emp1, state.tasks);
   console.table(conflicts);
   
   // Sprawdź szczegóły obciążenia
   const capacity = resourceConflictDetector.validateCapacity(emp1, newTask, today, state.tasks);
   console.log('Capacity:', capacity);
   ```

2. **Oczekiwany wynik:**
   - ✅ Wykryto konflikt `over-capacity`
   - ✅ `currentLoad` > `maxCapacity` (8h)
   - ✅ `utilizationPercent` > 100%

---

### Test 6: Alternative Suggestions

**Cel:** Sugestie alternatywnych pracowników.

**Kroki:**

1. **Test w konsoli:**
   ```javascript
   const task = state.tasks[0];
   const conflictedEmp = task.assignees[0];
   
   // Pobierz alternatywy
   const alternatives = resourceConflictDetector.suggestAlternatives(
     task,
     conflictedEmp,
     state.employees,
     state.tasks
   );
   
   console.table(alternatives.map(a => ({
     name: a.employeeName,
     score: a.score,
     available: a.availability,
     remaining: a.remaining + 'h'
   })));
   ```

2. **Oczekiwany wynik:**
   - ✅ Lista posortowana wg score (najlepszy pierwszy)
   - ✅ Pokazuje dostępność (remaining capacity)
   - ✅ Score uwzględnia skills i obciążenie

---

### Test 7: Conflict Dialog UI

**Cel:** Test interfejsu dialogu z alternatywami.

**Kroki:**

1. **Przygotowanie:**
   - Utwórz konflikt (nakładające się zadania)
   - Spróbuj przypisać pracownika który ma konflikt

2. **Test przypisania:**
   - Kliknij przycisk przypisania pracownika
   - Powinien pojawić się dialog z ostrzeżeniem
   - Dialog pokazuje:
     * ⚠️ Wykryte konflikty
     * Lista alternatywnych pracowników
     * Score dla każdego
     * Przycisk "Przypisz" dla alternatywy
   - Kliknij "Przypisz" dla jednego z pracowników

3. **Oczekiwany wynik:**
   - ✅ Dialog pokazuje się przy konflikcie
   - ✅ Można wybrać alternatywę
   - ✅ Po wyborze zadanie jest przypisane
   - ✅ Dialog zamyka się automatycznie

---

## Auto-assign Algorithm Tests

### Test 8: Score Calculation

**Cel:** Sprawdzenie obliczeń score przypisania.

**Kroki:**

1. **Test dopasowania umiejętności:**
   ```javascript
   const employee = {
     id: 'test_emp',
     name: 'Test Employee',
     skills: ['CNC', 'sklejanie', 'montaż']
   };
   
   const task = {
     id: 'test_task',
     opName: 'Frezowanie na CNC',
     startPlanned: Date.now()
   };
   
   // Dodaj operację do katalogu
   state.operationsCatalog.push({
     name: 'Frezowanie na CNC',
     time: 60,
     skills: ['CNC', 'frezowanie']
   });
   
   // Oblicz score
   const result = autoAssignAlgorithm.calculateAssignmentScore(employee, task, []);
   
   console.log('Score breakdown:', result.breakdown);
   console.log('Total score:', result.score);
   ```

2. **Oczekiwany wynik:**
   - ✅ Base score: 50
   - ✅ Skill bonus: +30 (pełne dopasowanie) lub +15 (częściowe)
   - ✅ Workload penalty: 0 do -30 zależnie od obciążenia
   - ✅ Total score: 20-80

---

### Test 9: Auto-assign Single Task

**Cel:** Automatyczne przypisanie pojedynczego zadania.

**Kroki:**

1. **Przygotowanie:**
   - Przejdź do zakładki "Zadania"
   - Znajdź nieprzypisane zadanie

2. **Test w konsoli:**
   ```javascript
   const unassignedTask = state.tasks.find(t => !t.assignees || t.assignees.length === 0);
   
   if (unassignedTask) {
     // Dry run (bez zapisywania)
     const result = autoAssignAlgorithm.autoAssignTask(unassignedTask, {
       dryRun: true,
       minScore: 20
     });
     
     console.log('Result:', result);
     console.log('Would assign to:', result.employeeName);
     console.log('Score:', result.score);
     
     // Rzeczywiste przypisanie
     if (confirm(`Przypisać do ${result.employeeName}?`)) {
       const finalResult = autoAssignAlgorithm.autoAssignTask(unassignedTask, {
         dryRun: false
       });
       console.log('Assigned!', finalResult);
       renderTasks(); // Odśwież UI
     }
   }
   ```

3. **Oczekiwany wynik:**
   - ✅ Wybiera pracownika z najwyższym score
   - ✅ Sprawdza dostępność
   - ✅ Przypisanie zapisywane w `task.assignees`
   - ✅ Flaga `_autoAssigned = true`
   - ✅ Zapisany `_assignmentScore`

---

### Test 10: Auto-assign All Tasks (UI)

**Cel:** Test przycisku "🤖 Auto-assign wszystkie".

**Kroki:**

1. **Przygotowanie:**
   - Upewnij się że masz kilka nieprzypisanych zadań
   - Przejdź do zakładki "Zadania"

2. **Kliknij przycisk:**
   - Znajdź przycisk "🤖 Auto-assign wszystkie"
   - Kliknij
   - Potwierdź w dialogu

3. **Obserwuj:**
   - Przycisk zmienia tekst na "⏳ Przypisuję..."
   - Po chwili pojawia się alert z wynikami
   - Zadania mają teraz przypisanych pracowników
   - Widoczne ikony: 🤖 (auto-assigned)
   - Kolorowe badge ze score

4. **Oczekiwany wynik:**
   - ✅ Wszystkie zadania przypisane (lub większość)
   - ✅ Alert pokazuje statystyki
   - ✅ UI automatycznie odświeżone
   - ✅ Score widoczne przy każdym zadaniu

---

### Test 11: Rebalance Workload (UI)

**Cel:** Test przycisku "⚖️ Rebalansuj".

**Kroki:**

1. **Stworzenie nierównomiernego obciążenia:**
   ```javascript
   // Przypisz wszystkie zadania do jednego pracownika
   const emp1 = state.employees[0].id;
   state.tasks.forEach(t => {
     if (!t.assignees || t.assignees.length === 0) {
       t.assignees = [emp1];
     }
   });
   save();
   renderTasks();
   ```

2. **Kliknij "⚖️ Rebalansuj":**
   - Potwierdź w dialogu
   - Obserwuj wyniki

3. **Oczekiwany wynik:**
   - ✅ Zadania przenoszone od przeciążonego pracownika
   - ✅ Alert pokazuje ilość przesunięć
   - ✅ Obciążenie bardziej równomierne
   - ✅ Flaga `_rebalanced = true` na przesunietych zadaniach

---

### Test 12: Performance Test (100 zadań)

**Cel:** Test wydajności na dużej ilości danych.

**Kroki:**

1. **Generowanie 100 zadań:**
   ```javascript
   // Generuj testowe zadania
   const testTasks = [];
   for (let i = 0; i < 100; i++) {
     testTasks.push({
       id: `perf_task_${i}`,
       opName: `Task ${i}`,
       orderId: 'perf_order',
       startPlanned: Date.now() + (i * 3600000),
       endPlanned: Date.now() + ((i + 1) * 3600000),
       assignees: []
     });
   }
   
   state.tasks = [...state.tasks, ...testTasks];
   console.log('Added 100 test tasks');
   ```

2. **Test auto-assign:**
   ```javascript
   console.time('Auto-assign 100 tasks');
   
   const result = autoAssignAlgorithm.autoAssignAll({
     dryRun: true,
     sortBy: 'duration'
   });
   
   console.timeEnd('Auto-assign 100 tasks');
   console.log('Stats:', result.stats);
   ```

3. **Oczekiwany wynik:**
   - ✅ Czas < 2 sekundy dla 100 zadań
   - ✅ Wszystkie zadania przetwor zone
   - ✅ Brak błędów out-of-memory
   - ✅ UI pozostaje responsywne

4. **Cleanup:**
   ```javascript
   // Usuń testowe zadania
   state.tasks = state.tasks.filter(t => !t.id.startsWith('perf_task_'));
   save();
   renderTasks();
   ```

---

## Full Workflow Test

### Test 13: Complete Production Workflow

**Cel:** Test pełnego przepływu od zamówienia do synchronizacji.

**Scenariusz:** Produkcja 3 drzwi z 2 procesami.

**Kroki:**

1. **Utwórz zamówienie (UI):**
   - Przejdź do "Zamówienia"
   - Kliknij "Dodaj zlecenie"
   - Wypełnij:
     * Nazwa: "Test E2E - 3 drzwi"
     * Typ: "Drzwi wewnętrzne"
     * Ilość: 3
     * Data przyjęcia: dziś
     * Termin: za 7 dni
   - Wybierz proces: "Proces standardowy"
   - Zapisz

2. **Wygeneruj zadania:**
   - Kliknij "Generuj zadania" dla zamówienia
   - Sprawdź w zakładce "Zadania" - powinny pojawić się nowe zadania

3. **Auto-assign:**
   - Kliknij "🤖 Auto-assign wszystkie"
   - Potwierdź
   - Sprawdź wyniki w alertcie

4. **Sprawdź konflikty:**
   - Przejdź do "Analiza Przepustowości"
   - Kliknij "Odśwież"
   - Na dole powinie n być "Raport konfliktów zasobów"
   - Sprawdź statystyki

5. **Multi-user sync:**
   - Otwórz aplikację w drugiej przeglądarce
   - Zmień status jednego zadania na "run" w pierwszej
   - Obserwuj synchronizację w drugiej (<1s)

6. **Konflikt i rebalans:**
   - Jeśli są konflikty, kliknij "⚖️ Rebalansuj"
   - Sprawdź czy obciążenie się wyrównało

7. **Oczekiwany wynik:**
   - ✅ Zamówienie utworzone
   - ✅ Zadania wygenerowane (3 x ilość operacji)
   - ✅ Zadania automatycznie przypisane
   - ✅ Konflikty wykryte i pokazane
   - ✅ Real-time sync działa między przeglądarkami
   - ✅ Rebalans poprawia obciążenie

---

## 📊 Checklist Testów

### Firebase Real-time Sync
- [ ] Multi-user concurrent edits
- [ ] Offline mode (network throttling)
- [ ] Conflict resolution (LWW)
- [ ] Automatic reconnect
- [ ] Pending writes queue

### Resource Conflicts
- [ ] Time-overlap detection
- [ ] Over-capacity detection
- [ ] Alternative suggestions
- [ ] Conflict dialog UI
- [ ] Conflict report generation

### Auto-assign
- [ ] Score calculation
- [ ] Auto-assign single task
- [ ] Auto-assign all tasks (UI)
- [ ] Rebalance workload (UI)
- [ ] Performance test (100 tasks)

### Full Workflow
- [ ] Order → Tasks generation
- [ ] Auto-assign workflow
- [ ] Conflict detection
- [ ] Multi-user sync
- [ ] Rebalancing

---

## 🐛 Troubleshooting

### Moduły nie załadowane
```javascript
// Sprawdź czy wszystkie moduły są dostępne
console.log('Firebase Sync:', !!window.firebaseRealtimeSync);
console.log('Conflicts:', !!window.resourceConflictDetector);
console.log('Auto-assign:', !!window.autoAssignAlgorithm);
```

### Konflikty nie są wykrywane
```javascript
// Sprawdź czy zadania mają wymagane pola
const task = state.tasks[0];
console.log('Task:', {
  id: task.id,
  startPlanned: task.startPlanned,
  endPlanned: task.endPlanned,
  assignees: task.assignees
});

// Sprawdź katalog operacji
console.log('Operations catalog:', state.operationsCatalog);
```

### Auto-assign nie działa
```javascript
// Sprawdź dostępnych pracowników
console.log('Employees:', state.employees);

// Sprawdź nieprzypisane zadania
const unassigned = state.tasks.filter(t => !t.assignees || t.assignees.length === 0);
console.log('Unassigned tasks:', unassigned.length);

// Sprawdź score dla pierwszego zadania
if (unassigned[0]) {
  const scores = autoAssignAlgorithm.calculateScoresForTask(unassigned[0]);
  console.table(scores);
}
```

---

## 📝 Raportowanie błędów

Jeśli znajdziesz błąd, zapisz:

1. **Kroki reprodukcji**
2. **Oczekiwany wynik**
3. **Rzeczywisty wynik**
4. **Logi z konsoli**
5. **Screenshot (opcjonalnie)**

Przykład:
```
BUG: Auto-assign nie przypisuje zadań z konfliktem czasowym

Kroki:
1. Utworzyłem 2 nakładające się zadania
2. Kliknąłem "Auto-assign wszystkie"
3. Jedno zadanie pozostało nieprzypisane

Oczekiwane: Powinno przypisać do alternatywnego pracownika
Rzeczywiste: Zadanie pozostało nieprzypisane

Logi:
"❌ Brak dostępnych pracowników"
```

---

## ✅ Status testów

Wypełnij po zakończeniu testów:

**Data testów:** __________
**Tester:** __________

**Wyniki:**
- Testy passed: ___ / ___
- Testy failed: ___ / ___
- Krytyczne bugi: ___
- Drobne bugi: ___

**Ogólna ocena:** ⭐⭐⭐⭐⭐
