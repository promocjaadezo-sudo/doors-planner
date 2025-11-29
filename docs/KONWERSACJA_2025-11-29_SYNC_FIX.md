# Konwersacja - Naprawa synchronizacji Worker-App ↔ Planer
**Data:** 29 listopada 2025
**Wersja:** 6.1.2

---

## Problem zgłoszony przez użytkownika

1. **"teraz nie działa w planerze i jeszcze przywraca stare zlecenie które niema w zleceniu"**
   - Worker-app przywracał stare statusy z Firebase po odświeżeniu
   - Planer nie otrzymywał zmian statusu z worker-app

2. **"nie działa jak z planera dam powtórz to nie resetuje UI"**
   - Funkcja "Powtórz" w planerze nie resetowała zadania w worker-app

3. **"powinien resetować te linie: Rozpoczął: BOGDAN Zamknął: BOGDAN • start: 21:56:43"**
   - Przy resecie brak czyszczenia pól startedBy, closedBy, startedAt, closedAt

---

## Analiza przyczyn

### Problem 1: Worker-app nadpisywał lokalny status danymi z Firebase

**Lokalizacja:** `worker-app.html` - funkcja `loadTasksFromFirebase()` (linie ~2540-2555)

**Przyczyna:** Kod używał `Object.assign()` który nadpisywał wszystkie pola lokalnego zadania danymi z Firebase, w tym status:
```javascript
// STARY KOD (BŁĘDNY)
tasks[idx] = Object.assign({}, tasks[idx], fbTask, {
    checklist: mergedChecklist
});
```

### Problem 2: Planer nie nasłuchiwał na zmiany z worker-app

**Lokalizacja:** `index.html` - brak event listenerów

**Przyczyna:** Worker-app wysyłał eventy (`plannerStateChanged`, `storage`), ale planer nie miał żadnych nasłuchiwaczy.

### Problem 3: Funkcja "Powtórz" nie zapisywała do Firebase

**Lokalizacja:** `index.html` - handler `taskRepeat` (linia ~4059)

**Przyczyna:** Po zmianie statusu na 'todo' wywoływano tylko `save()` (localStorage), ale NIE `saveTaskToDB()` (Firebase).

### Problem 4: Brak resetowania pól startedBy/closedBy

**Lokalizacja:** `index.html` - handler `taskRepeat`

**Przyczyna:** Resetowano tylko podstawowe pola (status, startTime, endTime), ale nie pola informacyjne.

---

## Wprowadzone rozwiązania

### 1. Naprawa merge w `loadTasksFromFirebase()` (worker-app.html)

Dodano logikę priorytetu statusów:
```javascript
// NOWY KOD
const statusPriority = { 'done': 4, 'run': 3, 'paused': 2, 'todo': 1 };
const localPriority = statusPriority[existing.status] || 1;
const remotePriority = statusPriority[fbTask.status] || 1;

// Sprawdź czy to jawny reset z planera
const isExplicitReset = fbTask._resetAt && (!existing._resetAt || fbTask._resetAt > existing._resetAt);

let finalStatus = existing.status;
if (isExplicitReset && fbTask.status === 'todo') {
    // Planer jawnie resetuje zadanie - akceptuj!
    finalStatus = 'todo';
    finalStartTime = null;
    finalEndTime = null;
    // + reset startedBy, closedBy, startedAt, closedAt
} else if (remotePriority > localPriority) {
    finalStatus = fbTask.status;
} else if (remotePriority < localPriority) {
    // Zachowaj lokalny status
}
```

### 2. Dodanie nasłuchiwaczy w planerze (index.html)

```javascript
// Nasłuchuj na zmiany storage z innych kart (worker-app)
window.addEventListener('storage', function(event) {
    if (event.key !== storeKey && event.key !== 'door_v50_state') return;
    // Merge przychodzących zadań...
});

// Nasłuchuj na CustomEvent plannerStateChanged
window.addEventListener('plannerStateChanged', function(event) {
    // Aktualizuj zadanie w lokalnym state...
});
```

### 3. Naprawa funkcji "Powtórz" (index.html)

