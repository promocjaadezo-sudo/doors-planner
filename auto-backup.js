/**
 * Automatyczny system backupów dla index.html
 * Uruchom: node auto-backup.js
 */

const fs = require('fs');
const path = require('path');

const WATCH_FILE = 'index.html';
const BACKUP_DIR = 'backups/auto';
const DEBOUNCE_MS = 2000; // Czekaj 2s po ostatniej zmianie przed zapisem

let saveTimeout = null;
let lastHash = null;

// Utwórz folder backupów
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Funkcja do hashowania zawartości (prosty hash)
function simpleHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Funkcja zapisująca backup
function saveBackup() {
  try {
    const content = fs.readFileSync(WATCH_FILE, 'utf8');
    const hash = simpleHash(content);
    
    // Sprawdź czy plik się zmienił
    if (hash === lastHash) {
      console.log('⏭️  Pominięto - brak zmian w treści');
      return;
    }
    
    lastHash = hash;
    
    // Wygeneruj nazwę pliku z datą
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    
    const backupFile = path.join(BACKUP_DIR, `index_${timestamp}.html`);
    
    // Zapisz kopię
    fs.copyFileSync(WATCH_FILE, backupFile);
    
    // Dodaj metadane
    const metaFile = path.join(BACKUP_DIR, `index_${timestamp}.json`);
    const meta = {
      timestamp: now.toISOString(),
      dateLocal: now.toLocaleString('pl-PL'),
      originalFile: WATCH_FILE,
      hash: hash,
      size: content.length
    };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    
    console.log(`✅ Zapisano backup: ${backupFile}`);
    console.log(`   Rozmiar: ${(content.length / 1024).toFixed(2)} KB`);
    
    // Usuń stare backupy (zostaw ostatnie 50)
    cleanOldBackups();
    
  } catch (error) {
    console.error('❌ Błąd podczas tworzenia backupu:', error.message);
  }
}

// Funkcja czyszcząca stare backupy
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.html'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Usuń wszystkie poza 50 najnowszymi
    if (files.length > 50) {
      const toDelete = files.slice(50);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        const metaPath = file.path.replace('.html', '.json');
        if (fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
        }
      });
      console.log(`🗑️  Usunięto ${toDelete.length} starych backupów`);
    }
  } catch (error) {
    console.error('⚠️  Błąd podczas czyszczenia backupów:', error.message);
  }
}

// Nasłuchuj zmian w pliku
console.log(`👁️  Obserwuję plik: ${WATCH_FILE}`);
console.log(`📁 Backupy zapisywane do: ${BACKUP_DIR}`);
console.log(`⏱️  Debounce: ${DEBOUNCE_MS}ms\n`);

fs.watch(WATCH_FILE, (eventType) => {
  if (eventType === 'change') {
    console.log(`📝 Wykryto zmianę w pliku...`);
    
    // Anuluj poprzedni timer
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Ustaw nowy timer - zapisz po 2s od ostatniej zmiany
    saveTimeout = setTimeout(() => {
      saveBackup();
    }, DEBOUNCE_MS);
  }
});

// Zapisz pierwszą kopię przy starcie
console.log('🚀 System backupów uruchomiony!\n');
saveBackup();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Zatrzymuję system backupów...');
  process.exit(0);
});
