# 📱 DOKUMENTACJA WORKER-APP - ŹRÓDŁA DANYCH

**Data utworzenia:** 1 listopada 2025  
**Wersja aplikacji:** v2.0 (z funkcją wylogowania)  
**Autor:** Copilot AI Assistant  

---

## 🎯 CEL DOKUMENTU

Ten dokument opisuje dokładnie skąd aplikacja mobilna `worker-app.html` pobiera dane pracowników i zadań. Jest to kluczowe dla zrozumienia synchronizacji między aplikacją główną (planer) a aplikacją mobilną.

---

## 📊 ŹRÓDŁA DANYCH - PRZEGLĄD

Worker-app pobiera dane z **3 źródeł** w następującej kolejności (priorytet):

```
1. Firebase (online)
   ↓ jeśli nie działa
2. localStorage Planera (z głównej aplikacji)
   ↓ jeśli pusty
3. Import ręczny (plik JSON lub przycisk)
```

---

## 🔥 1. FIREBASE (Priorytet #1 - Online)

### Konfiguracja Firebase:
```javascript
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAVfzKQGzp_4pE4U9jYwZQ_WQfO8M3QEQQ",
    authDomain: "doors-planner.firebaseapp.com",
    projectId: "doors-planner",
    storageBucket: "doors-planner.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456"
};
```

### Ścieżki w Firestore:
```
/planner/{appId}/users/{userId}/employees    → Lista pracowników
/planner/{appId}/users/{userId}/tasks        → Zadania
```

### Kiedy jest używane:
- ✅ Gdy urządzenie ma internet
- ✅ Gdy Firebase jest prawidłowo skonfigurowany
- ✅ Przy pierwszym uruchomieniu aplikacji

### Funkcje Firebase:
```javascript
loadEmployeesFromFirebase()  // Pobiera pracowników
loadTasksFromFirebase()      // Pobiera zadania
```

---

## 💾 2. LOCALSTORAGE PLANERA (Fallback #1)

### Klucze localStorage sprawdzane przez worker-app:

#### Dla pracowników:
```javascript
localStorage.getItem('planner-state')         // Główny stan planera
localStorage.getItem('door_v5627_state')      // Wersjonowany klucz
localStorage.getItem('planner-app-id')        // ID aplikacji
```

#### Dla zadań:
```javascript
localStorage.getItem('door_v5627_state')      // Zadania z planera
localStorage.getItem('door_planner_state')    // Alternatywny klucz
localStorage.getItem('state_backup')          // Backup stanu
```

#### Dane pracownika:
```javascript
localStorage.getItem('worker-current-employee-id')  // ID zalogowanego
localStorage.getItem('worker-tasks')                // Zadania pracownika
localStorage.getItem('worker-all-tasks')            // Cache wszystkich
```

### Struktura danych w localStorage:
```json
{
  "employees": [
    {
      "id": "emp_123",
      "name": "Jan Kowalski",
      "role": "Monter",
      "phone": "+48 123 456 789"
    }
  ],
  "tasks": [
    {
      "id": "task_456",
      "name": "Montaż drzwi",
      "orderId": "order_789",
      "employeeId": "emp_123",
      "status": "pending",
      "startPlanned": "2025-11-01T08:00:00",
      "endPlanned": "2025-11-01T10:00:00"
    }
  ],
  "orders": [
    {
      "id": "order_789",
      "client": "Firma ABC",
      "model": "Model XYZ",
      "quantity": 5
    }
  ]
}
```

### Kiedy jest używane:
- ✅ Gdy Firebase nie działa
- ✅ Gdy worker-app otwarty w TEJ SAMEJ przeglądarce co planer
- ✅ Na komputerze (desktop)

### ⚠️ WAŻNE OGRANICZENIE:
**localStorage NIE jest współdzielony między urządzeniami!**
- Komputer ma swój localStorage
- Telefon ma swój localStorage
- Nie są zsynchronizowane automatycznie

---

## 📥 3. IMPORT RĘCZNY (Fallback #2)

### Przycisk "📥 Importuj zadania"

#### Funkcja:
```javascript
function importTasksFromMainApp() {
    // 1. Próbuje załadować z localStorage planera
    const plannerState = loadPlannerState();
    
    // 2. Jeśli znaleziono - mapuje zadania
    if (plannerState) {
        const importedTasks = mapPlannerTasks(plannerState);
        mergeIncomingTasks(importedTasks);
        saveTasks();
        return;
    }
    
    // 3. Jeśli nie - pozwala wgrać plik JSON
    // Otwiera dialog wyboru pliku
}
```

