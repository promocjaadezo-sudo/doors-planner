# 🚀 SPRINT 1 - SZYBKIE STRESZCZENIE ZADAŃ

**Sprint:** Sprint 1 - Critical Features  
**Czas trwania:** 3-4 tygodnie  
**Priorytet:** 🔴 CRITICAL  
**Data:** 2 listopada 2025  

---

## 📊 Przegląd Sprint 1

| ID | Zadanie | Czas | Priorytet | Status |
|----|---------|------|-----------|--------|
| **S1-T1** | Firebase Real-time Sync | 2-3 tygodnie | 🔴 Critical | 📋 Gotowe do impl. |
| **S1-T2** | Detekcja konfliktów zasobów | 1 tydzień | 🔴 Critical | 📋 Gotowe do impl. |
| **S1-T3** | Algorytm auto-assign | 2 tygodnie | 🔴 Critical | ⏳ Czeka na S1-T2 |
| **S1-T4** | Testy integracyjne E2E | 1 tydzień | 🔴 Critical | ⏳ Czeka na wszystkie |

---

# 📘 ZADANIE S1-T1: Firebase Real-time Sync

## 🎯 Cel biznesowy

**Problem:** Obecna synchronizacja co 30 sekund powoduje opóźnienia i konflikty przy jednoczesnych edycjach.

**Rozwiązanie:** Implementacja real-time synchronizacji z Firebase Firestore używając `onSnapshot` listeners.

## 🔑 Kluczowe funkcje

1. **Real-time updates** - Zmiany widoczne w <1s u wszystkich użytkowników
2. **Conflict resolution** - Automatyczne rozwiązywanie konfliktów (Last-Write-Wins lub Merge)
3. **Offline support** - Aplikacja działa bez internetu, synchronizuje po powrocie online
4. **Optimistic updates** - Natychmiastowy feedback UI, rollback przy błędzie
5. **Error handling** - Graceful degradation, retry mechanism

## 📦 Główne komponenty

```javascript
// Nowy moduł: js/firebase-realtime-sync.js

const API = {
  init(),                              // Inicjalizacja z offline persistence
  startListening(collection, cb),      // onSnapshot listener
  stopListening(collection),           // Cleanup
  resolveConflict(local, remote),      // LWW / Merge strategies
  optimisticUpdate(docId, updates),    // Optimistic pattern
  getStatus()                          // Status synchronizacji
};
```

## 🛠️ Implementacja (kroki)

1. **Dzień 1-2:** Struktura modułu, konfiguracja
2. **Dzień 3-5:** onSnapshot listeners dla kolekcji (orders, tasks, employees, processes, operationsCatalog)
3. **Dzień 6-8:** Conflict resolution (LWW + Merge)
4. **Dzień 9-10:** Optimistic updates z rollback
5. **Dzień 11-12:** Offline support (enablePersistence)
6. **Dzień 13-14:** UI integration (sync status indicator)

## ✅ Definition of Done

- ✅ onSnapshot listeners dla wszystkich kolekcji
- ✅ Conflict resolution działa (testy pokrywają LWW i Merge)
- ✅ Offline mode z pending writes queue
- ✅ Sync status indicator w UI
- ✅ Unit tests (>80% coverage)
- ✅ Integration tests (multi-client scenarios)
- ✅ Performance: latency <1s
- ✅ Dokumentacja + code review

## ⚠️ Główne pułapki

1. **Race conditions** - Użyj Firestore transactions
2. **Memory leaks** - Zawsze unsubscribe listeners
3. **Quota exceeded** - Monitoruj cache size
4. **Infinite loops** - Flag aby ignorować własne zmiany

## 📊 Metryki sukcesu

- Sync latency: **<1s**
- Conflict rate: **<1%**
- Error rate: **<0.1%**
- Offline queue: **<100 items**

---

# 🔍 ZADANIE S1-T2: Detekcja konfliktów zasobów

## 🎯 Cel biznesowy

**Problem:** Pracownicy mogą być przypisani do wielu zadań jednocześnie, co prowadzi do:
- Przeciążenia pracowników
- Nierealistycznych harmonogramów
- Konfliktów czasowych (overlap)

