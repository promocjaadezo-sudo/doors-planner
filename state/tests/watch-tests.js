/**
 * Test Watcher - Automatyczne uruchamianie testów przy zmianie plików
 * Monitoruje pliki źródłowe i automatycznie uruchamia testy
 */

const fs = require('fs');
const path = require('path');
const { runTests } = require('./run-tests-node');

// Pliki do monitorowania
const watchFiles = [
  path.join(__dirname, '..', 'CentralnyMagazynStanu.js'),
  path.join(__dirname, 'unit-tests.js')
];

console.log('\n' + '═'.repeat(70));
console.log('👁️  TEST WATCHER - Monitorowanie zmian w plikach');
console.log('═'.repeat(70));
console.log('📂 Monitorowane pliki:');
watchFiles.forEach(file => {
  console.log(`   - ${path.relative(path.join(__dirname, '..', '..'), file)}`);
});
console.log('═'.repeat(70));
console.log('⏳ Oczekiwanie na zmiany... (Ctrl+C aby zatrzymać)\n');

let isRunning = false;
let lastRunTime = 0;
const debounceDelay = 1000; // 1 sekunda opóźnienia

// Funkcja do uruchomienia testów z debounce
async function runTestsWithDebounce() {
  const now = Date.now();
  
  // Ignoruj jeśli testy już są uruchamiane lub minęło za mało czasu
  if (isRunning || (now - lastRunTime) < debounceDelay) {
    return;
  }

  isRunning = true;
  lastRunTime = now;

  console.log('\n🔄 Wykryto zmianę - uruchamiam testy...\n');

  try {
    await runTests();
  } catch (error) {
    console.error('❌ Błąd podczas uruchamiania testów:', error);
  }

  isRunning = false;
  console.log('\n⏳ Oczekiwanie na kolejne zmiany...\n');
}

// Monitoruj każdy plik
watchFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.watch(file, (eventType, filename) => {
      if (eventType === 'change') {
        console.log(`\n📝 Zmiana w pliku: ${path.basename(file)}`);
        runTestsWithDebounce();
      }
    });
    console.log(`✅ Monitorowanie: ${path.basename(file)}`);
  } else {
    console.log(`⚠️  Plik nie istnieje: ${path.basename(file)}`);
  }
});

// Uruchom testy przy starcie
console.log('\n🚀 Uruchamiam testy początkowe...\n');
runTestsWithDebounce();

// Obsługa graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Zatrzymywanie watchera...');
  console.log('✅ Watcher zatrzymany pomyślnie\n');
  process.exit(0);
});
