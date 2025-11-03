# 📊 MONITORING SETUP - Instalacja i konfiguracja narzędzi monitoringu

**Wersja:** 1.0.0  
**Data utworzenia:** 2025-11-02  
**Status:** ✅ Gotowe do wdrożenia

---

## 📋 Spis treści

1. [Przegląd systemu](#1-przegląd-systemu)
2. [Architektura monitoringu](#2-architektura-monitoringu)
3. [Komponenty](#3-komponenty)
4. [Instalacja Prometheus](#4-instalacja-prometheus)
5. [Instalacja Grafana](#5-instalacja-grafana)
6. [Instalacja ELK Stack](#6-instalacja-elk-stack)
7. [Konfiguracja aplikacji](#7-konfiguracja-aplikacji)
8. [Alerty](#8-alerty)
9. [Dashboardy](#9-dashboardy)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Przegląd systemu

System monitoringu dla **CentralnyMagazynStanu** składa się z trzech głównych warstw:

```
┌─────────────────────────────────────────────────────┐
│          Aplikacja JavaScript (Browser)              │
│  ┌──────────────────────────────────────────────┐   │
│  │  CentralnyMagazynStanu.js                     │   │
│  │  • Zarządzanie stanem                         │   │
│  │  • Historia operacji                          │   │
│  └────────┬─────────────────────────────────────┘   │
│           │                                           │
│  ┌────────▼─────────┐  ┌──────────────────────┐     │
│  │ MetricsExporter  │  │  LogAggregator       │     │
│  │ • Prometheus     │  │  • ECS format        │     │
│  │ • 13 metryk      │  │  • Batch sending     │     │
│  └────────┬─────────┘  └──────────┬───────────┘     │
│           │                        │                 │
│  ┌────────▼────────────────────────▼───────────┐    │
│  │           Alerting System                    │    │
│  │  • 12 reguł alertów                          │    │
│  │  • Desktop notifications                     │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                    │                    │
        ┌───────────▼───────┐  ┌────────▼─────────┐
        │   Prometheus      │  │   Logstash       │
        │   • Scraping      │  │   • Log parsing  │
        │   • Storage       │  │   • Enrichment   │
        └───────────┬───────┘  └────────┬─────────┘
                    │                    │
        ┌───────────▼───────┐  ┌────────▼─────────┐
        │   Grafana         │  │  Elasticsearch   │
        │   • Dashboards    │  │   • Log storage  │
        │   • Alerts        │  │   • Indexing     │
        └───────────────────┘  └────────┬─────────┘
                                         │
                               ┌─────────▼─────────┐
                               │     Kibana        │
                               │   • Log search    │
                               │   • Visualization │
                               └───────────────────┘
```

---

## 2. Architektura monitoringu

### 2.1 Warstwy systemu

#### **Layer 1: Collection (Aplikacja)**
- `monitoring/metrics-exporter.js` - Eksport metryk w formacie Prometheus
- `monitoring/log-aggregator.js` - Agregacja logów w formacie ECS
- `monitoring/alerts.js` - Lokalne alerty i notyfikacje

#### **Layer 2: Storage & Processing**
- **Prometheus** - Przechowywanie time-series metryk
- **Logstash** - Przetwarzanie i routing logów
- **Elasticsearch** - Indeksowanie i przechowywanie logów

#### **Layer 3: Visualization & Alerting**
- **Grafana** - Wizualizacja metryk i dashboardy
- **Kibana** - Przeglądanie i analiza logów
- **Alertmanager** - Zarządzanie alertami

---

## 3. Komponenty

### 3.1 Metrics Exporter (`monitoring/metrics-exporter.js`)

**Metryki eksportowane:**

| Nazwa | Typ | Opis | Labels |
|-------|-----|------|--------|
| `app_operations_total` | Counter | Całkowita liczba operacji | `operation_type`, `status` |
| `app_errors_total` | Counter | Całkowita liczba błędów | `error_type` |
| `app_saves_total` | Counter | Liczba zapisów stanu | - |
| `app_tasks_total` | Counter | Liczba zadań | `task_type` |
| `app_memory_usage_bytes` | Gauge | Użycie pamięci (bytes) | - |
| `app_history_size` | Gauge | Rozmiar historii | - |
| `app_uptime_seconds` | Gauge | Czas działania (sekundy) | - |
| `app_active_users` | Gauge | Aktywni użytkownicy | - |
| `app_data_counts` | Gauge | Liczba encji danych | `entity_type` |
| `app_operation_duration_seconds` | Histogram | Czas trwania operacji | - |
| `app_save_duration_seconds` | Histogram | Czas zapisu | - |
| `app_response_time_seconds` | Summary | Czas odpowiedzi | - |

**API:**
```javascript
// Pobranie metryk
const metrics = window.metricsExporter.export();

// Reset metryk
window.metricsExporter.resetAll();

// Ręczna kolekcja
window.metricsExporter.collect();
```

### 3.2 Log Aggregator (`monitoring/log-aggregator.js`)

**Format logów:** Elastic Common Schema (ECS) 8.0.0

**Struktura:**
```json
{
  "@timestamp": "2025-11-02T10:30:00.000Z",
  "ecs": { "version": "8.0.0" },
  "event": {
    "action": "save",
    "category": ["database"],
    "type": ["info"],
    "outcome": "success",
    "duration": 50000000
  },
  "log": {
    "level": "info",
    "logger": "CentralnyMagazynStanu"
  },
  "message": "Stan zapisany (50ms)",
  "labels": {
    "operation_type": "SYSTEM_SAVE",
    "session_id": "session_123"
  },
  "magazyn": {
    "typ": "SYSTEM_SAVE",
    "dane": {},
    "id": 123
  }
}
```

**API:**
```javascript
// Flush logów
window.logAggregator.flush();

// Eksport logów
const logs = window.logAggregator.export();

// Eksport do pliku
window.logAggregator.exportToFile();

// Statystyki
const stats = window.logAggregator.getStats();
```

### 3.3 Alerting System (`monitoring/alerts.js`)

**12 reguł alertów:**

#### **CRITICAL (4 reguły)**
1. `memory_critical` - Użycie pamięci >90% limitu
2. `error_rate_critical` - >10 błędów w 5 minut
3. `history_overflow` - Historia >950/1000 wpisów
4. `save_failed` - Błąd zapisu stanu

#### **ERROR (3 reguły)**
5. `slow_operations` - >3 wolne operacje (>1s) w minutę
6. `data_loss_risk` - Brak zapisów od 10 minut
7. `localStorage_failure` - localStorage niedostępny

#### **WARNING (3 reguły)**
8. `memory_warning` - Użycie pamięci >70% limitu
9. `high_error_rate` - 3-10 błędów w 5 minut
10. `history_size_warning` - Historia >800/1000

#### **INFO (2 reguły)**
11. `session_long` - Sesja >4 godziny

**Konfiguracja:**
```javascript
window.alerting.config = {
  enabled: true,
  checkInterval: 30000,        // 30s
  cooldownPeriod: 300000,      // 5min
  maxAlertsPerHour: 10,
  notificationMethods: {
    console: true,
    desktop: true,
    sound: true,
    email: false,
    webhook: false
  }
};
```

---

## 4. Instalacja Prometheus

### 4.1 Pobieranie i instalacja

**Windows:**
```powershell
# Pobierz Prometheus
Invoke-WebRequest -Uri https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.windows-amd64.zip -OutFile prometheus.zip

# Rozpakuj
Expand-Archive -Path prometheus.zip -DestinationPath C:\prometheus

# Przejdź do katalogu
cd C:\prometheus\prometheus-2.48.0.windows-amd64
```

**Linux:**
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

### 4.2 Konfiguracja (`prometheus.yml`)

Utwórz plik konfiguracyjny:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'centralny-magazyn-stanu'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093

# Rule files
rule_files:
  - "alerts.yml"

# Scrape configurations
scrape_configs:
  # Aplikacja JavaScript
  - job_name: 'centralny-magazyn-stanu'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/api/metrics'
    
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 4.3 Reguły alertów (`alerts.yml`)

```yaml
groups:
  - name: centralny_magazyn_stanu_alerts
    interval: 30s
    rules:
      # Critical: Wysokie użycie pamięci
      - alert: HighMemoryUsage
        expr: app_memory_usage_bytes / 1024 / 1024 > 200
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Krytyczne użycie pamięci"
          description: "Pamięć: {{ $value }}MB"

      # Critical: Wysoki współczynnik błędów
      - alert: HighErrorRate
        expr: rate(app_errors_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Wysoki współczynnik błędów"
          description: "{{ $value }} błędów/s"

      # Warning: Wolne operacje
      - alert: SlowOperations
        expr: histogram_quantile(0.95, rate(app_operation_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Wolne operacje"
          description: "P95: {{ $value }}s"

      # Warning: Przepełnienie historii
      - alert: HistoryOverflow
        expr: app_history_size > 950
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Historia bliska przepełnienia"
          description: "{{ $value }}/1000 wpisów"

      # Info: Brak zapisów
      - alert: NoRecentSaves
        expr: rate(app_saves_total[10m]) == 0
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Brak zapisów od 10 minut"
```

### 4.4 Uruchomienie

**Windows:**
```powershell
.\prometheus.exe --config.file=prometheus.yml
```

**Linux:**
```bash
./prometheus --config.file=prometheus.yml
```

**Dostęp:** http://localhost:9090

### 4.5 Endpoint metryk w aplikacji

Aby Prometheus mógł scrapować metryki, utwórz prosty backend endpoint:

**Node.js (Express):**
```javascript
const express = require('express');
const app = express();

app.get('/api/metrics', (req, res) => {
  // Pobierz metryki z localStorage lub window.metricsExporter
  const metrics = getMetricsFromApp(); // Implementacja zależna od setup
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics);
});

app.listen(8080, () => {
  console.log('Metrics endpoint: http://localhost:8080/api/metrics');
});
```

**Alternatywa - Export do pliku:**
```javascript
// W aplikacji
setInterval(() => {
  const metrics = window.metricsExporter.export();
  fetch('/api/metrics', {
    method: 'POST',
    body: metrics
  });
}, 15000); // Co 15s
```

---

## 5. Instalacja Grafana

### 5.1 Pobieranie i instalacja

**Windows:**
```powershell
# Pobierz Grafana
Invoke-WebRequest -Uri https://dl.grafana.com/oss/release/grafana-10.2.2.windows-amd64.zip -OutFile grafana.zip

# Rozpakuj
Expand-Archive -Path grafana.zip -DestinationPath C:\grafana

# Uruchom
cd C:\grafana\grafana-10.2.2
.\bin\grafana-server.exe
```

**Linux:**
```bash
wget https://dl.grafana.com/oss/release/grafana-10.2.2.linux-amd64.tar.gz
tar -zxvf grafana-10.2.2.linux-amd64.tar.gz
cd grafana-10.2.2
./bin/grafana-server
```

**Docker:**
```bash
docker run -d -p 3000:3000 --name=grafana grafana/grafana
```

**Dostęp:** http://localhost:3000  
**Login:** admin / admin

### 5.2 Konfiguracja Data Source

1. **Przejdź do:** Configuration → Data Sources → Add data source
2. **Wybierz:** Prometheus
3. **URL:** `http://localhost:9090`
4. **Save & Test**

### 5.3 Import dashboardu

1. **Przejdź do:** Dashboards → Import
2. **Upload JSON file:** `monitoring/grafana-dashboard.json`
3. **Select Prometheus data source**
4. **Import**

Dashboard zawiera:
- 8 paneli statystyk (Stat)
- 6 wykresów time-series
- 2 heatmapy (histogramy)
- 1 wykres percentyli
- Anotacje alertów i deploymentów
- Zmienne do filtrowania (operation_type, status)

### 5.4 Konfiguracja alertów

Grafana wykorzystuje reguły zdefiniowane w `prometheus.yml` i `alerts.yml`.

**Konfiguracja notification channels:**

1. **Przejdź do:** Alerting → Notification channels → New channel
2. **Wybierz typ:** Email / Slack / Webhook
3. **Konfiguruj endpoint**
4. **Test** i **Save**

---

## 6. Instalacja ELK Stack

### 6.1 Elasticsearch

**Docker:**
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

**Weryfikacja:**
```bash
curl http://localhost:9200
```

### 6.2 Logstash

**Konfiguracja (`logstash.conf`):**
```ruby
input {
  http {
    port => 5044
    codec => json
  }
}

filter {
  # Parsowanie timestamp
  date {
    match => [ "@timestamp", "ISO8601" ]
    target => "@timestamp"
  }

  # Wzbogacenie geo IP (opcjonalne)
  # geoip {
  #   source => "client_ip"
  # }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "centralny-magazyn-stanu-%{+YYYY.MM.dd}"
  }
  
  # Debug output
  stdout { codec => rubydebug }
}
```

**Uruchomienie (Docker):**
```bash
docker run -d \
  --name logstash \
  -p 5044:5044 \
  -v $(pwd)/logstash.conf:/usr/share/logstash/pipeline/logstash.conf \
  logstash:8.11.0
```

### 6.3 Kibana

**Docker:**
```bash
docker run -d \
  --name kibana \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://host.docker.internal:9200" \
  kibana:8.11.0
```

**Dostęp:** http://localhost:5601

### 6.4 Konfiguracja aplikacji

Włącz wysyłanie logów do Logstash:

```javascript
// W pliku monitoring/log-aggregator.js
window.logAggregator.config.logstashUrl = 'http://localhost:5044';
```

Lub używaj localStorage jako bufora:
```javascript
// Logi zapisują się lokalnie
// Możesz je wyeksportować i załadować do Elasticsearch bulk API
const logs = window.logAggregator.export();

// Wyślij bulk
fetch('http://localhost:9200/_bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-ndjson' },
  body: logs.map(log => 
    `{"index":{"_index":"centralny-magazyn-stanu-${new Date().toISOString().split('T')[0]}"}}\n${JSON.stringify(log)}\n`
  ).join('')
});
```

### 6.5 Index Pattern w Kibana

1. **Przejdź do:** Management → Stack Management → Index Patterns
2. **Create index pattern:** `centralny-magazyn-stanu-*`
3. **Time field:** `@timestamp`
4. **Create**

---

## 7. Konfiguracja aplikacji

### 7.1 Dodanie skryptów do `index.html`

```html
<!-- MONITORING SCRIPTS -->
<script src="monitoring/metrics-exporter.js"></script>
<script src="monitoring/log-aggregator.js"></script>
<script src="monitoring/alerts.js"></script>
```

**Kolejność ładowania:**
1. `state/CentralnyMagazynStanu.js`
2. `state/integration.js`
3. `state/production-monitor.js`
4. `monitoring/metrics-exporter.js`
5. `monitoring/log-aggregator.js`
6. `monitoring/alerts.js`

### 7.2 Konfiguracja (opcjonalna)

Dostosuj konfigurację w console DevTools:

```javascript
// Metrics Exporter
window.metricsExporter.config.collectionInterval = 30000; // 30s
window.metricsExporter.config.histogramBuckets = [0.001, 0.01, 0.1, 1, 5, 10];

// Log Aggregator
window.logAggregator.config.batchSize = 100;
window.logAggregator.config.flushInterval = 5000; // 5s
window.logAggregator.config.logstashUrl = 'http://your-logstash:5044';

// Alerting
window.alerting.config.checkInterval = 60000; // 1min
window.alerting.config.cooldownPeriod = 600000; // 10min
```

### 7.3 Weryfikacja

Sprawdź w console:

```javascript
// Sprawdź metryki
console.log(window.metricsExporter.export());

// Sprawdź logi
console.log(window.logAggregator.getStats());

// Sprawdź alerty
console.log(window.alerting.getStats());
```

---

## 8. Alerty

### 8.1 Poziomy alertów

| Poziom | Ikona | Opis | Reakcja |
|--------|-------|------|---------|
| **CRITICAL** | 🆘 | Błąd krytyczny, wymaga natychmiastowej akcji | Natychmiast, 24/7 |
| **ERROR** | ❌ | Błąd wymagający uwagi | W ciągu godziny |
| **WARNING** | ⚠️ | Ostrzeżenie, monitoruj | W ciągu dnia |
| **INFO** | ℹ️ | Informacja | Do wiadomości |

### 8.2 Kanały notyfikacji

**Desktop Notifications:**
- Automatyczne dla CRITICAL alerts
- Wymagane pozwolenie przeglądarki
- `requireInteraction: true` dla CRITICAL

**Console Logs:**
- Kolorowane według severity
- Grupowane z danymi kontekstowymi

**Sound Alerts:**
- Różne częstotliwości dla różnych poziomów
- 3x beep dla CRITICAL

**Email/Webhook (wymaga konfiguracji):**
```javascript
window.alerting.config.notificationMethods.email = true;
window.alerting.config.notificationMethods.webhook = true;
window.alerting.config.webhookUrl = 'https://your-webhook-url';
```

### 8.3 Potwierdzanie alertów

```javascript
// Potwierdź alert
window.alerting.acknowledgeAlert('memory_critical');

// Historia alertów
const history = window.alerting.getHistory();

// Wyczyść historię
window.alerting.clearHistory();
```

### 8.4 Dostosowanie reguł

Edytuj `monitoring/alerts.js`:

```javascript
ALERT_RULES.push({
  id: 'custom_rule',
  name: 'Moja reguła',
  severity: AlertSeverity.WARNING,
  condition: () => {
    // Twój warunek
    return magazyn.pobierzHistorie().length > 500;
  },
  message: (data) => `Custom message: ${data.value}`,
  action: () => {
    console.warn('Custom action');
  }
});
```

---

## 9. Dashboardy

### 9.1 Grafana Dashboard

**URL:** http://localhost:3000/d/centralny-magazyn-stanu

**Sekcje:**
1. **Przegląd Systemu** - Statystyki ogólne (6 paneli)
2. **Operacje** - Wykresy operacji i błędów
3. **Wydajność** - Histogram i percentyle
4. **Zasoby** - Pamięć i historia
5. **Dane Biznesowe** - Zamówienia, zadania, pracownicy
6. **Histogram czasu zapisu** - Analiza wydajności

**Zmienne:**
- `$operation_type` - Filtruj po typie operacji
- `$status` - Filtruj po statusie (success/error)

**Time range:** Domyślnie ostatnia godzina, można zmienić na 5m - 30d

### 9.2 Production Dashboard

**URL:** http://localhost:5500/production-dashboard.html

**Funkcje:**
- Auto-refresh co 5s
- 8 kart statystyk
- Tabela historii z filtrami
- Export do JSON
- Czyszczenie historii

### 9.3 Kibana Discover

**URL:** http://localhost:5601/app/discover

**Wyszukiwanie:**
```
# Wszystkie błędy
log.level: "error"

# Błędy zapisu
event.action: "save" AND event.outcome: "failure"

# Wolne operacje
event.duration > 1000000000

# Alerty
event.action: "alert" AND magazyn.dane.severity: "critical"
```

**Saved Searches:**
- Critical Errors
- Slow Operations
- Recent Alerts
- User Actions

---

## 10. Troubleshooting

### 10.1 Prometheus nie scrapuje metryk

**Problem:** `Get "http://localhost:8080/api/metrics": connection refused`

**Rozwiązanie:**
1. Sprawdź czy endpoint działa: `curl http://localhost:8080/api/metrics`
2. Upewnij się że backend serwuje metryki
3. Sprawdź firewall
4. Użyj alternatywnej metody (localStorage + batch upload)

### 10.2 Grafana nie pokazuje danych

**Problem:** "No data"

**Rozwiązanie:**
1. Sprawdź połączenie z Prometheus: Configuration → Data Sources → Test
2. Sprawdź czy Prometheus ma dane: http://localhost:9090/graph
3. Sprawdź time range (domyślnie ostatnia godzina)
4. Sprawdź czy metryki mają prawidłowe nazwy

### 10.3 Logi nie pojawiają się w Kibana

**Problem:** "No results"

**Rozwiązanie:**
1. Sprawdź Elasticsearch: `curl http://localhost:9200/_cat/indices`
2. Sprawdź Logstash: logs w konsoli
3. Sprawdź index pattern w Kibana
4. Sprawdź czy aplikacja wysyła logi: `window.logAggregator.getStats()`
5. Użyj localStorage fallback i bulk import

### 10.4 Alertmanager nie wysyła alertów

**Problem:** Alerty nie docierają na email/Slack

**Rozwiązanie:**
1. Sprawdź konfigurację notification channel
2. Test notification channel w Grafana
3. Sprawdź logi Alertmanager
4. Sprawdź SMTP/webhook konfigurację

### 10.5 Wysokie użycie pamięci

**Problem:** Aplikacja zużywa dużo pamięci

**Rozwiązanie:**
1. Czyść historię: `magazyn.czyscHistorie(0.5)` (zostaw 50%)
2. Zmniejsz częstotliwość kolekcji metryk
3. Zmniejsz częstotliwość zapisów do localStorage
4. Używaj pagination w dashboardach

### 10.6 Pełny localStorage

**Problem:** `QuotaExceededError`

**Rozwiązanie:**
```javascript
// Wyczyść stare logi
window.logAggregator.clearLocalLogs();

// Zmniejsz batch size
window.logAggregator.config.batchSize = 20;

// Flush częściej
window.logAggregator.config.flushInterval = 5000; // 5s

// Eksportuj i usuń
window.logAggregator.exportToFile();
window.logAggregator.clearLocalLogs();
```

### 10.7 Za dużo alertów

**Problem:** Alert fatigue

**Rozwiązanie:**
```javascript
// Zwiększ cooldown
window.alerting.config.cooldownPeriod = 600000; // 10min

// Zmniejsz limit na godzinę
window.alerting.config.maxAlertsPerHour = 5;

// Wyłącz niektóre typy notyfikacji
window.alerting.config.notificationMethods.sound = false;

// Dostosuj progi w regułach alertów
```

---

## 📈 Podsumowanie

System monitoringu został skonfigurowany z trzema głównymi narzędziami:

✅ **Prometheus** - Time-series database dla metryk  
✅ **Grafana** - Wizualizacja i dashboardy  
✅ **ELK Stack** - Agregacja i analiza logów  
✅ **Alerting** - Automatyczne powiadomienia o problemach  

**Kluczowe endpointy:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Kibana: http://localhost:5601
- Elasticsearch: http://localhost:9200
- Production Dashboard: http://localhost:5500/production-dashboard.html

**Dalsze kroki:**
1. Dostosuj reguły alertów do swoich potrzeb
2. Skonfiguruj notification channels (email/Slack)
3. Dodaj custom dashboardy w Grafana
4. Stwórz saved searches w Kibana
5. Skonfiguruj backup dla Elasticsearch indices

---

**Autor:** AI Assistant  
**Kontakt:** [Twój kontakt]  
**Wersja dokumentu:** 1.0.0  
**Ostatnia aktualizacja:** 2025-11-02
