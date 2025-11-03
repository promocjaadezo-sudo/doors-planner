# 🔧 INTEGRACJA PRODUKCYJNA - CENTRALNY MAGAZYN STANU

## 📋 Spis Treści
- [Przegląd](#przegląd)
- [Architektura Integracji](#architektura-integracji)
- [Użycie w Aplikacji](#użycie-w-aplikacji)
- [Monitorowane Wydarzenia](#monitorowane-wydarzenia)
- [Dashboard Monitoringu](#dashboard-monitoringu)
- [Analiza Danych](#analiza-danych)
- [Rozwiązywanie Problemów](#rozwiązywanie-problemów)

---

## 🎯 Przegląd

Centralny Magazyn Stanu został w pełni zintegrowany z aplikacją produkcji drzwi. System automatycznie śledzi wszystkie kluczowe operacje biznesowe i zapewnia ciągły monitoring działania aplikacji.

### ✅ Zintegrowane Komponenty

| Komponent | Status | Opis |
|-----------|--------|------|
| **CentralnyMagazynStanu.js** | ✅ Aktywny | Główny moduł zarządzania stanem |
| **integration.js** | ✅ Aktywny | Integracja z procesami biznesowymi |
| **production-monitor.js** | ✅ Aktywny | Monitoring produkcyjny |
| **index.html** | ✅ Zintegrowany | Moduły załadowane w linii 913-923 |

---

## 🏗️ Architektura Integracji

### 1. Punkt Wejścia (index.html)

```html
<!-- Linia 913 -->
<script src="state/CentralnyMagazynStanu.js"></script>

<!-- Linie 916-919: Inicjalizacja -->
<script>
const centralnyMagazyn = CentralnyMagazynStanu.getInstance();
window.centralnyMagazyn = centralnyMagazyn;
</script>

<!-- Linie 921-923: Moduły integracyjne -->
<script src="state/integration.js"></script>
<script src="state/production-monitor.js"></script>
```

### 2. Przepływ Danych

```
Aplikacja (index.html)
    ↓
Operacje Biznesowe (save, saveTaskToDB, etc.)
    ↓
Integration Wrapper (state/integration.js)
    ↓
Centralny Magazyn Stanu
    ↓
Historia + Metryki + Monitoring
```

---

## 💼 Użycie w Aplikacji

### Automatyczne Trackowanie

Wszystkie poniższe operacje są **automatycznie śledzone** bez potrzeby dodatkowego kodu:

#### 1. Zapis Stanu (`save()`)

```javascript
// Oryginalne wywołanie (bez zmian w kodzie)
save();

// Automatycznie rejestrowane:
// - Czas wykonania operacji (ms)
// - Liczba orders, employees, tasks, operations, processes
// - Timestamp operacji
// - Status sukcesu/błędu
```

**Typ wpisu:** `SYSTEM_SAVE`

**Przykładowe dane:**
```json
{
  "typ": "SYSTEM_SAVE",
  "dane": {
    "akcja": "save_state",
    "czas_ms": 45,
    "statystyki": {
      "orders": 12,
      "employees": 8,
      "tasks": 156,
      "operations": 30,
      "processes": 5
    }
  },
  "timestamp": 1673521234567
}
```

#### 2. Zapis Zadania (`saveTaskToDB()`)

```javascript
// Oryginalne wywołanie
await saveTaskToDB(taskId);

// Automatycznie rejestrowane:
// - ID zadania
// - Nazwa zadania (opName)
// - Status zadania
// - ID zamówienia (orderId)
// - Czas wykonania operacji
```

**Typy wpisów:**
- `TASK_SAVE_START` - rozpoczęcie zapisu
- `TASK_SAVED` - sukces zapisu
- `TASK_SAVE_ERROR` - błąd podczas zapisu

#### 3. Zmiany w Danych

System automatycznie wykrywa zmiany w:
- `state.orders` (dodanie/usunięcie zamówień)
- `state.tasks` (dodanie/usunięcie zadań)
- `state.employees` (dodanie/usunięcie pracowników)

**Typ wpisu:** `DATA_CHANGE`

**Przykład:**
```json
{
  "typ": "DATA_CHANGE",
  "dane": {
    "tablica": "orders",
    "operacja": "ADD",
    "rozmiar_przed": 11,
    "rozmiar_po": 12,
    "zmiana": 1
  }
}
```

#### 4. Błędy Globalne

Wszystkie nieobsłużone błędy JavaScript są automatycznie przechwytywane:

**Typy wpisów:**
- `GLOBAL_ERROR` - błędy runtime
- `PROMISE_REJECTION` - odrzucone Promise

#### 5. Wysłanie Formularzy

Każdy submit formularza jest automatycznie rejestrowany:

**Typ wpisu:** `FORM_SUBMIT`

```json
{
  "typ": "FORM_SUBMIT",
  "dane": {
    "formId": "order-form",
    "action": "/api/orders",
    "method": "post"
  }
}
```

#### 6. Kliknięcia Użytkownika

Throttled tracking kliknięć (max 1 co 5s):

**Typ wpisu:** `USER_CLICK`

```json
{
  "typ": "USER_CLICK",
  "dane": {
    "element": "BUTTON",
    "id": "save-btn",
    "class": "btn btn-primary",
    "text": "Zapisz"
  }
}
```

---

## 📊 Monitorowane Wydarzenia

### Health Checks (co 1 minutę)

**Typ wpisu:** `HEALTH_CHECK`

Sprawdzane parametry:
- ✅ Dostępność `window.state`
- ✅ Poprawność struktury danych
- ✅ Dostępność localStorage
- ⚠️ Użycie pamięci RAM
- ⚠️ Rozmiar historii magazynu
- ⏱️ Czas wykonania health check

**Progi ostrzeżeń:**
- `memory_warning_mb: 100` - ostrzeżenie
- `memory_critical_mb: 200` - krytyczne
- `response_time_warning_ms: 1000` - wolna operacja
- `response_time_critical_ms: 3000` - bardzo wolna operacja

### Metryki Wydajności (co 30 sekund)

**Typ wpisu:** `METRICS_COLLECTED`

Zbierane dane:
- Czas ładowania strony
- Czas gotowości DOM
- Liczba załadowanych zasobów
- Średni czas ładowania zasobów
- Statystyki tasków (grupowane po statusie)

### Snapshoty Danych (co 5 minut)

**Typ wpisu:** `DATA_SNAPSHOT`

Pełny obraz stanu aplikacji:
- Liczba wszystkich encji (orders, tasks, employees, etc.)
- Grupowanie tasków po statusie
- Statystyki magazynu (liczba wpisów, rozmiar)
- Statystyki monitoringu (errors, warnings)

---

## 🖥️ Dashboard Monitoringu

### Dostęp do Dashboardu

Otwórz w przeglądarce:
```
http://localhost:5500/production-dashboard.html
```

### Dostępne Widoki

#### 1. Live Stats
- Uptime sesji
- Liczba health checks
- Błędy i ostrzeżenia
- Użycie pamięci

#### 2. Historia Operacji
- Wszystkie wpisy magazynu
- Filtrowanie po typie
- Wyszukiwanie
- Export do JSON/CSV

#### 3. Wykresy Wydajności
- Czas operacji save()
- Użycie pamięci w czasie
- Liczba operacji na minutę

#### 4. Alerty i Problemy
- Krytyczne błędy
- Wolne operacje
- Problemy z pamięcią

---

## 🔍 Analiza Danych

### Dostęp do Historii (Konsola)

```javascript
// Pobierz całą historię
const historia = window.centralnyMagazyn.pobierzHistorie();
console.log('Wszystkie wpisy:', historia);

// Filtruj po typie
const saves = historia.filter(w => w.typ === 'SYSTEM_SAVE');
console.log('Wszystkie zapisy stanu:', saves);

// Oblicz średni czas save()
const avgSaveTime = saves.reduce((sum, s) => sum + s.dane.czas_ms, 0) / saves.length;
console.log('Średni czas save():', avgSaveTime, 'ms');

// Znajdź błędy
const errors = historia.filter(w => w.typ.includes('ERROR'));
console.log('Wszystkie błędy:', errors);

// Export do JSON
const json = window.centralnyMagazyn.exportujDoJSON();
console.log('Export JSON:', json);
```

### API Monitoringu

```javascript
// Sprawdź status monitoringu
console.log(window.productionMonitor.getStats());

// Ręczny health check
window.productionMonitor.healthCheck();

// Ręczny snapshot
window.productionMonitor.takeSnapshot();

// Śledzenie własnej operacji
const startTime = performance.now();
// ... operacja ...
window.productionMonitor.trackOperation('moja-operacja', startTime);
```

### Eksport Danych

```javascript
// Export historii do pliku JSON
const exportData = () => {
  const historia = window.centralnyMagazyn.pobierzHistorie();
  const blob = new Blob([JSON.stringify(historia, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `magazyn-historia-${Date.now()}.json`;
  a.click();
};

exportData();
```

---

## 🛠️ Rozwiązywanie Problemów

### Problem: Magazyn nie śledzi operacji

**Sprawdź:**
1. Czy moduły są załadowane:
   ```javascript
   console.log('Magazyn:', !!window.centralnyMagazyn);
   console.log('Integration:', !!window.magazynIntegration);
   console.log('Monitor:', !!window.productionMonitor);
   ```

2. Czy funkcje są opakowane:
   ```javascript
   console.log('save() wrappowany:', window.save.toString().includes('trackSave'));
   console.log('saveTaskToDB() wrappowany:', window.saveTaskToDB?.toString().includes('trackSaveTask'));
   ```

3. Sprawdź logi w konsoli:
   ```javascript
   // Powinny być wpisy:
   // 🔧 [Magazyn] Inicjalizacja integracji...
   // ✅ Funkcja save() opakowana
   // 🚀 [Monitor] Monitoring aktywny
   ```

### Problem: Historia jest pusta

**Rozwiązanie:**
```javascript
// Sprawdź czy historia jest zapisywana
console.log('Historia:', window.centralnyMagazyn.pobierzHistorie());

// Dodaj testowy wpis
window.centralnyMagazyn.dodajDoHistorii('TEST', { message: 'test' });

// Sprawdź ponownie
console.log('Historia po teście:', window.centralnyMagazyn.pobierzHistorie());
```

### Problem: Wysoki error rate

**Analiza:**
```javascript
// Znajdź wszystkie błędy
const historia = window.centralnyMagazyn.pobierzHistorie();
const errors = historia.filter(w => w.typ.includes('ERROR'));

// Grupuj błędy
const errorGroups = {};
errors.forEach(e => {
  const msg = e.dane.blad || e.dane.message || 'unknown';
  errorGroups[msg] = (errorGroups[msg] || 0) + 1;
});

console.log('Grupy błędów:', errorGroups);
```

### Problem: Wolne operacje

**Analiza:**
```javascript
// Znajdź wolne operacje save()
const historia = window.centralnyMagazyn.pobierzHistorie();
const saves = historia.filter(w => w.typ === 'SYSTEM_SAVE');
const slowSaves = saves.filter(s => s.dane.czas_ms > 1000);

console.log('Wolne zapisy (>1s):', slowSaves);
console.log('Średni czas:', saves.reduce((sum, s) => sum + s.dane.czas_ms, 0) / saves.length, 'ms');
```

---

## 📈 Statystyki Produkcyjne

### Przykładowe Metryki (1 godzina pracy)

| Metryka | Wartość | Status |
|---------|---------|--------|
| **Total Health Checks** | 60 | ✅ OK |
| **Total Errors** | 0 | ✅ OK |
| **Total Warnings** | 2 | ⚠️ Minor |
| **Avg Save Time** | 42ms | ✅ Excellent |
| **Avg Memory Usage** | 87MB | ✅ Good |
| **Total Operations Tracked** | 450+ | ✅ Active |
| **History Size** | 520 entries (45KB) | ✅ Optimal |

---

## 🎯 Best Practices

### 1. Regularne Monitorowanie

Sprawdzaj dashboard co najmniej raz dziennie:
- Czy są nowe błędy?
- Czy wydajność jest stabilna?
- Czy pamięć nie rośnie?

### 2. Eksport Danych

Regularnie eksportuj historię (raz w tygodniu):
```javascript
// Backup historii
const backup = window.centralnyMagazyn.exportujDoJSON();
localStorage.setItem('magazyn_backup_' + Date.now(), backup);
```

### 3. Analiza Trendów

Śledź trendy w czasie:
- Czy operacje nie spowalniają?
- Czy rośnie liczba błędów?
- Czy użytkownicy klikają w odpowiednie miejsca?

### 4. Czyszczenie Historii

Regularnie czyść starą historię (co miesiąc):
```javascript
// Export przed czyszczeniem
const backup = window.centralnyMagazyn.exportujDoJSON();
// Zapisz backup

// Wyczyść
window.magazynIntegration.clearHistory();
```

---

## 🆘 Support

W razie problemów:

1. **Sprawdź logi konsoli** (`Ctrl+Shift+J` / `F12`)
2. **Uruchom diagnostykę:**
   ```javascript
   console.log(window.magazynIntegration.getStats());
   console.log(window.productionMonitor.getStats());
   ```
3. **Wyeksportuj dane:**
   ```javascript
   const data = window.centralnyMagazyn.exportujDoJSON();
   console.log('Export:', data);
   ```

---

## 📝 Changelog

### v1.0.0 (2025-01-12)
- ✅ Pełna integracja z procesami biznesowymi
- ✅ Automatyczne trackowanie operacji save() i saveTaskToDB()
- ✅ Health checks i metryki wydajności
- ✅ Snapshoty danych co 5 minut
- ✅ Error tracking i performance monitoring
- ✅ User action tracking (clicks, forms)
- ✅ Session tracking (start/end)
- ✅ Dashboard monitoringu

---

**Dokument zaktualizowany:** 2025-01-12  
**Status integracji:** ✅ Produkcja Aktywna  
**Wersja modułu:** 1.0.0
