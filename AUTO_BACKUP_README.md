# System Automatycznych Backupów

## Jak uruchomić:

1. Otwórz PowerShell w folderze aplikacji:
   ```powershell
   cd C:\Users\KOMPUTER\Desktop\aplikacja\1
   ```

2. Uruchom skrypt:
   ```powershell
   node auto-backup.js
   ```

3. Zostaw terminal otwarty - będzie działał w tle

## Co robi:

✅ Automatycznie wykrywa zmiany w `index.html`
✅ Czeka 2 sekundy po ostatniej zmianie (żeby nie zapisywać przy każdym znaku)
✅ Zapisuje backupy do folderu `backups/auto/`
✅ Nazwy plików zawierają datę i czas (np. `index_2025-11-08_15-30-45.html`)
✅ Tworzy pliki `.json` z metadanymi (data, rozmiar, hash)
✅ Automatycznie usuwa stare backupy (zostaje ostatnie 50)

## Przykład działania:

```
👁️  Obserwuję plik: index.html
📁 Backupy zapisywane do: backups/auto
⏱️  Debounce: 2000ms

🚀 System backupów uruchomiony!
✅ Zapisano backup: backups/auto/index_2025-11-08_15-30-45.html
   Rozmiar: 345.67 KB

📝 Wykryto zmianę w pliku...
✅ Zapisano backup: backups/auto/index_2025-11-08_15-32-10.html
   Rozmiar: 346.12 KB
```

## Zatrzymanie:

Naciśnij `Ctrl+C` w terminalu

## Przywracanie z backupu:

```powershell
# Zobacz listę backupów
dir backups\auto\*.html

# Przywróć konkretny backup
copy backups\auto\index_2025-11-08_15-30-45.html index.html
```

## Dane aplikacji:

- **Dane użytkowników** → Firebase (automatycznie)
- **Kod aplikacji** → Folder `backups/auto/` (ten skrypt)
