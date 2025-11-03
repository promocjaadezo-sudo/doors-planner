/**
 * Centralny Magazyn Stanu - Singleton
 * Zarządza globalnym stanem aplikacji doors-planner
 */

class CentralnyMagazynStanu {
  static instance = null;
  static MAX_HISTORIA_SIZE = 1000; // Maksymalny rozmiar historii
  
  constructor() {
    if (CentralnyMagazynStanu.instance) {
      return CentralnyMagazynStanu.instance;
    }
    
    this.stan = {
      historiaCzatu: [],
      aktywnaSesjaId: null,
      statusAI: 'idle',
      ostatniBlad: undefined
    };
    
    CentralnyMagazynStanu.instance = this;
    console.log('✅ CentralnyMagazynStanu: Zainicjalizowano singleton');
  }
  
  /**
   * Pobiera instancję singletona
   * @returns {CentralnyMagazynStanu}
   */
  static getInstance() {
    if (!CentralnyMagazynStanu.instance) {
      CentralnyMagazynStanu.instance = new CentralnyMagazynStanu();
    }
    return CentralnyMagazynStanu.instance;
  }
  
  /**
   * Pobiera aktualny stan aplikacji
   * Zwraca głęboką kopię stanu, aby zapobiec przypadkowej mutacji
   * @returns {Object} Głęboka kopia stanu aplikacji
   */
  getStan() {
    // Zwróć głęboką kopię stanu zamiast referencji
    return JSON.parse(JSON.stringify(this.stan));
  }
  
  /**
   * Ustawia status AI
   * @param {'idle' | 'processing' | 'error'} status
   * @param {string} [blad]
   */
  ustawStatus(status, blad) {
    this.stan.statusAI = status;
    this.stan.ostatniBlad = blad;
    console.log(`🔄 CentralnyMagazynStanu: Status AI zmieniony na "${status}"`, blad ? `(błąd: ${blad})` : '');
  }
  
  /**
   * Dodaje wiadomość do historii czatu
   * Automatycznie usuwa najstarsze wpisy, gdy przekroczony zostanie limit
   * @param {string} wiadomosc - Tekst wiadomości do zapisania
   * @returns {Object} Zwraca utworzony obiekt wiadomości z timestampem
   */
  dodajDoHistorii(wiadomosc) {
    // Utwórz obiekt wiadomości z timestampem
    const wiadomoscObj = {
      tekst: wiadomosc,
      timestamp: new Date().toISOString()
    };
    
    this.stan.historiaCzatu.push(wiadomoscObj);
    
    // Sprawdź, czy przekroczono limit
    if (this.stan.historiaCzatu.length > CentralnyMagazynStanu.MAX_HISTORIA_SIZE) {
      const usuniete = this.stan.historiaCzatu.length - CentralnyMagazynStanu.MAX_HISTORIA_SIZE;
      this.stan.historiaCzatu = this.stan.historiaCzatu.slice(-CentralnyMagazynStanu.MAX_HISTORIA_SIZE);
      console.log(`⚠️ CentralnyMagazynStanu: Usunięto ${usuniete} najstarszych wpisów (limit: ${CentralnyMagazynStanu.MAX_HISTORIA_SIZE})`);
    }
    
    console.log(`💬 CentralnyMagazynStanu: Dodano do historii (${this.stan.historiaCzatu.length}/${CentralnyMagazynStanu.MAX_HISTORIA_SIZE} wiadomości)`);
    return wiadomoscObj;
  }
  
  /**
   * Pobiera historię czatu
   * @returns {Array} Tablica wiadomości z historii czatu
   */
  pobierzHistorie() {
    return this.stan.historiaCzatu;
  }
  
  /**
   * Ustawia aktywną sesję
   * @param {string} idSesji
   */
  ustawSesje(idSesji) {
    this.stan.aktywnaSesjaId = idSesji;
    console.log(`🔗 CentralnyMagazynStanu: Aktywna sesja: ${idSesji}`);
  }
  
  /**
   * Resetuje stan do wartości początkowych
   */
  resetujStan() {
    this.stan = {
      historiaCzatu: [],
      aktywnaSesjaId: null,
      statusAI: 'idle',
      ostatniBlad: undefined
    };
    console.log('🔄 CentralnyMagazynStanu: Stan zresetowany');
  }
  
  /**
   * Eksportuje stan do JSON
   * @returns {string}
   */
  exportujDoJSON() {
    return JSON.stringify(this.stan, null, 2);
  }
  
