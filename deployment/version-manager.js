/**
 * ===================================================================
 * VERSION MANAGER - System wersjonowania aplikacji
 * ===================================================================
 * 
 * Zarządzanie wersjami aplikacji:
 * - Semantic versioning (MAJOR.MINOR.PATCH)
 * - Version tagging i tracking
 * - Changelog generation
 * - Version comparison
 * - Release notes
 * 
 * Features:
 * - Auto-increment version
 * - Version history
 * - Changelog tracking
 * - Breaking changes detection
 * - Migration scripts
 * - Version comparison
 * - Release validation
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-11-02
 */

(function(window) {
  'use strict';

  /**
   * Version Object
   */
  class Version {
    constructor(major, minor, patch, prerelease = null, metadata = null) {
      this.major = parseInt(major) || 0;
      this.minor = parseInt(minor) || 0;
      this.patch = parseInt(patch) || 0;
      this.prerelease = prerelease;
      this.metadata = metadata;
    }

    toString() {
      let str = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease) str += `-${this.prerelease}`;
      if (this.metadata) str += `+${this.metadata}`;
      return str;
    }

    static parse(versionString) {
      // Parse: 1.2.3-beta.1+20250102
      const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/;
      const match = versionString.match(regex);
      
      if (!match) {
        throw new Error('Invalid version string: ' + versionString);
      }

      return new Version(
        match[1],
        match[2],
        match[3],
        match[4] || null,
        match[5] || null
      );
    }

    increment(type) {
      switch (type) {
        case 'major':
          return new Version(this.major + 1, 0, 0);
        case 'minor':
          return new Version(this.major, this.minor + 1, 0);
        case 'patch':
          return new Version(this.major, this.minor, this.patch + 1);
        default:
          throw new Error('Invalid increment type: ' + type);
      }
    }

    compare(other) {
      if (this.major !== other.major) return this.major - other.major;
      if (this.minor !== other.minor) return this.minor - other.minor;
      if (this.patch !== other.patch) return this.patch - other.patch;
      return 0;
    }

    isGreaterThan(other) {
      return this.compare(other) > 0;
    }

    isLessThan(other) {
      return this.compare(other) < 0;
    }

    equals(other) {
      return this.compare(other) === 0;
    }
  }

  /**
   * Release - pojedynczy release
   */
  class Release {
    constructor(data) {
      this.version = data.version instanceof Version ? data.version : Version.parse(data.version);
      this.timestamp = data.timestamp || Date.now();
      this.changelog = data.changelog || [];
      this.breakingChanges = data.breakingChanges || [];
      this.migrations = data.migrations || [];
      this.releaseNotes = data.releaseNotes || '';
      this.author = data.author || 'unknown';
      this.backupId = data.backupId || null;
    }

    toJSON() {
      return {
        version: this.version.toString(),
        timestamp: this.timestamp,
        changelog: this.changelog,
        breakingChanges: this.breakingChanges,
        migrations: this.migrations,
        releaseNotes: this.releaseNotes,
        author: this.author,
        backupId: this.backupId
      };
    }

    getFormattedTimestamp() {
      return new Date(this.timestamp).toLocaleString('pl-PL');
    }

    hasBreakingChanges() {
      return this.breakingChanges.length > 0;
    }

    hasMigrations() {
      return this.migrations.length > 0;
    }
  }

  /**
   * VersionManager - główny manager wersji
   */
  class VersionManager {
    constructor(config = {}) {
      this.config = Object.assign({
        enabled: true,
        currentVersion: '1.0.0',
        storageKey: 'app_version_history',
        maxHistory: 50,
        autoBackupOnRelease: true,
        requireReleaseNotes: false,
        notifications: true
      }, config);

      this.currentVersion = null;
      this.history = [];
      this.backupManager = null;
      
      this.init();
    }

    init() {
      console.log('📌 [VersionManager] Inicjalizacja...');
      
      // Parse current version
      try {
        this.currentVersion = Version.parse(this.config.currentVersion);
      } catch (e) {
        console.error('❌ Invalid version format:', this.config.currentVersion);
        this.currentVersion = new Version(1, 0, 0);
      }

      // Get backup manager reference
      if (window.backupManager) {
        this.backupManager = window.backupManager;
        this.backupManager.setVersion(this.currentVersion.toString());
      }

      // Load history
      this.loadHistory();

      console.log('✅ [VersionManager] Zainicjalizowany');
      console.log(`📌 Current version: ${this.currentVersion.toString()}`);
      console.log(`📜 ${this.history.length} releases w historii`);
    }

    /**
     * Tworzy nowy release
     */
    createRelease(type, options = {}) {
      if (!this.config.enabled) {
        console.error('❌ [VersionManager] Disabled');
        return null;
      }

      console.log(`📦 [VersionManager] Creating ${type} release...`);

      // Increment version
      const newVersion = this.currentVersion.increment(type);

      // Create release
      const release = new Release({
        version: newVersion,
        changelog: options.changelog || [],
        breakingChanges: options.breakingChanges || [],
        migrations: options.migrations || [],
        releaseNotes: options.releaseNotes || '',
        author: options.author || 'unknown'
      });

      // Validate release notes if required
      if (this.config.requireReleaseNotes && !release.releaseNotes) {
        console.error('❌ [VersionManager] Release notes required');
        return null;
      }

      // Create backup if enabled
      if (this.config.autoBackupOnRelease && this.backupManager) {
        console.log('📦 Creating pre-release backup...');
        const backup = this.backupManager.createBackup(
          'pre-release',
          `Backup przed release ${newVersion.toString()}`
        );
        if (backup) {
          release.backupId = backup.id;
          console.log('✅ Backup created:', backup.id);
        }
      }

      // Add to history
      this.history.unshift(release);

      // Keep only maxHistory
      if (this.history.length > this.config.maxHistory) {
        this.history = this.history.slice(0, this.config.maxHistory);
      }

      // Update current version
      this.currentVersion = newVersion;

      // Update backup manager version
      if (this.backupManager) {
        this.backupManager.setVersion(newVersion.toString());
      }

      // Save
      this.saveHistory();
      this.saveCurrentVersion();

      console.log(`✅ [VersionManager] Release created: ${newVersion.toString()}`);

      if (this.config.notifications) {
        this.notify(
          'New Release',
          `Version ${newVersion.toString()} created`
        );
      }

      return release;
    }

    /**
     * Pobiera informacje o wersji
     */
    getCurrentVersion() {
      return this.currentVersion;
    }

    getCurrentVersionString() {
      return this.currentVersion.toString();
    }

    /**
     * Pobiera historię release'ów
     */
    getHistory(filter = {}) {
      let filtered = this.history;

      if (filter.major !== undefined) {
        filtered = filtered.filter(r => r.version.major === filter.major);
      }

      if (filter.minor !== undefined) {
        filtered = filtered.filter(r => r.version.minor === filter.minor);
      }

      if (filter.hasBreakingChanges) {
        filtered = filtered.filter(r => r.hasBreakingChanges());
      }

      return filtered;
    }

    /**
     * Pobiera release po wersji
     */
    getRelease(versionString) {
      const version = Version.parse(versionString);
      return this.history.find(r => r.version.equals(version));
    }

    /**
     * Pobiera poprzedni release
     */
    getPreviousRelease() {
      return this.history[0] || null;
    }

    /**
     * Generuje changelog między wersjami
     */
    generateChangelog(fromVersion, toVersion) {
      const from = typeof fromVersion === 'string' ? Version.parse(fromVersion) : fromVersion;
      const to = typeof toVersion === 'string' ? Version.parse(toVersion) : toVersion;

      const releases = this.history.filter(r => {
        return r.version.isGreaterThan(from) && 
               (r.version.isLessThan(to) || r.version.equals(to));
      });

      releases.sort((a, b) => b.version.compare(a.version));

      const changelog = {
        from: from.toString(),
        to: to.toString(),
        releases: releases.length,
        changes: [],
        breakingChanges: [],
        migrations: []
      };

      releases.forEach(release => {
        changelog.changes.push(...release.changelog);
        changelog.breakingChanges.push(...release.breakingChanges);
        changelog.migrations.push(...release.migrations);
      });

      return changelog;
    }

    /**
     * Generuje migration plan między wersjami
     */
    generateMigrationPlan(fromVersion, toVersion) {
      const changelog = this.generateChangelog(fromVersion, toVersion);
      
      return {
        from: changelog.from,
        to: changelog.to,
        hasBreakingChanges: changelog.breakingChanges.length > 0,
        breakingChanges: changelog.breakingChanges,
        migrations: changelog.migrations,
        steps: this.generateMigrationSteps(changelog.migrations)
      };
    }

    generateMigrationSteps(migrations) {
      const steps = [];
      
      migrations.forEach((migration, index) => {
        steps.push({
          step: index + 1,
          description: migration,
          status: 'pending'
        });
      });

      return steps;
    }

    /**
     * Porównuje wersje
     */
    compareVersions(v1String, v2String) {
      const v1 = Version.parse(v1String);
      const v2 = Version.parse(v2String);

      const result = v1.compare(v2);

      return {
        v1: v1.toString(),
        v2: v2.toString(),
        comparison: result > 0 ? 'greater' : result < 0 ? 'less' : 'equal',
        difference: {
          major: Math.abs(v1.major - v2.major),
          minor: Math.abs(v1.minor - v2.minor),
          patch: Math.abs(v1.patch - v2.patch)
        }
      };
    }

    /**
     * Sprawdza czy upgrade jest możliwy
     */
    canUpgrade(toVersion) {
      const to = typeof toVersion === 'string' ? Version.parse(toVersion) : toVersion;
      
      if (to.isLessThan(this.currentVersion) || to.equals(this.currentVersion)) {
        return {
          possible: false,
          reason: 'Target version must be greater than current version'
        };
      }

      const plan = this.generateMigrationPlan(this.currentVersion, to);

      return {
        possible: true,
        hasBreakingChanges: plan.hasBreakingChanges,
        migrationSteps: plan.steps.length,
        plan: plan
      };
    }

    /**
     * Statystyki wersji
     */
    getStats() {
      const majorReleases = new Set(this.history.map(r => r.version.major)).size;
      const minorReleases = this.history.filter(r => r.version.minor > 0).length;
      const patchReleases = this.history.filter(r => r.version.patch > 0).length;
      const breakingChanges = this.history.filter(r => r.hasBreakingChanges()).length;
      const withMigrations = this.history.filter(r => r.hasMigrations()).length;

      return {
        currentVersion: this.currentVersion.toString(),
        totalReleases: this.history.length,
        majorReleases: majorReleases,
        minorReleases: minorReleases,
        patchReleases: patchReleases,
        breakingChanges: breakingChanges,
        withMigrations: withMigrations,
        oldest: this.history.length > 0
          ? this.history[this.history.length - 1].version.toString()
          : null,
        newest: this.history.length > 0
          ? this.history[0].version.toString()
          : null
      };
    }

    /**
     * Export changelog do markdown
     */
    exportChangelogMarkdown() {
      let md = '# Changelog\n\n';
      md += `Current version: **${this.currentVersion.toString()}**\n\n`;
      md += '---\n\n';

      this.history.forEach(release => {
        md += `## [${release.version.toString()}] - ${release.getFormattedTimestamp()}\n\n`;

        if (release.releaseNotes) {
          md += `${release.releaseNotes}\n\n`;
        }

        if (release.changelog.length > 0) {
          md += '### Changes\n\n';
          release.changelog.forEach(change => {
            md += `- ${change}\n`;
          });
          md += '\n';
        }

        if (release.breakingChanges.length > 0) {
          md += '### ⚠️ Breaking Changes\n\n';
          release.breakingChanges.forEach(change => {
            md += `- ${change}\n`;
          });
          md += '\n';
        }

        if (release.migrations.length > 0) {
          md += '### Migrations\n\n';
          release.migrations.forEach(migration => {
            md += `- ${migration}\n`;
          });
          md += '\n';
        }

        md += '---\n\n';
      });

      return md;
    }

    /**
     * Export changelog do pliku
     */
    exportChangelog() {
      const md = this.exportChangelogMarkdown();
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CHANGELOG.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('💾 [VersionManager] Changelog exported');
    }

    /**
     * Zapisuje historię
     */
    saveHistory() {
      try {
        const data = this.history.map(r => r.toJSON());
        localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      } catch (e) {
        console.error('❌ [VersionManager] Failed to save history:', e);
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
          this.history = parsed.map(d => new Release(d));
          console.log(`📜 [VersionManager] Loaded ${this.history.length} releases`);
        }
      } catch (e) {
        console.error('❌ [VersionManager] Failed to load history:', e);
        this.history = [];
      }
    }

    /**
     * Zapisuje aktualną wersję
     */
    saveCurrentVersion() {
      try {
        localStorage.setItem('app_current_version', this.currentVersion.toString());
      } catch (e) {
        console.error('❌ [VersionManager] Failed to save current version:', e);
      }
    }

    /**
     * Czyści historię
     */
    clearHistory() {
      this.history = [];
      this.saveHistory();
      console.log('🗑️ [VersionManager] History cleared');
    }

    /**
     * Notification helper
     */
    notify(title, message) {
      if (!this.config.notifications) return;

      console.log(`🔔 [VersionManager] ${title}: ${message}`);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      }
    }
  }

  // Export to window
  window.VersionManager = VersionManager;
  window.Version = Version;
  
  // Auto-initialize
  if (window.versionManagerConfig || document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.versionManager = new VersionManager(window.versionManagerConfig);
    });
  }

  console.log('✅ VersionManager loaded');

})(window);
