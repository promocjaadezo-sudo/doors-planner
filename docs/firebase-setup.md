# Krok 1 – konfiguracja Firebase dla Doors Planner

Ten dokument prowadzi przez cały krok „Skonfiguruj Firebase” z instrukcji głównej. Po wykonaniu wszystkich punktów aplikacja i agenci będą gotowi do korzystania z danych w chmurze.

## 1. Utwórz klucz serwisowy i plik `firebase-credentials.json`

1. Zaloguj się na [https://console.firebase.google.com](https://console.firebase.google.com) i wybierz projekt.
2. Przejdź do **Project settings → Service accounts**.
3. Kliknij **Generate new private key**.
4. Zapisz pobrany plik jako `firebase-credentials.json` w katalogu repozytorium (`C:\Users\KOMPUTER\Desktop\aplikacja\1\`).
5. (Opcjonalnie) zachowaj kopię zapasową pliku poza repozytorium – zawiera wrażliwe dane.

> 🔐 **Uwaga:** W repozytorium znajduje się plik `firebase-credentials.sample.json`, który pokazuje oczekiwany format. Nie commituj prawdziwego klucza.

## 2. Przygotuj konfigurację `.env` dla agentów

1. Skopiuj plik `ai-agents/.env.sample` do `ai-agents/.env`.
2. Uzupełnij wartości:
   - `OPENAI_API_KEY` – potrzebny tylko, jeśli chcesz uruchomić monitoring agentów z dostępem do OpenAI.
   - `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_USER_ID` – wartości identyczne jak w aplikacji webowej (patrz panel Settings).
   - `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_MEASUREMENT_ID` – dane z karty **General → Your apps** w konsoli Firebase.
   - `FIREBASE_CREDENTIALS_PATH` – domyślnie `../firebase-credentials.json`.

## 3. Uzupełnij konfigurację w aplikacji (panel Settings)

1. Uruchom serwer plików i otwórz `http://localhost:8001/index.html`.
2. Przejdź do zakładki **Settings**.
3. Wprowadź:
   - `Storage mode`: `firebase`.
   - `App ID` – np. `doors-planner` lub środowisko docelowe.
   - `User ID` – np. `hala-1` (identyfikator przestrzeni roboczej).
   - `Firebase config JSON` – wklej blok konfiguracyjny z konsoli Firebase (pole „Config” w zakładce „General → Your apps”).
4. Zapisz ustawienia i wykonaj przyciski **Test & Connect**, **Save to DB**, **Load from DB**, aby upewnić się, że połączenie działa.

## 4. Szybki test agentów

Po uzupełnieniu `firebase-credentials.json` i `ai-agents/.env` możesz uruchomić pierwsze dwa kroki managera, aby zweryfikować konfigurację:

```powershell
cd C:\Users\KOMPUTER\Desktop\aplikacja\1\ai-agents\runtime
python manager.py --project-root .. --skip-monitoring --start-mode report
```

- `InitializationAgent` przygotuje virtualenv (`../venv`).
- `ConfigurationAgent` oraz `TestAgent` zweryfikują pliki `.env` oraz dostępność `firebase-admin`.
- `StartAgent` wygeneruje raport do `ai-agents/reports/auto_report.txt`. Jeśli brakuje modułów produkcyjnych, możesz pominąć ten krok (`--skip-tests --skip-monitoring --start-mode cli`).

## 5. Co jest ręczne, a co automatyczne?

| Zadanie | Status | Uwagi |
| --- | --- | --- |
| Generowanie klucza serwisowego | Ręczne | Tylko w konsoli Firebase; nie automatyzujemy z poziomu repo.
| Kopiowanie klucza do `firebase-credentials.json` | Ręczne | Po pobraniu przenieś plik do katalogu repozytorium.
| Uzupełnienie `ai-agents/.env` | Ręczne | Plik `.env.sample` podpowiada wszystkie pola.
| Wpisanie konfiguracji w panelu Settings | Ręczne | Możemy przygotować JSON i wkleić; UI zapisuje do `state.storage.fbConfig`.
| Uruchomienie managera agentów | Automatyczne | `python manager.py ...` wykonuje inicjalizację, testy i start.

Po wykonaniu tych czynności krok 1 instrukcji jest zakończony i można przejść do dodawania funkcji magazynu (krok 2).
