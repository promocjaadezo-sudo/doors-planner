### Zadania agentów AI do ukończenia aplikacji

1. **Uzupełnienie brakujących modułów**  
- Dodać pliki: `production_agent.py`, `agent_config.py`, `firebase_client.py` ze stubami i fallbackiem (offline mode).  
- Przygotować plik `.env.sample` z wymaganymi kluczami i instrukcją generowania poświadczeń.

2. **Testy i automatyzacja**  
- Rozbudować testy Playwright o kluczowe scenariusze (zamówienia, montaż, Gantt).  
- Dodać testy jednostkowe UI (`ui.js`, `store.js`) przy pomocy Vitest.  
- Skonfigurować GitHub Actions do uruchamiania automatycznych testów i publikacji raportów.

3. **Monitoring i telemetry**  
- Integrać monitoring z OTel/Grafana, dodać metryki (czas odpowiedzi, błędy).  
- Przygotować deployment agenta do automatycznego buildów i backupów.  
- Harmonogramować odświeżania danych worker-agentem.

4. **Stabilizacja i zarządzanie błędami**  
- Implementować obsługę błędów z logowaniem warningów i tryb fallback.  
- Dokumentować działania i zbierać raporty statusu w repozytorium.

5. **Ciągłe poprawki i iteracje**  
- Monitorować wydajność i stabilność, iteracyjnie poprawiać kod i testy.

**Zalecany cykl pracy agentów:**  
Pobierz → Zanalizuj → Zaplanuj → Wykonaj → Przetestuj → Raportuj → Powtórz

---

Poproś chat o rozwinięcie któregokolwiek punktu, generowanie kodu lub konfiguracji CI/CD.

