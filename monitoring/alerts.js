/**
 * ALERTING SYSTEM - Konfiguracja alertów dla błędów krytycznych
 * 
 * System monitorowania progów i wysyłania alertów
 * dla krytycznych błędów i przekroczeń limitów.
 * 
 * @version 1.0.0
 * @created 2025-11-02
 */

(function(window) {
  'use strict';

  if (!window.centralnyMagazyn) {
    console.error('❌ [Alerting] CentralnyMagazynStanu nie jest załadowany!');
    return;
  }

  const magazyn = window.centralnyMagazyn;

  /**
   * KONFIGURACJA ALERTÓW
   */
  const ALERT_CONFIG = {
    enabled: true,
    checkInterval: 30000,           // Sprawdzanie co 30s
    cooldownPeriod: 300000,         // Cooldown 5 minut między alertami tego samego typu
    maxAlertsPerHour: 10,           // Max alertów na godzinę
    notificationMethods: {
      console: true,                // Log w konsoli
      desktop: true,                // Desktop notifications
      email: false,                 // Email (wymaga backendu)
      webhook: false,               // Webhook (wymaga backendu)
      sound: true                   // Dźwięk alertu
    }
  };

  /**
   * POZIOMY ALERTÓW
   */
  const AlertSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  };

  /**
   * DEFINICJE REGUŁ ALERTÓW
   */
  const ALERT_RULES = [
    // === CRITICAL ALERTS ===
    {
      id: 'memory_critical',
      name: 'Krytyczne użycie pamięci',
      severity: AlertSeverity.CRITICAL,
      condition: () => {
        if (!window.performance?.memory) return false;
        const memory = window.performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        return usedMB > limitMB * 0.9; // Powyżej 90% limitu
      },
      message: (data) => `Użycie pamięci: ${data.usedMB}MB / ${data.limitMB}MB (${data.percent}%)`,
      action: () => {
        console.warn('🆘 CRITICAL: Rozważ czyszczenie pamięci lub przeładowanie aplikacji');
      }
    },

    {
      id: 'error_rate_critical',
      name: 'Krytyczny współczynnik błędów',
      severity: AlertSeverity.CRITICAL,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        const last5min = historia.filter(h => h.timestamp > Date.now() - 5 * 60 * 1000);
        const errors = last5min.filter(h => h.typ.includes('ERROR'));
        return errors.length > 10; // Więcej niż 10 błędów w 5 minut
      },
      message: (data) => `${data.errorCount} błędów w ostatnich 5 minutach`,
      action: () => {
        console.error('🆘 CRITICAL: Wysoka liczba błędów - sprawdź logi!');
      }
    },

    {
      id: 'history_overflow',
      name: 'Przepełnienie historii',
      severity: AlertSeverity.CRITICAL,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        return historia.length >= 950; // Blisko limitu 1000
      },
      message: (data) => `Historia: ${data.count}/1000 wpisów`,
      action: () => {
        console.warn('🆘 CRITICAL: Historia bliska przepełnienia - rozważ czyszczenie');
      }
    },

    {
      id: 'save_failed',
      name: 'Niepowodzenie zapisu stanu',
      severity: AlertSeverity.CRITICAL,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        const recent = historia.filter(h => h.timestamp > Date.now() - 60000);
        return recent.some(h => h.typ === 'SYSTEM_ERROR');
      },
      message: () => 'Błąd zapisu stanu aplikacji',
      action: () => {
        console.error('🆘 CRITICAL: Zapis stanu nie powiódł się!');
      }
    },

    // === ERROR ALERTS ===
    {
      id: 'slow_operations',
      name: 'Wolne operacje',
      severity: AlertSeverity.ERROR,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        const saves = historia.filter(h => 
          h.typ === 'SYSTEM_SAVE' && 
          h.timestamp > Date.now() - 60000
        );
        const slowSaves = saves.filter(s => (s.dane?.czas_ms || 0) > 1000);
        return slowSaves.length > 3; // Więcej niż 3 wolne zapisy w minutę
      },
      message: (data) => `${data.count} wolnych operacji (>1s)`,
      action: () => {
        console.warn('⚠️ ERROR: Aplikacja działa wolno - sprawdź wydajność');
      }
    },

    {
      id: 'data_loss_risk',
      name: 'Ryzyko utraty danych',
      severity: AlertSeverity.ERROR,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        const last10min = historia.filter(h => h.timestamp > Date.now() - 10 * 60 * 1000);
        const saves = last10min.filter(h => h.typ === 'SYSTEM_SAVE');
        return saves.length === 0; // Brak zapisów w 10 minut
      },
      message: () => 'Brak zapisów stanu od 10 minut',
      action: () => {
        console.warn('⚠️ ERROR: Dane mogą nie być zapisywane!');
      }
    },

    {
      id: 'localStorage_failure',
      name: 'Problem z localStorage',
      severity: AlertSeverity.ERROR,
      condition: () => {
        try {
          const testKey = '__alert_test__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
          return false;
        } catch (e) {
          return true; // localStorage nie działa
        }
      },
      message: () => 'localStorage jest niedostępny',
      action: () => {
        console.error('⚠️ ERROR: Nie można zapisywać danych lokalnie!');
      }
    },

    // === WARNING ALERTS ===
    {
      id: 'memory_warning',
      name: 'Wysokie użycie pamięci',
      severity: AlertSeverity.WARNING,
      condition: () => {
        if (!window.performance?.memory) return false;
        const memory = window.performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        return usedMB > limitMB * 0.7; // Powyżej 70% limitu
      },
      message: (data) => `Użycie pamięci: ${data.usedMB}MB / ${data.limitMB}MB (${data.percent}%)`,
      action: null
    },

    {
      id: 'high_error_rate',
      name: 'Podwyższony poziom błędów',
      severity: AlertSeverity.WARNING,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        const last5min = historia.filter(h => h.timestamp > Date.now() - 5 * 60 * 1000);
        const errors = last5min.filter(h => h.typ.includes('ERROR'));
        return errors.length > 3 && errors.length <= 10;
      },
      message: (data) => `${data.errorCount} błędów w ostatnich 5 minutach`,
      action: null
    },

    {
      id: 'history_size_warning',
      name: 'Duży rozmiar historii',
      severity: AlertSeverity.WARNING,
      condition: () => {
        const historia = magazyn.pobierzHistorie();
        return historia.length > 800; // Powyżej 80% limitu
      },
      message: (data) => `Historia: ${data.count}/1000 wpisów`,
      action: null
    },

    // === INFO ALERTS ===
    {
      id: 'session_long',
      name: 'Długa sesja',
      severity: AlertSeverity.INFO,
      condition: () => {
        if (!window.productionMonitor) return false;
        const stats = window.productionMonitor.getStats();
        return stats.uptime_seconds > 3600 * 4; // Powyżej 4 godzin
      },
      message: (data) => `Sesja trwa ${Math.round(data.hours)} godzin`,
      action: null
    }
  ];

  /**
   * Stan alertingu
   */
  const alertState = {
    firedAlerts: new Map(),    // ID -> ostatni czas wywołania
    alertHistory: [],          // Historia alertów
    timers: {},
    stats: {
      totalAlerts: 0,
      alertsBySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0
      }
    }
  };

  /**
   * KLASA ALERT
   */
  class Alert {
    constructor(rule, data) {
      this.id = rule.id;
      this.name = rule.name;
      this.severity = rule.severity;
      this.message = typeof rule.message === 'function' ? rule.message(data) : rule.message;
      this.timestamp = Date.now();
      this.data = data;
      this.acknowledged = false;
    }

    /**
     * Potwierdź alert
     */
    acknowledge() {
      this.acknowledged = true;
      console.log(`✅ Alert potwierdzony: ${this.name}`);
    }

    /**
     * Format do wyświetlenia
     */
    toString() {
      const icon = this._getSeverityIcon();
      return `${icon} [${this.severity.toUpperCase()}] ${this.name}: ${this.message}`;
    }

    /**
     * Ikona dla poziomu
     */
    _getSeverityIcon() {
      const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '🆘'
      };
      return icons[this.severity] || '❓';
    }
  }

  /**
   * SPRAWDZANIE REGUŁ
   */
  function checkAlertRules() {
    try {
      const now = Date.now();
      const alertsToFire = [];

      ALERT_RULES.forEach(rule => {
        // Sprawdź cooldown
        const lastFired = alertState.firedAlerts.get(rule.id);
        if (lastFired && now - lastFired < ALERT_CONFIG.cooldownPeriod) {
          return; // W cooldown
        }

        // Sprawdź limit alertów na godzinę
        const lastHourAlerts = alertState.alertHistory.filter(a => 
          a.timestamp > now - 3600000
        );
        if (lastHourAlerts.length >= ALERT_CONFIG.maxAlertsPerHour) {
          console.warn('⚠️ [Alerting] Osiągnięto limit alertów na godzinę');
          return;
        }

        // Sprawdź warunek
        try {
          if (rule.condition()) {
            // Zbierz dane kontekstowe
            const data = collectContextData(rule);
            
            // Utwórz alert
            const alert = new Alert(rule, data);
            alertsToFire.push({ rule, alert });

            // Oznacz jako wywołany
            alertState.firedAlerts.set(rule.id, now);
          }
        } catch (conditionError) {
          console.error(`❌ [Alerting] Błąd w regule ${rule.id}:`, conditionError);
        }
      });

      // Wywołaj alerty
      alertsToFire.forEach(({ rule, alert }) => {
        fireAlert(alert, rule);
      });

    } catch (error) {
      console.error('❌ [Alerting] Błąd sprawdzania reguł:', error);
    }
  }

  /**
   * ZBIERANIE DANYCH KONTEKSTOWYCH
   */
  function collectContextData(rule) {
    const data = {};

    // Pamięć
    if (window.performance?.memory) {
      const memory = window.performance.memory;
      data.usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      data.limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      data.percent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }

    // Historia
    const historia = magazyn.pobierzHistorie();
    data.count = historia.length;

    // Błędy
    const last5min = historia.filter(h => h.timestamp > Date.now() - 5 * 60 * 1000);
    data.errorCount = last5min.filter(h => h.typ.includes('ERROR')).length;

    // Uptime
    if (window.productionMonitor) {
      const stats = window.productionMonitor.getStats();
      data.uptimeSeconds = stats.uptime_seconds || 0;
      data.hours = data.uptimeSeconds / 3600;
    }

    return data;
  }

  /**
   * WYWOŁANIE ALERTU
   */
  function fireAlert(alert, rule) {
    // Zapisz w historii
    alertState.alertHistory.push(alert);
    alertState.stats.totalAlerts++;
    alertState.stats.alertsBySeverity[alert.severity]++;

    // Zapisz w magazynie
    magazyn.dodajDoHistorii('ALERT_FIRED', {
      alert_id: alert.id,
      alert_name: alert.name,
      severity: alert.severity,
      message: alert.message,
      data: alert.data
    });

    // Notyfikacje
    if (ALERT_CONFIG.notificationMethods.console) {
      logAlertToConsole(alert);
    }

    if (ALERT_CONFIG.notificationMethods.desktop) {
      showDesktopNotification(alert);
    }

    if (ALERT_CONFIG.notificationMethods.sound) {
      playAlertSound(alert.severity);
    }

    // Wywołaj akcję reguły
    if (rule.action) {
      try {
        rule.action();
      } catch (actionError) {
        console.error('❌ [Alerting] Błąd akcji alertu:', actionError);
      }
    }

    console.log(`🔔 [Alerting] Alert wywołany: ${alert.name}`);
  }

  /**
   * LOG W KONSOLI
   */
  function logAlertToConsole(alert) {
    const style = getConsoleStyle(alert.severity);
    console.group(`%c${alert.toString()}`, style);
    console.log('Timestamp:', new Date(alert.timestamp).toLocaleString('pl-PL'));
    console.log('Data:', alert.data);
    console.groupEnd();
  }

  /**
   * Style konsoli
   */
  function getConsoleStyle(severity) {
    const styles = {
      info: 'background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      warning: 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      error: 'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      critical: 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;'
    };
    return styles[severity] || '';
  }

  /**
   * DESKTOP NOTIFICATION
   */
  function showDesktopNotification(alert) {
    if (!('Notification' in window)) return;

    // Poproś o pozwolenie
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      new Notification(alert.name, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === AlertSeverity.CRITICAL
      });
    }
  }

  /**
   * DŹWIĘK ALERTU
   */
  function playAlertSound(severity) {
    try {
      // Web Audio API - generuj prosty beep
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Częstotliwość zależna od severity
      const frequencies = {
        info: 440,      // A4
        warning: 554,   // C#5
        error: 659,     // E5
        critical: 880   // A5
      };
      oscillator.frequency.value = frequencies[severity] || 440;

      // Volume
      gainNode.gain.value = 0.1;

      // Play
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2); // 200ms

      // Dla critical - powtórz 3 razy
      if (severity === AlertSeverity.CRITICAL) {
        setTimeout(() => oscillator.start(), 300);
        setTimeout(() => oscillator.start(), 600);
      }

    } catch (error) {
      console.warn('⚠️ [Alerting] Nie można odtworzyć dźwięku:', error);
    }
  }

  /**
   * INICJALIZACJA ALERTINGU
   */
  function initializeAlerting() {
    if (!ALERT_CONFIG.enabled) {
      console.log('⏸️ [Alerting] System alertów wyłączony');
      return;
    }

    console.log('🚀 [Alerting] Inicjalizacja...');

    // Poproś o pozwolenie na notyfikacje
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Pozwolenie na notyfikacje:', permission);
      });
    }

    // Cykliczne sprawdzanie
    alertState.timers.check = setInterval(checkAlertRules, ALERT_CONFIG.checkInterval);

    // Pierwsze sprawdzenie po 10s
    setTimeout(checkAlertRules, 10000);

    // Zapisz inicjalizację
    magazyn.dodajDoHistorii('ALERTING_INIT', {
      rules_count: ALERT_RULES.length,
      config: ALERT_CONFIG
    });

    console.log(`✅ [Alerting] Załadowano ${ALERT_RULES.length} reguł alertów`);
  }

  /**
   * ZATRZYMANIE ALERTINGU
   */
  function stopAlerting() {
    if (alertState.timers.check) {
      clearInterval(alertState.timers.check);
    }
    console.log('⏹️ [Alerting] Zatrzymany');
  }

  /**
   * PUBLICZNE API
   */
  window.alerting = {
    config: ALERT_CONFIG,
    rules: ALERT_RULES,
    init: initializeAlerting,
    stop: stopAlerting,
    check: checkAlertRules,
    getHistory: () => alertState.alertHistory,
    getStats: () => alertState.stats,
    acknowledgeAlert: (alertId) => {
      const alert = alertState.alertHistory.find(a => a.id === alertId);
      if (alert) alert.acknowledge();
    },
    clearHistory: () => {
      alertState.alertHistory = [];
      alertState.firedAlerts.clear();
    }
  };

  /**
   * AUTO-INIT
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAlerting);
  } else {
    initializeAlerting();
  }

})(window);
