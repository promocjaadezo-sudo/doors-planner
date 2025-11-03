/**
 * Testy Jednostkowe - Centralny Magazyn Stanu
 * Framework: Własna implementacja z raportowaniem
 */

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  describe(suiteName, testSuite) {
    console.log(`\n📦 Test Suite: ${suiteName}`);
    testSuite();
  }

  it(testName, testFn) {
    this.tests.push({ name: testName, fn: testFn });
  }

  async run() {
    console.log('🧪 Rozpoczynam testy jednostkowe...\n');
    const startTime = Date.now();

    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.passed++;
        this.results.details.push({
          name: test.name,
          status: 'PASS',
          error: null
        });
        console.log(`  ✅ ${test.name}`);
      } catch (error) {
        this.results.failed++;
        this.results.details.push({
          name: test.name,
          status: 'FAIL',
          error: error.message
        });
        console.log(`  ❌ ${test.name}`);
        console.log(`     Błąd: ${error.message}`);
      }
    }

    this.results.total = this.tests.length;
    const duration = Date.now() - startTime;

    console.log('\n' + '═'.repeat(60));
    console.log(`📊 Podsumowanie Testów`);
    console.log('═'.repeat(60));
    console.log(`✅ Zaliczone: ${this.results.passed}/${this.results.total}`);
    console.log(`❌ Niezaliczone: ${this.results.failed}/${this.results.total}`);
    console.log(`⏱️  Czas wykonania: ${duration}ms`);
    console.log(`📈 Wskaźnik sukcesu: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
    console.log('═'.repeat(60));

    return this.results;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: Math.round((this.results.passed / this.results.total) * 100)
      },
      tests: this.results.details
    };

    return JSON.stringify(report, null, 2);
  }
}

// Funkcje pomocnicze do asercji
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Oczekiwano "${expected}", otrzymano "${actual}"`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Oczekiwano ${JSON.stringify(expected)}, otrzymano ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Oczekiwano wartości prawdziwej, otrzymano "${actual}"`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Oczekiwano wartości fałszywej, otrzymano "${actual}"`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Oczekiwano null, otrzymano "${actual}"`);
      }
    },
    toBeInstanceOf(expectedClass) {
      if (!(actual instanceof expectedClass)) {
        throw new Error(`Oczekiwano instancji ${expectedClass.name}, otrzymano ${typeof actual}`);
      }
    },
    toHaveLength(expectedLength) {
      if (!actual || actual.length !== expectedLength) {
        throw new Error(`Oczekiwano długości ${expectedLength}, otrzymano ${actual?.length}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Oczekiwano że zawiera "${expected}", ale nie znaleziono`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Oczekiwano wartości większej niż ${expected}, otrzymano ${actual}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (actual > expected) {
        throw new Error(`Oczekiwano wartości <= ${expected}, otrzymano ${actual}`);
      }
    }
  };
}

// ============================================
// TESTY JEDNOSTKOWE
// ============================================

// Utwórz instancję runnera (globalną dla kompatybilności)
const runner = new TestRunner();

// Eksport dla Node.js (musi być przed testami)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runner, TestRunner, expect };
}

// ============================================
// 1. TESTY INICJALIZACJI
// ============================================
runner.describe('Inicjalizacja Magazynu', () => {
  
  runner.it('powinien utworzyć instancję singletona', () => {
    const instance1 = CentralnyMagazynStanu.getInstance();
    const instance2 = CentralnyMagazynStanu.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  runner.it('powinien mieć poprawną strukturę stanu początkowego', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    const stan = magazyn.getStan();
    
    expect(Array.isArray(stan.historiaCzatu)).toBeTruthy();
    expect(typeof stan.statusAI).toBe('string');
    expect(stan.aktywnaSesjaId === null || typeof stan.aktywnaSesjaId === 'string').toBeTruthy();
  });

  runner.it('powinien mieć ustawioną stałą MAX_HISTORIA_SIZE', () => {
    expect(CentralnyMagazynStanu.MAX_HISTORIA_SIZE).toBe(1000);
  });
});

// ============================================
// 2. TESTY DODAWANIA WPISÓW DO HISTORII
// ============================================
runner.describe('Dodawanie Wpisów do Historii', () => {
  
  runner.it('powinien dodać wiadomość do historii', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const lengthBefore = magazyn.getStan().historiaCzatu.length;
    magazyn.dodajDoHistorii('Test wiadomości');
    const lengthAfter = magazyn.getStan().historiaCzatu.length;
    
    expect(lengthAfter).toBe(lengthBefore + 1);
  });

  runner.it('powinien zwrócić obiekt z dodanej wiadomości', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const result = magazyn.dodajDoHistorii('Test zwracania');
    
    expect(typeof result).toBe('object');
    expect(result.tekst).toBe('Test zwracania');
    expect('timestamp' in result).toBeTruthy();
  });

  runner.it('powinien dodać wiele wiadomości po kolei', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    magazyn.dodajDoHistorii('Wiadomość 1');
    magazyn.dodajDoHistorii('Wiadomość 2');
    magazyn.dodajDoHistorii('Wiadomość 3');
    
    const stan = magazyn.getStan();
    expect(stan.historiaCzatu.length).toBe(3);
  });
});

// ============================================
// 3. TESTY TIMESTAMPÓW
// ============================================
runner.describe('Timestampy', () => {
  
  runner.it('powinien dodać timestamp do wiadomości', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const msg = magazyn.dodajDoHistorii('Test timestamp');
    
    expect(typeof msg.timestamp).toBe('string');
    expect(msg.timestamp).toContain('T');
    expect(msg.timestamp).toContain('Z');
  });

  runner.it('timestamp powinien być w formacie ISO 8601', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const msg = magazyn.dodajDoHistorii('Test ISO');
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    
    expect(isoRegex.test(msg.timestamp)).toBeTruthy();
  });

  runner.it('timestamp powinien być aktualny (w ciągu 5 sekund)', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const msg = magazyn.dodajDoHistorii('Test aktualności');
    const msgTime = new Date(msg.timestamp).getTime();
    const now = Date.now();
    
    expect(Math.abs(now - msgTime)).toBeLessThanOrEqual(5000);
  });

  runner.it('kolejne timestampy powinny rosnąć monotonnie', async () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const msg1 = magazyn.dodajDoHistorii('Wiadomość 1');
    await new Promise(resolve => setTimeout(resolve, 10));
    const msg2 = magazyn.dodajDoHistorii('Wiadomość 2');
    await new Promise(resolve => setTimeout(resolve, 10));
    const msg3 = magazyn.dodajDoHistorii('Wiadomość 3');
    
    const time1 = new Date(msg1.timestamp).getTime();
    const time2 = new Date(msg2.timestamp).getTime();
    const time3 = new Date(msg3.timestamp).getTime();
    
    expect(time1 < time2).toBeTruthy();
    expect(time2 < time3).toBeTruthy();
  });
});

// ============================================
// 4. TESTY LIMITOWANIA ROZMIARU HISTORII
// ============================================
runner.describe('Limitowanie Rozmiaru Historii', () => {
  
  runner.it('powinien zachować historię poniżej limitu', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    for (let i = 0; i < 50; i++) {
      magazyn.dodajDoHistorii(`Wiadomość ${i}`);
    }
    
    const stan = magazyn.getStan();
    expect(stan.historiaCzatu.length).toBe(50);
  });

  runner.it('powinien ograniczyć historię do MAX_HISTORIA_SIZE przy przekroczeniu', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const limit = CentralnyMagazynStanu.MAX_HISTORIA_SIZE;
    
    // Dodaj więcej niż limit
    for (let i = 0; i < limit + 50; i++) {
      magazyn.dodajDoHistorii(`Wiadomość ${i}`);
    }
    
    const stan = magazyn.getStan();
    expect(stan.historiaCzatu.length).toBe(limit);
  });

  runner.it('powinien zachować najnowsze wpisy po przekroczeniu limitu', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const limit = CentralnyMagazynStanu.MAX_HISTORIA_SIZE;
    
    // Dodaj 1005 wiadomości
    for (let i = 0; i < limit + 5; i++) {
      magazyn.dodajDoHistorii(`Wiadomość ${i}`);
    }
    
    const stan = magazyn.getStan();
    const lastMessage = stan.historiaCzatu[stan.historiaCzatu.length - 1];
    
    // Ostatnia wiadomość powinna być "Wiadomość 1004"
    expect(lastMessage.tekst).toContain('1004');
  });
});

// ============================================
// 5. TESTY IMMUTABILITY (getStan)
// ============================================
runner.describe('Immutability - getStan()', () => {
  
  runner.it('powinien zwrócić kopię stanu, nie referencję', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const stan1 = magazyn.getStan();
    const stan2 = magazyn.getStan();
    
    expect(stan1 !== stan2).toBeTruthy();
  });

  runner.it('modyfikacja zwróconego stanu nie powinna wpłynąć na oryginalny', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    magazyn.ustawStatus('processing');
    
    const statusBefore = magazyn.getStan().statusAI;
    const kopia = magazyn.getStan();
    kopia.statusAI = 'ZMIENIONY';
    const statusAfter = magazyn.getStan().statusAI;
    
    expect(statusBefore).toBe(statusAfter);
    expect(statusAfter).toBe('processing');
  });

  runner.it('modyfikacja tablicy historiaCzatu na kopii nie powinna wpłynąć na oryginał', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    magazyn.dodajDoHistorii('Test');
    
    const lengthBefore = magazyn.getStan().historiaCzatu.length;
    const kopia = magazyn.getStan();
    kopia.historiaCzatu.push({ tekst: 'NIELEGALNA', timestamp: new Date().toISOString() });
    const lengthAfter = magazyn.getStan().historiaCzatu.length;
    
    expect(lengthBefore).toBe(lengthAfter);
  });
});

// ============================================
// 6. TESTY WALIDACJI JSON
// ============================================
runner.describe('Walidacja importujZJSON()', () => {
  
  runner.it('powinien zaimportować poprawny JSON', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const validJSON = JSON.stringify({
      historiaCzatu: [{ tekst: 'Test', timestamp: '2025-11-02T12:00:00.000Z' }],
      statusAI: 'idle',
      aktywnaSesjaId: 'test-123'
    });
    
    const result = magazyn.importujZJSON(validJSON);
    expect(result).toBe(true);
  });

  runner.it('powinien odrzucić JSON gdzie historiaCzatu nie jest tablicą', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const invalidJSON = JSON.stringify({
      historiaCzatu: 'to nie jest tablica',
      statusAI: 'idle'
    });
    
    const result = magazyn.importujZJSON(invalidJSON);
    expect(result).toBe(false);
  });

  runner.it('powinien odrzucić JSON gdzie statusAI nie jest stringiem', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const invalidJSON = JSON.stringify({
      historiaCzatu: [],
      statusAI: 123
    });
    
    const result = magazyn.importujZJSON(invalidJSON);
    expect(result).toBe(false);
  });

  runner.it('powinien odrzucić JSON gdzie statusAI ma nieprawidłową wartość', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const invalidJSON = JSON.stringify({
      historiaCzatu: [],
      statusAI: 'invalid_status'
    });
    
    const result = magazyn.importujZJSON(invalidJSON);
    expect(result).toBe(false);
  });

  runner.it('powinien odrzucić nieprawidłowy JSON (syntax error)', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const malformedJSON = '{ "historiaCzatu": [, "statusAI": "idle" }';
    
    const result = magazyn.importujZJSON(malformedJSON);
    expect(result).toBe(false);
  });

  runner.it('powinien zaakceptować starą strukturę (stringi w historii)', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const oldFormatJSON = JSON.stringify({
      historiaCzatu: ['Stara wiadomość 1', 'Stara wiadomość 2'],
      statusAI: 'idle'
    });
    
    const result = magazyn.importujZJSON(oldFormatJSON);
    expect(result).toBe(true);
  });
});

// ============================================
// 7. TESTY OBSŁUGI BŁĘDÓW
// ============================================
runner.describe('Obsługa Błędów', () => {
  
  runner.it('powinien ustawić status error przy nieudanym imporcie', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const invalidJSON = JSON.stringify({
      historiaCzatu: 'nieprawidłowe',
      statusAI: 'idle'
    });
    
    magazyn.importujZJSON(invalidJSON);
    const stan = magazyn.getStan();
    
    expect(stan.statusAI).toBe('error');
  });

  runner.it('powinien zapisać komunikat błędu w ostatniBlad', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    const invalidJSON = JSON.stringify({
      historiaCzatu: 123,
      statusAI: 'idle'
    });
    
    magazyn.importujZJSON(invalidJSON);
    const stan = magazyn.getStan();
    
    expect(typeof stan.ostatniBlad).toBe('string');
    expect(stan.ostatniBlad.length).toBeGreaterThan(0);
  });

  runner.it('ustawStatus powinien zapisać błąd', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    magazyn.ustawStatus('error', 'Test błędu');
    const stan = magazyn.getStan();
    
    expect(stan.statusAI).toBe('error');
    expect(stan.ostatniBlad).toBe('Test błędu');
  });

  runner.it('powinien wyczyścić błąd przy udanym imporcie', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    // Najpierw ustaw błąd
    magazyn.ustawStatus('error', 'Test błędu');
    
    // Potem zaimportuj poprawny JSON
    const validJSON = JSON.stringify({
      historiaCzatu: [],
      statusAI: 'idle'
    });
    
    magazyn.importujZJSON(validJSON);
    const stan = magazyn.getStan();
    
    expect(stan.statusAI).toBe('idle');
  });
});

// ============================================
// 8. TESTY POZOSTAŁYCH METOD
// ============================================
runner.describe('Pozostałe Metody', () => {
  
  runner.it('ustawSesje powinien ustawić ID sesji', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    magazyn.ustawSesje('test-session-456');
    const stan = magazyn.getStan();
    
    expect(stan.aktywnaSesjaId).toBe('test-session-456');
  });

  runner.it('ustawStatus powinien zmienić status AI', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    
    magazyn.ustawStatus('processing');
    const stan = magazyn.getStan();
    
    expect(stan.statusAI).toBe('processing');
  });

  runner.it('resetujStan powinien zresetować wszystkie pola', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    
    magazyn.dodajDoHistorii('Test');
    magazyn.ustawSesje('test-123');
    magazyn.ustawStatus('processing');
    
    magazyn.resetujStan();
    const stan = magazyn.getStan();
    
    expect(stan.historiaCzatu).toHaveLength(0);
    expect(stan.aktywnaSesjaId).toBeNull();
    expect(stan.statusAI).toBe('idle');
  });

  runner.it('exportujDoJSON powinien zwrócić string JSON', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    magazyn.dodajDoHistorii('Test eksportu');
    
    const jsonString = magazyn.exportujDoJSON();
    
    expect(typeof jsonString).toBe('string');
    expect(jsonString).toContain('historiaCzatu');
    expect(jsonString).toContain('statusAI');
  });

  runner.it('eksportowany JSON powinien być poprawnie parsowany', () => {
    const magazyn = CentralnyMagazynStanu.getInstance();
    magazyn.resetujStan();
    magazyn.dodajDoHistorii('Test');
    
    const jsonString = magazyn.exportujDoJSON();
    const parsed = JSON.parse(jsonString);
    
    expect(Array.isArray(parsed.historiaCzatu)).toBeTruthy();
    expect(typeof parsed.statusAI).toBe('string');
  });
});

// ============================================
// KONIEC TESTÓW
// ============================================
// Eksport jest już zdefiniowany na początku pliku (linia ~147)