**Rozwiązanie:** System walidacji i wykrywania konfliktów zasobów przed przypisaniem zadania.

## 🔑 Kluczowe funkcje

1. **Time overlap detection** - Wykrywa nakładające się zadania
2. **Resource capacity validation** - Sprawdza dostępność pracownika
3. **Real-time warnings** - UI pokazuje konflikty natychmiast
4. **Auto-resolution suggestions** - Sugeruje alternatywnych pracowników
5. **Conflict report** - Raport wszystkich konfliktów

## 📦 Główne komponenty

```javascript
// Nowy moduł: js/resource-conflict-detector.js

const API = {
  detectConflicts(task, employeeId),     // Wykrywa konflikty dla zadania
  validateAssignment(task, employee),    // Waliduje przypisanie
  getConflictReport(),                   // Raport wszystkich konfliktów
  suggestAlternatives(task),             // Sugeruje alternatywnych pracowników
  autoResolve(conflict)                  // Próbuje rozwiązać konflikt
};
```

## 🛠️ Implementacja (kroki)

### **Dzień 1-2: Core detection algorithm**

```javascript
/**
 * Wykrywa konflikty czasowe dla zadania
 */
function detectTimeOverlap(task, employeeId, allTasks) {
  const employeeTasks = allTasks.filter(t => 
    t.assignedTo === employeeId && 
    t.id !== task.id &&
    t.status !== 'completed'
  );
  
  const conflicts = [];
  
  for (const existingTask of employeeTasks) {
    // Sprawdź overlap
    if (
      (task.startPlanned >= existingTask.startPlanned && 
       task.startPlanned < existingTask.endPlanned) ||
      (task.endPlanned > existingTask.startPlanned && 
       task.endPlanned <= existingTask.endPlanned) ||
      (task.startPlanned <= existingTask.startPlanned && 
       task.endPlanned >= existingTask.endPlanned)
    ) {
      conflicts.push({
        type: 'time-overlap',
        taskId: task.id,
        conflictingTaskId: existingTask.id,
        employeeId,
        overlapStart: Math.max(task.startPlanned, existingTask.startPlanned),
        overlapEnd: Math.min(task.endPlanned, existingTask.endPlanned),
        severity: calculateSeverity(task, existingTask)
      });
    }
  }
  
  return conflicts;
}
```

### **Dzień 3-4: Capacity validation**

```javascript
/**
 * Sprawdza czy pracownik ma capacity na zadanie
 */
function validateCapacity(employee, task, date) {
  const dailyTasks = getTasksForDate(employee.id, date);
  
  const totalHours = dailyTasks.reduce((sum, t) => {
    return sum + calculateDuration(t);
  }, 0);
  
  const newTaskHours = calculateDuration(task);
  const workdayHours = state.scheduleConfig.workdayLengthHours || 8;
  
  if (totalHours + newTaskHours > workdayHours) {
    return {
      valid: false,
      reason: 'over-capacity',
      currentLoad: totalHours,
      maxCapacity: workdayHours,
      overload: (totalHours + newTaskHours) - workdayHours
    };
  }
  
  return { valid: true };
}
```

### **Dzień 5-6: UI integration**

```javascript
/**
 * Pokaż warning o konflikcie w UI
 */
function showConflictWarning(conflicts) {
  const container = document.getElementById('conflict-warnings');
  
  if (conflicts.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  const html = conflicts.map(c => `
    <div class="conflict-warning ${c.severity}">
      ⚠️ <strong>Konflikt:</strong> 
      ${getConflictMessage(c)}
      <button onclick="showConflictDetails('${c.taskId}')">
        Szczegóły
      </button>
    </div>
  `).join('');
  
  container.innerHTML = html;
}
```

### **Dzień 7: Auto-resolution**

```javascript
/**
 * Sugeruje alternatywnych pracowników
 */
function suggestAlternatives(task, conflictedEmployeeId) {
  const allEmployees = state.employees;
  const alternatives = [];
  
  for (const employee of allEmployees) {
    if (employee.id === conflictedEmployeeId) continue;
    
    const conflicts = detectConflicts(task, employee.id);
    const capacity = validateCapacity(employee, task, task.startPlanned);
    
    if (conflicts.length === 0 && capacity.valid) {
      alternatives.push({
        employeeId: employee.id,
        name: employee.name,
        score: calculateEmployeeScore(employee, task),
        availability: 'full'
      });
    }
  }
  
  // Sortuj po score (najlepsi pierwsi)
  return alternatives.sort((a, b) => b.score - a.score);
}
```

