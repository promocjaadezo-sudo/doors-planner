# 🧪 Test usuwania zleceń - Instrukcja manualna

## Problem
Zlecenia usunięte lokalnie wracają po odświeżeniu strony, ponieważ `loadFromDB()` nadpisuje lokalny stan danymi z Firestore.

## Rozwiązanie
Dodano flagę `window._deleteInProgress` która blokuje auto-load podczas operacji usuwania.

## Kroki testowe

### 1. Przygotowanie
1. Otwórz aplikację: http://127.0.0.1:5500
2. Przejdź do Ustawień
3. Sprawdź czy tryb Firebase jest włączony
4. Włącz "Auto-load from DB" jeśli wyłączone

### 2. Test usuwania zlecenia

#### A. Dodaj testowe zlecenie
1. Przejdź do zakładki "Zlecenia"
2. Wypełnij formularz:
   - Nazwa: `TEST DELETE ${Date.now()}`
   - Klient: `Test Client`
   - Model: `Test Model`
   - Ilość: `1`
3. Kliknij "Zapisz zlecenie"
4. Zanotuj nazwę dodanego zlecenia

#### B. Sprawdź synchronizację
1. Otwórz Console (F12)
2. Poszukaj logów:
   ```
   ✅ Wczytano dane z Firebase
   ```
3. To potwierdza że dane są w Firestore

#### C. Usuń zlecenie
1. W tabeli zleceń znajdź testowe zlecenie
2. Kliknij przycisk "Usuń"
3. **SPRAWDŹ CONSOLE:**
   ```
   🗑️ USUŃ ZLECENIE: [id]
   📊 Zleceń przed usunięciem: X
   🔥 Firestore delete result: true
   📊 Zleceń po usunięciu: X-1
   💾 Zapisano po usunięciu
   🔓 Delete operation completed, auto-load unlocked
   ```

#### D. Odśwież stronę (KLUCZOWY MOMENT)
1. Naciśnij F5 lub Ctrl+R
2. **SPRAWDŹ czy zlecenie wróciło**
3. **SPRAWDŹ CONSOLE:**
   ```
   [loadFromDB] Operacja usuwania w toku - pomijam ładowanie
   ```
   LUB
   ```
   ✅ Wczytano dane z Firebase
   ```

### 3. Oczekiwane wyniki

✅ **PASS:** Zlecenie NIE wraca po odświeżeniu
❌ **FAIL:** Zlecenie wraca po odświeżeniu

### 4. Dodatkowe testy

#### Test A: Usuń pracownika
1. Dodaj testowego pracownika
2. Usuń go
3. Odśwież stronę
4. Sprawdź czy nie wrócił

#### Test B: Usuń wiele zleceń
1. Dodaj 3 testowe zlecenia
2. Usuń je jedno po drugim
3. Odśwież po każdym usunięciu
4. Sprawdź czy żadne nie wróciło

#### Test C: Offline mode
1. Wyłącz WiFi
2. Usuń zlecenie
3. Sprawdź czy działa (powinno, bo localStorage)
4. Włącz WiFi i odśwież
5. Sprawdź czy zlecenie nie wróciło

## Diagnozowanie problemów

### Jeśli zlecenie wraca:
1. Sprawdź logi w Console
2. Poszukaj błędów typu:
   ```
   ❌ Nie udało się usunąć zlecenia z Firestore
   ```
3. Użyj `test-delete-order.html` do weryfikacji czy Firestore faktycznie usuwa dokumenty

### Jeśli błąd "NS_BINDING_ABORTED":
- To normalne - Firestore czasem anuluje długie połączenia
- Nie wpływa na funkcjonalność

### Jeśli batch.commit() fails:
1. Sprawdź Firestore Rules (muszą zezwalać na delete)
2. Sprawdź czy użytkownik jest zalogowany:
   ```javascript
   firebase.auth().currentUser
   ```

## Logi debugowania

### Prawidłowe logi przy usuwaniu:
```
🗑️ USUŃ ZLECENIE: mg9abc123
📊 Zleceń przed usunięciem: 53
🔥 Firestore delete result: true
📊 Zleceń po usunięciu: 52
💾 Zapisano po usunięciu
✅ SAVE: Dane zapisane i zweryfikowane! Zleceń w localStorage: 52
🔓 Delete operation completed, auto-load unlocked
```

### Logi przy odświeżeniu (gdy wszystko OK):
```
[autoSubscribeIfNeeded] Czekam na zakończenie operacji usuwania...
✅ Wczytano dane z Firebase
Stan załadowany: { ordersLength: 52 }
```

## Kod do testów w Console

### Sprawdź czy flaga działa:
```javascript
console.log('Delete in progress:', window._deleteInProgress);
```

### Ręcznie zablokuj auto-load:
```javascript
window._deleteInProgress = true;
// Teraz odśwież - nie powinno załadować z Firestore
```

### Ręcznie odblokuj:
```javascript
window._deleteInProgress = false;
```

### Sprawdź localStorage vs Firestore count:
```javascript
const localOrders = JSON.parse(localStorage.getItem('door_v50_state')).orders.length;
console.log('Local orders:', localOrders);

// W Firestore (musisz być zalogowany):
const fbOrders = await firebase.firestore()
  .collection('planner').doc('doors-demo')
  .collection('users').doc('hala-1')
  .collection('orders').get();
console.log('Firestore orders:', fbOrders.size);
```
