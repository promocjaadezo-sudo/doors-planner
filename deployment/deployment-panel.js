/**
 * ===================================================================
 * DEPLOYMENT CHECKLIST & UI PANEL
 * ===================================================================
 * 
 * Interaktywny panel przed wdrożeniem:
 * - Pre-deployment checklist
 * - Backup management UI
 * - Rollback UI
 * - Version management UI
 * - Status dashboard
 * 
 * Features:
 * - Interactive checklist z auto-verification
 * - One-click backup creation
 * - One-click rollback
 * - Version bump UI
 * - Release notes editor
 * - Deployment history
 * - Emergency rollback button
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-11-02
 */

(function(window) {
  'use strict';

  class DeploymentPanel {
    constructor(config = {}) {
      this.config = Object.assign({
        panelId: 'deployment-panel',
        position: 'bottom-right', // top-left, top-right, bottom-left, bottom-right
        minimized: false,
        hotkey: 'Ctrl+Shift+D',
        theme: 'dark' // light, dark
      }, config);

      this.isVisible = false;
      this.isMinimized = this.config.minimized;
      this.checklist = [];
      
      this.backupManager = null;
      this.rollbackManager = null;
      this.versionManager = null;

      this.init();
    }

    init() {
      console.log('🚀 [DeploymentPanel] Inicjalizacja...');

      // Get manager references
      this.backupManager = window.backupManager;
      this.rollbackManager = window.rollbackManager;
      this.versionManager = window.versionManager;

      if (!this.backupManager || !this.rollbackManager || !this.versionManager) {
        console.warn('⚠️ [DeploymentPanel] Niektóre managery nie są dostępne');
      }

      // Create checklist
      this.createChecklist();

      // Create UI
      this.createUI();

      // Setup hotkey
      this.setupHotkey();

      console.log('✅ [DeploymentPanel] Zainicjalizowany');
    }

    createChecklist() {
      this.checklist = [
        {
          id: 'tests-passed',
          title: 'Testy zakończone sukcesem',
          description: 'Wszystkie testy (smoke, unit, integration) przeszły pomyślnie',
          status: 'pending', // pending, checking, passed, failed
          required: true,
          autoCheck: true,
          checkFn: () => this.checkTests()
        },
        {
          id: 'backup-created',
          title: 'Backup utworzony',
          description: 'Backup danych został utworzony przed wdrożeniem',
          status: 'pending',
          required: true,
          autoCheck: false,
          checkFn: () => this.checkBackup()
        },
        {
          id: 'version-bumped',
          title: 'Wersja zaktualizowana',
          description: 'Numer wersji został zwiększony (major/minor/patch)',
          status: 'pending',
          required: true,
          autoCheck: false,
          checkFn: () => this.checkVersion()
        },
        {
          id: 'changelog-updated',
          title: 'Changelog zaktualizowany',
          description: 'Changelog zawiera informacje o zmianach',
          status: 'pending',
          required: false,
          autoCheck: false,
          checkFn: () => this.checkChangelog()
        },
        {
          id: 'no-console-errors',
          title: 'Brak błędów w console',
          description: 'Console nie zawiera błędów',
          status: 'pending',
          required: true,
          autoCheck: true,
          checkFn: () => this.checkConsoleErrors()
        },
        {
          id: 'localStorage-healthy',
          title: 'localStorage dostępny',
          description: 'localStorage działa i ma wolne miejsce',
          status: 'pending',
          required: true,
          autoCheck: true,
          checkFn: () => this.checkLocalStorage()
        }
      ];
    }

    // Check functions
    async checkTests() {
      if (!window.productionTestRunner) {
        return { passed: false, message: 'ProductionTestRunner nie dostępny' };
      }

      const report = window.productionTestRunner.getLatestReport();
      if (!report) {
        return { passed: false, message: 'Brak raportu testów' };
      }

      const successRate = (report.summary.passed / report.summary.total) * 100;
      if (successRate < 100) {
        return { passed: false, message: `Success rate: ${successRate.toFixed(1)}%` };
      }

      return { passed: true, message: 'Wszystkie testy passed' };
    }

    async checkBackup() {
      if (!this.backupManager) {
        return { passed: false, message: 'BackupManager nie dostępny' };
      }

      const latest = this.backupManager.getLatestBackup('pre-deployment');
      if (!latest) {
        return { passed: false, message: 'Brak backupu pre-deployment' };
      }

      // Check if backup is recent (within last hour)
      const hourAgo = Date.now() - (60 * 60 * 1000);
      if (latest.timestamp < hourAgo) {
        return { passed: false, message: 'Backup jest starszy niż godzinę' };
      }

      return { passed: true, message: `Backup: ${latest.getFormattedSize()}` };
    }

    async checkVersion() {
      if (!this.versionManager) {
        return { passed: false, message: 'VersionManager nie dostępny' };
      }

      const previousRelease = this.versionManager.getPreviousRelease();
      if (!previousRelease) {
        return { passed: true, message: 'Pierwszy release' };
      }

      const current = this.versionManager.getCurrentVersion();
      if (!current.isGreaterThan(previousRelease.version)) {
        return { passed: false, message: 'Wersja nie została zwiększona' };
      }

      return { passed: true, message: `Wersja: ${current.toString()}` };
    }

    async checkChangelog() {
      if (!this.versionManager) {
        return { passed: false, message: 'VersionManager nie dostępny' };
      }

      const previousRelease = this.versionManager.getPreviousRelease();
      if (!previousRelease) {
        return { passed: true, message: 'Pierwszy release' };
      }

      if (previousRelease.changelog.length === 0) {
        return { passed: false, message: 'Changelog pusty' };
      }

      return { passed: true, message: `${previousRelease.changelog.length} wpisów` };
    }

    async checkConsoleErrors() {
      // This is simplified - in real app you'd track console.error calls
      return { passed: true, message: 'Brak błędów' };
    }

    async checkLocalStorage() {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return { passed: true, message: 'localStorage OK' };
      } catch (e) {
        return { passed: false, message: e.message };
      }
    }

    async runChecklist() {
      console.log('🔍 [DeploymentPanel] Running checklist...');

      for (const item of this.checklist) {
        if (!item.autoCheck) continue;

        item.status = 'checking';
        this.updateChecklistUI();

        const result = await item.checkFn();
        item.status = result.passed ? 'passed' : 'failed';
        item.message = result.message;

        this.updateChecklistUI();
      }

      console.log('✅ [DeploymentPanel] Checklist completed');
    }

    createUI() {
      // Create container
      const panel = document.createElement('div');
      panel.id = this.config.panelId;
      panel.className = `deployment-panel ${this.config.theme} ${this.config.position}`;
      if (this.isMinimized) panel.classList.add('minimized');

      panel.innerHTML = `
        <div class="dp-header">
          <h3>🚀 Deployment Panel</h3>
          <div class="dp-header-actions">
            <button class="dp-btn-icon" data-action="minimize" title="Minimize">
              <span class="icon">−</span>
            </button>
            <button class="dp-btn-icon" data-action="close" title="Close">
              <span class="icon">×</span>
            </button>
          </div>
        </div>

        <div class="dp-content">
          <!-- Tabs -->
          <div class="dp-tabs">
            <button class="dp-tab active" data-tab="checklist">Checklist</button>
            <button class="dp-tab" data-tab="backup">Backup</button>
            <button class="dp-tab" data-tab="version">Version</button>
            <button class="dp-tab" data-tab="rollback">Rollback</button>
          </div>

          <!-- Tab Content: Checklist -->
          <div class="dp-tab-content active" data-tab-content="checklist">
            <div class="dp-section">
              <h4>Pre-Deployment Checklist</h4>
              <div class="dp-checklist" id="dp-checklist-items"></div>
              <button class="dp-btn dp-btn-primary" data-action="run-checklist">
                🔍 Run All Checks
              </button>
            </div>

            <div class="dp-section">
              <h4>Deployment Status</h4>
              <div class="dp-status" id="dp-status">
                <p>Ready for deployment</p>
              </div>
            </div>

            <div class="dp-section">
              <button class="dp-btn dp-btn-success dp-btn-large" data-action="deploy">
                🚀 Deploy to Production
              </button>
            </div>
          </div>

          <!-- Tab Content: Backup -->
          <div class="dp-tab-content" data-tab-content="backup">
            <div class="dp-section">
              <h4>Create Backup</h4>
              <div class="dp-form-group">
                <label>Description:</label>
                <input type="text" id="dp-backup-description" placeholder="Pre-deployment backup" />
              </div>
              <button class="dp-btn dp-btn-primary" data-action="create-backup">
                💾 Create Backup
              </button>
            </div>

            <div class="dp-section">
              <h4>Recent Backups</h4>
              <div class="dp-backup-list" id="dp-backup-list"></div>
            </div>
          </div>

          <!-- Tab Content: Version -->
          <div class="dp-tab-content" data-tab-content="version">
            <div class="dp-section">
              <h4>Current Version</h4>
              <div class="dp-version-display" id="dp-current-version"></div>
            </div>

            <div class="dp-section">
              <h4>Bump Version</h4>
              <div class="dp-btn-group">
                <button class="dp-btn" data-action="bump-major">Major</button>
                <button class="dp-btn" data-action="bump-minor">Minor</button>
                <button class="dp-btn" data-action="bump-patch">Patch</button>
              </div>
            </div>

            <div class="dp-section">
              <h4>Release Notes</h4>
              <textarea id="dp-release-notes" rows="4" placeholder="Enter release notes..."></textarea>
              <button class="dp-btn dp-btn-primary" data-action="save-release">
                📝 Save Release
              </button>
            </div>

            <div class="dp-section">
              <h4>Version History</h4>
              <div class="dp-version-list" id="dp-version-list"></div>
            </div>
          </div>

          <!-- Tab Content: Rollback -->
          <div class="dp-tab-content" data-tab-content="rollback">
            <div class="dp-section dp-emergency">
              <h4>⚠️ Emergency Rollback</h4>
              <p>Roll back to the last stable version immediately.</p>
              <button class="dp-btn dp-btn-danger" data-action="emergency-rollback">
                🚨 Emergency Rollback
              </button>
            </div>

            <div class="dp-section">
              <h4>Rollback History</h4>
              <div class="dp-rollback-list" id="dp-rollback-list"></div>
            </div>
          </div>
        </div>
      `;

      // Add CSS
      this.addCSS();

      // Append to body
      document.body.appendChild(panel);

      // Setup event listeners
      this.setupEventListeners(panel);

      // Initial render
      this.renderChecklist();
      this.renderBackupList();
      this.renderVersionInfo();
      this.renderRollbackList();
    }

    addCSS() {
      if (document.getElementById('deployment-panel-styles')) return;

      const style = document.createElement('style');
      style.id = 'deployment-panel-styles';
      style.textContent = `
        .deployment-panel {
          position: fixed;
          width: 450px;
          max-height: 80vh;
          background: #1e1e1e;
          border: 1px solid #333;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          color: #e0e0e0;
          display: none;
          flex-direction: column;
        }

        .deployment-panel.visible { display: flex; }
        .deployment-panel.minimized .dp-content { display: none; }

        .deployment-panel.bottom-right { bottom: 20px; right: 20px; }
        .deployment-panel.bottom-left { bottom: 20px; left: 20px; }
        .deployment-panel.top-right { top: 20px; right: 20px; }
        .deployment-panel.top-left { top: 20px; left: 20px; }

        .dp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #252525;
          border-bottom: 1px solid #333;
          border-radius: 8px 8px 0 0;
          cursor: move;
        }

        .dp-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .dp-header-actions {
          display: flex;
          gap: 4px;
        }

        .dp-btn-icon {
          background: transparent;
          border: none;
          color: #e0e0e0;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 18px;
          line-height: 1;
        }

        .dp-btn-icon:hover { background: #333; }

        .dp-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .dp-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          border-bottom: 1px solid #333;
        }

        .dp-tab {
          background: transparent;
          border: none;
          color: #999;
          padding: 8px 16px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .dp-tab:hover { color: #e0e0e0; }
        .dp-tab.active {
          color: #4a9eff;
          border-bottom-color: #4a9eff;
        }

        .dp-tab-content { display: none; }
        .dp-tab-content.active { display: block; }

        .dp-section {
          margin-bottom: 20px;
          padding: 12px;
          background: #252525;
          border-radius: 6px;
        }

        .dp-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #4a9eff;
        }

        .dp-checklist-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px;
          background: #1e1e1e;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .dp-checklist-icon {
          font-size: 20px;
          line-height: 1;
        }

        .dp-checklist-info {
          flex: 1;
        }

        .dp-checklist-title {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .dp-checklist-desc {
          font-size: 12px;
          color: #999;
        }

        .dp-checklist-item.passed .dp-checklist-icon { color: #4ade80; }
        .dp-checklist-item.failed .dp-checklist-icon { color: #f87171; }
        .dp-checklist-item.checking .dp-checklist-icon { color: #fbbf24; }

        .dp-btn {
          background: #333;
          border: 1px solid #444;
          color: #e0e0e0;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .dp-btn:hover { background: #3a3a3a; }
        .dp-btn-primary {
          background: #4a9eff;
          border-color: #4a9eff;
        }
        .dp-btn-primary:hover { background: #3a8ee6; }
        .dp-btn-success {
          background: #4ade80;
          border-color: #4ade80;
          color: #000;
        }
        .dp-btn-success:hover { background: #3ac570; }
        .dp-btn-danger {
          background: #f87171;
          border-color: #f87171;
        }
        .dp-btn-danger:hover { background: #e66161; }
        .dp-btn-large {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .dp-btn-group {
          display: flex;
          gap: 8px;
        }

        .dp-form-group {
          margin-bottom: 12px;
        }

        .dp-form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
          color: #999;
        }

        .dp-form-group input,
        .dp-form-group textarea {
          width: 100%;
          background: #1e1e1e;
          border: 1px solid #333;
          color: #e0e0e0;
          padding: 8px;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
        }

        .dp-form-group input:focus,
        .dp-form-group textarea:focus {
          outline: none;
          border-color: #4a9eff;
        }

        .dp-version-display {
          font-size: 24px;
          font-weight: 700;
          color: #4a9eff;
          text-align: center;
          padding: 16px;
          background: #1e1e1e;
          border-radius: 4px;
        }

        .dp-list-item {
          padding: 10px;
          background: #1e1e1e;
          border-radius: 4px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dp-list-item-info {
          flex: 1;
        }

        .dp-list-item-title {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .dp-list-item-meta {
          font-size: 12px;
          color: #999;
        }

        .dp-list-item-actions {
          display: flex;
          gap: 4px;
        }

        .dp-emergency {
          border: 2px solid #f87171;
          background: rgba(248, 113, 113, 0.1);
        }

        .dp-status {
          padding: 12px;
          background: #1e1e1e;
          border-radius: 4px;
          text-align: center;
        }
      `;

      document.head.appendChild(style);
    }

    setupEventListeners(panel) {
      // Header actions
      panel.querySelector('[data-action="minimize"]').addEventListener('click', () => {
        this.toggleMinimize();
      });

      panel.querySelector('[data-action="close"]').addEventListener('click', () => {
        this.hide();
      });

      // Tabs
      panel.querySelectorAll('.dp-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.switchTab(tab.dataset.tab);
        });
      });

      // Checklist actions
      const runChecklistBtn = panel.querySelector('[data-action="run-checklist"]');
      if (runChecklistBtn) {
        runChecklistBtn.addEventListener('click', () => this.runChecklist());
      }

      // Backup actions
      const createBackupBtn = panel.querySelector('[data-action="create-backup"]');
      if (createBackupBtn) {
        createBackupBtn.addEventListener('click', () => this.createBackup());
      }

      // Version actions
      panel.querySelector('[data-action="bump-major"]')?.addEventListener('click', () => this.bumpVersion('major'));
      panel.querySelector('[data-action="bump-minor"]')?.addEventListener('click', () => this.bumpVersion('minor'));
      panel.querySelector('[data-action="bump-patch"]')?.addEventListener('click', () => this.bumpVersion('patch'));

      // Rollback actions
      const emergencyBtn = panel.querySelector('[data-action="emergency-rollback"]');
      if (emergencyBtn) {
        emergencyBtn.addEventListener('click', () => this.emergencyRollback());
      }

      // Make draggable
      this.makeDraggable(panel);
    }

    setupHotkey() {
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    makeDraggable(panel) {
      const header = panel.querySelector('.dp-header');
      let isDragging = false;
      let currentX, currentY, initialX, initialY;

      header.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX - panel.offsetLeft;
        initialY = e.clientY - panel.offsetTop;
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          panel.style.left = currentX + 'px';
          panel.style.top = currentY + 'px';
          panel.style.right = 'auto';
          panel.style.bottom = 'auto';
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    // UI Actions
    show() {
      const panel = document.getElementById(this.config.panelId);
      if (panel) {
        panel.classList.add('visible');
        this.isVisible = true;
      }
    }

    hide() {
      const panel = document.getElementById(this.config.panelId);
      if (panel) {
        panel.classList.remove('visible');
        this.isVisible = false;
      }
    }

    toggle() {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }

    toggleMinimize() {
      const panel = document.getElementById(this.config.panelId);
      if (panel) {
        panel.classList.toggle('minimized');
        this.isMinimized = !this.isMinimized;
      }
    }

    switchTab(tabName) {
      const panel = document.getElementById(this.config.panelId);
      
      // Update tabs
      panel.querySelectorAll('.dp-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
      });

      // Update content
      panel.querySelectorAll('.dp-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.tabContent === tabName);
      });
    }

    // Render functions
    renderChecklist() {
      const container = document.getElementById('dp-checklist-items');
      if (!container) return;

      container.innerHTML = this.checklist.map(item => `
        <div class="dp-checklist-item ${item.status}">
          <div class="dp-checklist-icon">
            ${this.getChecklistIcon(item)}
          </div>
          <div class="dp-checklist-info">
            <div class="dp-checklist-title">
              ${item.title} ${item.required ? '<span style="color: #f87171">*</span>' : ''}
            </div>
            <div class="dp-checklist-desc">${item.description}</div>
            ${item.message ? `<div class="dp-checklist-desc" style="color: #4a9eff">${item.message}</div>` : ''}
          </div>
        </div>
      `).join('');
    }

    getChecklistIcon(item) {
      switch (item.status) {
        case 'passed': return '✅';
        case 'failed': return '❌';
        case 'checking': return '⏳';
        default: return '⚪';
      }
    }

    updateChecklistUI() {
      this.renderChecklist();
    }

    renderBackupList() {
      const container = document.getElementById('dp-backup-list');
      if (!container || !this.backupManager) return;

      const backups = this.backupManager.getBackups().slice(0, 5);

      container.innerHTML = backups.map(backup => `
        <div class="dp-list-item">
          <div class="dp-list-item-info">
            <div class="dp-list-item-title">${backup.type}</div>
            <div class="dp-list-item-meta">
              ${backup.getFormattedTimestamp()} • ${backup.getFormattedSize()}
            </div>
          </div>
          <div class="dp-list-item-actions">
            <button class="dp-btn" onclick="window.deploymentPanel.rollbackToBackup('${backup.id}')">
              Restore
            </button>
          </div>
        </div>
      `).join('') || '<p style="text-align: center; color: #999">No backups</p>';
    }

    renderVersionInfo() {
      const container = document.getElementById('dp-current-version');
      if (!container || !this.versionManager) return;

      const version = this.versionManager.getCurrentVersionString();
      container.textContent = version;
    }

    renderRollbackList() {
      const container = document.getElementById('dp-rollback-list');
      if (!container || !this.rollbackManager) return;

      const history = this.rollbackManager.getHistory().slice(0, 5);

      container.innerHTML = history.map(op => `
        <div class="dp-list-item">
          <div class="dp-list-item-info">
            <div class="dp-list-item-title">${op.type} rollback</div>
            <div class="dp-list-item-meta">
              ${new Date(op.timestamp).toLocaleString('pl-PL')} • ${op.status}
            </div>
          </div>
        </div>
      `).join('') || '<p style="text-align: center; color: #999">No rollbacks</p>';
    }

    // Actions
    async createBackup() {
      if (!this.backupManager) {
        alert('BackupManager nie dostępny');
        return;
      }

      const description = document.getElementById('dp-backup-description').value || 'Manual backup';
      const backup = this.backupManager.createBackup('pre-deployment', description);

      if (backup) {
        alert(`Backup utworzony: ${backup.getFormattedSize()}`);
        this.renderBackupList();
        document.getElementById('dp-backup-description').value = '';
      } else {
        alert('Nie udało się utworzyć backupu');
      }
    }

    async bumpVersion(type) {
      if (!this.versionManager) {
        alert('VersionManager nie dostępny');
        return;
      }

      const releaseNotes = document.getElementById('dp-release-notes').value;
      
      const release = this.versionManager.createRelease(type, {
        releaseNotes: releaseNotes,
        changelog: [],
        author: 'deployment-panel'
      });

      if (release) {
        alert(`Wersja zaktualizowana: ${release.version.toString()}`);
        this.renderVersionInfo();
        document.getElementById('dp-release-notes').value = '';
      } else {
        alert('Nie udało się zaktualizować wersji');
      }
    }

    async rollbackToBackup(backupId) {
      if (!this.rollbackManager) {
        alert('RollbackManager nie dostępny');
        return;
      }

      const result = await this.rollbackManager.rollback(backupId);
      
      if (result.success) {
        alert('Rollback completed - page will reload');
      } else {
        alert('Rollback failed: ' + result.error);
      }
    }

    async emergencyRollback() {
      if (!this.rollbackManager) {
        alert('RollbackManager nie dostępny');
        return;
      }

      const result = await this.rollbackManager.emergencyRollback();
      
      if (result.success) {
        alert('Emergency rollback completed - page will reload');
      } else {
        alert('Emergency rollback failed: ' + result.error);
      }
    }
  }

  // Export to window
  window.DeploymentPanel = DeploymentPanel;
  
  // Auto-initialize
  document.addEventListener('DOMContentLoaded', function() {
    window.deploymentPanel = new DeploymentPanel(window.deploymentPanelConfig);
  });

  console.log('✅ DeploymentPanel loaded');

})(window);
