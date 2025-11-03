/**
 * ===================================================================
 * BACKUP MANAGER - System zarządzania backupami
 * ===================================================================
 * 
 * Automatyczne tworzenie backupów przed wdrożeniem:
 * - localStorage (wszystkie klucze)
 * - CentralnyMagazynStanu (pełny state)
 * - Configuration (ustawienia aplikacji)
 * - Test reports (historia testów)
 * 
 * Features:
 * - Automatic backup on deployment
 * - Manual backup creation
 * - Backup validation
 * - Compression (JSON.stringify)
 * - Metadata (timestamp, version, size, checksum)
 * - Storage management (max backups, auto-cleanup)
 * - Export/Import to file
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-11-02
 */

(function(window) {
  'use strict';

  /**
   * Backup Item - pojedynczy backup
   */
  class BackupItem {
    constructor(data) {
      this.id = data.id || this.generateId();
      this.timestamp = data.timestamp || Date.now();
      this.version = data.version || '1.0.0';
      this.environment = data.environment || 'production';
      this.type = data.type || 'manual'; // manual, auto, pre-deployment
      this.data = data.data || {};
      this.metadata = data.metadata || {};
      this.checksum = data.checksum || this.calculateChecksum();
      this.size = data.size || this.calculateSize();
    }

    generateId() {
      return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    calculateChecksum() {
      const str = JSON.stringify(this.data);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    }

    calculateSize() {
      const str = JSON.stringify(this.data);
      return str.length;
    }

    validate() {
      const errors = [];
      
      if (!this.id) errors.push('Missing id');
      if (!this.timestamp) errors.push('Missing timestamp');
      if (!this.data) errors.push('Missing data');
      
      // Validate checksum
      const currentChecksum = this.calculateChecksum();
      if (this.checksum !== currentChecksum) {
        errors.push('Checksum mismatch - data may be corrupted');
      }

      return {
        valid: errors.length === 0,
        errors: errors
      };
    }

    toJSON() {
      return {
        id: this.id,
        timestamp: this.timestamp,
        version: this.version,
        environment: this.environment,
        type: this.type,
        data: this.data,
        metadata: this.metadata,
        checksum: this.checksum,
        size: this.size
      };
    }

    getFormattedSize() {
      const bytes = this.size;
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    getFormattedTimestamp() {
      return new Date(this.timestamp).toLocaleString('pl-PL');
    }
  }

  /**
   * BackupManager - główny manager backupów
   */
  class BackupManager {
    constructor(config = {}) {
      this.config = Object.assign({
        enabled: true,
        autoBackup: true,
        storageKey: 'app_backups',
        maxBackups: 10,
        autoCleanup: true,
        compressionEnabled: true,
        includeLocalStorage: true,
        includeCentralnyMagazyn: true,
        includeTestReports: true,
        includeConfiguration: true,
        notifications: true
      }, config);

      this.backups = [];
      this.currentVersion = '1.0.0';
      
      this.init();
    }

    init() {
      console.log('🔒 [BackupManager] Inicjalizacja...');
      
      // Load existing backups
      this.loadBackups();
      
      // Setup auto-backup on page unload (if enabled)
      if (this.config.autoBackup) {
        this.setupAutoBackup();
      }

      console.log('✅ [BackupManager] Zainicjalizowany');
      console.log(`📦 ${this.backups.length} backupów w storage`);
    }

    setupAutoBackup() {
      // Auto-backup before page unload
      window.addEventListener('beforeunload', (e) => {
        if (this.hasUnsavedChanges()) {
          this.createBackup('auto', 'Auto-backup przed zamknięciem');
        }
      });

      // Auto-backup every hour
      setInterval(() => {
        if (this.config.autoBackup) {
          this.createBackup('auto', 'Auto-backup (co godzinę)');
        }
      }, 60 * 60 * 1000); // 1h
    }

    hasUnsavedChanges() {
      // Check if there are unsaved changes
      if (!window.centralnyMagazyn) return false;
      
      const state = window.centralnyMagazyn.pobierzStan();
      return state.historiaCzatu && state.historiaCzatu.length > 0;
    }

    /**
     * Tworzy nowy backup
     */
    createBackup(type = 'manual', description = '') {
      if (!this.config.enabled) {
        console.warn('⚠️ [BackupManager] Backupy wyłączone');
        return null;
      }

      console.log('📦 [BackupManager] Tworzenie backupu...');

      try {
        const backupData = this.collectData();
        
        const backup = new BackupItem({
          version: this.currentVersion,
          environment: this.detectEnvironment(),
          type: type,
          data: backupData,
          metadata: {
            description: description,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        });

        // Validate backup
        const validation = backup.validate();
        if (!validation.valid) {
          console.error('❌ [BackupManager] Backup invalid:', validation.errors);
          return null;
        }

        // Add to backups
        this.backups.push(backup);

        // Save to storage
        this.saveBackups();

        // Auto cleanup if enabled
        if (this.config.autoCleanup) {
          this.cleanup();
        }

        console.log('✅ [BackupManager] Backup utworzony:', backup.id);
        console.log(`📊 Size: ${backup.getFormattedSize()}`);

        if (this.config.notifications) {
          this.notify('Backup utworzony', `${backup.getFormattedSize()} - ${description}`);
        }

        return backup;

      } catch (error) {
        console.error('❌ [BackupManager] Błąd tworzenia backupu:', error);
        return null;
      }
    }

    /**
     * Zbiera dane do backupu
     */
    collectData() {
      const data = {};

      // localStorage
      if (this.config.includeLocalStorage) {
        data.localStorage = this.backupLocalStorage();
      }

      // CentralnyMagazynStanu
      if (this.config.includeCentralnyMagazyn && window.centralnyMagazyn) {
        data.centralnyMagazyn = window.centralnyMagazyn.exportujDoJSON();
      }

      // Test Reports
      if (this.config.includeTestReports) {
        data.testReports = this.backupTestReports();
      }

      // Configuration
      if (this.config.includeConfiguration) {
        data.configuration = this.backupConfiguration();
      }

      return data;
    }

    backupLocalStorage() {
      const storage = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          storage[key] = localStorage.getItem(key);
        }
      } catch (e) {
        console.error('❌ Błąd backupu localStorage:', e);
      }
      return storage;
    }

    backupTestReports() {
      try {
        const reports = localStorage.getItem('production_test_reports');
        return reports ? JSON.parse(reports) : null;
      } catch (e) {
        console.error('❌ Błąd backupu test reports:', e);
        return null;
      }
    }

    backupConfiguration() {
      const config = {};
      
      // Backup configs from various managers
      if (window.productionTestRunner) {
        config.testing = window.productionTestRunner.config;
      }
      
      if (window.productionMonitor) {
        config.monitoring = window.productionMonitor.config;
      }

      return config;
    }

    detectEnvironment() {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'development';
      }
      return 'production';
    }

    /**
     * Pobiera listę backupów
     */
    getBackups(filter = {}) {
      let filtered = this.backups;

      // Filter by type
      if (filter.type) {
        filtered = filtered.filter(b => b.type === filter.type);
      }

      // Filter by date range
      if (filter.from) {
        filtered = filtered.filter(b => b.timestamp >= filter.from);
      }
      if (filter.to) {
        filtered = filtered.filter(b => b.timestamp <= filter.to);
      }

      // Filter by version
      if (filter.version) {
        filtered = filtered.filter(b => b.version === filter.version);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => b.timestamp - a.timestamp);

      return filtered;
    }

    /**
     * Pobiera backup po ID
     */
    getBackup(id) {
      return this.backups.find(b => b.id === id);
    }

    /**
     * Pobiera najnowszy backup
     */
    getLatestBackup(type = null) {
      let filtered = this.backups;
      if (type) {
        filtered = filtered.filter(b => b.type === type);
      }
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      return filtered[0] || null;
    }

    /**
     * Usuwa backup
     */
    deleteBackup(id) {
      const index = this.backups.findIndex(b => b.id === id);
      if (index === -1) {
        console.warn('⚠️ [BackupManager] Backup nie znaleziony:', id);
        return false;
      }

      this.backups.splice(index, 1);
      this.saveBackups();

      console.log('🗑️ [BackupManager] Backup usunięty:', id);
      return true;
    }

    /**
     * Czyści stare backupy
     */
    cleanup() {
      if (this.backups.length <= this.config.maxBackups) {
        return;
      }

      console.log(`🧹 [BackupManager] Cleanup: ${this.backups.length} -> ${this.config.maxBackups}`);

      // Sort by timestamp
      this.backups.sort((a, b) => b.timestamp - a.timestamp);

      // Keep only maxBackups newest
      this.backups = this.backups.slice(0, this.config.maxBackups);

      // Save
      this.saveBackups();

      console.log(`✅ [BackupManager] Cleanup zakończony: ${this.backups.length} backupów`);
    }

    /**
     * Eksportuje backup do pliku
     */
    exportBackup(id) {
      const backup = this.getBackup(id);
      if (!backup) {
        console.error('❌ [BackupManager] Backup nie znaleziony:', id);
        return;
      }

      const json = JSON.stringify(backup.toJSON(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backup.id}_${new Date(backup.timestamp).toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('💾 [BackupManager] Backup wyeksportowany:', backup.id);
    }

    /**
     * Importuje backup z pliku
     */
    importBackup(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            const backup = new BackupItem(data);
            
            // Validate
            const validation = backup.validate();
            if (!validation.valid) {
              reject(new Error('Invalid backup: ' + validation.errors.join(', ')));
              return;
            }

            // Add to backups
            this.backups.push(backup);
            this.saveBackups();

            console.log('✅ [BackupManager] Backup zaimportowany:', backup.id);
            resolve(backup);

          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }

    /**
     * Zapisuje backupy do localStorage
     */
    saveBackups() {
      try {
        const data = this.backups.map(b => b.toJSON());
        localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      } catch (e) {
        console.error('❌ [BackupManager] Błąd zapisu backupów:', e);
        
        // If quota exceeded, cleanup and retry
        if (e.name === 'QuotaExceededError') {
          console.log('🧹 [BackupManager] QuotaExceeded - czyszczenie...');
          this.backups = this.backups.slice(0, 5); // Keep only 5 newest
          try {
            const data = this.backups.map(b => b.toJSON());
            localStorage.setItem(this.config.storageKey, JSON.stringify(data));
          } catch (e2) {
            console.error('❌ [BackupManager] Nie udało się zapisać nawet po cleanup:', e2);
          }
        }
      }
    }

    /**
     * Wczytuje backupy z localStorage
     */
    loadBackups() {
      try {
        const data = localStorage.getItem(this.config.storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          this.backups = parsed.map(d => new BackupItem(d));
          console.log(`📦 [BackupManager] Wczytano ${this.backups.length} backupów`);
        }
      } catch (e) {
        console.error('❌ [BackupManager] Błąd wczytywania backupów:', e);
        this.backups = [];
      }
    }

    /**
     * Usuwa wszystkie backupy
     */
    clearAll() {
      if (!confirm('Czy na pewno usunąć WSZYSTKIE backupy? Tej operacji nie można cofnąć!')) {
        return false;
      }

      this.backups = [];
      this.saveBackups();

      console.log('🗑️ [BackupManager] Wszystkie backupy usunięte');
      return true;
    }

    /**
     * Statystyki backupów
     */
    getStats() {
      const totalSize = this.backups.reduce((sum, b) => sum + b.size, 0);
      const byType = {};
      
      this.backups.forEach(b => {
        byType[b.type] = (byType[b.type] || 0) + 1;
      });

      return {
        total: this.backups.length,
        totalSize: totalSize,
        totalSizeFormatted: this.formatSize(totalSize),
        byType: byType,
        oldest: this.backups.length > 0 
          ? Math.min(...this.backups.map(b => b.timestamp))
          : null,
        newest: this.backups.length > 0
          ? Math.max(...this.backups.map(b => b.timestamp))
          : null
      };
    }

    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Notification helper
     */
    notify(title, message) {
      if (!this.config.notifications) return;

      console.log(`🔔 [BackupManager] ${title}: ${message}`);

      // Desktop notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      }
    }

    /**
     * Set current version
     */
    setVersion(version) {
      this.currentVersion = version;
      console.log('📌 [BackupManager] Version set:', version);
    }
  }

  // Export to window
  window.BackupManager = BackupManager;
  
  // Auto-initialize if config exists
  if (window.backupManagerConfig || document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.backupManager = new BackupManager(window.backupManagerConfig);
    });
  }

  console.log('✅ BackupManager loaded');

})(window);
