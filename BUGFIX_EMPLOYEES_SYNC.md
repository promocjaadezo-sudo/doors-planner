# 🐛 Naprawa: Pracownicy nie synchronizują się do Firebase

## Problem

Po implementacji flagi `_isSyncingDelete` (naprawa race condition), pracownicy przestali się synchronizować do Firebase:
- Dodanie nowego pracownika → pracownik pojawia się lokalnie
- **ALE** nie pojawia się w Firebase
- Komunikat: "TERAZ ZAKŁADKA PRACOWNICY NIE DOPISUJĄ SIĘ DO BAZY FIREBASE"

## Root Cause

Flaga `_isSyncingDelete` blokowała **całą** funkcję `loadFromDB()`:

```javascript
// STARE - BŁĘDNE
if (window._isSyncingDelete) {
  console.log('🔒 [loadFromDB] Pominięty: trwa synchronizacja usunięcia');
  return { skipped: true, reason: 'sync-delete-in-progress' };  // ← Blokuje WSZYSTKO!
}
```

To powodowało, że:
1. Gdy usuwaliśmy zlecenie, flaga=TRUE
2. `loadFromDB()` wracała natychmiast - bez aktualizacji ŻADNYCH kolekcji
3. **Kolekcja `employees` się nie aktualizowała**
4. Nowy pracownik dodany lokalnie czekał na `loadFromDB()` aby się zacommitować
5. Ale `loadFromDB()` była zablokowana, więc pracownik nigdy się nie wysłał do Firebase

## Rozwiązanie

Zmieniam strategię blokowania na **selektywne**:
- Flaga `_isSyncingDelete` blokuje TYLKO `orders` i `tasks`
- Wszystkie inne kolekcje, w tym `employees`, synchronizują się normalnie

### Zmiana w `loadFromDB()` - Linia 7013 (planer_6.0.0/index.html)

**STARE:**
```javascript
if (window._isSyncingDelete) {
  console.log('🔒 [loadFromDB] Pominięty: trwa synchronizacja usunięcia');
  qs('#set-info').textContent = '🔒 Czekam na zakończenie usunięcia...';
  return { skipped: true, reason: 'sync-delete-in-progress' };
}
```

**NOWE:**
```javascript
if (window._isSyncingDelete) {
  console.log('🔒 [loadFromDB] Blokowanie tylko dla orders/tasks. Pracownicy mogą się synchronizować.');
  // Flaga blokuje pełne loadFromDB dla orders/tasks, ale pracownicy są zarządzani niezależnie
}
```

### Zmiana w pętli kolekcji - Linia 7123 (planer_6.0.0/index.html)

**DODAJE SIĘ** w `Object.entries(remoteCollections).forEach()`:

```javascript
// 🔒 BLOKADA PODCZAS USUWANIA - Nie nadpisuj orders/tasks gdy usuwamy
if (window._isSyncingDelete && (key === 'orders' || key === 'tasks')) {
  console.log(`🔒 [loadFromDB] Blokuję aktualizację ${key} (trwa synchronizacja usunięcia)`);
  skipped.push(key);
  return;  // ← Pomiń TYLKO te dwie kolekcje
}
```

Teraz:
- `employees`, `operationsCatalog`, `processes`, `after` → normalnie się synchronizują
- TYLKO `orders` i `tasks` → czekają aż flaga się wyłączy

## Pliki zmienione

- `planer_6.0.0/index.html` - linie 7013, 7123
- `index.html` - identyczne zmiany (linie 6926, 7054)

## Testowanie

### Test 1: Dodaj pracownika
1. Wciśnij "Dodaj pracownika"
2. Wypełnij dane
3. Sprawdź konsolę - powinno być: `✍️ Zapisuję pracownika`
4. Sprawdź Firebase Console → pracownik powinien być w kolekcji `employees`

### Test 2: Pracownik podczas usuwania zlecenia
1. Miej otwarte zlecenie z zadaniami
2. Jednocześnie dodaj nowego pracownika
3. Usuń zlecenie w drugiej karcie/oknie
4. Pracownik powinien być nadal synchronizowany do Firebase
5. Zlecenie/zadania nie powinny się przywrócić

### Test 3: Usuwanie zleceń wciąż działa
1. Usuń zlecenie i jego zadania
2. Sprawdź, że się nie przywracają po ~6 sekund
3. Flaga `_isSyncingDelete` powinna chronić te kolekcje

## Diagram synchronizacji

```
┌─────────────────────────────────────────────────────────────┐
│                      Dodaj pracownika                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    save() lokalnie
                         │
                    ┌────▼───────┐
                    │ _isSyncingDelete = ?
                    └────┬────────┘
          ┌─────────┬────┴────────┬─────────┐
          │         │             │         │
     FALSE    TRUE(orders/tasks)  │   (inne kolekcje)
     (normal) (blokowane)         │
          │         │             │
          ▼         ▼             ▼
    ✅ saveToDB  ⏳ czeka      ✅ saveToDB
    uploaduje    na:          uploaduje
   pracowników   flagę        pracowników
                END            zawsze!
```

## Monitoring

Uruchom konsolę, dodaj pracownika, usuń zlecenie jednocześnie:

```javascript
// Powinno widać:
🔍 [saveToDB] DIAGNOSTYKA PRACOWNIKÓW:
  📦 Lokalne items: [...]
  ✍️ Zapisuję pracownika: Jan Kowalski

// I podczas usuwania:
🔒 [loadFromDB] Blokuję aktualizację orders (trwa synchronizacja usunięcia)
🔒 [loadFromDB] Blokuję aktualizację tasks (trwa synchronizacja usunięcia)
📝 Aktualizuję kolekcję 'employees': lokalna=1, zdalna=1  ← Pracownicy synchronizują!
```

## Commit

```
FIX: Allow employees to sync independently from order deletion lock
```

Status: ✅ NAPRAWIONO
