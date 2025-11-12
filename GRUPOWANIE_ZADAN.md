# 📊 Grupowanie Zadań (Task Grouping)

## 🎯 Cel

Umożliwienie organizacji i wyświetlania zadań w zgrupowanej formie według różnych kryteriów, co ułatwia zarządzanie dużą liczbą zadań w systemie planowania produkcji drzwi.

## ✨ Funkcjonalności

### 1. **Opcje grupowania**

Zadania można grupować według trzech kryteriów:

- **Zlecenie (Order)** - grupuje zadania według zlecenia, do którego należą
- **Status** - grupuje zadania według ich statusu (Do zrobienia, W realizacji, Zamknięte)
- **Przypisany pracownik (Assignee)** - grupuje zadania według przypisanego pracownika

### 2. **Interfejs użytkownika**

#### Dropdown wyboru grupowania
```html
<select id="tasks-group-by" style="min-width:180px" title="Grupuj zadania wg...">
  <option value="">Bez grupowania</option>
  <option value="order">Grupuj wg zlecenia</option>
  <option value="status">Grupuj wg statusu</option>
  <option value="assignee">Grupuj wg przypisanego</option>
</select>
```

#### Nagłówki grup
Każda grupa wyświetlana jest z:
- Ikoną zwinięcia/rozwinięcia (▶/▼)
- Nazwą grupy
- Licznikiem zadań w grupie
- Tłem gradientowym dla lepszej widoczności

### 3. **Funkcja zwijania grup**

Grupy można zwijać i rozwijać klikając na nagłówek. Stan zwinięcia jest zapisywany w `window._taskGroupsCollapsed` i zachowywany między renderowaniami.

## 🔧 Implementacja

### Główna funkcja: `renderTasksGrouped(tasks, groupBy)`

Lokalizacja: `index.html` (linie 11975-12041)

```javascript
function renderTasksGrouped(tasks, groupBy) {
  const list = qs('#tasks-list');
  if (!list) return;
  
  // Grupuj zadania według wybranego kryterium
  const groups = {};
  tasks.forEach(t => {
    let key;
    switch(groupBy) {
      case 'order':
        const order = (state.orders || []).find(o => o.id === t.orderId);
        key = order ? order.name : '(Brak zlecenia)';
        break;
      case 'status':
        const statusMap = { 
          'todo': 'Do zrobienia', 
          'run': 'W realizacji', 
          'done': 'Zamknięte' 
        };
        key = statusMap[t.status] || t.status || 'todo';
        break;
      case 'assignee':
        const emp = (state.employees || []).find(e => e.id === t.assignee);
        key = emp ? emp.name : '(Nieprzypisane)';
        break;
      default:
        key = 'Wszystkie';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  
  // Renderuj grupy z możliwością zwijania
  list.innerHTML = '';
  Object.keys(groups).sort().forEach(groupName => {
    const groupTasks = groups[groupName];
    const groupId = 'group-' + groupName.replace(/[^a-z0-9]/gi, '-');
    const isCollapsed = window._taskGroupsCollapsed[groupId] || false;
    
    // Nagłówek grupy
    const groupHeader = document.createElement('div');
    groupHeader.className = 'card';
    groupHeader.style.cursor = 'pointer';
    groupHeader.innerHTML = `...`;
    
    groupHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      window._taskGroupsCollapsed[groupId] = !window._taskGroupsCollapsed[groupId];
      renderTasks(); // Re-render z zachowaniem stanu
    });
    
    list.appendChild(groupHeader);
    
    // Zadania w grupie (tylko jeśli nie zwinięte)
    if (!isCollapsed) {
      groupTasks.forEach(t => {
        const taskCard = createTaskCard(t);
        list.appendChild(taskCard);
      });
    }
  });
}
```

### Funkcja pomocnicza: `createTaskCard(t)`

Lokalizacja: `index.html` (linie 12043-12100+)

