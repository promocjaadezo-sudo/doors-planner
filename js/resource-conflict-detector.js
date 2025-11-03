/**
 * Resource Conflict Detector Module
 * Wykrywa i zarządza konfliktami zasobów (pracowników)
 * 
 * @module resource-conflict-detector
 * @version 1.0.0
 * @date 2025-11-02
 */

(function(global) {
  'use strict';
  
  console.log('🔍 Loading Resource Conflict Detector module...');
  
  // ============================================================================
  // KONFIGURACJA
  // ============================================================================
  
  /**
   * Konfiguracja wykrywania konfliktów
   */
  const CONFIG = {
    workdayLengthHours: 8,          // Standardowa długość dnia pracy (godziny)
    overloadThreshold: 1.2,          // 120% capacity = overload
    warningThreshold: 0.9,           // 90% capacity = warning
    conflictDebug: true              // Debug logs
  };
  
  // ============================================================================
  // DETEKCJA KONFLIKTÓW CZASOWYCH
  // ============================================================================
  
  /**
   * Wykrywa wszystkie konflikty dla zadania
   * @param {Object} task - Zadanie do sprawdzenia
   * @param {string} employeeId - ID pracownika
   * @param {Array} allTasks - Wszystkie zadania (opcjonalne)
   * @returns {Array<Object>} Tablica konfliktów
   */
  function detectConflicts(task, employeeId, allTasks) {
    if (!task || !employeeId) {
      console.error('[ConflictDetector] Invalid parameters');
      return [];
    }
    
    // Pobierz state jeśli nie przekazano zadań
    if (!allTasks) {
      const state = window.store ? window.store.get() : window.state;
      allTasks = state.tasks || [];
    }
    
    const conflicts = [];
    
    // 1. Time overlap conflicts
    const timeConflicts = detectTimeOverlap(task, employeeId, allTasks);
    conflicts.push(...timeConflicts);
    
    // 2. Capacity conflicts
    const capacityConflicts = detectCapacityConflict(task, employeeId, allTasks);
    conflicts.push(...capacityConflicts);
    
    if (CONFIG.conflictDebug && conflicts.length > 0) {
      console.log(`⚠️ [ConflictDetector] Found ${conflicts.length} conflicts for task:`, task.id);
    }
    
    return conflicts;
  }
  
  /**
   * Wykrywa nakładające się zadania (time overlap)
   * @param {Object} task - Zadanie do sprawdzenia
   * @param {string} employeeId - ID pracownika
   * @param {Array} allTasks - Wszystkie zadania
   * @returns {Array<Object>} Konflikty czasowe
   */
  function detectTimeOverlap(task, employeeId, allTasks) {
    const conflicts = [];
    
    // Filtruj zadania pracownika (z wyjątkiem obecnego)
    const employeeTasks = allTasks.filter(t => 
      t.assignedTo === employeeId && 
      t.id !== task.id &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );
    
    if (!task.startPlanned || !task.endPlanned) {
      // Zadanie nie ma zaplanowanych dat
      return conflicts;
    }
    
    const taskStart = new Date(task.startPlanned).getTime();
    const taskEnd = new Date(task.endPlanned).getTime();
    
    for (const existingTask of employeeTasks) {
      if (!existingTask.startPlanned || !existingTask.endPlanned) {
        continue;
      }
      
      const existingStart = new Date(existingTask.startPlanned).getTime();
      const existingEnd = new Date(existingTask.endPlanned).getTime();
      
      // Sprawdź overlap
      const hasOverlap = (
        (taskStart >= existingStart && taskStart < existingEnd) ||  // Start w trakcie
        (taskEnd > existingStart && taskEnd <= existingEnd) ||      // End w trakcie
        (taskStart <= existingStart && taskEnd >= existingEnd)      // Otacza całkowicie
      );
      
      if (hasOverlap) {
        const overlapStart = Math.max(taskStart, existingStart);
        const overlapEnd = Math.min(taskEnd, existingEnd);
        const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
        
        conflicts.push({
          type: 'time-overlap',
          taskId: task.id,
          taskName: task.name || task.id,
          conflictingTaskId: existingTask.id,
          conflictingTaskName: existingTask.name || existingTask.id,
          employeeId,
          overlapStart: new Date(overlapStart),
          overlapEnd: new Date(overlapEnd),
          overlapHours: overlapHours.toFixed(2),
          severity: calculateSeverity(overlapHours, task, existingTask),
          message: `Nakładanie się z zadaniem "${existingTask.name || existingTask.id}"`
        });
        
        if (CONFIG.conflictDebug) {
          console.log(`   ⏱️ Time overlap: ${task.id} ↔ ${existingTask.id} (${overlapHours.toFixed(1)}h)`);
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Wykrywa konflikty pojemności (capacity overload)
   * @param {Object} task - Zadanie do sprawdzenia
   * @param {string} employeeId - ID pracownika
   * @param {Array} allTasks - Wszystkie zadania
   * @returns {Array<Object>} Konflikty pojemności
   */
  function detectCapacityConflict(task, employeeId, allTasks) {
    const conflicts = [];
    
    if (!task.startPlanned || !task.endPlanned) {
      return conflicts;
    }
    
    // Sprawdź capacity dla każdego dnia w zakresie zadania
    const taskStart = new Date(task.startPlanned);
    const taskEnd = new Date(task.endPlanned);
    
    let currentDate = new Date(taskStart);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= taskEnd) {
      const validation = validateCapacity(employeeId, task, currentDate, allTasks);
      
      if (!validation.valid) {
        conflicts.push({
          type: 'over-capacity',
          taskId: task.id,
          taskName: task.name || task.id,
          employeeId,
          date: new Date(currentDate),
          currentLoad: validation.currentLoad.toFixed(2),
          maxCapacity: validation.maxCapacity,
          overload: validation.overload.toFixed(2),
          severity: validation.overload > 4 ? 'high' : 'medium',
          message: `Przeciążenie ${validation.overload.toFixed(1)}h na dzień ${formatDate(currentDate)}`
        });
        
        if (CONFIG.conflictDebug) {
          console.log(`   💼 Capacity overload on ${formatDate(currentDate)}: ${validation.overload.toFixed(1)}h over limit`);
        }
      }
      
      // Następny dzień
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return conflicts;
  }
  
  // ============================================================================
  // WALIDACJA POJEMNOŚCI
  // ============================================================================
  
  /**
   * Sprawdza czy pracownik ma capacity na zadanie w danym dniu
   * @param {string} employeeId - ID pracownika
   * @param {Object} task - Zadanie
   * @param {Date} date - Data do sprawdzenia
   * @param {Array} allTasks - Wszystkie zadania (opcjonalne)
   * @returns {Object} Wynik walidacji
   */
  function validateCapacity(employeeId, task, date, allTasks) {
    // Pobierz state jeśli nie przekazano zadań
    if (!allTasks) {
      const state = window.store ? window.store.get() : window.state;
      allTasks = state.tasks || [];
    }
    
    // Pobierz zadania pracownika na ten dzień
    const dailyTasks = getTasksForDate(employeeId, date, allTasks);
    
    // Oblicz obecne obciążenie
    const currentLoad = dailyTasks.reduce((sum, t) => {
      if (t.id === task.id) return sum; // Pomiń obecne zadanie
      return sum + calculateTaskDuration(t);
    }, 0);
    
    // Oblicz duration nowego zadania
    const newTaskDuration = calculateTaskDuration(task);
    
    // Pobierz max capacity z config
    const state = window.store ? window.store.get() : window.state;
    const workdayHours = (state.scheduleConfig && state.scheduleConfig.workdayLengthHours) 
      || CONFIG.workdayLengthHours;
    
    const totalLoad = currentLoad + newTaskDuration;
    
    if (totalLoad > workdayHours) {
      return {
        valid: false,
        reason: 'over-capacity',
        currentLoad,
        maxCapacity: workdayHours,
        overload: totalLoad - workdayHours,
        utilizationPercent: ((totalLoad / workdayHours) * 100).toFixed(1)
      };
    }
    
    // Warning jeśli blisko limitu
    if (totalLoad > workdayHours * CONFIG.warningThreshold) {
      return {
        valid: true,
        warning: true,
        reason: 'near-capacity',
        currentLoad,
        maxCapacity: workdayHours,
        remaining: workdayHours - totalLoad,
        utilizationPercent: ((totalLoad / workdayHours) * 100).toFixed(1)
      };
    }
    
    return {
      valid: true,
      currentLoad,
      maxCapacity: workdayHours,
      remaining: workdayHours - totalLoad,
      utilizationPercent: ((totalLoad / workdayHours) * 100).toFixed(1)
    };
  }
  
  /**
   * Pobiera zadania pracownika dla konkretnego dnia
   * @param {string} employeeId - ID pracownika
   * @param {Date} date - Data
   * @param {Array} allTasks - Wszystkie zadania
   * @returns {Array<Object>} Zadania na ten dzień
   */
  function getTasksForDate(employeeId, date, allTasks) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return allTasks.filter(t => {
      if (t.assignedTo !== employeeId) return false;
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (!t.startPlanned || !t.endPlanned) return false;
      
      const taskStart = new Date(t.startPlanned);
      const taskEnd = new Date(t.endPlanned);
      
      // Czy zadanie jest aktywne w tym dniu
      return taskStart <= dayEnd && taskEnd >= dayStart;
    });
  }
  
  /**
   * Oblicza czas trwania zadania w godzinach
   * @param {Object} task - Zadanie
   * @returns {number} Duration w godzinach
   */
  function calculateTaskDuration(task) {
    if (task.duration) {
      return task.duration; // Jeśli już obliczone
    }
    
    if (task.startPlanned && task.endPlanned) {
      const start = new Date(task.startPlanned);
      const end = new Date(task.endPlanned);
      const hours = (end - start) / (1000 * 60 * 60);
      return Math.max(0, hours);
    }
    
    // Fallback: użyj duration z operacji
    if (task.operation && typeof window.computeDuration === 'function') {
      const state = window.store ? window.store.get() : window.state;
      const order = state.orders.find(o => o.id === task.orderId);
      return window.computeDuration(task.operation, order) || 1;
    }
    
    return 1; // Default: 1 godzina
  }
  
  // ============================================================================
  // SUGESTIE ALTERNATYWNYCH PRACOWNIKÓW
  // ============================================================================
  
  /**
   * Sugeruje alternatywnych pracowników dla zadania
   * @param {Object} task - Zadanie
   * @param {string} conflictedEmployeeId - ID pracownika z konfliktem
   * @param {Array} allEmployees - Wszyscy pracownicy (opcjonalne)
   * @param {Array} allTasks - Wszystkie zadania (opcjonalne)
   * @returns {Array<Object>} Alternatywni pracownicy
   */
  function suggestAlternatives(task, conflictedEmployeeId, allEmployees, allTasks) {
    const state = window.store ? window.store.get() : window.state;
    
    if (!allEmployees) {
      allEmployees = state.employees || [];
    }
    
    if (!allTasks) {
      allTasks = state.tasks || [];
    }
    
    const alternatives = [];
    
    for (const employee of allEmployees) {
      // Pomiń pracownika z konfliktem
      if (employee.id === conflictedEmployeeId) continue;
      
      // Sprawdź konflikty
      const conflicts = detectConflicts(task, employee.id, allTasks);
      
      // Sprawdź capacity
      const capacity = validateCapacity(employee.id, task, 
        new Date(task.startPlanned || Date.now()), allTasks);
      
      if (conflicts.length === 0 && capacity.valid) {
        alternatives.push({
          employeeId: employee.id,
          name: employee.name,
          score: calculateEmployeeScore(employee, task, allTasks),
          availability: capacity.warning ? 'limited' : 'full',
          utilizationPercent: capacity.utilizationPercent,
          remaining: capacity.remaining
        });
      }
    }
    
    // Sortuj po score (najlepsi pierwsi)
    alternatives.sort((a, b) => b.score - a.score);
    
    if (CONFIG.conflictDebug) {
      console.log(`💡 [ConflictDetector] Found ${alternatives.length} alternatives for task:`, task.id);
    }
    
    return alternatives;
  }
  
  /**
   * Oblicza score pracownika dla zadania (prosty scoring)
   * @param {Object} employee - Pracownik
   * @param {Object} task - Zadanie
   * @param {Array} allTasks - Wszystkie zadania
   * @returns {number} Score (0-100)
   */
  function calculateEmployeeScore(employee, task, allTasks) {
    let score = 50; // Bazowy score
    
    // 1. Skills match (jeśli dostępne)
    if (employee.skills && task.operationName) {
      const hasSkill = employee.skills.some(skill => 
        skill.toLowerCase().includes(task.operationName.toLowerCase()) ||
        task.operationName.toLowerCase().includes(skill.toLowerCase())
      );
      
      if (hasSkill) {
        score += 30; // Bonus za umiejętności
      }
    }
    
    // 2. Current workload (mniej zajęty = wyższy score)
    const employeeTasks = allTasks.filter(t => 
      t.assignedTo === employee.id && 
      t.status !== 'completed'
    );
    
    const workload = employeeTasks.length;
    const workloadPenalty = Math.min(workload * 5, 30);
    score -= workloadPenalty;
    
    return Math.max(0, Math.min(100, score));
  }
  
  // ============================================================================
  // RAPORT KONFLIKTÓW
  // ============================================================================
  
  /**
   * Generuje raport wszystkich konfliktów w systemie
   * @returns {Object} Raport konfliktów
   */
  function getConflictReport() {
    const state = window.store ? window.store.get() : window.state;
    const allTasks = state.tasks || [];
    const allEmployees = state.employees || [];
    
    const report = {
      timestamp: new Date(),
      totalConflicts: 0,
      byType: {
        'time-overlap': 0,
        'over-capacity': 0
      },
      byEmployee: {},
      byTask: {},
      conflicts: []
    };
    
    // Sprawdź każde zadanie
    for (const task of allTasks) {
      if (!task.assignedTo) continue;
      if (task.status === 'completed' || task.status === 'cancelled') continue;
      
      const conflicts = detectConflicts(task, task.assignedTo, allTasks);
      
      if (conflicts.length > 0) {
        report.totalConflicts += conflicts.length;
        
        // Grupuj po typie
        conflicts.forEach(c => {
          report.byType[c.type] = (report.byType[c.type] || 0) + 1;
          
          // Grupuj po pracowniku
          if (!report.byEmployee[c.employeeId]) {
            const employee = allEmployees.find(e => e.id === c.employeeId);
            report.byEmployee[c.employeeId] = {
              employeeName: employee ? employee.name : c.employeeId,
              conflicts: []
            };
          }
          report.byEmployee[c.employeeId].conflicts.push(c);
          
          // Grupuj po zadaniu
          if (!report.byTask[c.taskId]) {
            report.byTask[c.taskId] = {
              taskName: c.taskName,
              conflicts: []
            };
          }
          report.byTask[c.taskId].conflicts.push(c);
        });
        
        report.conflicts.push(...conflicts);
      }
    }
    
    console.log(`📊 [ConflictDetector] Conflict Report: ${report.totalConflicts} total conflicts`);
    
    return report;
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  /**
   * Oblicza severity konfliktu
   * @param {number} overlapHours - Godziny nakładania się
   * @param {Object} task1 - Zadanie 1
   * @param {Object} task2 - Zadanie 2
   * @returns {string} Severity ('low' | 'medium' | 'high' | 'critical')
   */
  function calculateSeverity(overlapHours, task1, task2) {
    // Critical jeśli oba zadania są critical
    if (task1.critical && task2.critical) {
      return 'critical';
    }
    
    // High jeśli długie nakładanie (>4h) lub jedno critical
    if (overlapHours > 4 || task1.critical || task2.critical) {
      return 'high';
    }
    
    // Medium jeśli 2-4h
    if (overlapHours > 2) {
      return 'medium';
    }
    
    // Low otherwise
    return 'low';
  }
  
  /**
   * Formatuje datę do czytelnej formy
   * @param {Date} date - Data
   * @returns {string} Sformatowana data
   */
  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Formatuje czas do czytelnej formy
   * @param {Date} date - Data i czas
   * @returns {string} Sformatowany czas
   */
  function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // ============================================================================
  // UI HELPERS
  // ============================================================================
  
  /**
   * Pokaż warning o konflikcie w UI
   * @param {Array<Object>} conflicts - Konflikty
   * @param {string} containerId - ID kontenera
   */
  function showConflictWarnings(conflicts, containerId) {
    const container = document.getElementById(containerId || 'conflict-warnings');
    if (!container) return;
    
    if (conflicts.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'block';
    
    const html = conflicts.map(c => {
      const severityClass = c.severity || 'medium';
      const icon = getSeverityIcon(severityClass);
      
      return `
        <div class="conflict-warning ${severityClass}">
          <div class="conflict-icon">${icon}</div>
          <div class="conflict-content">
            <div class="conflict-message">${c.message}</div>
            <div class="conflict-details">
              ${c.type === 'time-overlap' 
                ? `Nakładanie: ${formatTime(c.overlapStart)} - ${formatTime(c.overlapEnd)} (${c.overlapHours}h)`
                : `Przeciążenie: ${c.overload}h ponad limit ${c.maxCapacity}h`
              }
            </div>
          </div>
          <button class="btn small" onclick="window.resourceConflictDetector.showConflictDetails('${c.taskId}')">
            Szczegóły
          </button>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  }
  
  /**
   * Pobiera ikonę dla severity
   * @param {string} severity - Severity
   * @returns {string} Ikona
   */
  function getSeverityIcon(severity) {
    switch(severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '⚠️';
    }
  }
  
  /**
   * Pokaż szczegóły konfliktu
   * @param {string} taskId - ID zadania
   */
  function showConflictDetails(taskId) {
    const state = window.store ? window.store.get() : window.state;
    const task = state.tasks.find(t => t.id === taskId);
    
    if (!task) {
      alert('Zadanie nie znalezione');
      return;
    }
    
    const conflicts = detectConflicts(task, task.assignedTo);
    const alternatives = suggestAlternatives(task, task.assignedTo);
    
    // Pokaż dialog z alternatywami
    showAlternativesDialog(task, conflicts, alternatives);
  }
  
  /**
   * Pokaż dialog z alternatywnymi pracownikami
   * @param {Object} task - Zadanie
   * @param {Array} conflicts - Konflikty
   * @param {Array} alternatives - Alternatywni pracownicy
   */
  function showAlternativesDialog(task, conflicts, alternatives) {
    // Usuń istniejący dialog jeśli jest
    const existing = document.getElementById('alternatives-dialog');
    if (existing) {
      existing.remove();
    }
    
    // Utwórz dialog
    const dialog = document.createElement('div');
    dialog.id = 'alternatives-dialog';
    dialog.className = 'alternatives-dialog';
    
    let conflictsHtml = '';
    if (conflicts.length > 0) {
      conflictsHtml = `
        <div style="margin-bottom: 20px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
          <div style="font-weight: 600; color: #ef4444; margin-bottom: 8px;">
            ⚠️ Wykryto ${conflicts.length} konflikt(ów)
          </div>
          ${conflicts.slice(0, 3).map(c => `
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8); margin-bottom: 4px;">
              • ${c.message}
            </div>
          `).join('')}
        </div>
      `;
    }
    
    let alternativesHtml = '';
    if (alternatives.length > 0) {
      alternativesHtml = `
        <div class="alternatives-list">
          ${alternatives.map(alt => `
            <div class="alternative-item" onclick="window.resourceConflictDetector.assignToAlternative('${task.id}', '${alt.employeeId}')">
              <div class="alternative-info">
                <div class="alternative-name">${alt.name}</div>
                <div class="alternative-meta">
                  <span class="alternative-badge ${alt.availability}">
                    ${alt.availability === 'full' ? '✓ Dostępny' : '⚠️ Ograniczona dostępność'}
                  </span>
                  <span style="color: rgba(255, 255, 255, 0.6);">
                    Wykorzystanie: ${alt.utilizationPercent}%
                  </span>
                </div>
              </div>
              <div class="alternative-score">
                <span>Score:</span>
                <span>${alt.score}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      alternativesHtml = `
        <div class="no-alternatives">
          <div style="font-size: 48px; margin-bottom: 12px;">😔</div>
          <div>Brak dostępnych alternatywnych pracowników</div>
        </div>
      `;
    }
    
    dialog.innerHTML = `
      <div class="alternatives-content">
        <div class="alternatives-header">
          <h3 class="alternatives-title">
            Konflikty dla zadania: ${task.name || task.id}
          </h3>
          <button class="alternatives-close" onclick="this.closest('.alternatives-dialog').remove()">
            ✕
          </button>
        </div>
        
        ${conflictsHtml}
        
        <div class="report-header">Alternatywni pracownicy</div>
        ${alternativesHtml}
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Zamknij po kliknięciu tła
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });
  }
  
  /**
   * Przypisz zadanie do alternatywnego pracownika
   * @param {string} taskId - ID zadania
   * @param {string} employeeId - ID pracownika
   */
  function assignToAlternative(taskId, employeeId) {
    const state = window.store ? window.store.get() : window.state;
    const task = state.tasks.find(t => t.id === taskId);
    const employee = state.employees.find(e => e.id === employeeId);
    
    if (!task || !employee) {
      alert('Błąd: Zadanie lub pracownik nie znaleziony');
      return;
    }
    
    // Sprawdź ponownie konflikty
    const conflicts = detectConflicts(task, employeeId);
    
    if (conflicts.length > 0) {
      const confirmed = confirm(
        `Uwaga: Nadal wykryto ${conflicts.length} konflikt(ów) dla pracownika ${employee.name}.\n\n` +
        `Czy na pewno chcesz przypisać to zadanie?`
      );
      
      if (!confirmed) return;
    }
    
    // Przypisz zadanie
    task.assignedTo = employeeId;
    task._manuallyAssigned = true;
    task._assignedAt = Date.now();
    
    // Zapisz
    if (window.store && typeof window.store.save === 'function') {
      window.store.save();
    }
    
    // Re-render
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof renderGantt === 'function') renderGantt();
    
    // Zamknij dialog
    const dialog = document.getElementById('alternatives-dialog');
    if (dialog) dialog.remove();
    
    // Pokaż powiadomienie
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Zadanie przypisane', {
        body: `Zadanie "${task.name || task.id}" przypisane do ${employee.name}`,
        icon: '/favicon.ico'
      });
    }
    
    console.log(`✅ [ConflictDetector] Task ${taskId} assigned to ${employeeId}`);
  }
  
  /**
   * Pokaż raport konfliktów w UI
   * @param {string} containerId - ID kontenera
   */
  function showConflictReport(containerId) {
    const report = getConflictReport();
    const container = document.getElementById(containerId || 'conflict-report');
    
    if (!container) {
      console.error('[ConflictDetector] Container not found:', containerId);
      return;
    }
    
    const html = `
      <div class="conflict-report">
        <div class="report-section">
          <div class="report-header">Podsumowanie konfliktów</div>
          <div class="report-stats">
            <div class="report-stat ${report.totalConflicts > 0 ? 'danger' : 'success'}">
              <div class="report-stat-value">${report.totalConflicts}</div>
              <div class="report-stat-label">Total Conflicts</div>
            </div>
            <div class="report-stat ${report.byType['time-overlap'] > 0 ? 'warning' : 'success'}">
              <div class="report-stat-value">${report.byType['time-overlap'] || 0}</div>
              <div class="report-stat-label">Time Overlaps</div>
            </div>
            <div class="report-stat ${report.byType['over-capacity'] > 0 ? 'warning' : 'success'}">
              <div class="report-stat-value">${report.byType['over-capacity'] || 0}</div>
              <div class="report-stat-label">Over Capacity</div>
            </div>
          </div>
        </div>
        
        ${Object.keys(report.byEmployee).length > 0 ? `
          <div class="report-section">
            <div class="report-header">Konflikty według pracowników</div>
            <div class="list">
              ${Object.entries(report.byEmployee).map(([empId, data]) => `
                <div class="card" style="padding: 10px; margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="font-weight: 600; color: #ffffff;">${data.employeeName}</span>
                      <span style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin-left: 8px;">
                        ${data.conflicts.length} konflikt(ów)
                      </span>
                    </div>
                    <button class="btn small" onclick="window.resourceConflictDetector.showEmployeeConflicts('${empId}')">
                      Szczegóły
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="no-alternatives">
            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
            <div>Brak konfliktów w systemie</div>
          </div>
        `}
      </div>
    `;
    
    container.innerHTML = html;
  }
  
  /**
   * Pokaż konflikty pracownika
   * @param {string} employeeId - ID pracownika
   */
  function showEmployeeConflicts(employeeId) {
    const report = getConflictReport();
    const employeeData = report.byEmployee[employeeId];
    
    if (!employeeData) {
      alert('Brak danych dla pracownika');
      return;
    }
    
    let message = `Pracownik: ${employeeData.employeeName}\n`;
    message += `Konflikty: ${employeeData.conflicts.length}\n\n`;
    
    employeeData.conflicts.forEach((c, i) => {
      message += `${i + 1}. ${c.message}\n`;
      if (c.type === 'time-overlap') {
        message += `   Overlap: ${formatTime(c.overlapStart)} - ${formatTime(c.overlapEnd)}\n`;
      }
      message += '\n';
    });
    
    alert(message);
  }
  
  /**
   * Sprawdź konflikty przy przypisywaniu zadania (validation przed zapisem)
   * @param {Object} task - Zadanie
   * @param {string} employeeId - ID pracownika
   * @returns {boolean} Czy można przypisać (true) czy są konflikty (false)
   */
  function validateAssignment(task, employeeId) {
    const conflicts = detectConflicts(task, employeeId);
    
    if (conflicts.length === 0) {
      return true; // OK, brak konfliktów
    }
    
    // Pokaż ostrzeżenie
    const criticalConflicts = conflicts.filter(c => 
      c.severity === 'critical' || c.severity === 'high'
    );
    
    if (criticalConflicts.length > 0) {
      // Krytyczne konflikty - pokaż dialog
      showConflictDetails(task.id);
      return false;
    }
    
    // Konflikty niskiego priorytetu - pokaż warning ale pozwól przypisać
    const confirmed = confirm(
      `Ostrzeżenie: Wykryto ${conflicts.length} konflikt(ów) niskiego priorytetu.\n\n` +
      conflicts.slice(0, 3).map(c => `• ${c.message}`).join('\n') +
      `\n\nCzy chcesz kontynuować?`
    );
    
    return confirmed;
  }
  
  // ============================================================================
  // EKSPORT API
  // ============================================================================
  
  global.resourceConflictDetector = {
    // Detekcja
    detectConflicts,
    detectTimeOverlap,
    detectCapacityConflict,
    
    // Walidacja
    validateCapacity,
    validateAssignment,
    getTasksForDate,
    
    // Sugestie
    suggestAlternatives,
    
    // Raport
    getConflictReport,
    
    // UI Functions
    showConflictWarnings,
    showConflictDetails,
    showAlternativesDialog,
    showConflictReport,
    showEmployeeConflicts,
    assignToAlternative,
    
    // Helpers
    calculateTaskDuration,
    calculateSeverity,
    formatDate,
    formatTime,
    
    // Config
    CONFIG
  };
  
  console.log('✅ Resource Conflict Detector module loaded');
  
})(window);
