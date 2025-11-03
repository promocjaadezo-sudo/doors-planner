# 📦 Katalog `state/` - Centralny Magazyn Stanu

## 📋 Zawartość

| Plik | Opis | Linie | Status |
|------|------|-------|--------|
| **CentralnyMagazynStanu.js** | Główny moduł zarządzania stanem | 234 | ✅ Aktywny |
| **integration.js** | Integracja z procesami biznesowymi | 530 | ✅ Aktywny |
| **production-monitor.js** | Monitoring produkcyjny | 450 | ✅ Aktywny |
| **tests/unit-tests.js** | Testy jednostkowe (31 testów) | 590 | ✅ 100% pass |

---

## 🚀 Szybki Start

### Uruchomienie Aplikacji
```bash
# W VS Code: Open with Live Server
# Lub:
python -m http.server 5500
```

Otwórz: `http://localhost:5500/index.html`

### Dashboard Monitoringu
Otwórz w nowej karcie:
```
http://localhost:5500/production-dashboard.html
```

---

## 🔧 Moduły

### 1. CentralnyMagazynStanu.js
**Główny moduł zarządzania historią stanu aplikacji**

**API:**
```javascript
const magazyn = CentralnyMagazynStanu.getInstance();

// Dodawanie wpisu do historii
magazyn.dodajDoHistorii('TYP_OPERACJI', { dane: 'wartość' });

// Pobieranie historii
const historia = magazyn.pobierzHistorie();

// Pobieranie aktualnego stanu
const stan = magazyn.pobierzStan();

// Export do JSON
const json = magazyn.exportujDoJSON();

// Import z JSON
magazyn.importujZJSON(json);

// Reset stanu
magazyn.resetujStan();

// Ustawienie sesji
magazyn.ustawSesje('session_123');

// Ustawienie statusu
magazyn.ustawStatus('aktywny', { info: 'działa' });
```

**Funkcje:**
- ✅ Singleton pattern (jedna instancja w aplikacji)
- ✅ Historia operacji (limit 1000 wpisów)
- ✅ Automatyczne timestampy
- ✅ Deep copy danych (immutability)
- ✅ Walidacja JSON (przy import/export)
- ✅ Error handling (try-catch, validacje)
- ✅ Session tracking
- ✅ Status tracking

---

### 2. integration.js
**Integracja magazynu z procesami biznesowymi**

**Auto-Init:** ✅ Uruchamia się automatycznie przy ładowaniu `index.html`

**Funkcje:**
- ✅ Wrapping funkcji `save()` - automatyczne logowanie zapisów stanu
- ✅ Wrapping funkcji `saveTaskToDB()` - tracking zadań produkcyjnych
- ✅ Obserwatory zmian danych (`state.orders`, `state.tasks`, `state.employees`)
- ✅ Error tracking (globalne błędy, odrzucone Promise)
- ✅ Performance tracking (pamięć RAM)
- ✅ Session tracking (start/koniec sesji)
- ✅ Form tracking (wysłanie formularzy)
- ✅ User action tracking (kliknięcia - throttled)

**API:**
```javascript
// Statystyki integracji
console.log(window.magazynIntegration.getStats());
// {
//   total_entries: 520,
//   session_id: 'session_1673521234567',
//   status: { aktywny: true, ... }
// }

// Eksport historii
const json = window.magazynIntegration.exportHistory();

// Czyszczenie historii
window.magazynIntegration.clearHistory();

// Konfiguracja
console.log(window.magazynIntegration.config);
```

**Konfiguracja:**
```javascript
const CONFIG = {
  enableAutoTracking: true,        // Automatyczne śledzenie
  trackFormSubmits: true,          // Tracking formularzy
  trackDataChanges: true,          // Tracking zmian danych
  trackErrors: true,               // Tracking błędów
  trackPerformance: true,          // Tracking wydajności
  maxHistorySize: 1000,            // Limit historii
  persistToLocalStorage: true,    // Zapis do localStorage
  enableConsoleLogging: true       // Logi w konsoli
};
```

---

### 3. production-monitor.js
**Ciągły monitoring produkcyjny aplikacji**

**Auto-Init:** ✅ Uruchamia się automatycznie przy ładowaniu `index.html`

**Interwały:**
- Health Check: co 1 minutę
- Metryki: co 30 sekund
- Snapshot: co 5 minut