## ✅ Definition of Done

- ✅ Time overlap detection działa poprawnie
- ✅ Capacity validation dla pracowników
- ✅ UI pokazuje konflikty w czasie rzeczywistym
- ✅ Auto-resolution sugeruje alternatywy
- ✅ Conflict report dostępny
- ✅ Unit tests (>80% coverage)
- ✅ Integration z S1-T1 (real-time updates)
- ✅ Performance: walidacja <50ms
- ✅ Dokumentacja

## 📊 Metryki sukcesu

- Detection accuracy: **>99%**
- Validation time: **<50ms**
- False positives: **<1%**
- Auto-resolution success: **>70%**

---

# 🤖 ZADANIE S1-T3: Algorytm auto-assign

## 🎯 Cel biznesowy

**Problem:** Ręczne przypisywanie zadań do pracowników jest:
- Czasochłonne
- Podatne na błędy
- Nieoptymalne (nierównomierny load)

**Rozwiązanie:** Inteligentny algorytm automatycznego przypisywania zadań do pracowników z optymalizacją load balancing.

## 🔑 Kluczowe funkcje

1. **Smart assignment** - Przypisuje zadania do najbardziej odpowiednich pracowników
2. **Load balancing** - Równomierne rozłożenie pracy
3. **Skills matching** - Uwzględnia umiejętności pracowników
4. **Priority handling** - Zadania krytyczne mają pierwszeństwo
5. **Manual override** - Możliwość ręcznej zmiany przypisania

## 📦 Główne komponenty

```javascript
// Nowy moduł: js/auto-assign-algorithm.js

const API = {
  autoAssignTask(task),              // Przypisz jedno zadanie
  autoAssignAll(tasks),              // Przypisz wszystkie zadania
  rebalance(),                       // Zrównoważ obciążenie
  getAssignmentScore(task, emp),     // Oceń dopasowanie
  optimizeSchedule()                 // Optymalizuj cały harmonogram
};
```

## 🛠️ Implementacja (kroki)

### **Dzień 1-3: Core algorithm (Scoring)**

```javascript
/**
 * Oblicza score dopasowania pracownika do zadania
 * Wyższy score = lepsze dopasowanie
 */
function calculateAssignmentScore(task, employee, context) {
  let score = 100; // Start z max score
  
  // 1. Skills match (weight: 40%)
  const skillScore = calculateSkillMatch(task, employee);
  score += skillScore * 0.4;
  
  // 2. Current workload (weight: 30%)
  const loadScore = calculateLoadScore(employee, context);
  score += loadScore * 0.3;
  
  // 3. Availability (weight: 20%)
  const availScore = calculateAvailability(employee, task);
  score += availScore * 0.2;
  
  // 4. Priority bonus (weight: 10%)
  const priorityBonus = task.critical ? 10 : 0;
  score += priorityBonus * 0.1;
  
  // 5. Penalties
  const conflicts = detectConflicts(task, employee.id);
  score -= conflicts.length * 20; // -20 za każdy konflikt
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Skills matching
 */
function calculateSkillMatch(task, employee) {
  // Jeśli brak danych o skills, użyj operacji
  const taskOperation = task.operationName || task.operation;
  const employeeSkills = employee.skills || [];
  
  if (employeeSkills.includes(taskOperation)) {
    return 100; // Perfekcyjne dopasowanie
  }
  
  // Sprawdź podobne operacje
  const similarSkills = employeeSkills.filter(skill => 
    skill.toLowerCase().includes(taskOperation.toLowerCase()) ||
    taskOperation.toLowerCase().includes(skill.toLowerCase())
  );
  
  if (similarSkills.length > 0) {
    return 70; // Podobne umiejętności
  }
  
  return 30; // Brak dopasowania (może się nauczyć)
}

/**
 * Load balancing score
 */
function calculateLoadScore(employee, context) {
  const employeeTasks = context.allTasks.filter(t => 
    t.assignedTo === employee.id && 
    t.status !== 'completed'
  );
  
  const currentHours = employeeTasks.reduce((sum, t) => 
    sum + calculateDuration(t), 0
  );
  
  const avgHours = context.avgEmployeeLoad;
  
  // Im mniej obciążony vs średnia, tym wyższy score
  if (currentHours < avgHours * 0.7) {
    return 100; // Bardzo mało obciążony
  } else if (currentHours < avgHours) {
    return 80; // Poniżej średniej
  } else if (currentHours < avgHours * 1.3) {
    return 50; // Średnia
  } else {
    return 20; // Przeciążony
  }
}

/**
 * Availability score
 */
function calculateAvailability(employee, task) {
  const conflicts = detectTimeOverlap(task, employee.id, state.tasks);
  
  if (conflicts.length === 0) {
    return 100; // Całkowicie dostępny
  }
  
  const overlapHours = conflicts.reduce((sum, c) => {
    return sum + (c.overlapEnd - c.overlapStart) / (1000 * 60 * 60);
  }, 0);
  
  const taskHours = calculateDuration(task);
  const overlapPercent = (overlapHours / taskHours) * 100;
  
  return Math.max(0, 100 - overlapPercent * 2);
}
```

