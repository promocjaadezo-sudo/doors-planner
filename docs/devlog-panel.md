# 🛠️ DevLog Panel – instrukcja wdrożenia

Ten dokument wyjaśnia, jak korzystać z nowego panelu logów deweloperskich (`DevLog Panel`) dodanego do aplikacji. Panel pokazuje najnowsze wpisy debugowe, pozwala je filtrować, eksportować oraz wysyłać do systemów monitoringu.

---

## ✨ Najważniejsze funkcje

| Funkcja | Opis |
| --- | --- |
| Kolorowe logi | Ikony i kolorystyka zależna od poziomu: ℹ️ info, ⚠️ ostrzeżenia, ⛔ błędy |
| Filtrowanie i wyszukiwanie | Checkboxy poziomów + pełnotekstowe wyszukiwanie po treści i meta |
| Eksport | Przyciski eksportu do pliku TXT/JSON (zawiera całą historię) |
| Rotacja | Przechowywane jest ostatnie 100 wpisów (konfigurowalne) |
| Wysyłka logów | Przycisk „Prześlij logi” wysyła paczkę do backendu (konfigurowalne endpointy) |
| Wyczyść | Natychmiastowe czyszczenie historii w panelu |
| Auto-monitoring | Automatyczne wysyłanie błędów do webhooka/API (np. Slack, OpsGenie) |
| Integracja Sentry | Wysyłanie błędów do Sentry przez `captureMessage` |
| Testy | Plik `tests/devlog-panel.test.js` z przykładowymi testami Jest |

---

## 🔌 Integracja z aplikacją

1. **Skrypt panelu** – w `index.html` dodano:
   ```html
   <script src="js/devlog-panel.js"></script>
   <script>
     (function(){
       const devLogConfig = {
         maxEntries: 100,
         captureConsole: true,
         sendLogsUrl: window.state?.settings?.devlogEndpoint || null,
         autoErrorWebhookUrl: window.state?.settings?.devlogWebhook || null,
         sentry: window.Sentry || null,
         autoErrorLevels: ['error'],
         autoErrorSampleRate: 1
       };
       window.devLogPanel = new DevLogPanel(devLogConfig).init();
     })();
   </script>
   ```
   > Ustaw `state.settings.devlogEndpoint` / `devlogWebhook`, aby aktywować wysyłkę logów oraz automatyczny monitoring.

2. **Przechwytywanie `console`** – opcja `captureConsole: true` przechwytuje `console.log/warn/error`, więc cały ruch konsoli trafia również do panelu.

3. **Hooki `logDev`** – panel podłącza się pod istniejące helpery `window.logDev`, `window.logWarn`, `window.logError` (jeśli dotychczas istniały), aby zachować kompatybilność.

4. **Rotacja** – limit 100 wpisów można zmienić: `new DevLogPanel({ maxEntries: 200 })`.

---

## 🌐 Wysyłka logów na backend

- Ustaw endpoint w `state.settings.devlogEndpoint` (np. `https://api.example.com/debug/logs`).
- Każde kliknięcie „Prześlij logi” wyśle payload:
  ```json
  {
    "sentAt": "2025-11-02T18:30:12.123Z",
    "logs": [ { "level": "error", "message": "Sync failed", ... } ],
    "userAgent": "...",
    "location": "https://..."
  }
  ```
- Możesz ustawić dodatkowe nagłówki (np. token Bearer) przez `state.settings.devlogHeaders` i nadpisać je w konfiguracji panelu.

---

## 🚨 Automatyczne zgłaszanie błędów (webhook/API)

W konfiguracji ustaw `autoErrorWebhookUrl`, aby każdy błąd (poziom `error`) był wysyłany POST-em do webhooka.

Przykład zapisany w `index.html`:
```js
window.state.settings.devlogWebhook = 'https://hooks.slack.com/services/...';
```

Możesz ustawić też:
```js
window.devLogPanel.setAutoErrorWebhook(url, {
  'Content-Type': 'application/json',
  Authorization: 'Bearer ...'
});
```