**Funkcje:**
- ✅ Health checks (state, localStorage, pamięć)
- ✅ Zbieranie metryk (Performance API, Resource Timing)
- ✅ Snapshoty pełnego stanu
- ✅ Tracking akcji użytkownika
- ✅ Monitorowanie progów ostrzeżeń

**API:**
```javascript
// Statystyki monitoringu
console.log(window.productionMonitor.getStats());
// {
//   uptime_seconds: 3600,
//   checks: 60,
//   errors: 0,
//   warnings: 2,
//   last_snapshot: {...}
// }

// Ręczny health check
window.productionMonitor.healthCheck();

// Ręczny snapshot
window.productionMonitor.takeSnapshot();

// Tracking własnej operacji
const startTime = performance.now();
// ... operacja ...
window.productionMonitor.trackOperation('nazwa-operacji', startTime);

// Stop monitoringu
window.productionMonitor.stop();
```

**Progi Ostrzeżeń:**
```javascript
const MONITOR_CONFIG = {
  thresholds: {
    memory_warning_mb: 100,       // Ostrzeżenie
    memory_critical_mb: 200,      // Krytyczne
    response_time_warning_ms: 1000,   // Wolna operacja
    response_time_critical_ms: 3000   // Bardzo wolna
  }
};
```

---

## 📊 Monitorowane Wydarzenia

### System
- `INTEGRATION_INIT` - inicjalizacja integracji
- `SYSTEM_SAVE` - zapis stanu aplikacji
- `SYSTEM_ERROR` - błąd zapisu stanu
- `MONITOR_START` - start monitoringu
- `MONITOR_STOP` - stop monitoringu

### Zadania
- `TASK_SAVE_START` - rozpoczęcie zapisu zadania
- `TASK_SAVED` - sukces zapisu zadania
- `TASK_SAVE_ERROR` - błąd zapisu zadania

### Dane
- `DATA_CHANGE` - zmiana w tablicy danych

### Monitoring
- `HEALTH_CHECK` - sprawdzenie stanu aplikacji
- `METRICS_COLLECTED` - zebranie metryk
- `DATA_SNAPSHOT` - snapshot stanu
- `PERFORMANCE_CHECK` - sprawdzenie pamięci
- `OPERATION_TIMING` - czas operacji

### Błędy
- `GLOBAL_ERROR` - nieobsłużony błąd JS
- `PROMISE_REJECTION` - odrzucone Promise
- `HEALTH_CHECK_ERROR` - błąd health check

### Użytkownik
- `SESSION_START` - start sesji
- `SESSION_END` - koniec sesji
- `USER_CLICK` - kliknięcie (throttled)
- `NAVIGATION` - zmiana strony
- `FORM_SUBMIT` - wysłanie formularza

---

## 🧪 Testy

### Uruchomienie Testów
```bash
npm run test:unit
```

### Statystyki Testów
- **Total Tests:** 31
- **Pass Rate:** 100%
- **Execution Time:** ~388ms
- **Categories:** 8
- **Code Coverage:** 100%

### Kategorie Testów
1. Initialization (3 testy)
2. Adding Entries (3 testy)
3. Timestamps (4 testy)
4. History Limiting (3 testy)
5. Immutability (3 testy)
6. JSON Validation (6 testów)
7. Error Handling (4 testy)
8. Other Methods (5 testów)

---

## 📖 Dokumentacja

### Główne Pliki
- **INTEGRACJA_PRODUKCYJNA.md** - Instrukcja użycia w produkcji
- **STATE_TESTS_README.md** - Dokumentacja testów
- **RAPORT_KONCOWY_TESTY.md** - Raport z testów
- **RAPORT_INTEGRACJI_PRODUKCYJNEJ.md** - Raport końcowy integracji

### Dashboardy
- **production-dashboard.html** - Monitoring w czasie rzeczywistym
- **verify-production.html** - Weryfikacja środowiska

---

## 🔍 Przykłady Użycia

### 1. Ręczne Dodanie Wpisu
```javascript
window.centralnyMagazyn.dodajDoHistorii('CUSTOM_EVENT', {
  action: 'user_login',
  user_id: '123',
  timestamp: Date.now()
});
```

### 2. Analiza Historii
```javascript
const historia = window.centralnyMagazyn.pobierzHistorie();

// Wszystkie zapisy stanu
const saves = historia.filter(h => h.typ === 'SYSTEM_SAVE');
console.log('Zapisów:', saves.length);

// Średni czas save()
const avgTime = saves.reduce((sum, s) => sum + s.dane.czas_ms, 0) / saves.length;
console.log('Średni czas:', avgTime, 'ms');

// Wszystkie błędy
const errors = historia.filter(h => h.typ.includes('ERROR'));
console.log('Błędów:', errors.length);
```