Tworzy kartę zadania z wszystkimi informacjami:
- Nazwa operacji
- Status synchronizacji (✔️, ⏳, ⚠️)
- Informacje o przypisaniu
- Zaplanowane daty rozpoczęcia i zakończenia
- Czas trwania
- Nazwa zlecenia
- Przyciski akcji (Start, Pauza, Zakończ, Resetuj, itp.)

## 📊 Logika grupowania

### 1. Grupowanie według zlecenia

```javascript
case 'order':
  const order = (state.orders || []).find(o => o.id === t.orderId);
  key = order ? order.name : '(Brak zlecenia)';
  break;
```

Znajduje zlecenie powiązane z zadaniem i używa jego nazwy jako klucza grupy.

### 2. Grupowanie według statusu

```javascript
case 'status':
  const statusMap = { 
    'todo': 'Do zrobienia', 
    'run': 'W realizacji', 
    'done': 'Zamknięte' 
  };
  key = statusMap[t.status] || t.status || 'todo';
  break;
```

Mapuje statusy techniczne na przyjazne nazwy w języku polskim.

### 3. Grupowanie według pracownika

```javascript
case 'assignee':
  const emp = (state.employees || []).find(e => e.id === t.assignee);
  key = emp ? emp.name : '(Nieprzypisane)';
  break;
```

Znajduje pracownika przypisanego do zadania i używa jego imienia jako klucza grupy.

## 🎨 Stylizacja

### Nagłówek grupy
```css
.card {
  cursor: pointer;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}
```

### Zadania w grupie
```css
.card {
  margin-left: 20px; /* Wcięcie dla hierarchii wizualnej */
}
```

## 💾 Stan zwinięcia grup

```javascript
window._taskGroupsCollapsed = window._taskGroupsCollapsed || {};

// Zapisz stan zwinięcia
window._taskGroupsCollapsed[groupId] = !window._taskGroupsCollapsed[groupId];

// Sprawdź stan zwinięcia
const isCollapsed = window._taskGroupsCollapsed[groupId] || false;
```

Stan zwinięcia jest przechowywany w pamięci przeglądarki i zachowywany między renderowaniami widoku zadań.

## 🔄 Integracja z renderowaniem zadań

Funkcja `renderTasks()` (linia 3357+) sprawdza czy wybrano grupowanie:

```javascript
function renderTasks(){
  const list = qs('#tasks-list');
  if (!list) return;
  
  const groupBy = qs('#tasks-group-by')?.value || '';
  const rows = (state.tasks || []).filter(/* filtry */);
  
  // Jeśli wybrano grupowanie, użyj funkcji renderTasksGrouped
  if(groupBy && typeof window.renderTasksGrouped === 'function') {
    window.renderTasksGrouped(rows, groupBy);
    return;
  }
  
  // W przeciwnym razie renderuj normalnie (płaska lista)
  // ...
}
```

## 📋 Event Listeners

Lokalizacja: `index.html` (linia 3827)

```javascript
const tasksGroupBy = qs('#tasks-group-by');
if(tasksGroupBy) {
  tasksGroupBy.addEventListener('change', () => {
    renderTasks(); // Re-renderuj przy zmianie opcji grupowania
  });
}
```

## 🔗 Integracja z synchronizacją Firebase

Grupowanie zadań działa niezależnie od synchronizacji i jest kompatybilne z:

- **Firebase Sync Queue** (`js/firebase-sync-queue.js`) - kolejkowanie operacji
- **Firebase Realtime Sync** (`js/firebase-realtime-sync.js`) - synchronizacja w czasie rzeczywistym
- **saveTaskToDB()** - zapisywanie pojedynczych zadań do Firebase
- **subscribeToTaskUpdates()** - nasłuchiwanie zmian w Firebase

Gdy zadania są aktualizowane przez synchronizację, `renderTasks()` jest automatycznie wywoływana, co powoduje ponowne renderowanie grup z zachowaniem stanu zwinięcia.

## 🧪 Scenariusze testowe