Parametry dodatkowe:
- `autoErrorLevels`: lista poziomów, które mają być wysyłane (domyślnie tylko `error`).
- `autoErrorSampleRate`: liczba od 0 do 1 – próbkowanie (np. 0.25 = 25%).
- `autoSendCooldownMs`: opóźnienie między kolejnymi zgłoszeniami (domyślnie 2000ms).

---

## 🪢 Integracja z Sentry

Jeśli aplikacja ładuje Sentry (np. `window.Sentry`), panel wyśle każdy log do `captureMessage`:
```js
Sentry.init({ dsn: 'https://...' });
window.devLogPanel = new DevLogPanel({ sentry: window.Sentry }).init();
```

Mapę poziomów można zmodyfikować:
```js
new DevLogPanel({
  sentry: window.Sentry,
  sentryLevelMap: {
    info: 'info',
    warning: 'warning',
    error: 'fatal'
  }
});
```

---

## 🧪 Testy automatyczne

Przykładowy test (`tests/devlog-panel.test.js`) uruchamiany w środowisku `jsdom` (Jest):
```bash
npx jest tests/devlog-panel.test.js
```

Główne scenariusze:
- Rotacja logów powyżej limitu.
- Filtrowanie po poziomie i tekście.
- Eksport do JSON (sprawdzenie, że tworzony jest plik).

---

## ✅ Best practices UX & bezpieczeństwo

- **Widoczność** – panel ma domyślnie tryb „pływający”. Można go zwinąć (przycisk „Zwiń”), by nie zasłaniał widoku.
- **Brak PII** – unikaj logowania danych osobowych; jeśli musisz, pseudonimizuj dane przed wysłaniem do backendu.
- **Autoryzacja wysyłek** – endpointy `sendLogsUrl` / `autoErrorWebhookUrl` powinny wymagać tokenu lub podpisu (nagłówki ustawiane w konfiguracji).
- **Nie używaj w produkcji bez kontroli** – panel przechwytuje `console`, więc może ujawnić wrażliwe dane. W produkcji włączaj go warunkowo (`if (isDev) ...`).
- **Ostrożnie z rotacją** – 100 wpisów jest kompromisem między kontekstem a wydajnością. Przy zwiększeniu limitu rozważ stronicowanie.
- **Dostępność** – kontrolki mają opisy (emoji + tekst), a kolory mają wystarczający kontrast. W razie potrzeb można dodać obsługę skrótów klawiszowych.
- **Monitoring / alerty** – webhooki mogą być kierowane np. do Slack/Teams/PagerDuty. Zadbaj o rate-limity (`autoSendCooldownMs`).

---

## 🔄 Podłączenie własnych źródeł logów

Panel udostępnia metody:
```js
window.devLogPanel.info('Wiadomość', { kontekst: 123 });
window.devLogPanel.warning('Ostrzeżenie', { ... });
window.devLogPanel.error('Błąd krytyczny', new Error('...'));
```

Możesz również zarejestrować callback:
```js
window.devLogPanel.onLog((entry) => {
  // np. synchronizacja z lokalnym storage
  console.debug('Nowy wpis devlog:', entry);
});
```

Dodatkowe przykłady integracji:
- **Z synchronizacją Firebase** – w `monitoringAdapter` wysyłamy nowe błędy do kolejki Firebase (zachowane w `index.html`).
- **Z workerami** – wewnątrz Workerów wystarczy `postMessage` do głównej strony i wywołanie `devLogPanel.log()` po odebraniu eventu.

---

## 🚀 Szybki start dla nowego projektu

```html
<body>
  ...
  <script>
    window.__DEV_MODE__ = true;
    window.__DEVLOG_CONFIG = {
      captureConsole: true,
      sendLogsUrl: '/api/devlogs',
      autoErrorWebhookUrl: 'https://hooks.slack.com/services/...'
    };
  </script>
  <script src="js/devlog-panel.js"></script>
  <script>
    window.devLogPanel = new DevLogPanel(window.__DEVLOG_CONFIG).init();
  </script>
</body>
```

---

Masz pytania lub chcesz rozszerzyć panel? Najczęstsze pomysły:
- zapisywanie logów do IndexedDB (persistencja między sesjami),
- integracja z narzędziami QA (Jira, Linear),
- wysyłka screenshotów wraz z logami (drag & drop).

Powodzenia! 🧑‍💻
