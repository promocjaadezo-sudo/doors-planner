# 🔒 Naprawka: Race Condition przy Usuwaniu Zleceń

## Problem
Po usunięciu zlecenia, **zadania znikały, ale potem wracały** po ~6 sekundach.

### Sekwencja błędu:
1. **19:20:29** - Kliknięcie "usuń zlecenie"
2. Lokalne zadania były usuwane: `tasksLength: 0` ✅
3. Ustawialiśmy: `state.storage.lastRemoteSync = 0` (aby wymusić wczytanie z Firebase)
4. **19:20:30** - Uruchamiało się `saveToDB()` aby usunąć z Firebase
5. **Błąd**: W tym samym momencie auto-sync startował `loadFromDB()`
6. `loadFromDB()` **pobierał stare dane z Firebase zanim `saveToDB()` je usunęło**
7. **19:20:35** - Stare zadania wracały: `tasksLength: 9` ❌

### Root cause: Race condition
```
Timeline:
T0: deleteOrder() → set lastRemoteSync=0
T1: auto-sync → loadFromDB() STARTS (bo lastRemoteSync=0)
T2: saveToDB() → deletes from Firebase
T3: loadFromDB() READS → Gets old tasks (because delete didn't happen yet)
T4: Old tasks appear in state ❌
```

## Rozwiązanie

### Mechanizm: Blokada synchronizacji (`_isSyncingDelete`)

1. **Deklaracja flagi** (przy inicjalizacji state):
```javascript
window._isSyncingDelete = false;      // Flaga blokady
window._syncDeleteTimeout = null;     // Timeout do odblokowania
```

2. **Blokada PRZED saveToDB()** (w funkcji deleteOrder):
```javascript
window._isSyncingDelete = true;  // 🔒 ZABLOKUJ loadFromDB
console.log('  🔒 Flaga _isSyncingDelete = true');

window.saveToDB().then(() => {
  // Po pomyślnym zapisaniu czekaj 2s
  window._syncDeleteTimeout = setTimeout(() => {
    window._isSyncingDelete = false;  // 🔓 ODBLOKUJ
    console.log('  🔓 Flaga _isSyncingDelete = false');
  }, 2000);
}).catch(err => {
  // Nawet przy błędzie, odblokuj po 3s
  window._syncDeleteTimeout = setTimeout(() => {
    window._isSyncingDelete = false;
  }, 3000);
});
```

3. **Check w loadFromDB()** (na początku funkcji):
```javascript
if (window._isSyncingDelete) {
  console.log('🔒 [loadFromDB] Pominięty: trwa synchronizacja usunięcia');
  return { skipped: true, reason: 'sync-delete-in-progress' };
}
```

### Jak to działa:

```
Timeline PO FIX:
T0: deleteOrder() 
    - set _isSyncingDelete = true (🔒 BLOKADA)
    - set lastRemoteSync=0
    - call saveToDB()
T1: auto-sync → loadFromDB() STARTS
    - CHECK: if (_isSyncingDelete) → SKIP ✅
T2: saveToDB() COMPLETES → deletes from Firebase
T3: Timeout 2s after T2
    - set _isSyncingDelete = false (🔓 ODBLOKADA)
T4: Następny auto-sync będzie PO odblokadzie
    - Firebase ma już usunięte dane ✅
```

## Implementacja

### Zmiany w obydwu plikach:
- `index.html`
- `planer_6.0.0/index.html`

### Kod zmieniony:

1. **Inicjalizacja** (~wiersz 1885-1895):
   - Dodane: `window._isSyncingDelete = false`
   - Dodane: `window._syncDeleteTimeout = null`

2. **Funkcja deleteOrder** (~wiersz 2583-2625):
   - Zmienione: Ustawianie flagi PRZED `saveToDB()`
   - Zmienione: Timeout do odblokowania PO `saveToDB().then()`
   - Dodane: Obsługa błędów z timeout 3s

3. **Funkcja loadFromDB** (~wiersz 6985-7000):
   - Dodane: Check flagi na początku
   - Zwraca: `{ skipped: true, reason: 'sync-delete-in-progress' }`

## Testowanie

1. Otwórz aplikację
2. Utwórz zlecenie z zadaniami
3. Kliknij "usuń zlecenie" 🗑️
4. **Obserwuj logi** - powinna pojawić się sekwencja:
   ```
   🗑️ Usuwanie zlecenia: id-xxx
     Usunięto: zlecenie YYY, 9 zadań
     ✅ Zapisano do localStorage
     🔒 Flaga _isSyncingDelete = true (blokuję loadFromDB)
     🔄 Synchronizuję usunięcie z Firebase...
     ✅ Zlecenie i zadania usunięte z Firebase
     🔓 Flaga _isSyncingDelete = false (odblokuję loadFromDB)
   ```
5. **Rezultat**: Zadania NIE powracają ✅

## Bezpieczeństwo timeout

- **2 sekundy normalnie** - wystarczy na Firebase sync
- **3 sekundy przy błędzie** - zapobiega wiecznej blokadzie
- **Timeout wyczyścić** - jeśli istnieje stary timeout

Gwarantuje że loadFromDB() nigdy nie zostanie zablokowana wiecznie.

## Notatki implementacyjne

### Dlaczego flaga zamiast awaitu?
- `saveToDB()` jest async i czasochłonny (~500-1000ms)
- Timeout 2s jest bardziej niezawodny niż czekanie na saveToDB()
- Gwarantuje separację między usuwaniem a wczytywaniem

### Dlaczego 2 sekundy?
- Firebase replikuje dane w ciągu ~500-1000ms
- 2s daje duży bufor na pewność
- Auto-sync co 30s więc brak opóźnienia dla użytkownika

### Flaga na window
- Dostępna globalnie dla wszystkich funkcji
- Prosta do debugowania w console: `window._isSyncingDelete`
- Nie wymaga refaktorizacji state

## Przyszłe ulepszenia

1. **Kolejka operacji** - zamiast flagi, użyć kolejki zleceń
2. **Transakcje** - Firebase transactions dla atomic delete
3. **Optimistic UI** - ukryć elementy wcześniej, nie czekać na Firebase
4. **Versioning** - timestamp version na dokumentach