### **Dzień 4-6: Auto-assign implementation**

```javascript
/**
 * Automatycznie przypisz zadanie do najlepszego pracownika
 */
function autoAssignTask(task) {
  console.log('🤖 Auto-assign:', task.id);
  
  // Oblicz context (średnie obciążenie)
  const context = {
    allTasks: state.tasks,
    avgEmployeeLoad: calculateAverageLoad()
  };
  
  // Oceń wszystkich pracowników
  const scores = state.employees.map(employee => ({
    employeeId: employee.id,
    name: employee.name,
    score: calculateAssignmentScore(task, employee, context),
    conflicts: detectConflicts(task, employee.id)
  }));
  
  // Sortuj po score (najwyższy pierwszy)
  scores.sort((a, b) => b.score - a.score);
  
  // Wybierz najlepszego bez konfliktów
  const best = scores.find(s => s.conflicts.length === 0 && s.score > 50);
  
  if (best) {
    console.log(`✅ Assigned to: ${best.name} (score: ${best.score})`);
    
    // Przypisz
    task.assignedTo = best.employeeId;
    task._autoAssigned = true;
    task._assignmentScore = best.score;
    
    return {
      success: true,
      employeeId: best.employeeId,
      score: best.score
    };
  }
  
  // Jeśli nie znaleziono idealnego, wybierz najlepszego mimo konfliktów
  const bestWithConflicts = scores[0];
  
  if (bestWithConflicts && bestWithConflicts.score > 30) {
    console.warn(`⚠️ Assigned to: ${bestWithConflicts.name} (with conflicts)`);
    
    task.assignedTo = bestWithConflicts.employeeId;
    task._autoAssigned = true;
    task._assignmentScore = bestWithConflicts.score;
    task._hasConflicts = true;
    
    return {
      success: true,
      employeeId: bestWithConflicts.employeeId,
      score: bestWithConflicts.score,
      warning: 'Assigned with conflicts'
    };
  }
  
  console.error('❌ Failed to auto-assign task:', task.id);
  
  return {
    success: false,
    reason: 'No suitable employee found'
  };
}

/**
 * Przypisz wszystkie nieprzypisane zadania
 */
function autoAssignAll() {
  console.log('🤖 Auto-assigning all tasks...');
  
  const unassignedTasks = state.tasks.filter(t => 
    !t.assignedTo && t.status !== 'completed'
  );
  
  console.log(`Found ${unassignedTasks.length} unassigned tasks`);
  
  const results = {
    success: 0,
    failed: 0,
    withConflicts: 0
  };
  
  for (const task of unassignedTasks) {
    const result = autoAssignTask(task);
    
    if (result.success) {
      results.success++;
      if (result.warning) results.withConflicts++;
    } else {
      results.failed++;
    }
  }
  
  console.log('✅ Auto-assign completed:', results);
  
  // Save state
  if (window.store && typeof window.store.save === 'function') {
    window.store.save();
  }
  
  // Re-render
  if (typeof renderTasks === 'function') renderTasks();
  if (typeof renderGantt === 'function') renderGantt();
  
  return results;
}
```

