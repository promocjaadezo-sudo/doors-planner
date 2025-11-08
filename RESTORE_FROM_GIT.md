# 🔄 Instrukcja: Jak Przywrócić Twardą Kopię z Git

## 📌 Twarda Kopia w Git

| Parametr | Wartość |
|----------|---------|
| **Commit ID** | `fb7d1cf` |
| **Commit Message** | BACKUP: Hard copy of current working application state |
| **Data** | Sat Nov 8 19:33:12 2025 +0100 |
| **Lokalizacja** | `backups/2025-11-08_193309_HARD_COPY/` |
| **Pliki** | `index.html`, `planer_6.0.0_index.html` |

---

## 🛠️ Metoda 1: Przywrócić Tylko Pliki Backupu

Jeśli chcesz mieć kopię plików z tamtego momentu:

```powershell
cd c:\Users\KOMPUTER\Desktop\aplikacja\1

# Przywróć pliki backupu z commita fb7d1cf
git checkout fb7d1cf -- backups/2025-11-08_193309_HARD_COPY/

# Weryfikacja - powinno się pojawić
# Updated 2 paths from fb7d1cf
```

---

## 🛠️ Metoda 2: Przywrócić Aplikację do Stanu z fb7d1cf

Jeśli chcesz mieć aplikację w stanie z tamtego backupu:

```powershell
cd c:\Users\KOMPUTER\Desktop\aplikacja\1

# WERSJA 1: Przywróć TYLKO aplikację (zachowaj inne zmiany)
git checkout fb7d1cf -- index.html planer_6.0.0/index.html

# Lub WERSJA 2: Przywróć wszystko z tamtego commita
git reset --hard fb7d1cf

# Jeśli zrobiłeś reset, wróć do najnowszej wersji
git reset --hard HEAD
```

---

## 🛠️ Metoda 3: Porównaj Wersje

Aby zobaczyć różnice między obecną wersją a backupem:

```powershell
# Pokaż różnice w głównym pliku
git diff fb7d1cf -- index.html

# Pokaż różnice w pliku planer
git diff fb7d1cf -- planer_6.0.0/index.html

# Pokaż WSZYSTKIE zmiany od backupu do teraz
git diff fb7d1cf HEAD
```

---

## 🛠️ Metoda 4: Utwórz Nową Gałąź ze Starego Commita

Jeśli chcesz pracować na wersji z backupu bez ryzyka:

```powershell
# Utwórz nową gałąź na bazie backupu
git checkout -b restore-from-backup fb7d1cf

# Teraz pracujesz na starej wersji
# Aby wrócić do bieżącej pracy
git checkout copilot/vscode1762609443284

# Aby scalić zmiany
git merge restore-from-backup
```

---

## 🛠️ Metoda 5: Pobierz Pojedyncze Pliki

Jeśli chcesz tylko wyciągnąć pliki aplikacji z backupu:

```powershell
# Pobierz główny plik aplikacji z backupu
git show fb7d1cf:backups/2025-11-08_193309_HARD_COPY/planer_6.0.0_index.html > temp_planer.html

# Pobierz backup index.html
git show fb7d1cf:backups/2025-11-08_193309_HARD_COPY/index.html > temp_index.html

# Teraz możesz je przejrzeć lub skopiować gdzie trzeba
```

---

## ⚠️ WAŻNE: Różnice Wersji

### Między Backupem (`fb7d1cf`) a TERAZ (`HEAD`):

```powershell
# Przejrzyj co się zmieniło
git log --oneline fb7d1cf..HEAD

# Pokaż
fc94964 DOCS: Current application state summary
a3d0a2d DOCS: Employee sync fix documentation
caa8275 FIX: Allow employees to sync independently from order deletion lock
```

---

## 🔐 Bezpieczne Przywrócenie - Krok po Kroku

**Jeśli boisz się coś zepsuć:**

```powershell
# 1. Utwórz bezpieczną kopię lokalną
Copy-Item "planer_6.0.0\index.html" "planer_6.0.0\index.html.current"
Copy-Item "index.html" "index.html.current"

# 2. Utwórz nową gałąź ze starego commita
git checkout -b safe-restore fb7d1cf

# 3. Pracuj na nowej gałęzi - nic nie ryzykujesz
# ... testuj tutaj...

# 4. Jeśli wszystko OK, scal ze swoją gałęzią
git checkout copilot/vscode1762609443284
git merge safe-restore

# 5. Jeśli coś poszło nie tak, wróć
git reset --hard copilot/vscode1762609443284
```

---

## 📋 Szybkie Komendy

| Operacja | Komenda |
|----------|---------|
| Pokaż co jest w backupie | `git show fb7d1cf --stat` |
| Porównaj z teraz | `git diff fb7d1cf HEAD -- index.html` |
| Przywróć tylko aplikację | `git checkout fb7d1cf -- planer_6.0.0/index.html` |
| Przywróć wszystko | `git reset --hard fb7d1cf` |
| Wróć do teraz | `git reset --hard HEAD` |
| Zobacz zawartość pliku | `git show fb7d1cf:backups/2025-11-08_193309_HARD_COPY/index.html` |

---

## 🎯 Scenariusze

### Scenariusz 1: Chcę Przywrócić Aplikację bo Coś Się Zepsuło

```powershell
cd c:\Users\KOMPUTER\Desktop\aplikacja\1

# Przywróć pliki aplikacji z backupu
git checkout fb7d1cf -- planer_6.0.0/index.html index.html

# Potwierdź
Write-Host "✅ Aplikacja przywrócona z backupu"
```

### Scenariusz 2: Chcę Zobaczyć Różnice

```powershell
# Pokaż wszystko co się zmieniło od backupu
git diff fb7d1cf HEAD

# Lub jeśli chcesz wizualnie
# Użyj VS Code Git Graph albo GitHub Desktop
```

### Scenariusz 3: Chcę Pracować na Starej Wersji bez Ryzyka

```powershell
# Utwórz gałąź z backupu
git checkout -b work-on-backup fb7d1cf

# Teraz pracujesz bezpiecznie na starej wersji
# Zmiany nie wpłyną na main branch
```

### Scenariusz 4: Chcę Wyciągnąć Kod z Backupu

```powershell
# Wyświetl zawartość pliku
git show fb7d1cf:backups/2025-11-08_193309_HARD_COPY/planer_6.0.0_index.html | head -100

# Lub zapisz do pliku tymczasowego
git show fb7d1cf:backups/2025-11-08_193309_HARD_COPY/planer_6.0.0_index.html > planer_from_backup.html
```

---

## ✅ Sprawdzenie

Po przywróceniu, zawsze sprawdź:

```powershell
# 1. Czy pliki się zmienił
git status

# 2. Czy zmiany wyglądają OK
git diff

# 3. Czy zawartość jest taka jaka spodziewasz
Get-Content "planer_6.0.0\index.html" | Select-Object -First 50
```

---

## 🚨 Jeśli Coś Poszło Nie Tak

```powershell
# Wróć do ostatniego commita (anuluj wszystkie zmiany)
git reset --hard HEAD

# Lub wróć do konkretnego commita
git reset --hard fc94964

# Lub zobacz historię aby wybrać punkt przywrócenia
git log --oneline -20
```

---

**Backup został stworzony:** 2025-11-08_193309
**Commit ID:** fb7d1cf
**Branch:** copilot/vscode1762609443284
