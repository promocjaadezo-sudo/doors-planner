#!/usr/bin/env node

/**
 * Test Runner for Task Grouping and Sync Tests
 * 
 * Uruchamia testy jednostkowe dla funkcji grupowania zadań i synchronizacji
 */

const path = require('path');
const fs = require('fs');

console.log('🚀 Task Grouping & Sync Test Runner\n');
console.log('═'.repeat(70));

async function runTests() {
  try {
    // Load test file
    const testFile = path.join(__dirname, 'task-grouping-sync.test.js');
    
    if (!fs.existsSync(testFile)) {
      console.error('❌ Plik testów nie istnieje:', testFile);
      process.exit(1);
    }
    
    console.log('📄 Ładuję testy z:', testFile);
    
    const { runner } = require(testFile);
    
    // Run tests
    const results = await runner.run();
    
    // Save report
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `grouping-sync-test-report-${timestamp}.json`);
    
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    
    console.log('═'.repeat(70));
    console.log('💾 RAPORT ZAPISANY');
    console.log('═'.repeat(70));
    console.log('📄 Plik:', path.basename(reportFile));
    console.log('📍 Lokalizacja:', reportFile);
    console.log('═'.repeat(70));
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Błąd podczas uruchamiania testów:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