### **Dzień 7-9: Load balancing (Rebalance)**

```javascript
/**
 * Zrównoważ obciążenie między pracownikami
 */
function rebalanceWorkload() {
  console.log('⚖️ Rebalancing workload...');
  
  // Oblicz obecne obciążenie
  const loads = state.employees.map(emp => ({
    employeeId: emp.id,
    name: emp.name,
    hours: calculateEmployeeLoad(emp.id),
    tasks: state.tasks.filter(t => t.assignedTo === emp.id && t.status !== 'completed')
  }));
  
  const avgLoad = loads.reduce((sum, l) => sum + l.hours, 0) / loads.length;
  
  console.log('Average load:', avgLoad, 'hours');
  
  // Znajdź przeciążonych i niedociążonych
  const overloaded = loads.filter(l => l.hours > avgLoad * 1.3);
  const underloaded = loads.filter(l => l.hours < avgLoad * 0.7);
  
  console.log('Overloaded:', overloaded.length);
  console.log('Underloaded:', underloaded.length);
  
  if (overloaded.length === 0) {
    console.log('✅ Workload is balanced');
    return { balanced: true };
  }
  
  let reassignments = 0;
  
  // Przenieś zadania z przeciążonych do niedociążonych
  for (const overloadedEmp of overloaded) {
    // Sortuj zadania (nie-krytyczne najpierw)
    const movableTasks = overloadedEmp.tasks
      .filter(t => !t.critical && !t._manuallyAssigned)
      .sort((a, b) => calculateDuration(a) - calculateDuration(b));
    
    for (const task of movableTasks) {
      // Znajdź najlepszego niedociążonego pracownika
      const context = {
        allTasks: state.tasks,
        avgEmployeeLoad: avgLoad
      };
      
      const bestUnderloaded = underloaded
        .map(emp => ({
          employeeId: emp.employeeId,
          score: calculateAssignmentScore(task, 
            state.employees.find(e => e.id === emp.employeeId),
            context
          )
        }))
        .sort((a, b) => b.score - a.score)[0];
      
      if (bestUnderloaded && bestUnderloaded.score > 50) {
        console.log(`🔄 Moving task ${task.id} from ${overloadedEmp.name} to employee ${bestUnderloaded.employeeId}`);
        
        task.assignedTo = bestUnderloaded.employeeId;
        task._rebalanced = true;
        reassignments++;
        
        // Update loads
        overloadedEmp.hours -= calculateDuration(task);
        const underloadedEmp = underloaded.find(e => e.employeeId === bestUnderloaded.employeeId);
        if (underloadedEmp) {
          underloadedEmp.hours += calculateDuration(task);
        }
        
        // Jeśli już zbalansowany, przerwij
        if (overloadedEmp.hours <= avgLoad * 1.3) break;
      }
    }
  }
  
  console.log(`✅ Rebalanced: ${reassignments} tasks reassigned`);
  
  // Save & re-render
  if (window.store) window.store.save();
  if (typeof renderTasks === 'function') renderTasks();
  if (typeof renderGantt === 'function') renderGantt();
  
  return {
    balanced: true,
    reassignments
  };
}
```

### **Dzień 10-12: UI integration**

```html
<!-- Przycisk auto-assign w sekcji Tasks -->
<div class="task-toolbar">
  <button onclick="window.autoAssignAlgorithm.autoAssignAll()" class="btn-primary">
    🤖 Auto-assign wszystkie
  </button>
  
  <button onclick="window.autoAssignAlgorithm.rebalanceWorkload()" class="btn-secondary">
    ⚖️ Zrównoważ obciążenie
  </button>
  
  <button onclick="showAssignmentReport()" class="btn-secondary">
    📊 Raport przypisań
  </button>
</div>

<style>
.task-card[data-auto-assigned="true"] {
  border-left: 3px solid #10b981; /* Zielona ramka */
}

.task-card[data-has-conflicts="true"] {
  border-left: 3px solid #f59e0b; /* Pomarańczowa ramka */
}
</style>
```

## ✅ Definition of Done

