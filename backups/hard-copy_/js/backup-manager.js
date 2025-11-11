// js/backup-manager.js
// Automatyczny system kopii zapasowych stanu aplikacji

(function() {
  const BACKUP_KEY_PREFIX = 'door_backup_';
  const MAX_AUTO_BACKUPS = 5; // Maksymalna liczba automatycznych kopii
  
  /**
   * Tworzy automatyczną kopię zapasową aktualnego stanu
   * @param {string} reason - Powód utworzenia backupu (np. 'before-order-save', 'before-task-delete')
   * @returns {string} ID utworzonego backupu
   */
  function createAutoBackup(reason = 'manual') {
    try {
      const stateKey = window.storeKey || 'door_v50_state';
      const currentState = localStorage.getItem(stateKey);
      
      if (!currentState) {
        console.warn('[backup] Brak stanu do zapisania');
        return null;
      }
      
      const timestamp = Date.now();
      const backupId = `${BACKUP_KEY_PREFIX}${timestamp}`;
      
      const backupData = {
        id: backupId,
        timestamp: timestamp,
        date: new Date(timestamp).toISOString(),
        reason: reason,
        stateKey: stateKey,
        data: currentState,
        compressed: false,
        version: window.APP_VERSION || '5.6.27'
      };
      
      localStorage.setItem(backupId, JSON.stringify(backupData));
      console.log(`[backup] ✓ Utworzono kopię zapasową: ${backupId} (${reason})`);
      
      // Automatyczne czyszczenie starych kopii
      cleanupOldBackups();
      
      return backupId;
    } catch (err) {
      console.error('[backup] Błąd podczas tworzenia kopii:', err);
      return null;
    }
  }
  
  /**
   * Usuwa najstarsze automatyczne backupy jeśli przekroczono limit
   */
  function cleanupOldBackups() {
    try {
      const backups = listBackups();
      const autoBackups = backups.filter(b => b.reason !== 'manual-export');
      
      if (autoBackups.length > MAX_AUTO_BACKUPS) {
        const toDelete = autoBackups
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, autoBackups.length - MAX_AUTO_BACKUPS);
        
        toDelete.forEach(backup => {
          localStorage.removeItem(backup.id);
          console.log(`[backup] Usunięto starą kopię: ${backup.id}`);
        });
      }
    } catch (err) {
      console.error('[backup] Błąd podczas czyszczenia kopii:', err);
    }
  }
  
  /**
   * Zwraca listę wszystkich dostępnych kopii zapasowych
   * @returns {Array} Lista backupów z metadanymi
   */
  function listBackups() {
    const backups = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            backups.push({
              id: parsed.id,
              timestamp: parsed.timestamp,
              date: parsed.date,
              reason: parsed.reason,
              stateKey: parsed.stateKey,
              size: data.length,
              version: parsed.version
            });
          }
        }
      }
    } catch (err) {
      console.error('[backup] Błąd podczas listowania kopii:', err);
    }
    
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Przywraca stan z wybranego backupu
   * @param {string} backupId - ID backupu do przywrócenia
   * @returns {boolean} true jeśli przywrócono pomyślnie
   */
  function restoreBackup(backupId) {
    try {
      const backupData = localStorage.getItem(backupId);
      if (!backupData) {
        console.error('[backup] Nie znaleziono kopii:', backupId);
        return false;
      }
      
      const parsed = JSON.parse(backupData);
      const stateKey = parsed.stateKey || window.storeKey || 'door_v50_state';
      
      // Zapisz obecny stan jako backup przed przywróceniem
      createAutoBackup('before-restore');
      
      // Przywróć stan
      localStorage.setItem(stateKey, parsed.data);
      console.log(`[backup] ✓ Przywrócono stan z: ${parsed.date} (${parsed.reason})`);
      
      return true;
    } catch (err) {
      console.error('[backup] Błąd podczas przywracania:', err);
      return false;
    }
  }
  
  /**
   * Usuwa wybraną kopię zapasową
   * @param {string} backupId - ID backupu do usunięcia
   */
  function deleteBackup(backupId) {
    try {
      localStorage.removeItem(backupId);
      console.log(`[backup] Usunięto kopię: ${backupId}`);
      return true;
    } catch (err) {
      console.error('[backup] Błąd podczas usuwania:', err);
      return false;
    }
  }
  
  /**
   * Eksportuje backup do pliku JSON
   * @param {string} backupId - ID backupu do eksportu
   */
  function exportBackupToFile(backupId) {
    try {
      const backupData = localStorage.getItem(backupId);
      if (!backupData) {
        alert('Nie znaleziono kopii zapasowej');
        return;
      }
      
      const parsed = JSON.parse(backupData);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date(parsed.timestamp).toISOString().split('T')[0]}_${parsed.reason}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      console.log('[backup] ✓ Wyeksportowano kopię do pliku');
    } catch (err) {
      console.error('[backup] Błąd podczas eksportu:', err);
      alert('Błąd podczas eksportu kopii');
    }
  }
  
  // Publiczne API
  window.BackupManager = {
    create: createAutoBackup,
    list: listBackups,
    restore: restoreBackup,
    delete: deleteBackup,
    export: exportBackupToFile,
    cleanup: cleanupOldBackups
  };
  
  console.log('[backup] BackupManager załadowany ✓');
})();