### 3. Eksport i Import
```javascript
// Eksport
const json = window.centralnyMagazyn.exportujDoJSON();
localStorage.setItem('backup', json);

// Import
const backup = localStorage.getItem('backup');
window.centralnyMagazyn.importujZJSON(backup);
```

### 4. Tracking Własnej Operacji
```javascript
const startTime = performance.now();

// Twoja operacja
for (let i = 0; i < 1000000; i++) {
  // ...
}

// Log do magazynu
window.centralnyMagazyn.dodajDoHistorii('MY_OPERATION', {
  duration_ms: Math.round(performance.now() - startTime),
  iterations: 1000000
});
```

---

## 🛠️ Rozwiązywanie Problemów

### Problem: Magazyn nie działa

**Sprawdź:**
```javascript
console.log('Magazyn:', !!window.centralnyMagazyn);
console.log('Integration:', !!window.magazynIntegration);
console.log('Monitor:', !!window.productionMonitor);
```

**Powinno zwrócić:** `true` dla wszystkich

### Problem: Historia jest pusta

**Sprawdź:**
```javascript
const historia = window.centralnyMagazyn.pobierzHistorie();
console.log('Historia:', historia.length);

// Dodaj testowy wpis
window.centralnyMagazyn.dodajDoHistorii('TEST', { test: true });

// Sprawdź ponownie
console.log('Po teście:', window.centralnyMagazyn.pobierzHistorie().length);
```

### Problem: Dashboard nie działa

**Wymagania:**
1. Dashboard musi być otwarty w **nowej karcie** (nie w nowym oknie)
2. Główna aplikacja (`index.html`) musi być aktywna
3. Korzysta z `window.opener.centralnyMagazyn`

**Sprawdź:**
- Czy dashboard został otwarty z index.html?
- Czy w konsoli są błędy?
- Czy w alertach jest komunikat "Magazyn niedostępny"?

### Problem: Wolne operacje

**Analiza:**
```javascript
const historia = window.centralnyMagazyn.pobierzHistorie();
const saves = historia.filter(h => h.typ === 'SYSTEM_SAVE');

// Najwolniejsze operacje
const slowest = saves
  .sort((a, b) => b.dane.czas_ms - a.dane.czas_ms)
  .slice(0, 10);

console.log('Top 10 najwolniejszych:', slowest);
```

---

## 📈 Best Practices

### 1. Regularny Monitoring
- Sprawdzaj dashboard codziennie
- Analizuj trendy wydajności
- Reaguj na ostrzeżenia

### 2. Backup Historii
```javascript
// Co tydzień
const backup = window.centralnyMagazyn.exportujDoJSON();
localStorage.setItem('magazyn_backup_' + Date.now(), backup);
```

### 3. Czyszczenie Starych Danych
```javascript
// Co miesiąc
const backup = window.centralnyMagazyn.exportujDoJSON();
// Zapisz backup
window.magazynIntegration.clearHistory();
```

### 4. Custom Tracking
```javascript
// Dodawaj własne eventy dla kluczowych operacji
window.centralnyMagazyn.dodajDoHistorii('BUSINESS_EVENT', {
  type: 'order_completed',
  order_id: '123',
  value: 5000
});
```

---

## 🎯 Kryteria Sukcesu

| Kryterium | Status |
|-----------|--------|
| Moduły załadowane | ✅ |
| Funkcje opakowane | ✅ |
| Health checks działają | ✅ |
| Metryki zbierane | ✅ |
| Snapshoty tworzone | ✅ |
| Error tracking | ✅ |
| Dashboard działa | ✅ |
| Testy 100% pass | ✅ |
| Dokumentacja kompletna | ✅ |

**Status:** ✅ **PRODUKCJA AKTYWNA**

---

## 📞 Support

W razie problemów:

1. Sprawdź dokumentację w `INTEGRACJA_PRODUKCYJNA.md`
2. Uruchom diagnostykę w konsoli
3. Sprawdź dashboard monitoringu
4. Wyeksportuj historię do analizy

---

**Wersja:** 1.0.0  
**Status:** ✅ Produkcja Aktywna  
**Ostatnia aktualizacja:** 2025-01-12
