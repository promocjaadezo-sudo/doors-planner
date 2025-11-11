# Planer 6.0.0 – szybka checklista regresji

Poniższe kroki pomagają wychwycić większość regresji przed wypchnięciem zmian.

## 1. Kopia bezpieczeństwa
- Uruchom `powershell -File scripts/create-backup.ps1` (lub podaj własną ścieżkę), aby zapisać aktualny stan.

## 2. Weryfikacja interfejsu
1. **Zadania / filtr zleceń** – wybierz konkretne zlecenie w `#tasks-filter-order`, sprawdź czy lista zawiera tylko zadania tego zlecenia oraz widoczne są nazwiska brygady.
2. **Grupowanie zadań** – ustaw `Grupuj wg zlecenia`, rozwiń i zwiń grupy, upewnij się, że strzałka i karty reagują poprawnie.
3. **Montaż (zakładka After)** – potwierdź, że przypisani pracownicy i godziny montażu wyświetlają się poprawnie.
4. **Lista zleceń** – odśwież stronę i sprawdź, że dane z Firebase/localStorage ładują się bez duplikatów.

## 3. Testy automatyczne
- `npm test` – jeśli istnieją testy jednostkowe.
- `npx playwright test` – uruchomienie testów E2E (można dodać tag/grep aby ograniczyć czas).

## 4. Logi i sieć
- Otwórz konsolę (F12 → Console) i upewnij się, że nie ma błędów JS podczas powyższych kroków.
- (Opcjonalnie) W zakładce Network sprawdź, że zapisy/odczyty do Firebase kończą się powodzeniem.

## 5. Przed push
- Przejrzyj zmiany `git status` / `git diff` – upewnij się, że w PR trafiają tylko zamierzone pliki.
- Rozważ `git commit --no-verify` tylko jeśli testy są uruchomione ręcznie i udokumentowane.

> Notatka: zaktualizuj checklistę, gdy dojdzie nowe krytyczne zachowanie wymagające rutynowego sprawdzenia.