- ✅ Scoring algorithm zaimplementowany
- ✅ Auto-assign dla pojedynczych zadań
- ✅ Auto-assign dla wszystkich zadań
- ✅ Load balancing (rebalance)
- ✅ Skills matching działa
- ✅ Integration z S1-T2 (conflict detection)
- ✅ UI buttons i wizualizacja
- ✅ Manual override możliwy
- ✅ Unit tests (>80% coverage)
- ✅ Performance: <100ms per task
- ✅ Dokumentacja

## 📊 Metryki sukcesu

- Assignment accuracy: **>85%**
- Assignment time: **<100ms per task**
- Load balance: **Std dev <20%**
- User satisfaction: **>80%**

---

# 🧪 ZADANIE S1-T4: Testy integracyjne E2E

## 🎯 Cel biznesowy

**Problem:** Nowe funkcje (S1-T1, S1-T2, S1-T3) muszą działać razem bez regresu.

**Rozwiązanie:** Kompleksowe testy integracyjne i E2E pokrywające wszystkie scenariusze biznesowe.

## 🔑 Kluczowe funkcje

1. **Full workflow tests** - Test całego procesu od utworzenia zlecenia do auto-assign
2. **Multi-user scenarios** - Symulacja wielu użytkowników jednocześnie
3. **Conflict scenarios** - Test wszystkich typów konfliktów
4. **Performance tests** - Load testing i stress testing
5. **Regression tests** - Sprawdzenie że stare funkcje działają

## 📦 Test suites

### **Suite 1: Real-time Sync (E2E)**

```javascript
// tests/e2e/realtime-sync.spec.js

describe('Real-time Sync - E2E', () => {
  
  test('Should sync order creation between two users', async () => {
    // Setup: Dwa browsery
    const [userA, userB] = await setupTwoUsers();
    
    // UserA creates order
    await userA.goto('/');
    await userA.click('[data-nav="order"]');
    await userA.fill('#o-name', 'Test Order E2E');
    await userA.fill('#o-qty', '10');
    await userA.click('button[type="submit"]');
    
    // Wait for sync
    await userA.waitForTimeout(2000);
    
    // UserB should see it
    await userB.goto('/');
    await userB.click('[data-nav="order"]');
    const orderRow = await userB.locator('text=Test Order E2E');
    
    expect(await orderRow.isVisible()).toBe(true);
  });
  
  test('Should handle concurrent edits with conflict resolution', async () => {
    const [userA, userB] = await setupTwoUsers();
    
    // Both users edit same order
    await Promise.all([
      userA.updateOrder('order1', { quantity: 20 }),
      userB.updateOrder('order1', { quantity: 30 })
    ]);
    
    await wait(3000);
    
    // Both should have the same (resolved) version
    const orderA = await userA.getOrder('order1');
    const orderB = await userB.getOrder('order1');
    
    expect(orderA.quantity).toBe(orderB.quantity);
    expect(orderA._conflictResolved).toBe(true);
  });
  
  test('Should work offline and sync when back online', async () => {
    const user = await setupUser();
    
    // Go offline
    await user.context().setOffline(true);
    
    // Create order offline
    await user.createOrder({ name: 'Offline Order', quantity: 5 });
    
    // Should be queued
    const pendingWrites = await user.evaluate(() => 
      window.firebaseRealtimeSync.getSyncState().pendingWrites.size
    );
    expect(pendingWrites).toBe(1);
    
    // Go online
    await user.context().setOffline(false);
    await wait(5000);
    
    // Should be synced
    const pendingAfter = await user.evaluate(() => 
      window.firebaseRealtimeSync.getSyncState().pendingWrites.size
    );
    expect(pendingAfter).toBe(0);
  });
});
```

### **Suite 2: Resource Conflicts**

