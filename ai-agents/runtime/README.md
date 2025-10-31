# 🚀 Runtime Automation Agents

Zestaw prostych agentów Python automatyzuje przygotowanie środowiska oraz uruchomienie aplikacji produkcyjnej dla modułu `ai-agents`.

## 📦 Zawarte skrypty

| Plik | Opis |
| --- | --- |
| `initialization_agent.py` | Tworzy/aktualizuje środowisko virtualenv oraz instaluje podstawowe zależności (`numpy`, `openai`, `python-dotenv`, `firebase-admin`, `rich`). |
| `config_agent.py` | Wczytuje konfigurację z pliku `.env` i weryfikuje wymagane klucze. |
| `test_agent.py` | Uruchamia proste testy jednostkowe (kontrola `.env`, dostępność `firebase-admin`). |
| `monitoring_agent.py` | Monitoruje logi, sprawdza łączność z OpenAI i Firebase (z możliwością przełączenia w tryb offline). |
| `start_agent.py` | Uruchamia aplikację w trybie raportowania lub CLI (`agents/production_agent.py`). |
| `manager.py` | Menedżer uruchamiający agentów jeden po drugim i zatrzymujący proces przy błędach. |

## ✅ Wymagania wstępne

- Python 3.10+
- Plik `ai-agents/.env` z uzupełnionymi kluczami (minimum: `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_USER_ID`).
- Dostęp do internetu dla walidacji OpenAI/Firebase (lub użyj flag `--skip-monitoring`).

## ▶️ Szybki start

1. Przejdź do katalogu `ai-agents/runtime`:

   ```powershell
   cd ai-agents\runtime
   ```

2. Uruchom managera agentów (pełny setup):

   ```powershell
   python manager.py --project-root .. --log-level INFO
   ```

   Kolejne kroki:
   1. Tworzenie/aktualizacja virtualenv (`../venv`).
   2. Weryfikacja `.env`.
   3. Testy jednostkowe.
   4. Monitoring (logi + konektywność OpenAI/Firebase).
   5. Generowanie raportu produkcyjnego (`../reports/auto_report.txt`).

## ⚙️ Najważniejsze opcje

| Flaga | Opis |
| --- | --- |
| `--skip-init` | Pomija tworzenie virtualenv i instalację pakietów. |
| `--skip-tests` | Pomija uruchamianie testów. |
| `--skip-monitoring` | Pomija weryfikację monitoringu. |
| `--packages` | Własna lista pakietów do instalacji (zastępuje domyślną). |
| `--start-mode` | `report` (domyślnie) zapisuje raport, `cli` uruchamia interaktywne CLI. |
| `--env` | Ścieżka do pliku `.env` (domyślnie `../.env`). |

### Przykłady

- Tylko walidacja konfiguracji i testy (bez instalacji i monitoringu):

  ```powershell
  python manager.py --project-root .. --skip-init --skip-monitoring
  ```

- Instalacja z dodatkowymi pakietami i uruchomienie CLI:

  ```powershell
  python manager.py --project-root .. --packages numpy openai rich typer --start-mode cli
  ```

## 📁 Struktura katalogu

```
ai-agents/runtime/
├── __init__.py
├── base_agent.py
├── config_agent.py
├── initialization_agent.py
├── logging_utils.py
├── manager.py
├── monitoring_agent.py
├── start_agent.py
├── test_agent.py
└── README.md
```

## 🛠️ Dalsze kroki

- Rozszerz `test_agent.py` o dodatkowe testy domenowe (np. symulacja `ProductionAgent`).
- Podłącz `monitoring_agent.py` do zewnętrznego systemu telemetrycznego (Grafana, LangSmith).
- Dodaj kolejne agentów (np. automatyczne deploymenty) i dopisz je do `manager.py`.

Powodzenia w automatyzacji! 🎯
