/**
 * ===================================================================
 * ROLLBACK MANAGER - System awaryjnego przywracania
 * ===================================================================
 * 
 * Bezpieczne przywracanie aplikacji do poprzedniej wersji:
 * - Restore localStorage
 * - Restore CentralnyMagazynStanu
 * - Restore configuration
 * - Restore test reports
 * 
 * Features:
 * - Safe rollback with validation
 * - Pre-rollback backup creation
 * - Dry-run mode (test without applying)
 * - Rollback verification
 * - Rollback history
 * - Emergency rollback (one-click)
 * - Partial rollback (selected components)
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-11-02
 */

(function(window) {
  'use strict';

  /**
   * Rollback Operation - pojedyncza operacja rollback
   */
  class RollbackOperation {
    constructor(data) {
      this.id = data.id || this.generateId();
      this.timestamp = data.timestamp || Date.now();
      this.backupId = data.backupId;
      this.status = data.status || 'pending'; // pending, running, completed, failed
      this.type = data.type || 'full'; // full, partial
      this.components = data.components || ['localStorage', 'centralnyMagazyn', 'configuration', 'testReports'];
      this.dryRun = data.dryRun || false;
      this.result = data.result || null;
      this.error = data.error || null;
      this.duration = data.duration || 0;
    }

    generateId() {
      return 'rollback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    toJSON() {
      return {
        id: this.id,
        timestamp: this.timestamp,
        backupId: this.backupId,
        status: this.status,
        type: this.type,
        components: this.components,
        dryRun: this.dryRun,
        result: this.result,
        error: this.error,
        duration: this.duration
      };
    }
  }

  /**
   * RollbackManager - główny manager rollbacku
   */
  class RollbackManager {
    constructor(config = {}) {
      this.config = Object.assign({
        enabled: true,
        requireConfirmation: true,
        createBackupBeforeRollback: true,
        verifyAfterRollback: true,
        storageKey: 'app_rollback_history',
        maxHistory: 20,
        dryRunDefault: false,
        notifications: true
      }, config);

      this.history = [];
      this.backupManager = null;
      
      this.init();
    }

    init() {
      console.log('🔄 [RollbackManager] Inicjalizacja...');
      
      // Get backup manager reference
      if (window.backupManager) {
        this.backupManager = window.backupManager;
      } else {
        console.warn('⚠️ [RollbackManager] BackupManager nie znaleziony - rollback może nie działać');
      }

      // Load history
      this.loadHistory();

      console.log('✅ [RollbackManager] Zainicjalizowany');
      console.log(`📜 ${this.history.length} operacji w historii`);
    }

    /**
     * Wykonuje rollback do backupu
     */
    async rollback(backupId, options = {}) {
      if (!this.config.enabled) {
        console.error('❌ [RollbackManager] Rollback wyłączony');
        return { success: false, error: 'Rollback disabled' };
      }

      if (!this.backupManager) {
        console.error('❌ [RollbackManager] BackupManager nie dostępny');
        return { success: false, error: 'BackupManager not available' };
      }

      // Get backup
      const backup = this.backupManager.getBackup(backupId);
      if (!backup) {
        console.error('❌ [RollbackManager] Backup nie znaleziony:', backupId);
        return { success: false, error: 'Backup not found: ' + backupId };
      }

      // Validate backup
      const validation = backup.validate();
      if (!validation.valid) {
        console.error('❌ [RollbackManager] Backup invalid:', validation.errors);
        return { success: false, error: 'Invalid backup: ' + validation.errors.join(', ') };
      }

      // Confirmation
      if (this.config.requireConfirmation && !options.skipConfirmation) {
        const confirmed = confirm(
          `Czy na pewno wykonać rollback do:\n\n` +
          `Backup ID: ${backup.id}\n` +
          `Data: ${backup.getFormattedTimestamp()}\n` +
          `Wersja: ${backup.version}\n` +
          `Size: ${backup.getFormattedSize()}\n\n` +
          `To zastąpi obecny stan aplikacji!`
        );
        
        if (!confirmed) {
          console.log('⚠️ [RollbackManager] Rollback anulowany przez użytkownika');
          return { success: false, error: 'Cancelled by user' };
        }
      }

      // Create operation
      const operation = new RollbackOperation({
        backupId: backupId,
        type: options.partial ? 'partial' : 'full',
        components: options.components || this.config.components,
        dryRun: options.dryRun || this.config.dryRunDefault
      });

      console.log(`🔄 [RollbackManager] Starting rollback...`);
      console.log(`📦 Backup: ${backupId}`);
      console.log(`🎯 Type: ${operation.type}`);
      console.log(`🔧 Components: ${operation.components.join(', ')}`);
      console.log(`🧪 Dry run: ${operation.dryRun}`);

      const startTime = Date.now();
      operation.status = 'running';

      try {
        // Pre-rollback backup
        if (this.config.createBackupBeforeRollback && !operation.dryRun) {
          console.log('📦 [RollbackManager] Creating pre-rollback backup...');
          const preBackup = this.backupManager.createBackup('pre-rollback', 'Backup przed rollback');
          if (!preBackup) {
            throw new Error('Failed to create pre-rollback backup');
          }
          console.log('✅ Pre-rollback backup created:', preBackup.id);
        }

        // Execute rollback
        const result = await this.executeRollback(backup, operation);

        // Verify if not dry run
        if (this.config.verifyAfterRollback && !operation.dryRun) {
          console.log('🔍 [RollbackManager] Verifying rollback...');
          const verification = this.verifyRollback(backup);
          result.verification = verification;
          
          if (!verification.success) {
            throw new Error('Rollback verification failed: ' + verification.errors.join(', '));
          }
        }

        operation.status = 'completed';
        operation.result = result;
        operation.duration = Date.now() - startTime;

        // Add to history
        this.addToHistory(operation);

        console.log(`✅ [RollbackManager] Rollback completed in ${operation.duration}ms`);
        
        if (this.config.notifications) {
          this.notify(
            'Rollback Completed',
            `Successfully rolled back to ${backup.getFormattedTimestamp()}`
          );
        }

        // Reload page if not dry run
        if (!operation.dryRun) {
          console.log('🔄 [RollbackManager] Reloading page...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }

        return { success: true, operation: operation };

      } catch (error) {
        console.error('❌ [RollbackManager] Rollback failed:', error);
        
        operation.status = 'failed';
        operation.error = error.message;
        operation.duration = Date.now() - startTime;

        this.addToHistory(operation);

        if (this.config.notifications) {
          this.notify('Rollback Failed', error.message);
        }

        return { success: false, error: error.message, operation: operation };
      }
    }

    /**
     * Wykonuje rollback
     */
    async executeRollback(backup, operation) {
      const result = {
        restored: {},
        skipped: {},
        errors: {}
      };

      // Restore localStorage
      if (operation.components.includes('localStorage') && backup.data.localStorage) {
        console.log('🔄 Restoring localStorage...');
        try {
          if (!operation.dryRun) {
            this.restoreLocalStorage(backup.data.localStorage);
          }
          result.restored.localStorage = true;
          console.log('✅ localStorage restored');
        } catch (error) {
          result.errors.localStorage = error.message;
          console.error('❌ localStorage restore failed:', error);
        }
      } else {
        result.skipped.localStorage = true;
      }

      // Restore CentralnyMagazynStanu
      if (operation.components.includes('centralnyMagazyn') && backup.data.centralnyMagazyn) {
        console.log('🔄 Restoring CentralnyMagazynStanu...');
        try {
          if (!operation.dryRun) {
            this.restoreCentralnyMagazyn(backup.data.centralnyMagazyn);
          }
          result.restored.centralnyMagazyn = true;
          console.log('✅ CentralnyMagazynStanu restored');
        } catch (error) {
          result.errors.centralnyMagazyn = error.message;
          console.error('❌ CentralnyMagazynStanu restore failed:', error);
        }
      } else {
        result.skipped.centralnyMagazyn = true;
      }

      // Restore Test Reports
      if (operation.components.includes('testReports') && backup.data.testReports) {
        console.log('🔄 Restoring test reports...');
        try {
          if (!operation.dryRun) {
            this.restoreTestReports(backup.data.testReports);
          }
          result.restored.testReports = true;
          console.log('✅ Test reports restored');
        } catch (error) {
          result.errors.testReports = error.message;
          console.error('❌ Test reports restore failed:', error);
        }
      } else {
        result.skipped.testReports = true;
      }

      // Restore Configuration
      if (operation.components.includes('configuration') && backup.data.configuration) {
        console.log('🔄 Restoring configuration...');
        try {
          if (!operation.dryRun) {
            this.restoreConfiguration(backup.data.configuration);
          }
          result.restored.configuration = true;
          console.log('✅ Configuration restored');
        } catch (error) {
          result.errors.configuration = error.message;
          console.error('❌ Configuration restore failed:', error);
        }
      } else {
        result.skipped.configuration = true;
      }

      return result;
    }

    /**
     * Restore localStorage
     */
    restoreLocalStorage(data) {
      // Clear current localStorage
      localStorage.clear();

      // Restore from backup
      Object.keys(data).forEach(key => {
        try {
          localStorage.setItem(key, data[key]);
        } catch (e) {
          console.error(`Failed to restore localStorage key "${key}":`, e);
          throw e;
        }
      });
    }

    /**
     * Restore CentralnyMagazynStanu
     */
    restoreCentralnyMagazyn(data) {
      if (!window.centralnyMagazyn) {
        throw new Error('CentralnyMagazynStanu not available');
      }

      // Import data
      window.centralnyMagazyn.importujZJSON(data);
    }

    /**
     * Restore Test Reports
     */
    restoreTestReports(data) {
      localStorage.setItem('production_test_reports', JSON.stringify(data));
    }

    /**
     * Restore Configuration
     */
    restoreConfiguration(data) {
      // Restore testing config
      if (data.testing && window.productionTestRunner) {
        Object.assign(window.productionTestRunner.config, data.testing);
      }

      // Restore monitoring config
      if (data.monitoring && window.productionMonitor) {
        Object.assign(window.productionMonitor.config, data.monitoring);
      }
    }

    /**
     * Weryfikuje rollback
     */
    verifyRollback(backup) {
      const errors = [];

      // Verify localStorage
      if (backup.data.localStorage) {
        const currentKeys = Object.keys(localStorage);
        const backupKeys = Object.keys(backup.data.localStorage);
        
        if (currentKeys.length !== backupKeys.length) {
          errors.push(`localStorage key count mismatch: ${currentKeys.length} vs ${backupKeys.length}`);
        }
      }

      // Verify CentralnyMagazynStanu
      if (backup.data.centralnyMagazyn && window.centralnyMagazyn) {
        const currentState = window.centralnyMagazyn.exportujDoJSON();
        const backupState = backup.data.centralnyMagazyn;
        
        if (JSON.stringify(currentState) !== JSON.stringify(backupState)) {
          errors.push('CentralnyMagazynStanu state mismatch');
        }
      }

      return {
        success: errors.length === 0,
        errors: errors
      };
    }

    /**
     * Emergency rollback - do ostatniego stabilnego backupu
     */
    async emergencyRollback() {
      console.log('🚨 [RollbackManager] EMERGENCY ROLLBACK');

      if (!this.backupManager) {
        console.error('❌ BackupManager not available');
        return { success: false, error: 'BackupManager not available' };
      }

      // Get latest backup
      const backup = this.backupManager.getLatestBackup();
      if (!backup) {
        console.error('❌ No backups available');
        return { success: false, error: 'No backups available' };
      }

      console.log(`🔄 Rolling back to: ${backup.id} (${backup.getFormattedTimestamp()})`);

      // Execute rollback without confirmation
      return await this.rollback(backup.id, {
        skipConfirmation: true,
        dryRun: false
      });
    }

    /**
     * Rollback do poprzedniej wersji
     */
    async rollbackToPreviousVersion() {
      if (!this.backupManager) {
        return { success: false, error: 'BackupManager not available' };
      }

      const backups = this.backupManager.getBackups();
      if (backups.length < 2) {
        return { success: false, error: 'Not enough backups (need at least 2)' };
      }

      // Get second newest (skip the latest which is current)
      const previousBackup = backups[1];

      console.log(`🔄 Rolling back to previous version: ${previousBackup.version}`);

      return await this.rollback(previousBackup.id);
    }

    /**
     * Dodaje operację do historii
     */
    addToHistory(operation) {
      this.history.unshift(operation);

      // Keep only maxHistory
      if (this.history.length > this.config.maxHistory) {
        this.history = this.history.slice(0, this.config.maxHistory);
      }

      this.saveHistory();
    }

    /**
     * Pobiera historię rollbacków
     */
    getHistory(filter = {}) {
      let filtered = this.history;

      if (filter.status) {
        filtered = filtered.filter(op => op.status === filter.status);
      }

      if (filter.backupId) {
        filtered = filtered.filter(op => op.backupId === filter.backupId);
      }

      return filtered;
    }

    /**
     * Pobiera ostatnią operację
     */
    getLastOperation() {
      return this.history[0] || null;
    }

    /**
     * Statystyki rollbacków
     */
    getStats() {
      const byStatus = {};
      const byType = {};
      let totalDuration = 0;

      this.history.forEach(op => {
        byStatus[op.status] = (byStatus[op.status] || 0) + 1;
        byType[op.type] = (byType[op.type] || 0) + 1;
        totalDuration += op.duration;
      });

      return {
        total: this.history.length,
        byStatus: byStatus,
        byType: byType,
        avgDuration: this.history.length > 0 ? Math.round(totalDuration / this.history.length) : 0,
        successRate: this.history.length > 0
          ? Math.round((byStatus.completed || 0) / this.history.length * 100)
          : 0
      };
    }

    /**
     * Zapisuje historię
     */
    saveHistory() {
      try {
        const data = this.history.map(op => op.toJSON());
        localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      } catch (e) {
        console.error('❌ [RollbackManager] Failed to save history:', e);
      }
    }

    /**
     * Wczytuje historię
     */
    loadHistory() {
      try {
        const data = localStorage.getItem(this.config.storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          this.history = parsed.map(d => new RollbackOperation(d));
          console.log(`📜 [RollbackManager] Loaded ${this.history.length} operations`);
        }
      } catch (e) {
        console.error('❌ [RollbackManager] Failed to load history:', e);
        this.history = [];
      }
    }

    /**
     * Czyści historię
     */
    clearHistory() {
      this.history = [];
      this.saveHistory();
      console.log('🗑️ [RollbackManager] History cleared');
    }

    /**
     * Notification helper
     */
    notify(title, message) {
      if (!this.config.notifications) return;

      console.log(`🔔 [RollbackManager] ${title}: ${message}`);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      }
    }
  }

  // Export to window
  window.RollbackManager = RollbackManager;
  
  // Auto-initialize
  if (window.rollbackManagerConfig || document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.rollbackManager = new RollbackManager(window.rollbackManagerConfig);
    });
  }

  console.log('✅ RollbackManager loaded');

})(window);