### Test 1: Grupowanie według zlecenia
1. Otwórz zakładkę "Zadania"
2. Wybierz "Grupuj wg zlecenia" z dropdown
3. Sprawdź czy zadania są pogrupowane według nazw zleceń
4. Sprawdź czy zadania bez zlecenia są w grupie "(Brak zlecenia)"

### Test 2: Grupowanie według statusu
1. Wybierz "Grupuj wg statusu"
2. Sprawdź czy istnieją grupy: "Do zrobienia", "W realizacji", "Zamknięte"
3. Sprawdź czy zadania są w odpowiednich grupach

### Test 3: Grupowanie według pracownika
1. Wybierz "Grupuj wg przypisanego"
2. Sprawdź czy zadania są pogrupowane według imion pracowników
3. Sprawdź czy zadania nieprzypisane są w grupie "(Nieprzypisane)"

### Test 4: Zwijanie/rozwijanie grup
1. Wybierz dowolne grupowanie
2. Kliknij nagłówek grupy
3. Sprawdź czy grupa się zwija (ikona zmienia się na ▶)
4. Kliknij ponownie - grupa powinna się rozwinąć (ikona ▼)
5. Zmień filtr lub odśwież widok - stan zwinięcia powinien być zachowany

### Test 5: Przełączanie między trybami
1. Grupuj według zlecenia
2. Zwiń kilka grup
3. Przełącz na "Bez grupowania"
4. Sprawdź czy widok wraca do płaskiej listy
5. Przełącz z powrotem na grupowanie - stan zwinięcia powinien być zachowany

### Test 6: Synchronizacja z Firebase
1. Włącz grupowanie według zlecenia
2. W innej przeglądarce/zakładce zmień status zadania
3. Sprawdź czy zmiana jest widoczna w pogrupowanym widoku
4. Sprawdź czy stan zwinięcia grup jest zachowany po synchronizacji

## ✅ Zalety funkcji grupowania

1. **Lepsza organizacja** - Duża liczba zadań jest łatwiejsza do zarządzania
2. **Elastyczność** - Różne kryteria grupowania dla różnych celów
3. **Czytelność** - Hierarchiczna struktura z licznikami
4. **Wydajność** - Zwijanie grup redukuje ilość wyświetlanych elementów
5. **UX** - Stan zwinięcia jest zapamiętywany między renderowaniami
6. **Kompatybilność** - Działa z synchronizacją Firebase i filtrami

## 🔮 Możliwe rozszerzenia

1. **Wielokrotne grupowanie** - Grupowanie według dwóch kryteriów jednocześnie (np. zlecenie → status)
2. **Sortowanie w grupach** - Opcja sortowania zadań w ramach grup
3. **Akcje grupowe** - Wykonywanie akcji na całej grupie (np. masowe przypisanie pracownika)
4. **Eksport grup** - Eksport CSV/PDF z zachowaniem grupowania
5. **Filtry w grupach** - Dodatkowe filtry stosowane wewnątrz grup
6. **Statystyki grup** - Podsumowania czasu, postępu dla każdej grupy
7. **Zapisywanie preferencji** - Zapamiętywanie preferowanego trybu grupowania w localStorage
8. **Drag & drop między grupami** - Przenoszenie zadań między grupami

## 📄 Pliki

- **index.html** (linie 11970-12100) - Implementacja funkcji grupowania
- **index.html** (linie 650-658) - HTML dropdown wyboru grupowania
- **index.html** (linia 3827) - Event listener dla grupowania
- **index.html** (linie 3357-3369) - Integracja z renderTasks()
- **js/firebase-sync-queue.js** - Synchronizacja z Firebase (niezależna)
- **js/firebase-realtime-sync.js** - Synchronizacja real-time (niezależna)

## 🎉 Status

✅ **ZAIMPLEMENTOWANE I DZIAŁAJĄCE**

Funkcja grupowania zadań jest w pełni zaimplementowana i gotowa do użycia w produkcji.

---

**Dokument utworzony:** 3 listopada 2025  
**Wersja:** 1.0  
**Autor:** AI Agent  
**Related:** FIREBASE_SYNC_QUEUE.md, index.html
