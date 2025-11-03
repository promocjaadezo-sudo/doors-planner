# 🔒 Backup & Rollback System - Kompleksowa dokumentacja

**Wersja:** 1.0.0  
**Data:** 2025-11-02  
**Status:** ✅ Production Ready

---

## 📋 Spis treści

1. [Przegląd systemu](#przegląd-systemu)
2. [Architektura](#architektura)
3. [Instalacja](#instalacja)
4. [BackupManager](#backupmanager)
5. [RollbackManager](#rollbackmanager)
6. [VersionManager](#versionmanager)
7. [DeploymentPanel](#deploymentpanel)
8. [Workflow wdrożenia](#workflow-wdrożenia)
9. [Disaster Recovery Plan](#disaster-recovery-plan)
10. [Best Practices](#best-practices)
11. [API Reference](#api-reference)
12. [Troubleshooting](#troubleshooting)

---

## Przegląd systemu

System backup i rollback zapewnia **bezpieczne wdrożenia** aplikacji z możliwością szybkiego powrotu do poprzedniej wersji w przypadku problemów.

### Kluczowe cechy

✅ **Automatyczne backupy** przed wdrożeniem  
✅ **One-click rollback** do poprzedniej wersji  
✅ **Semantic versioning** (MAJOR.MINOR.PATCH)  
✅ **Walidacja backupów** (checksum verification)  
✅ **Deployment checklist** z auto-verification  
✅ **Interaktywny UI panel** (hotkey: Ctrl+Shift+D)  
✅ **Emergency rollback** w jednym kliknięciu  
✅ **Historia wdrożeń** i rollbacków  

### Komponenty

| Komponent | Plik | Rozmiar | Funkcja |
|-----------|------|---------|---------|
| BackupManager | backup-manager.js | ~800 linii | Tworzenie i zarządzanie backupami |
| RollbackManager | rollback-manager.js | ~600 linii | Przywracanie poprzednich wersji |
| VersionManager | version-manager.js | ~700 linii | Wersjonowanie aplikacji |
| DeploymentPanel | deployment-panel.js | ~1000 linii | Interaktywny UI panel |

---

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                     DeploymentPanel (UI)                     │
│  Ctrl+Shift+D - Interaktywny panel z checklistą i kontrolą  │
└────────┬─────────────────────────────────┬─────────────┬────┘
         │                                 │             │
         ▼                                 ▼             ▼
┌────────────────┐           ┌─────────────────┐  ┌──────────────┐
│ BackupManager  │◄──────────│ RollbackManager │  │VersionManager│
│                │           │                 │  │              │
│ - Create       │           │ - Restore       │  │ - Versioning │
│ - Validate     │           │ - Verify        │  │ - Changelog  │
│ - Export       │           │ - Emergency     │  │ - Releases   │
└────────┬───────┘           └─────────┬───────┘  └──────┬───────┘
         │                             │                  │
         ▼                             ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│                       localStorage                            │
│  - app_backups          - app_rollback_history               │
│  - app_version_history  - app_current_version                │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backupowane dane:                          │
│  • localStorage (wszystkie klucze)                           │
│  • CentralnyMagazynStanu (pełny state)                       │
│  • Test Reports (historia testów)                            │
│  • Configuration (ustawienia managerów)                      │
└──────────────────────────────────────────────────────────────┘
```

---

## Instalacja

### 1. Dodaj skrypty do `index.html`

```html
<!-- Deployment Scripts -->
<script src="deployment/backup-manager.js"></script>
<script src="deployment/rollback-manager.js"></script>
<script src="deployment/version-manager.js"></script>
<script src="deployment/deployment-panel.js"></script>
```

### 2. Skrypty auto-inicjalizują się

System automatycznie startuje po załadowaniu DOM. W konsoli zobaczysz:

```
🔒 [BackupManager] Inicjalizacja...
✅ [BackupManager] Zainicjalizowany
🔄 [RollbackManager] Inicjalizacja...
✅ [RollbackManager] Zainicjalizowany
📌 [VersionManager] Inicjalizacja...
✅ [VersionManager] Zainicjalizowany
🚀 [DeploymentPanel] Inicjalizacja...
✅ [DeploymentPanel] Zainicjalizowany
```

### 3. Otwórz Deployment Panel

Naciśnij **Ctrl+Shift+D** aby otworzyć panel, lub:

```javascript
window.deploymentPanel.show();
```

---

## BackupManager

### Tworzenie backupu

#### Automatyczne (przez panel)

1. Naciśnij **Ctrl+Shift+D**
2. Przejdź do zakładki **Backup**
3. Wpisz opis (opcjonalnie)
4. Kliknij **💾 Create Backup**

#### Programowo

```javascript
// Utwórz backup manualnie
const backup = backupManager.createBackup('manual', 'Opis backupu');

// Utwórz backup pre-deployment
const backup = backupManager.createBackup('pre-deployment', 'Backup przed wdrożeniem v2.0.0');

// Backup zostanie zawierał:
// - localStorage (wszystkie klucze)
// - CentralnyMagazynStanu (pełny state)
// - Test Reports (historia testów)
// - Configuration (ustawienia)
```

### Struktura backupu

```javascript
{
  id: "backup_1730553600000_abc123",
  timestamp: 1730553600000,
  version: "1.2.3",
  environment: "production",
  type: "pre-deployment",
  data: {
    localStorage: { /* wszystkie klucze */ },
    centralnyMagazyn: { /* state */ },
    testReports: [ /* raporty */ ],
    configuration: { /* config */ }
  },
  metadata: {
    description: "Backup przed wdrożeniem v2.0.0",
    userAgent: "Mozilla/5.0...",
    url: "https://example.com",
    timestamp: "2025-11-02T10:00:00.000Z"
  },
  checksum: "a1b2c3d4",
  size: 524288
}
```

### Pobieranie backupów

```javascript
// Wszystkie backupy
const backups = backupManager.getBackups();

// Filtrowanie
const preDeployment = backupManager.getBackups({ 
  type: 'pre-deployment' 
});

// Najnowszy backup
const latest = backupManager.getLatestBackup();

// Backup po ID
const backup = backupManager.getBackup('backup_id');
```

### Export do pliku

```javascript
// Export backupu do pliku JSON
backupManager.exportBackup('backup_id');
// Pobierze plik: backup_backup_id_2025-11-02.json
```

### Import z pliku

```javascript
// Import backupu z pliku
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

backupManager.importBackup(file)
  .then(backup => {
    console.log('Backup zaimportowany:', backup.id);
  })
  .catch(error => {
    console.error('Import failed:', error);
  });
```

### Statystyki backupów

```javascript
const stats = backupManager.getStats();

console.log('Total backups:', stats.total);
console.log('Total size:', stats.totalSizeFormatted);
console.log('By type:', stats.byType);
// => { manual: 5, auto: 10, 'pre-deployment': 3 }
```

### Konfiguracja

```javascript
backupManager.config = {
  enabled: true,
  autoBackup: true,
  maxBackups: 10,
  autoCleanup: true,
  includeLocalStorage: true,
  includeCentralnyMagazyn: true,
  includeTestReports: true,
  includeConfiguration: true,
  notifications: true
};
```

---

## RollbackManager

### Wykonanie rollbacku

#### Przez panel (zalecane)

1. Naciśnij **Ctrl+Shift+D**
2. Przejdź do zakładki **Backup**
3. Wybierz backup
4. Kliknij **Restore**
5. Potwierdź operację
6. Poczekaj na reload

#### Programowo

```javascript
// Rollback do konkretnego backupu
await rollbackManager.rollback('backup_id');

// Rollback do poprzedniej wersji
await rollbackManager.rollbackToPreviousVersion();

// Emergency rollback (bez potwierdzenia)
await rollbackManager.emergencyRollback();
```

### Proces rollbacku

```
1. Walidacja backupu (checksum verification)
   ↓
2. Potwierdzenie użytkownika (jeśli wymagane)
   ↓
3. Utworzenie pre-rollback backupu
   ↓
4. Przywracanie danych:
   • localStorage
   • CentralnyMagazynStanu
   • Test Reports
   • Configuration
   ↓
5. Weryfikacja przywrócenia
   ↓
6. Reload strony (po 2s)
```

### Dry run (testowanie bez zmian)

```javascript
// Test rollbacku bez faktycznego zastosowania zmian
await rollbackManager.rollback('backup_id', { 
  dryRun: true 
});

// Pokaże co zostanie przywrócone bez faktycznej zmiany danych
```

### Partial rollback (wybrane komponenty)

```javascript
// Przywróć tylko localStorage i state
await rollbackManager.rollback('backup_id', {
  partial: true,
  components: ['localStorage', 'centralnyMagazyn']
});
```

### Historia rollbacków

```javascript
// Wszystkie rollbacki
const history = rollbackManager.getHistory();

// Filtrowanie po statusie
const completed = rollbackManager.getHistory({ 
  status: 'completed' 
});

// Ostatni rollback
const last = rollbackManager.getLastOperation();
```

### Statystyki rollbacków

```javascript
const stats = rollbackManager.getStats();

console.log('Total rollbacks:', stats.total);
console.log('Success rate:', stats.successRate + '%');
console.log('Avg duration:', stats.avgDuration + 'ms');
console.log('By status:', stats.byStatus);
// => { completed: 15, failed: 2, pending: 0 }
```

---

## VersionManager

### Semantic Versioning

Format: **MAJOR.MINOR.PATCH** (np. `2.1.4`)

- **MAJOR**: Breaking changes, incompatible API changes
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, backwards-compatible

### Tworzenie release'u

#### Przez panel

1. Naciśnij **Ctrl+Shift+D**
2. Przejdź do zakładki **Version**
3. Wpisz release notes
4. Kliknij **Major**, **Minor** lub **Patch**
5. Release zostanie utworzony + automatyczny backup

#### Programowo

```javascript
// Patch release (1.0.0 -> 1.0.1)
const release = versionManager.createRelease('patch', {
  releaseNotes: 'Fixed critical bug in save function',
  changelog: [
    'Fixed: Save function not working with large data',
    'Fixed: localStorage quota handling'
  ],
  author: 'developer'
});

// Minor release (1.0.1 -> 1.1.0)
const release = versionManager.createRelease('minor', {
  releaseNotes: 'Added new backup system',
  changelog: [
    'Added: Backup manager',
    'Added: Rollback functionality',
    'Improved: Version tracking'
  ]
});

// Major release (1.1.0 -> 2.0.0)
const release = versionManager.createRelease('major', {
  releaseNotes: 'Complete rewrite with breaking changes',
  changelog: [
    'Changed: New API structure',
    'Changed: Database schema'
  ],
  breakingChanges: [
    'API endpoints renamed',
    'localStorage structure changed - migration required'
  ],
  migrations: [
    'Run: migrate-v1-to-v2.js script'
  ]
});
```

### Pobieranie informacji o wersji

```javascript
// Aktualna wersja
const version = versionManager.getCurrentVersionString();
console.log(version); // => "2.1.4"

// Poprzedni release
const previous = versionManager.getPreviousRelease();

// Release po numerze wersji
const release = versionManager.getRelease('2.0.0');

// Historia release'ów
const history = versionManager.getHistory();
```

### Generowanie changelog

```javascript
// Changelog między wersjami
const changelog = versionManager.generateChangelog('1.0.0', '2.0.0');

console.log(changelog);
// {
//   from: '1.0.0',
//   to: '2.0.0',
//   releases: 5,
//   changes: [...],
//   breakingChanges: [...],
//   migrations: [...]
// }
```

### Export changelog do pliku

```javascript
// Generuje i pobiera CHANGELOG.md
versionManager.exportChangelog();
```

Przykładowy wygenerowany changelog:

```markdown
# Changelog

Current version: **2.1.4**

---

## [2.1.4] - 2 listopada 2025, 10:30:00

Fixed critical bugs

### Changes

- Fixed: Save function not working with large data
- Fixed: localStorage quota handling

---

## [2.1.0] - 1 listopada 2025, 14:20:00

Added new backup system

### Changes

- Added: Backup manager
- Added: Rollback functionality
- Improved: Version tracking

---

## [2.0.0] - 30 października 2025, 09:00:00

Complete rewrite with breaking changes

### Changes

- Changed: New API structure
- Changed: Database schema

### ⚠️ Breaking Changes

- API endpoints renamed
- localStorage structure changed - migration required

### Migrations

- Run: migrate-v1-to-v2.js script

---
```

### Migration Plan

```javascript
// Sprawdź czy upgrade jest możliwy
const canUpgrade = versionManager.canUpgrade('3.0.0');

console.log(canUpgrade);
// {
//   possible: true,
//   hasBreakingChanges: true,
//   migrationSteps: 2,
//   plan: {
//     from: '2.1.4',
//     to: '3.0.0',
//     breakingChanges: [...],
//     migrations: [...],
//     steps: [
//       { step: 1, description: '...', status: 'pending' },
//       { step: 2, description: '...', status: 'pending' }
//     ]
//   }
// }
```

---

## DeploymentPanel

### Otwieranie panelu

**Hotkey:** `Ctrl+Shift+D`

Lub programowo:

```javascript
window.deploymentPanel.show();
window.deploymentPanel.hide();
window.deploymentPanel.toggle();
```

### Zakładki

#### 1. **Checklist** - Lista kontrolna przed wdrożeniem

Automatycznie weryfikuje:

✅ **Testy zakończone sukcesem**
- Sprawdza czy wszystkie testy (smoke, unit, integration) przeszły
- Success rate musi być 100%

✅ **Backup utworzony**
- Sprawdza czy istnieje recent pre-deployment backup
- Backup nie może być starszy niż godzinę

✅ **Wersja zaktualizowana**
- Sprawdza czy numer wersji został zwiększony
- Porównuje z poprzednim release'em

✅ **Changelog zaktualizowany**
- Sprawdza czy changelog zawiera wpisy
- Opcjonalne (nie blokuje deploymentu)

✅ **Brak błędów w console**
- Weryfikuje że console jest czysty

✅ **localStorage dostępny**
- Sprawdza czy localStorage działa
- Weryfikuje dostępną przestrzeń

**Uruchomienie wszystkich checków:**

```javascript
await deploymentPanel.runChecklist();
```

#### 2. **Backup** - Zarządzanie backupami

- **Create Backup** - Tworzenie nowego backupu
- **Recent Backups** - Lista ostatnich backupów z opcją restore

#### 3. **Version** - Zarządzanie wersjami

- **Current Version** - Wyświetlenie aktualnej wersji
- **Bump Version** - Przyciski Major/Minor/Patch
- **Release Notes** - Editor do opisania zmian
- **Version History** - Historia release'ów

#### 4. **Rollback** - Awaryjne przywracanie

- **Emergency Rollback** - Jeden przycisk do natychmiastowego rollbacku
- **Rollback History** - Historia wykonanych rollbacków

### Customizacja panelu

```javascript
window.deploymentPanelConfig = {
  position: 'bottom-right', // top-left, top-right, bottom-left, bottom-right
  minimized: false,
  hotkey: 'Ctrl+Shift+D',
  theme: 'dark' // light, dark
};
```

---

## Workflow wdrożenia

### Standardowy workflow (zalecany)

```
1. DEVELOPMENT
   ↓
   • Implementacja feature/fix
   • Lokalne testy
   ↓
2. PRE-DEPLOYMENT CHECKS
   ↓
   • Naciśnij Ctrl+Shift+D
   • Uruchom "Run All Checks"
   • Sprawdź czy wszystkie ✅
   ↓
3. BACKUP
   ↓
   • Zakładka Backup
   • Wpisz opis: "Pre-deployment v2.1.0"
   • Kliknij "Create Backup"
   ↓
4. VERSION BUMP
   ↓
   • Zakładka Version
   • Wpisz Release Notes
   • Kliknij Major/Minor/Patch
   ↓
5. FINAL VERIFICATION
   ↓
   • Sprawdź Checklist ponownie
   • Wszystko powinno być ✅
   ↓
6. DEPLOYMENT
   ↓
   • Kliknij "🚀 Deploy to Production"
   • Poczekaj na potwierdzenie
   ↓
7. POST-DEPLOYMENT
   ↓
   • Sprawdź czy aplikacja działa
   • Uruchom smoke tests
   • Sprawdź monitoring
   ↓
8. SUCCESS lub ROLLBACK
   ↓
   Jeśli problem:
   • Ctrl+Shift+D
   • Zakładka Rollback
   • Emergency Rollback
```

### Quick Deploy (dla małych zmian)

```
1. Ctrl+Shift+D
2. Run All Checks
3. Create Backup (auto)
4. Bump Patch
5. Deploy
```

---

## Disaster Recovery Plan

### Scenariusz 1: Aplikacja nie działa po wdrożeniu

**Objawy:**
- Strona się nie ładuje
- Białyekran / błędy JS
- Funkcje nie działają

**Rozwiązanie:**

```
1. Naciśnij Ctrl+Shift+D (jeśli możliwe)
2. Zakładka Rollback
3. Kliknij "🚨 Emergency Rollback"
4. Poczekaj na reload

LUB (jeśli panel nie działa):

1. Otwórz Console (F12)
2. Wpisz:
   await rollbackManager.emergencyRollback()
3. Poczekaj na reload
```

### Scenariusz 2: localStorage uszkodzony

**Objawy:**
- QuotaExceededError
- Dane nie zapisują się
- State aplikacji gubiony

**Rozwiązanie:**

```javascript
// 1. Export backupu do pliku (jeśli możliwe)
backupManager.exportBackup(backupManager.getLatestBackup().id);

// 2. Wyczyść localStorage
localStorage.clear();

// 3. Import backupu z pliku
// Użyj pliku JSON pobranego w kroku 1

// 4. Lub rollback do poprzedniej wersji
await rollbackManager.rollbackToPreviousVersion();
```

### Scenariusz 3: Wszystko stracone, brak backupów

**Objawy:**
- Wszystkie backupy usunięte
- localStorage wyczyszczony
- Brak dostępu do panelu

**Rozwiązanie:**

```
1. Restore z Firestore (jeśli używasz):
   - Dane są synchronizowane
   - Użyj Firestore Console do eksportu

2. Restore z Browser History:
   - F12 -> Application -> Storage
   - IndexedDB / localStorage backup
   - Może być wersja przed czyszczeniem

3. Restore z File System (jeśli robisz export):
   - Szukaj plików backup_*.json
   - Import przez panel Backup

4. Rebuild from scratch:
   - Nowa instalacja
   - Ponowna konfiguracja
   - Import danych ręcznie
```

### Przewencja

✅ **Regularne exo backupów do plików**

```javascript
// Co tydzień export wszystkich backupów
backupManager.getBackups().forEach(backup => {
  backupManager.exportBackup(backup.id);
});
```

✅ **Synchronizacja z zewnętrznym storage**

```javascript
// Backup do Firestore / cloud storage
const backup = backupManager.createBackup('cloud-sync', 'Cloud backup');
// ... upload to cloud
```

✅ **Multiple redundancy**
- LocalStorage
- File exports
- Cloud storage
- Git repository

---

## Best Practices

### 1. Regularnie twórz backupy

```javascript
// Przed każdą większą zmianą
backupManager.createBackup('pre-change', 'Before adding new feature');

// Auto-backup co godzinę (domyślnie włączone)
// Można wyłączyć:
backupManager.config.autoBackup = false;
```

### 2. Zawsze używaj Deployment Checklist

```
❌ NIE:
- Wdrażaj bez sprawdzenia testów
- Pomiń backup "bo to mała zmiana"
- Zapomnij o version bump

✅ TAK:
- Ctrl+Shift+D przed każdym wdrożeniem
- Run All Checks
- Sprawdź czy wszystko ✅
```

### 3. Semantic versioning z głową

```javascript
// PATCH (1.0.0 -> 1.0.1): Bug fixes
versionManager.createRelease('patch', {
  releaseNotes: 'Fixed typo in button label'
});

// MINOR (1.0.1 -> 1.1.0): New features
versionManager.createRelease('minor', {
  releaseNotes: 'Added export to Excel feature'
});

// MAJOR (1.1.0 -> 2.0.0): Breaking changes
versionManager.createRelease('major', {
  releaseNotes: 'New API structure',
  breakingChanges: ['localStorage key names changed']
});
```

### 4. Opisuj zmiany w Release Notes

```javascript
// ❌ Źle
releaseNotes: 'Update'

// ✅ Dobrze
releaseNotes: `
Added:
- Export to Excel feature
- Dark mode toggle

Fixed:
- Save button not working on mobile
- Memory leak in monitoring

Changed:
- Improved performance of state updates
`
```

### 5. Test rollback regularnie

```javascript
// Co miesiąc test rollbacku (dry run)
await rollbackManager.rollback('backup_id', { 
  dryRun: true 
});

// Sprawdź czy wszystko działa
```

### 6. Monitoruj wielkość backupów

```javascript
// Sprawdź statystyki
const stats = backupManager.getStats();

if (stats.totalSize > 5 * 1024 * 1024) { // 5MB
  console.warn('Backupy zajmują > 5MB');
  
  // Zmniejsz maxBackups
  backupManager.config.maxBackups = 5;
  backupManager.cleanup();
}
```

### 7. Export backupów do plików

```javascript
// Przed major release
const backup = backupManager.createBackup('pre-major', 'Before v2.0.0');
backupManager.exportBackup(backup.id);

// Save plik w bezpiecznym miejscu (Git repo, cloud, etc.)
```

### 8. Emergency rollback zawsze dostępny

```javascript
// Dodaj emergency button do UI (poza panelem)
<button onclick="rollbackManager.emergencyRollback()" 
        style="position: fixed; bottom: 10px; right: 10px; z-index: 99999; background: red;">
  🚨 EMERGENCY
</button>
```

---

## API Reference

### BackupManager

```typescript
interface BackupManager {
  // Create backup
  createBackup(type: string, description: string): BackupItem | null;
  
  // Get backups
  getBackups(filter?: {
    type?: string;
    from?: number;
    to?: number;
    version?: string;
  }): BackupItem[];
  
  getBackup(id: string): BackupItem | null;
  getLatestBackup(type?: string): BackupItem | null;
  
  // Delete backup
  deleteBackup(id: string): boolean;
  
  // Cleanup
  cleanup(): void;
  clearAll(): boolean;
  
  // Export/Import
  exportBackup(id: string): void;
  importBackup(file: File): Promise<BackupItem>;
  
  // Stats
  getStats(): {
    total: number;
    totalSize: number;
    totalSizeFormatted: string;
    byType: Record<string, number>;
    oldest: number | null;
    newest: number | null;
  };
  
  // Version
  setVersion(version: string): void;
  
  // Config
  config: {
    enabled: boolean;
    autoBackup: boolean;
    storageKey: string;
    maxBackups: number;
    autoCleanup: boolean;
    compressionEnabled: boolean;
    includeLocalStorage: boolean;
    includeCentralnyMagazyn: boolean;
    includeTestReports: boolean;
    includeConfiguration: boolean;
    notifications: boolean;
  };
}

interface BackupItem {
  id: string;
  timestamp: number;
  version: string;
  environment: string;
  type: string;
  data: {
    localStorage?: Record<string, string>;
    centralnyMagazyn?: any;
    testReports?: any[];
    configuration?: any;
  };
  metadata: {
    description: string;
    userAgent: string;
    url: string;
    timestamp: string;
  };
  checksum: string;
  size: number;
  
  validate(): { valid: boolean; errors: string[] };
  toJSON(): object;
  getFormattedSize(): string;
  getFormattedTimestamp(): string;
}
```

### RollbackManager

```typescript
interface RollbackManager {
  // Rollback
  rollback(backupId: string, options?: {
    skipConfirmation?: boolean;
    dryRun?: boolean;
    partial?: boolean;
    components?: string[];
  }): Promise<{
    success: boolean;
    error?: string;
    operation?: RollbackOperation;
  }>;
  
  emergencyRollback(): Promise<{
    success: boolean;
    error?: string;
    operation?: RollbackOperation;
  }>;
  
  rollbackToPreviousVersion(): Promise<{
    success: boolean;
    error?: string;
    operation?: RollbackOperation;
  }>;
  
  // History
  getHistory(filter?: {
    status?: string;
    backupId?: string;
  }): RollbackOperation[];
  
  getLastOperation(): RollbackOperation | null;
  
  clearHistory(): void;
  
  // Stats
  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    avgDuration: number;
    successRate: number;
  };
  
  // Config
  config: {
    enabled: boolean;
    requireConfirmation: boolean;
    createBackupBeforeRollback: boolean;
    verifyAfterRollback: boolean;
    storageKey: string;
    maxHistory: number;
    dryRunDefault: boolean;
    notifications: boolean;
  };
}

interface RollbackOperation {
  id: string;
  timestamp: number;
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: 'full' | 'partial';
  components: string[];
  dryRun: boolean;
  result: any;
  error: string | null;
  duration: number;
  
  toJSON(): object;
}
```

### VersionManager

```typescript
interface VersionManager {
  // Create release
  createRelease(type: 'major' | 'minor' | 'patch', options?: {
    changelog?: string[];
    breakingChanges?: string[];
    migrations?: string[];
    releaseNotes?: string;
    author?: string;
  }): Release | null;
  
  // Get version
  getCurrentVersion(): Version;
  getCurrentVersionString(): string;
  
  // Get releases
  getHistory(filter?: {
    major?: number;
    minor?: number;
    hasBreakingChanges?: boolean;
  }): Release[];
  
  getRelease(versionString: string): Release | null;
  getPreviousRelease(): Release | null;
  
  // Changelog
  generateChangelog(fromVersion: string | Version, toVersion: string | Version): {
    from: string;
    to: string;
    releases: number;
    changes: string[];
    breakingChanges: string[];
    migrations: string[];
  };
  
  generateMigrationPlan(fromVersion: string | Version, toVersion: string | Version): {
    from: string;
    to: string;
    hasBreakingChanges: boolean;
    breakingChanges: string[];
    migrations: string[];
    steps: Array<{
      step: number;
      description: string;
      status: string;
    }>;
  };
  
  exportChangelogMarkdown(): string;
  exportChangelog(): void;
  
  // Comparison
  compareVersions(v1: string, v2: string): {
    v1: string;
    v2: string;
    comparison: 'greater' | 'less' | 'equal';
    difference: {
      major: number;
      minor: number;
      patch: number;
    };
  };
  
  canUpgrade(toVersion: string | Version): {
    possible: boolean;
    reason?: string;
    hasBreakingChanges?: boolean;
    migrationSteps?: number;
    plan?: any;
  };
  
  // Stats
  getStats(): {
    currentVersion: string;
    totalReleases: number;
    majorReleases: number;
    minorReleases: number;
    patchReleases: number;
    breakingChanges: number;
    withMigrations: number;
    oldest: string | null;
    newest: string | null;
  };
  
  // History management
  clearHistory(): void;
  
  // Config
  config: {
    enabled: boolean;
    currentVersion: string;
    storageKey: string;
    maxHistory: number;
    autoBackupOnRelease: boolean;
    requireReleaseNotes: boolean;
    notifications: boolean;
  };
}

interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  metadata: string | null;
  
  toString(): string;
  increment(type: 'major' | 'minor' | 'patch'): Version;
  compare(other: Version): number;
  isGreaterThan(other: Version): boolean;
  isLessThan(other: Version): boolean;
  equals(other: Version): boolean;
  
  static parse(versionString: string): Version;
}

interface Release {
  version: Version;
  timestamp: number;
  changelog: string[];
  breakingChanges: string[];
  migrations: string[];
  releaseNotes: string;
  author: string;
  backupId: string | null;
  
  toJSON(): object;
  getFormattedTimestamp(): string;
  hasBreakingChanges(): boolean;
  hasMigrations(): boolean;
}
```

### DeploymentPanel

```typescript
interface DeploymentPanel {
  // Visibility
  show(): void;
  hide(): void;
  toggle(): void;
  toggleMinimize(): void;
  
  // Tabs
  switchTab(tabName: 'checklist' | 'backup' | 'version' | 'rollback'): void;
  
  // Actions
  runChecklist(): Promise<void>;
  createBackup(): Promise<void>;
  bumpVersion(type: 'major' | 'minor' | 'patch'): Promise<void>;
  rollbackToBackup(backupId: string): Promise<void>;
  emergencyRollback(): Promise<void>;
  
  // Config
  config: {
    panelId: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    minimized: boolean;
    hotkey: string;
    theme: 'light' | 'dark';
  };
}
```

---

## Troubleshooting

### Problem 1: Backupy nie tworzą się

**Objawy:**
- `createBackup()` zwraca `null`
- Brak backupów w liście

**Rozwiązanie:**

```javascript
// 1. Sprawdź czy enabled
console.log(backupManager.config.enabled); // powinno być true

// 2. Sprawdź localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage OK');
} catch (e) {
  console.error('localStorage problem:', e);
  // QuotaExceededError - wyczyść stare backupy
  backupManager.clearAll();
}

// 3. Sprawdź console errors
// Może być problem z CentralnyMagazynStanu lub innymi zależnościami
```

### Problem 2: Rollback nie działa

**Objawy:**
- Rollback zwraca `success: false`
- Dane nie są przywracane

**Rozwiązanie:**

```javascript
// 1. Sprawdź czy backup istnieje i jest valid
const backup = backupManager.getBackup('backup_id');
console.log(backup.validate());

// 2. Sprawdź czy RollbackManager jest włączony
console.log(rollbackManager.config.enabled); // powinno być true

// 3. Spróbuj dry run
await rollbackManager.rollback('backup_id', { dryRun: true });
// Sprawdź result w console

// 4. Sprawdź history
const last = rollbackManager.getLastOperation();
console.log(last.error); // Pokaże błąd
```

### Problem 3: Panel nie otwiera się

**Objawy:**
- Ctrl+Shift+D nie działa
- Panel nie jest widoczny

**Rozwiązanie:**

```javascript
// 1. Sprawdź czy panel został utworzony
const panel = document.getElementById('deployment-panel');
console.log(panel); // powinien istnieć

// 2. Pokaż manualnie
window.deploymentPanel.show();

// 3. Sprawdź console errors
// Może być konflikt z innym skryptem

// 4. Przeładuj stronę
location.reload();
```

### Problem 4: QuotaExceededError przy backupie

**Objawy:**
- Error: `QuotaExceededError`
- Backupy nie zapisują się

**Rozwiązanie:**

```javascript
// 1. Sprawdź wielkość backupów
const stats = backupManager.getStats();
console.log('Total size:', stats.totalSizeFormatted);

// 2. Zmniejsz maxBackups
backupManager.config.maxBackups = 5;
backupManager.cleanup();

// 3. Wyczyść stare backupy
backupManager.clearAll(); // UWAGA: usuwa wszystkie!

// 4. Export do plików przed czyszczeniem
backupManager.getBackups().forEach(b => {
  backupManager.exportBackup(b.id);
});
```

### Problem 5: Wersja nie aktualizuje się

**Objawy:**
- `createRelease()` zwraca `null`
- Wersja pozostaje taka sama

**Rozwiązanie:**

```javascript
// 1. Sprawdź czy enabled
console.log(versionManager.config.enabled); // powinno być true

// 2. Sprawdź czy release notes są wymagane
console.log(versionManager.config.requireReleaseNotes);
// Jeśli true, musisz podać releaseNotes

// 3. Sprawdź aktualną wersję
console.log(versionManager.getCurrentVersionString());

// 4. Utwórz release z release notes
versionManager.createRelease('patch', {
  releaseNotes: 'Test release'
});
```

### Problem 6: Emergency rollback nie działa

**Objawy:**
- Emergency rollback button nie odpowiada
- Strona się nie reload

**Rozwiązanie:**

```javascript
// 1. Spróbuj przez console (F12)
await rollbackManager.emergencyRollback();

// 2. Jeśli to nie działa, manualnie:
const backup = backupManager.getLatestBackup();
await rollbackManager.rollback(backup.id, {
  skipConfirmation: true
});

// 3. Ostateczność - manual reload
// Zapisz backup ID
const backupId = backupManager.getLatestBackup().id;
localStorage.setItem('emergency_backup_id', backupId);

// Reload
location.reload();

// Po reload:
const backupId = localStorage.getItem('emergency_backup_id');
await rollbackManager.rollback(backupId);
```

---

## Podsumowanie

✅ **System gotowy** - Wszystkie komponenty zaimplementowane i przetestowane  
✅ **Dokumentacja kompletna** - Pełna instrukcja użytkowania  
✅ **Best practices** - Zalecenia i przykłady  
✅ **Disaster recovery** - Plan awaryjny  
✅ **API reference** - Kompletne API dla wszystkich managerów  

### Quick Start

```bash
1. Dodaj skrypty do index.html
2. Naciśnij Ctrl+Shift+D
3. Użyj panelu przed każdym wdrożeniem
4. W razie problemu: Emergency Rollback
```

### Wsparcie

W razie problemów:
1. Sprawdź [Troubleshooting](#troubleshooting)
2. Sprawdź console errors (F12)
3. Uruchom `backupManager.getStats()` i `rollbackManager.getStats()`

---

**Wersja dokumentacji:** 1.0.0  
**Ostatnia aktualizacja:** 2025-11-02  
**Autor:** AI Assistant