```javascript
if(t.dataset.taskRepeat) {
    const id = t.dataset.taskRepeat;
    const task = state.tasks.find(x => x.id === id);
    if (!task) return;
    
    // Reset wszystkich pól
    task.status = 'todo';
    task.elapsedMin = 0;
    task.startTime = null;
    task.endTime = null;
    task.startedAt = null;      // NOWE
    task.closedAt = null;       // NOWE
    task.startedBy = null;      // NOWE
    task.closedBy = null;       // NOWE
    task._resetAt = Date.now(); // Znacznik resetu dla worker-app
    
    // Resetuj checklistę
    if (Array.isArray(task.checklist)) {
        task.checklist = task.checklist.map(item => ({...item, done: false}));
    }
    
    save();
    renderTasks();
    
    // KLUCZOWE: Zapisz reset do Firebase
    if(state.storage && state.storage.mode === 'firebase'){
        (async () => {
            try{ await saveTaskToDB(id); }catch(e){ console.warn(e); }
        })();
    }
}
```

### 4. Naprawa `handleRealtimeTaskSnapshot()` (worker-app.html)

Ta sama logika co w `loadTasksFromFirebase()` - sprawdzanie `_resetAt` i priorytetu statusów.

---

## Pliki zmodyfikowane

| Plik | Zmiany |
|------|--------|
| `planer_6.1.1/worker-app.html` | Logika merge z priorytetem statusów, obsługa `_resetAt` |
| `planer_6.1.1/index.html` | Event listenery, naprawa "Powtórz", reset wszystkich pól |

---

## Pliki utworzone

| Plik | Opis |
|------|------|
| `planer_6.1.2/index.html` | Kopia produkcyjna planera v6.1.2 |
| `planer_6.1.2/worker-app.html` | Kopia produkcyjna worker-app v6.1.2 |
| `planer_6.1.1/index.backup-6.1.2.html` | Backup planera |
| `planer_6.1.1/worker-app.backup-6.1.2.html` | Backup worker-app |

---

## Commity Git

1. **`9527de4`** - "Dodano planer_6.1.2 - poprawiona synchronizacja worker-app z planerem (reset Powtorz)"
2. **`3460c85`** - "Aktualizacja produkcyjna v6.1.2 - synchronizacja worker-app"

---

## Jak działa synchronizacja po naprawie

### Scenariusz 1: Worker kończy zadanie
```
Worker: zmienia status → zapisuje do localStorage + Firebase + wysyła event
   ↓
Planer: nasłuchuje storage event → aktualizuje lokalny state → zapisuje → renderuje UI
```

### Scenariusz 2: Planer resetuje zadanie ("Powtórz")
```
Planer: klik "Powtórz" → ustawia status='todo', _resetAt=Date.now() → zapisuje do Firebase
   ↓
Firebase: wysyła update przez onSnapshot
   ↓
Worker-app: odbiera, sprawdza _resetAt > lokalny → akceptuje reset → renderuje UI
```

### Logika priorytetu statusów
```
done (4) > run (3) > paused (2) > todo (1)
```
- Jeśli lokalny status ma wyższy priorytet → zachowaj lokalny
- Wyjątek: jawny reset z planera (`_resetAt`) → akceptuj reset

---

## Pola resetowane przy "Powtórz"

| Pole | Reset do |
|------|----------|
| `status` | `'todo'` |
| `elapsedMin` | `0` |
| `startTime` | `null` |
| `endTime` | `null` |
| `startedAt` | `null` |
| `closedAt` | `null` |
| `startedBy` | `null` |
| `closedBy` | `null` |
| `checklist[].done` | `false` |
| `_resetAt` | `Date.now()` |

---

## Publikacja

- **GitHub:** https://github.com/promocjaadezo-sudo/doors-planner
- **GitHub Pages:** https://promocjaadezo-sudo.github.io/doors-planner/

---

## Podsumowanie

Naprawiono dwukierunkową synchronizację między worker-app a planerem. Kluczowe elementy:

1. **Priorytet statusów** - zapobiega cofaniu ukończonych zadań przez stare dane z Firebase
2. **Znacznik `_resetAt`** - pozwala planerowi jawnie zresetować zadanie
3. **Event listenery** - planer teraz nasłuchuje na zmiany z worker-app
4. **Pełny reset** - "Powtórz" czyści wszystkie pola włącznie z informacjami o wykonawcach