#### Sprawdzane klucze (w kolejności):
1. `door_v5627_state`
2. `door_planner_state`
3. `state_backup`

#### Filtrowanie zadań:
```javascript
// Pokazuje TYLKO zadania przypisane do zalogowanego pracownika
const filtered = plannerState.tasks.filter(task => {
    const direct = task.employeeId === currentUser.id;
    const assignee = task.assignees?.includes(currentUser.id);
    return direct || assignee;
});
```

### Kiedy jest używane:
- ✅ Na telefonie (po pierwszym otwarciu)
- ✅ Gdy Firebase jest pusty
- ✅ Gdy localStorage planera jest pusty
- ✅ Gdy chcesz odświeżyć dane

---

## 🔄 PRZEPŁYW DANYCH - KROK PO KROKU

### Scenariusz A: Pierwsze otwarcie na komputerze
```
1. Worker-app otwiera się
2. Próbuje Firebase → ✅ Pobiera pracowników
3. Użytkownik wybiera pracownika → zapisuje w localStorage
4. Kliknie "Importuj zadania" → pobiera z localStorage planera
5. Filtruje zadania dla pracownika → zapisuje lokalnie
```

### Scenariusz B: Pierwsze otwarcie na telefonie
```
1. Worker-app otwiera się
2. Próbuje Firebase → ❌ Może nie działać / być pusty
3. Próbuje localStorage planera → ❌ Pusty (inne urządzenie)
4. Lista pracowników pusta → ❌ Nie można się zalogować
5. ROZWIĄZANIE: Wysłać plik HTML z komputera na telefon
```

### Scenariusz C: Praca offline (telefon)
```
1. Worker-app otwiera się
2. Ładuje dane z localStorage telefonu:
   - worker-current-employee-id → ID pracownika
   - worker-tasks → zadania
3. Pracownik widzi swoje zadania
4. Zaznacza jako wykonane → zapisuje w localStorage
5. Działa bez internetu ✅
```

---

## 📱 JAK SKONFIGUROWAĆ NA TELEFONIE

### Metoda 1: Wysłanie pliku HTML
1. Skopiuj `worker-app-v2.html` na Pulpit
2. Wyślij na telefon (email/WhatsApp/Drive)
3. Pobierz i otwórz w przeglądarce
4. **Problem:** Lista pracowników będzie pusta!

### Metoda 2: Export/Import JSON
1. W planerze (index.html):
   - Kliknij "💾 Eksport" (na czerwonym banerze)
   - Zapisz plik JSON
   
2. Wyślij plik JSON na telefon

3. W worker-app na telefonie:
   - Kliknij "📥 Importuj zadania"
   - Wybierz plik JSON
   - Zadania się załadują

### Metoda 3: Firebase (automatyczna)
1. Upewnij się że Firebase działa
2. Otwórz worker-app
3. Pracownicy załadują się automatycznie
4. Wybierz pracownika
5. Kliknij "Importuj zadania"

---

## 🔑 KLUCZOWE KLUCZE LOCALSTORAGE

### Worker-app zapisuje:
```javascript
'worker-current-employee-id'    // ID zalogowanego pracownika
'worker-tasks'                  // Zadania pracownika (filtrowane)
'worker-all-tasks'              // Cache wszystkich zadań
'worker-notifications'          // Ustawienia powiadomień
```

### Planer (index.html) zapisuje:
```javascript
'door_v5627_state'              // Główny stan aplikacji
'planner-state'                 // Backup stanu
'planner-app-id'                // ID aplikacji Firebase
```

### Współdzielone (jeśli ta sama przeglądarka):
- ✅ Na komputerze: worker-app widzi dane planera
- ❌ Na telefonie: worker-app NIE widzi danych z komputera

---

## 🛠️ FUNKCJE POBIERANIA DANYCH

### Pracownicy:
```javascript
loadEmployeesFromFirebase()         // Z Firebase
loadEmployeesFromLocalStorage()     // Z localStorage planera
```

### Zadania:
```javascript
loadTasksFromFirebase()             // Z Firebase
importTasksFromMainApp()            // Z localStorage lub plik
mapPlannerTasks(plannerState)       // Mapowanie struktury
filterTasksForEmployee(tasks, id)   // Filtrowanie dla pracownika
```

### Zapis:
```javascript
saveTasks()                         // Do localStorage worker-app
localStorage.setItem('worker-tasks', JSON.stringify(tasks))
```

---

## 🔍 DEBUGOWANIE