  /**
   * Importuje stan z JSON z pełną walidacją struktury
   * @param {string} jsonString - String JSON do zaimportowania
   * @returns {boolean} True jeśli import się powiódł, false w przeciwnym razie
   */
  importujZJSON(jsonString) {
    try {
      // Parsuj JSON
      const nowystan = JSON.parse(jsonString);
      
      // Walidacja struktury
      const validationErrors = this._walidujStrukture(nowystan);
      
      if (validationErrors.length > 0) {
        const errorMessage = `Nieprawidłowa struktura stanu: ${validationErrors.join(', ')}`;
        console.error('❌ CentralnyMagazynStanu: Walidacja nieudana:', validationErrors);
        this.ustawStatus('error', errorMessage);
        return false;
      }
      
      // Import tylko zwalidowanych danych
      this.stan = { ...this.stan, ...nowystan };
      console.log('✅ CentralnyMagazynStanu: Stan zaimportowany i zwalidowany pomyślnie');
      
      // Wyczyść błędy jeśli import się powiódł
      if (this.stan.statusAI === 'error' && this.stan.ostatniBlad?.includes('Nieprawidłowa struktura')) {
        this.ustawStatus('idle');
      }
      
      return true;
    } catch (error) {
      const errorMessage = `Błąd parsowania JSON: ${error.message}`;
      console.error('❌ CentralnyMagazynStanu: Błąd importu JSON:', error);
      this.ustawStatus('error', errorMessage);
      return false;
    }
  }
  
  /**
   * Waliduje strukturę importowanego stanu
   * @private
   * @param {Object} stan - Stan do walidacji
   * @returns {Array<string>} Tablica błędów walidacji (pusta jeśli OK)
   */
  _walidujStrukture(stan) {
    const errors = [];
    
    // Sprawdź czy stan jest obiektem
    if (typeof stan !== 'object' || stan === null) {
      errors.push('Stan musi być obiektem');
      return errors;
    }
    
    // Walidacja historiaCzatu
    if ('historiaCzatu' in stan) {
      if (!Array.isArray(stan.historiaCzatu)) {
        errors.push('historiaCzatu musi być tablicą');
      } else {
        // Sprawdź każdy element tablicy
        stan.historiaCzatu.forEach((item, index) => {
          if (typeof item === 'string') {
            // Stary format - OK dla wstecznej kompatybilności
          } else if (typeof item === 'object' && item !== null) {
            // Nowy format { tekst, timestamp }
            if (!('tekst' in item) || typeof item.tekst !== 'string') {
              errors.push(`historiaCzatu[${index}] musi mieć pole 'tekst' typu string`);
            }
            if (!('timestamp' in item) || typeof item.timestamp !== 'string') {
              errors.push(`historiaCzatu[${index}] musi mieć pole 'timestamp' typu string`);
            }
          } else {
            errors.push(`historiaCzatu[${index}] ma nieprawidłowy typ`);
          }
        });
      }
    }
    
    // Walidacja statusAI
    if ('statusAI' in stan) {
      if (typeof stan.statusAI !== 'string') {
        errors.push('statusAI musi być stringiem');
      } else {
        const dozwoloneStatusy = ['idle', 'processing', 'error'];
        if (!dozwoloneStatusy.includes(stan.statusAI)) {
          errors.push(`statusAI musi być jednym z: ${dozwoloneStatusy.join(', ')}`);
        }
      }
    }
    
    // Walidacja aktywnaSesjaId
    if ('aktywnaSesjaId' in stan) {
      if (stan.aktywnaSesjaId !== null && typeof stan.aktywnaSesjaId !== 'string') {
        errors.push('aktywnaSesjaId musi być stringiem lub null');
      }
    }
    
    // Walidacja ostatniBlad
    if ('ostatniBlad' in stan) {
      if (stan.ostatniBlad !== undefined && stan.ostatniBlad !== null && typeof stan.ostatniBlad !== 'string') {
        errors.push('ostatniBlad musi być stringiem, null lub undefined');
      }
    }
    
    return errors;
  }
}

// Export dla użycia w różnych kontekstach
if (typeof module !== 'undefined' && module.exports) {
  // Node.js / CommonJS
  module.exports = CentralnyMagazynStanu;
} else {
  // Browser / Global scope
  window.CentralnyMagazynStanu = CentralnyMagazynStanu;
}