```javascript
// tests/integration/resource-conflicts.test.js

describe('Resource Conflict Detection', () => {
  
  test('Should detect time overlap', () => {
    const task1 = {
      id: 't1',
      assignedTo: 'emp1',
      startPlanned: new Date('2025-11-05T08:00'),
      endPlanned: new Date('2025-11-05T12:00')
    };
    
    const task2 = {
      id: 't2',
      assignedTo: 'emp1',
      startPlanned: new Date('2025-11-05T10:00'),
      endPlanned: new Date('2025-11-05T14:00')
    };
    
    state.tasks = [task1];
    
    const conflicts = detectConflicts(task2, 'emp1');
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('time-overlap');
  });
  
  test('Should detect over-capacity', () => {
    const employee = { id: 'emp1', name: 'John' };
    
    // Already has 7h of tasks
    state.tasks = [
      { id: 't1', assignedTo: 'emp1', duration: 4 },
      { id: 't2', assignedTo: 'emp1', duration: 3 }
    ];
    
    // Try to add 2h task (total 9h > 8h workday)
    const newTask = { duration: 2 };
    
    const validation = validateCapacity(employee, newTask, new Date());
    
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('over-capacity');
  });
  
  test('Should suggest alternatives', () => {
    const task = { id: 't1', duration: 2 };
    
    state.employees = [
      { id: 'emp1', name: 'John' }, // Occupied
      { id: 'emp2', name: 'Jane' }, // Free
      { id: 'emp3', name: 'Bob' }   // Free
    ];
    
    state.tasks = [
      { id: 't2', assignedTo: 'emp1', duration: 8 }
    ];
    
    const alternatives = suggestAlternatives(task, 'emp1');
    
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives[0].availability).toBe('full');
  });
});
```

### **Suite 3: Auto-assign Algorithm**

```javascript
// tests/integration/auto-assign.test.js

describe('Auto-assign Algorithm', () => {
  
  test('Should assign to least loaded employee', () => {
    state.employees = [
      { id: 'emp1', name: 'John' },
      { id: 'emp2', name: 'Jane' }
    ];
    
    state.tasks = [
      { id: 't1', assignedTo: 'emp1', duration: 6 },
      { id: 't2', assignedTo: 'emp2', duration: 2 }
    ];
    
    const newTask = { id: 't3', duration: 3 };
    
    const result = autoAssignTask(newTask);
    
    expect(result.success).toBe(true);
    expect(newTask.assignedTo).toBe('emp2'); // Less loaded
  });
  
  test('Should consider skills when assigning', () => {
    state.employees = [
      { id: 'emp1', name: 'John', skills: ['Cięcie', 'Frezowanie'] },
      { id: 'emp2', name: 'Jane', skills: ['Montaż'] }
    ];
    
    const task = { id: 't1', operationName: 'Cięcie' };
    
    const result = autoAssignTask(task);
    
    expect(result.success).toBe(true);
    expect(task.assignedTo).toBe('emp1'); // Has matching skill
  });
  
  test('Should rebalance workload correctly', () => {
    state.employees = [
      { id: 'emp1', name: 'John' },
      { id: 'emp2', name: 'Jane' }
    ];
    
    // emp1 overloaded, emp2 free
    state.tasks = [
      { id: 't1', assignedTo: 'emp1', duration: 8 },
      { id: 't2', assignedTo: 'emp1', duration: 8 },
      { id: 't3', assignedTo: 'emp2', duration: 1 }
    ];
    
    const result = rebalanceWorkload();
    
    expect(result.balanced).toBe(true);
    expect(result.reassignments).toBeGreaterThan(0);
    
    // Check loads are balanced
    const load1 = calculateEmployeeLoad('emp1');
    const load2 = calculateEmployeeLoad('emp2');
    const diff = Math.abs(load1 - load2);
    
    expect(diff).toBeLessThan(4); // Within 4 hours
  });
});
```

### **Suite 4: Full Workflow (E2E)**

