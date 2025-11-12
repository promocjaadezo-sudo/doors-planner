# Synchronizacja planera do `planer_6.0.0`

Skrypt `scripts/sync-planer-6.0.0.ps1` automatyzuje kopiowanie aktualnej wersji aplikacji planera
do katalogu `planer_6.0.0`. Dzięki temu snapshot, który publikujemy w GitHub Pages,
można zaktualizować jednym poleceniem.

## Jak używać

1. Upewnij się, że repozytorium jest czyste (`git status`).
2. Uruchom synchronizację:
   ```powershell
   npm run sync:planer
   ```
   Domyślnie skrypt skopiuje:
   - pliki `index.html`, `worker-app.html`, `worker-app-v2.html`, `firestore.rules`,
     `firebase-credentials.sample.json`, `production-dashboard.html`,
     `verify-production.html`, `verify-production.js`
   - katalogi `js/` i `state/`
3. Po zakończeniu sprawdź różnice w `planer_6.0.0`:
   ```powershell
   git -C planer_6.0.0 status
   ```
4. Jeśli wszystko wygląda dobrze, wykonaj commit/push w submodule
   (np. na gałąź `planer_6.0.0`) oraz zaktualizuj wskaźnik w nadrzędnym repozytorium.

## Parametry opcjonalne

Skrypt akceptuje parametry PowerShell, dzięki którym możesz rozszerzyć listę kopiowanych elementów:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-planer-6.0.0.ps1 \
    -DirectoriesToMirror @('js','state','scripts') \
    -FilesToCopy @('index.html','worker-app.html','verify-production.html')
```

Dodatkowo parametr `ExcludedSubdirectories` pozwala pominąć katalogi podczas synchronizacji
(np. `node_modules`, `backups`).

## Uwagi

- Skrypt używa `robocopy` do synchronizacji katalogów, dzięki czemu usuwa pliki, które zostały
  usunięte ze źródła. Jeśli nie chcesz usuwać plików w `planer_6.0.0`, usuń przełącznik `/MIR`
  z definicji w skrypcie.
- Po każdej synchronizacji pamiętaj, że `planer_6.0.0` jest osobnym repozytorium (submodule).
  Zmiany trzeba w nim zatwierdzić i wypchnąć niezależnie od głównego repozytorium.
- W logach skryptu zobaczysz listę pominiętych plików/katalogów. To normalne, jeśli świadomie
  usuwasz coś z listy.