### W konsoli przeglądarki (F12):
```javascript
// Sprawdź dane planera
JSON.parse(localStorage.getItem('door_v5627_state'))

// Sprawdź pracowników
JSON.parse(localStorage.getItem('planner-state'))?.employees

// Sprawdź zadania worker-app
JSON.parse(localStorage.getItem('worker-tasks'))

// Sprawdź zalogowanego pracownika
localStorage.getItem('worker-current-employee-id')

// Wyczyść dane worker-app
localStorage.removeItem('worker-tasks')
localStorage.removeItem('worker-current-employee-id')
```

### Logi w konsoli:
```
✅ Załadowano X pracowników
✅ Załadowano X zadań
✅ Wybrano pracownika: Jan Kowalski
📥 Załadowano X zadań z planera
🚪 Pracownik wylogowany
```

---

## ⚠️ NAJCZĘSTSZE PROBLEMY

### Problem 1: Lista pracowników pusta na telefonie
**Przyczyna:** localStorage nie jest współdzielony  
**Rozwiązanie:** 
- Skonfiguruj Firebase
- Lub wyślij plik JSON z danymi

### Problem 2: Brak zadań po imporcie
**Przyczyna:** Zadania nie są przypisane do pracownika  
**Rozwiązanie:**
- W planerze przypisz zadania do pracownika
- Sprawdź pole `employeeId` lub `assignees`

### Problem 3: Stare dane po aktualizacji
**Przyczyna:** Cache w przeglądarce  
**Rozwiązanie:**
- CTRL+SHIFT+R (wymuszony reload)
- Wyczyść cache przeglądarki
- Otwórz worker-app-v2.html (nowa wersja)

### Problem 4: "Importuj zadania" nie działa
**Przyczyna:** Brak danych w localStorage planera  
**Rozwiązanie:**
- Otwórz planer (index.html) najpierw
- Stwórz kilka zadań
- Przypisz do pracownika
- Wróć do worker-app i importuj

---

## 📋 CHECKLIST - KONFIGURACJA NA NOWYM TELEFONIE

- [ ] 1. Wyślij plik `worker-app-v2.html` na telefon
- [ ] 2. Pobierz i otwórz w przeglądarce
- [ ] 3. Sprawdź czy lista pracowników się załadowała (Firebase)
- [ ] 4. Jeśli pusta - wyeksportuj JSON z planera
- [ ] 5. Wyślij JSON na telefon
- [ ] 6. W worker-app: "Importuj zadania" → wybierz JSON
- [ ] 7. Wybierz pracownika z listy
- [ ] 8. Sprawdź czy zadania się załadowały
- [ ] 9. Dodaj do ekranu głównego (dla łatwego dostępu)
- [ ] 10. Testuj: zaznacz zadanie, sprawdź zapis

---

## 🔗 POWIĄZANE PLIKI

### Główne pliki aplikacji:
- `worker-app.html` - Oryginalna wersja
- `worker-app-v2.html` - Nowa wersja z wylogowaniem (v2.0)
- `worker-app-TELEFON.html` - Kopia na Pulpicie do wysłania

### Pliki konfiguracyjne:
- `js/firebase.js` - Konfiguracja Firebase (jeśli osobny plik)
- `index.html` - Główny planer (źródło danych)

### Dokumentacja:
- `README.md` - Ogólna dokumentacja projektu
- `DOKUMENTACJA_WORKER_APP.md` - Ten plik

---

## 📞 KONTAKT / SUPPORT

W razie problemów sprawdź:
1. Konsolę przeglądarki (F12) → szukaj błędów
2. localStorage (F12 → Application → Local Storage)
3. Ten dokument (sekcja Debugowanie)

---

## 🎯 PODSUMOWANIE

**Worker-app pobiera dane w kolejności:**
1. 🔥 **Firebase** (online, automatycznie)
2. 💾 **localStorage planera** (ten sam komputer/przeglądarka)
3. 📥 **Import ręczny** (przycisk lub plik JSON)

**Kluczowe punkty:**
- ✅ Firebase działa globalnie (wymaga internetu)
- ✅ localStorage działa lokalnie (per urządzenie)
- ✅ Import ręczny działa zawsze (backup)
- ❌ Telefon NIE widzi localStorage komputera
- ❌ Bez Firebase i bez importu → brak danych

**Najlepsza praktyka:**
- Skonfiguruj Firebase → automatyczna synchronizacja
- Lub regularnie eksportuj JSON → import na telefonie

---

**Koniec dokumentacji**  
*Wygenerowano automatycznie przez GitHub Copilot*  
*Data: 1 listopada 2025*
