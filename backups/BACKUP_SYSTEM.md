# System automatycznych backupów - Dokumentacja

## ✅ Status: WDROŻONY

Data wdrożenia: 2025-01-01

## 🎯 Opis systemu

System automatycznych backupów został w pełni zintegrowany z aplikacją doors-planner. Backupy są tworzone automatycznie przed każdym zapisem stanu aplikacji, zapewniając pełną ochronę danych.

## 📦 Komponenty

### 1. BackupManager (`js/backup-manager.js`)
Moduł odpowiedzialny za zarządzanie backupami:
- Automatyczne tworzenie backupów przed zapisem
- Przechowywanie maksymalnie 5 automatycznych backupów
- Automatyczne czyszczenie najstarszych backupów
- Eksport/import backupów
- Przywracanie danych z backupu

### 2. Integracja z store.js
Funkcja `saveState()` automatycznie wywołuje `BackupManager.create('auto-before-save')` przed każdym zapisem.

### 3. UI backupów (index.html)
Panel backupów w sekcji "Ustawienia" z przyciskami:
- **🔄 Utwórz backup** - Tworzenie ręcznego backupu
- **💾 Eksportuj dane** - Eksport danych do pliku JSON
- **📂 Importuj dane** - Import danych z pliku JSON
- **🔄 Odśwież listę** - Odświeżenie listy backupów
- **🧹 Wyczyść stare** - Usunięcie starych backupów

## 🚀 Jak używać

### Automatyczne backupy
System działa automatycznie - nie wymaga żadnej konfiguracji!
- Backup jest tworzony przed każdym zapisem
- Maksymalnie 5 automatycznych backupów
- Najstarsze backupy są usuwane automatycznie

### Ręczne backupy
1. Przejdź do zakładki "Ustawienia" → sekcja "Backup danych"
2. Kliknij "🔄 Utwórz backup"
3. Opcjonalnie podaj nazwę backupu
4. Backup zostanie utworzony natychmiast

### Przywracanie danych
1. W liście backupów znajdź backup, który chcesz przywrócić
2. Kliknij "🔄 Przywróć"
3. Potwierdź operację
4. **UWAGA**: Obecny stan zostanie automatycznie zapisany jako backup przed przywróceniem!

### Eksport backupu do pliku
1. W liście backupów kliknij "💾 Eksport" przy wybranym backupie
2. Plik JSON zostanie automatycznie pobrany

### Czyszczenie starych backupów
1. Kliknij "🧹 Wyczyść stare"
2. System usunie najstarsze backupy (zachowując maksymalnie 5)

## 📊 Format backupu

Każdy backup zawiera:
```json
{
  "id": "backup_1234567890123",
  "timestamp": 1234567890123,
  "date": "2025-01-01T12:00:00.000Z",
  "reason": "auto-before-save",
  "stateKey": "door_v50_state",
  "data": { /* pełny stan aplikacji */ },
  "compressed": false,
  "version": "5.6.27"
}
```

## 🔧 Konfiguracja

### Zmiana liczby automatycznych backupów
W pliku `js/backup-manager.js` zmień wartość:
```javascript
const MAX_AUTO_BACKUPS = 5; // Domyślnie 5
```

### Klucz przechowywania w localStorage
Backupy są przechowywane pod kluczem `door_backup_*` w localStorage przeglądarki.

## ⚠️ Ważne informacje

1. **Backupy są przechowywane lokalnie** w przeglądarce (localStorage)
2. **Czyszczenie danych przeglądarki usunie wszystkie backupy**
3. **Zalecamy regularne eksportowanie ważnych backupów do plików**
4. **Backup przed przywróceniem** - system automatycznie tworzy backup obecnego stanu przed każdym przywróceniem
5. **Limit rozmiaru** - localStorage ma limit ~10MB, w przypadku przekroczenia najstarsze backupy zostaną usunięte

## 🧪 Testowanie

### Test 1: Automatyczny backup przy zapisie
1. Zmień cokolwiek w aplikacji (np. dodaj pracownika)
2. System automatycznie zapisze
3. Sprawdź listę backupów - powinien pojawić się nowy backup z powodem "auto-before-save"

### Test 2: Ręczne tworzenie backupu
1. Kliknij "🔄 Utwórz backup"
2. Podaj nazwę (np. "Test manualny")
3. Sprawdź listę - backup powinien się pojawić

### Test 3: Przywracanie z backupu
1. Zmień coś w aplikacji
2. Przywróć starszy backup
3. Zmiany powinny zniknąć
4. Sprawdź listę backupów - powinien pojawić się backup "pre-restore"

### Test 4: Eksport backupu
1. Kliknij "💾 Eksport" przy dowolnym backupie
2. Plik JSON powinien zostać pobrany
3. Otwórz plik - sprawdź czy zawiera pełne dane

## 🐛 Rozwiązywanie problemów

### Backup się nie tworzy
- Sprawdź konsolę przeglądarki (F12) - mogą być błędy
- Sprawdź czy localStorage nie jest pełny
- Sprawdź czy BackupManager jest załadowany: `console.log(window.BackupManager)`

### Lista backupów jest pusta
- Sprawdź localStorage: `localStorage.getItem('door_backup_list')`
- Sprawdź czy są klucze `door_backup_*`: Devtools → Application → Local Storage

### Przywracanie nie działa
- Sprawdź konsolę przeglądarki
- Sprawdź czy backup zawiera dane: kliknij Eksport i otwórz plik

## 📝 Historia zmian

### v1.0 (2025-01-01)
- ✅ Utworzenie modułu BackupManager
- ✅ Integracja z store.js
- ✅ Automatyczne backupy przed zapisem
- ✅ UI dla zarządzania backupami
- ✅ Funkcje eksport/import/przywracanie
- ✅ Automatyczne czyszczenie starych backupów
- ✅ Kompatybilność wsteczna ze starym systemem

## 🎓 Kolejne kroki

System backupów jest w pełni funkcjonalny. Następne zadania według planu:
1. ✅ **System backupów** - UKOŃCZONE
2. ⏳ Ekstrakcja logiki zamówień do `js/orders.js`
3. ⏳ Ekstrakcja logiki zadań do `js/tasks.js`
4. ⏳ Ekstrakcja logiki magazynu do `js/warehouse.js`
5. ⏳ Rozszerzenie testów Playwright
6. ⏳ Dokumentacja użytkownika (README.md)