```javascript
// tests/e2e/full-workflow.spec.js

describe('Full Workflow - Order to Auto-assign', () => {
  
  test('Complete workflow: Create order → Generate tasks → Auto-assign → Sync', async () => {
    const [admin, worker] = await setupTwoUsers();
    
    // STEP 1: Admin creates order
    await admin.goto('/');
    await admin.click('[data-nav="order"]');
    await admin.fill('#o-name', 'Zlecenie E2E');
    await admin.fill('#o-qty', '5');
    await admin.selectOption('#o-proc', 'proc1'); // Select process
    await admin.click('button[type="submit"]');
    
    // STEP 2: Generate tasks
    await admin.click('[data-nav="tasks"]');
    await admin.click('button:text("Generuj zadania")');
    
    await wait(2000);
    
    // STEP 3: Auto-assign
    await admin.click('button:text("Auto-assign wszystkie")');
    
    await wait(3000);
    
    // STEP 4: Worker sees assigned task in real-time
    await worker.goto('/');
    await worker.click('[data-nav="tasks"]');
    
    const assignedTask = await worker.locator('.task-card[data-auto-assigned="true"]');
    expect(await assignedTask.count()).toBeGreaterThan(0);
    
    // STEP 5: Check Gantt
    await admin.click('[data-nav="gantt"]');
    
    const ganttTasks = await admin.locator('.gantt-bar');
    expect(await ganttTasks.count()).toBeGreaterThan(0);
    
    // STEP 6: Verify no conflicts
    const conflictWarnings = await admin.locator('.conflict-warning');
    expect(await conflictWarnings.count()).toBe(0);
  });
});
```

### **Suite 5: Performance Tests**

```javascript
// tests/performance/load-test.js

describe('Performance - Load Testing', () => {
  
  test('Should handle 100 tasks auto-assign in <10s', async () => {
    // Setup: 10 employees, 100 tasks
    state.employees = generateEmployees(10);
    state.tasks = generateTasks(100);
    
    const startTime = Date.now();
    
    autoAssignAll();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10000); // <10s
    
    // Verify all assigned
    const assigned = state.tasks.filter(t => t.assignedTo);
    expect(assigned.length).toBeGreaterThan(90); // >90% success rate
  });
  
  test('Should sync 1000 documents in <5s', async () => {
    const docs = generateDocuments(1000);
    
    const startTime = Date.now();
    
    await saveToDB({ orders: docs });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000);
  });
  
  test('Should detect conflicts for 500 tasks in <1s', async () => {
    state.employees = generateEmployees(50);
    state.tasks = generateTasks(500);
    
    const startTime = Date.now();
    
    const report = getConflictReport();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000);
    expect(report).toBeDefined();
  });
});
```

## ✅ Definition of Done

- ✅ **Suite 1:** Real-time sync E2E (5 testów)
- ✅ **Suite 2:** Resource conflicts (8 testów)
- ✅ **Suite 3:** Auto-assign (10 testów)
- ✅ **Suite 4:** Full workflow E2E (3 scenariusze)
- ✅ **Suite 5:** Performance tests (5 testów)
- ✅ **Total:** 31+ testów
- ✅ **Coverage:** >85%
- ✅ **All tests pass** w CI/CD
- ✅ **Performance targets** met
- ✅ **Dokumentacja testów**

## 📊 Metryki sukcesu

- Test coverage: **>85%**
- Test pass rate: **100%**
- Performance tests: **All pass**
- Regression: **0 new bugs**
- CI/CD: **Green build**

---

## 📅 Timeline Sprint 1

```
Tydzień 1:
  Mon-Fri: S1-T1 (Firebase real-time) - Kroki 1-4
  
Tydzień 2:
  Mon-Wed: S1-T1 (Firebase real-time) - Kroki 5-6
  Thu-Fri: S1-T2 (Conflict detection) - Start
  
Tydzień 3:
  Mon-Tue: S1-T2 (Conflict detection) - Finish
  Wed-Fri: S1-T3 (Auto-assign) - Start
  
Tydzień 4:
  Mon-Wed: S1-T3 (Auto-assign) - Finish
  Thu-Fri: S1-T4 (Tests E2E) - Full run
```

---

## 🎯 Success Criteria Sprint 1

Sprint jest ukończony gdy:

- ✅ Wszystkie 4 zadania mają status "Done"
- ✅ Wszystkie testy przechodzą (31+ testów)
- ✅ Code review zaaprobowany
- ✅ Dokumentacja zaktualizowana
- ✅ Demo dla stakeholderów przeprowadzone
- ✅ Deployment na staging successful
- ✅ Performance targets spełnione:
  - Real-time latency <1s
  - Conflict detection <50ms
  - Auto-assign <100ms per task
  - E2E tests <30s

---

**Przygotował:** AI Assistant  
**Data:** 2 listopada 2025  
**Sprint:** Sprint 1 - Quick Summary  
**Status:** 📋 Ready for implementation

