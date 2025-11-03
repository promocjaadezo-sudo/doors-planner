/**
 * Automatyczny Runner Testów - Node.js
 * Uruchamia testy jednostkowe w środowisku Node.js
 */

const fs = require('fs');
const path = require('path');

// Załaduj Centralny Magazyn Stanu (używając require - plik ma już export)
const CentralnyMagazynStanu = require('../CentralnyMagazynStanu.js');

// Ustaw jako globalny dla testów
global.CentralnyMagazynStanu = CentralnyMagazynStanu;

// Załaduj testy
const { runner } = require('./unit-tests.js');

// Funkcja do uruchomienia testów
async function runTests() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 AUTOMATYCZNE URUCHOMIENIE TESTÓW JEDNOSTKOWYCH');
  console.log('═'.repeat(70));
  console.log(`📅 Data: ${new Date().toLocaleString('pl-PL')}`);
  console.log(`📂 Projekt: Centralny Magazyn Stanu`);
  console.log('═'.repeat(70) + '\n');

  try {
    // Uruchom wszystkie testy
    const results = await runner.run();

    // Generuj raport JSON
    const report = JSON.parse(runner.generateReport());

    // Zapisz raport do pliku
    const reportFileName = `test-report-${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
    const reportPath = path.join(__dirname, 'reports', reportFileName);

    // Utwórz katalog reports jeśli nie istnieje
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '═'.repeat(70));
    console.log('💾 RAPORT ZAPISANY');
    console.log('═'.repeat(70));
    console.log(`📄 Plik: ${reportFileName}`);
    console.log(`📍 Lokalizacja: ${reportPath}`);
    console.log('═'.repeat(70) + '\n');

    // Zwróć kod wyjścia
    return results.failed === 0 ? 0 : 1;

  } catch (error) {
    console.error('\n❌ BŁĄD PODCZAS URUCHAMIANIA TESTÓW:', error);
    return 1;
  }
}

// Jeśli uruchomiono bezpośrednio
if (require.main === module) {
  runTests().then(exitCode => {
    process.exit(exitCode);
  });
}

module.exports = { runTests };
