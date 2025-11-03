# 🔐 Naprawa uprawnień Firebase - Brak dostępu do Firestore

## Problem
```
❌ Błąd zapisu do Firebase: Missing or insufficient permissions.
⚠️ tasks onSnapshot error Missing or insufficient permissions.
```

## Przyczyna
Reguły bezpieczeństwa Firestore **blokują dostęp** dla użytkowników anonimowych.

---

## Rozwiązanie - Konfiguracja reguł Firestore

### **1. Otwórz Firebase Console**
1. Przejdź do: https://console.firebase.google.com/
2. Wybierz swój projekt
3. Menu → **Firestore Database**
4. Zakładka **Reguły** (Rules)

---

### **2. Obecne reguły (BŁĘDNE - blokują dostęp)**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // ❌ BLOKUJE WSZYSTKO
    }
  }
}
```

---

### **3. Poprawne reguły (umożliwiają dostęp anonimowy)**

#### **Opcja A: Pełny dostęp dla zalogowanych (w tym anonimowych)**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Dostęp tylko dla zalogowanych użytkowników (w tym anonimowych)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### **Opcja B: Dostęp tylko do własnych dokumentów** (zalecane dla produkcji)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Każdy użytkownik ma dostęp tylko do swoich danych
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Wspólne kolekcje (orders, tasks, employees) - dostęp dla wszystkich zalogowanych
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /employees/{employeeId} {
      allow read, write: if request.auth != null;
    }
    match /state/{stateId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### **Opcja C: Tryb testowy (TYLKO na czas testów - 30 dni)**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 1); // ⚠️ Wygasa 1 grudnia 2025
    }
  }
}
```

---

### **4. Zastosuj reguły**
1. Skopiuj wybraną wersję reguł (zalecam **Opcję B**)
2. Wklej do edytora reguł w Firebase Console
3. Kliknij **Opublikuj** (Publish)

---

### **5. Zweryfikuj w aplikacji**
1. Odśwież aplikację (F5)
2. Sprawdź konsolę - błędy uprawnień powinny zniknąć
3. Sprawdź logi DevLog - powinna pojawić się informacja o pomyślnym połączeniu

---

## Weryfikacja działania

### **Prawidłowe logi po naprawie:**
```
[INFO] ✅ INIT: Połączono z Firebase! UID: nlprA11XcQfJ4cOEENtcp261kNz1
[INFO] 📥 INIT: Ładuję dane z Firebase...
[INFO] ✅ Zapisano do Firebase z timestamp: 2.11.2025, 21:25:21
[INFO] 🔄 INIT: Kolejka synchronizacji włączona
```

### **Brak błędów:**
- ❌ `Missing or insufficient permissions` - **nie powinno się pojawić**
- ❌ `tasks onSnapshot error` - **nie powinno się pojawić**

---

## Dodatkowe wskazówki

### **Jeśli problem się utrzymuje:**
1. Wyczyść cache przeglądarki (Ctrl+Shift+Delete)
2. Sprawdź czy UID w logach jest ten sam co w Firebase Console (Authentication)
3. Sprawdź czy kolekcje `orders`, `tasks`, `employees`, `state` istnieją w Firestore
4. Upewnij się że logowanie anonimowe jest włączone w Authentication → Sign-in method

### **Bezpieczeństwo produkcyjne:**
- **NIE** używaj Opcji C (tryb testowy) w produkcji
- Użyj Opcji B (dostęp do własnych dokumentów)
- Rozważ dodanie walidacji danych w regułach (np. sprawdzanie pól, typów)

---

## Status implementacji
- ✅ Diagnoza problemu
- ⏳ Oczekiwanie na zmianę reguł w Firebase Console
- ⏳ Weryfikacja działania po zmianie reguł
