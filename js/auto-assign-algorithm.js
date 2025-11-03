/**
 * AUTO-ASSIGN ALGORITHM MODULE
 * 
 * Automatyczne przypisywanie pracowników do zadań z optymalizacją obciążenia.
 * 
 * Algorytm scoring:
 * - Bazowy score: 50 punktów
 * - Dopasowanie umiejętności: +30 punktów (wszystkie), +15 (częściowe), 0 (brak)
 * - Obciążenie pracownika: -30 punktów (pełne), -15 (75%), 0 (50% lub mniej)
 * - Dostępność: Boolean (czy pracownik ma czas w danym dniu)
 * 
 * @module auto-assign-algorithm
 */

(function(global) {
  'use strict';

  // ============================================================================
  // KONFIGURACJA
  // ============================================================================

  const CONFIG = {
    // Scoring weights
    baseScore: 50,
    skillMatchBonus: {
      full: 30,      // Wszystkie wymagane umiejętności
      partial: 15,   // Część umiejętności
      none: 0        // Brak umiejętności
    },
    workloadPenalty: {
      full: -30,     // 100%+ obciążenia
      high: -15,     // 75-99% obciążenia
      medium: -5,    // 50-74% obciążenia
      low: 0         // <50% obciążenia
    },
    
    // Workload thresholds
    workloadThresholds: {
      full: 1.0,     // 100%
      high: 0.75,    // 75%
      medium: 0.5    // 50%
    },
    
    // Workday configuration
    workdayHours: 8,
    maxWorkloadRatio: 1.2, // 120% = przeciążenie
    
    // Auto-assign strategy
    strategy: 'best-fit', // 'best-fit' | 'next-fit' | 'load-balance'
    
    // Debug logging
    debug: true
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Pobiera wszystkie zadania z window.state
   * @returns {Array} Lista zadań
   */
  function getAllTasks() {
    return (global.state && global.state.tasks) || [];
  }

  /**
   * Pobiera wszystkich pracowników z window.state
   * @returns {Array} Lista pracowników
   */
  function getAllEmployees() {
    return (global.state && global.state.employees) || [];
  }

  /**
   * Pobiera katalog operacji z window.state
   * @returns {Array} Katalog operacji
   */
  function getOperationsCatalog() {
    return (global.state && global.state.operationsCatalog) || [];
  }

  /**
   * Loguje informacje (jeśli debug włączony)
   */
  function log(...args) {
    if (CONFIG.debug) {
      console.log('[AutoAssign]', ...args);
    }
  }

  /**
   * Normalizuje ID pracownika (obsługuje różne formaty)
   * @param {string|Object} employeeRef - Referencja do pracownika
   * @returns {string} ID pracownika
   */
  function normalizeEmployeeId(employeeRef) {
    if (!employeeRef) return null;
    return typeof employeeRef === 'object' ? employeeRef.id : employeeRef;
  }

  /**
   * Konwertuje timestamp na datę bez godzin
   * @param {number} timestamp - Unix timestamp w ms
   * @returns {Date} Data bez godzin
   */
  function timestampToDate(timestamp) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Sprawdza czy dwie daty są tym samym dniem
   * @param {Date} date1 
   * @param {Date} date2 
   * @returns {boolean}
   */
  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // ============================================================================
  // SCORING ALGORITHM
  // ============================================================================

  /**
   * Oblicza dopasowanie umiejętności pracownika do zadania
   * @param {Object} employee - Pracownik
   * @param {Object} task - Zadanie
   * @returns {number} Bonus za umiejętności (0, 15, lub 30)
   */
  function calculateSkillBonus(employee, task) {
    // Pobierz wymagane umiejętności z katalogu operacji
    const catalogOp = getOperationsCatalog().find(op => op.name === task.opName);
    const requiredSkills = (catalogOp && catalogOp.skills) || [];
    
    if (requiredSkills.length === 0) {
      // Brak wymagań = każdy może wykonać
      return CONFIG.skillMatchBonus.full;
    }

    // Umiejętności pracownika
    const employeeSkills = employee.skills || [];
    
    // Policz dopasowane umiejętności
    const matchedSkills = requiredSkills.filter(skill => 
      employeeSkills.includes(skill)
    );

    const matchRatio = matchedSkills.length / requiredSkills.length;

    if (matchRatio === 1.0) {
      return CONFIG.skillMatchBonus.full;
    } else if (matchRatio >= 0.5) {
      return CONFIG.skillMatchBonus.partial;
    } else {
      return CONFIG.skillMatchBonus.none;
    }
  }

  /**
   * Oblicza obciążenie pracownika w danym dniu
   * @param {string} employeeId - ID pracownika
   * @param {Date} date - Data do sprawdzenia
   * @param {Array} allTasks - Wszystkie zadania
   * @returns {Object} {hours: number, ratio: number}
   */
  function calculateDailyWorkload(employeeId, date, allTasks) {
    const tasks = allTasks.filter(t => {
      // Sprawdź czy zadanie jest przypisane do tego pracownika
      const assignees = t.assignees || (t.assignee ? [t.assignee] : []);
      const isAssigned = assignees.some(a => normalizeEmployeeId(a) === employeeId);
      
      if (!isAssigned) return false;

      // Sprawdź czy zadanie jest w tym dniu
      if (!t.startPlanned) return false;
      const taskDate = timestampToDate(t.startPlanned);
      return isSameDay(taskDate, date);
    });

    // Sumuj godziny
    let totalHours = 0;
    tasks.forEach(t => {
      // Pobierz czas trwania z katalogu operacji
      const catalogOp = getOperationsCatalog().find(op => op.name === t.opName);
      const duration = (catalogOp && catalogOp.time) || t.duration || 0;
      totalHours += duration / 60; // Konwersja z minut na godziny
    });

    const ratio = totalHours / CONFIG.workdayHours;

    return {
      hours: totalHours,
      ratio: ratio
    };
  }

  /**
   * Oblicza karę za obciążenie pracownika
   * @param {number} workloadRatio - Stosunek obciążenia (0-1+)
   * @returns {number} Kara za obciążenie (-30 do 0)
   */
  function calculateWorkloadPenalty(workloadRatio) {
    const { full, high, medium } = CONFIG.workloadThresholds;
    const penalty = CONFIG.workloadPenalty;

    if (workloadRatio >= full) {
      return penalty.full;
    } else if (workloadRatio >= high) {
      return penalty.high;
    } else if (workloadRatio >= medium) {
      return penalty.medium;
    } else {
      return penalty.low;
    }
  }

  /**
   * Oblicza score przypisania pracownika do zadania
   * @param {Object} employee - Pracownik
   * @param {Object} task - Zadanie
   * @param {Array} allTasks - Wszystkie zadania (dla kalkulacji obciążenia)
   * @returns {Object} {score: number, breakdown: Object, available: boolean}
   */
  function calculateAssignmentScore(employee, task, allTasks = null) {
    allTasks = allTasks || getAllTasks();
    
    const employeeId = normalizeEmployeeId(employee.id || employee);
    const taskDate = task.startPlanned ? timestampToDate(task.startPlanned) : new Date();

    // Bazowy score
    let score = CONFIG.baseScore;
    const breakdown = {
      base: CONFIG.baseScore,
      skillBonus: 0,
      workloadPenalty: 0,
      available: true
    };

    // Bonus za umiejętności
    const skillBonus = calculateSkillBonus(employee, task);
    score += skillBonus;
    breakdown.skillBonus = skillBonus;

    // Obciążenie pracownika
    const workload = calculateDailyWorkload(employeeId, taskDate, allTasks);
    const workloadPenalty = calculateWorkloadPenalty(workload.ratio);
    score += workloadPenalty;
    breakdown.workloadPenalty = workloadPenalty;
    breakdown.workloadHours = workload.hours;
    breakdown.workloadRatio = workload.ratio;

    // Dostępność (czy przekracza max obciążenie)
    const available = workload.ratio < CONFIG.maxWorkloadRatio;
    breakdown.available = available;

    // Jeśli niedostępny, score = 0
    if (!available) {
      score = 0;
    }

    return {
      score: Math.max(0, score), // Score nie może być ujemny
      breakdown: breakdown,
      available: available,
      employeeId: employeeId,
      employeeName: employee.name || employeeId
    };
  }

  /**
   * Oblicza score dla wszystkich pracowników dla danego zadania
   * @param {Object} task - Zadanie
   * @param {Array} employees - Lista pracowników (opcjonalna)
   * @param {Array} allTasks - Wszystkie zadania (opcjonalna)
   * @returns {Array} Posortowana lista {employee, score, breakdown, available}
   */
  function calculateScoresForTask(task, employees = null, allTasks = null) {
    employees = employees || getAllEmployees();
    allTasks = allTasks || getAllTasks();

    const scores = employees.map(emp => {
      const result = calculateAssignmentScore(emp, task, allTasks);
      return {
        employee: emp,
        ...result
      };
    });

    // Sortuj malejąco po score
    scores.sort((a, b) => b.score - a.score);

    return scores;
  }

  // ============================================================================
  // AUTO-ASSIGN FUNCTIONS
  // ============================================================================

  /**
   * Automatycznie przypisuje najlepszego pracownika do pojedynczego zadania
   * @param {string|Object} taskRef - ID zadania lub obiekt zadania
   * @param {Object} options - Opcje: {dryRun: boolean, allowConflicts: boolean}
   * @returns {Object} Wynik przypisania {success, employee, score, message}
   */
  function autoAssignTask(taskRef, options = {}) {
    const defaults = {
      dryRun: false,           // Czy tylko symulacja
      allowConflicts: false,   // Czy pozwolić na konflikty
      minScore: 20             // Minimalny score do przypisania
    };
    const opts = Object.assign({}, defaults, options);

    // Znajdź zadanie
    const tasks = getAllTasks();
    const task = typeof taskRef === 'object' ? taskRef : tasks.find(t => t.id === taskRef);
    
    if (!task) {
      return {
        success: false,
        message: 'Zadanie nie znalezione'
      };
    }

    // Sprawdź czy zadanie już ma przypisanie
    if (task.assignees && task.assignees.length > 0 && !opts.dryRun) {
      return {
        success: false,
        message: 'Zadanie ma już przypisanego pracownika',
        currentAssignee: task.assignees[0]
      };
    }

    // Oblicz score dla wszystkich pracowników
    const scores = calculateScoresForTask(task);

    // Filtruj dostępnych
    let candidates = scores.filter(s => s.available);
    
    if (candidates.length === 0 && opts.allowConflicts) {
      // Jeśli brak dostępnych, weź najlepszych nawet jeśli niedostępni
      candidates = scores.slice(0, 3);
      log('⚠️ Brak dostępnych pracowników, używam najlepszych mimo konfliktów');
    }

    if (candidates.length === 0) {
      return {
        success: false,
        message: 'Brak dostępnych pracowników',
        allScores: scores
      };
    }

    // Wybierz najlepszego
    const best = candidates[0];

    if (best.score < opts.minScore) {
      return {
        success: false,
        message: `Najlepszy pracownik ma za niski score (${best.score} < ${opts.minScore})`,
        bestCandidate: best
      };
    }

    // Sprawdź konflikty (jeśli moduł dostępny)
    let conflicts = [];
    if (global.resourceConflictDetector && !opts.allowConflicts) {
      conflicts = global.resourceConflictDetector.detectConflicts(
        task, 
        best.employeeId, 
        tasks
      );

      if (conflicts.length > 0) {
        return {
          success: false,
          message: 'Wykryto konflikty zasobów',
          employee: best.employee,
          conflicts: conflicts,
          allScores: scores
        };
      }
    }

    // Przypisz (jeśli nie dry run)
    if (!opts.dryRun) {
      task.assignees = [best.employeeId];
      task._autoAssigned = true;
      task._assignmentScore = best.score;
      task._assignmentTimestamp = Date.now();
      
      // Zapisz (jeśli funkcja dostępna)
      if (global.save && typeof global.save === 'function') {
        global.save();
      }

      log(`✅ Przypisano ${best.employeeName} do ${task.opName} (score: ${best.score})`);
    }

    return {
      success: true,
      message: `Przypisano ${best.employeeName}`,
      employee: best.employee,
      employeeId: best.employeeId,
      employeeName: best.employeeName,
      score: best.score,
      breakdown: best.breakdown,
      dryRun: opts.dryRun
    };
  }

  /**
   * Automatycznie przypisuje pracowników do wszystkich nieprzypisanych zadań
   * @param {Object} options - Opcje przypisania
   * @returns {Object} Statystyki przypisania
   */
  function autoAssignAll(options = {}) {
    const defaults = {
      dryRun: false,
      allowConflicts: false,
      minScore: 20,
      sortBy: 'duration' // 'duration' | 'priority' | 'date'
    };
    const opts = Object.assign({}, defaults, options);

    log('🤖 Rozpoczynam automatyczne przypisywanie zadań...');

    const tasks = getAllTasks();
    
    // Filtruj nieprzypisane zadania
    const unassignedTasks = tasks.filter(t => !t.assignees || t.assignees.length === 0);

    if (unassignedTasks.length === 0) {
      return {
        success: true,
        message: 'Wszystkie zadania są już przypisane',
        stats: {
          total: 0,
          assigned: 0,
          failed: 0
        }
      };
    }

    // Sortuj zadania według strategii
    const sortedTasks = sortTasksByStrategy(unassignedTasks, opts.sortBy);

    const results = {
      assigned: [],
      failed: [],
      conflicts: []
    };

    // Przypisuj kolejno
    sortedTasks.forEach(task => {
      const result = autoAssignTask(task, opts);
      
      if (result.success) {
        results.assigned.push({
          taskId: task.id,
          taskName: task.opName,
          employeeId: result.employeeId,
          employeeName: result.employeeName,
          score: result.score
        });
      } else {
        if (result.conflicts && result.conflicts.length > 0) {
          results.conflicts.push({
            taskId: task.id,
            taskName: task.opName,
            message: result.message,
            conflicts: result.conflicts
          });
        } else {
          results.failed.push({
            taskId: task.id,
            taskName: task.opName,
            message: result.message
          });
        }
      }
    });

    log(`✅ Przypisano: ${results.assigned.length}`);
    log(`❌ Niepowodzenia: ${results.failed.length}`);
    log(`⚠️ Konflikty: ${results.conflicts.length}`);

    return {
      success: true,
      message: `Przypisano ${results.assigned.length}/${unassignedTasks.length} zadań`,
      stats: {
        total: unassignedTasks.length,
        assigned: results.assigned.length,
        failed: results.failed.length,
        conflicts: results.conflicts.length
      },
      details: results,
      dryRun: opts.dryRun
    };
  }

  /**
   * Sortuje zadania według strategii
   * @param {Array} tasks - Lista zadań
   * @param {string} strategy - Strategia sortowania
   * @returns {Array} Posortowane zadania
   */
  function sortTasksByStrategy(tasks, strategy) {
    const catalog = getOperationsCatalog();
    
    switch(strategy) {
      case 'duration':
        // Najdłuższe zadania pierwsze (bin packing)
        return tasks.slice().sort((a, b) => {
          const durationA = catalog.find(op => op.name === a.opName)?.time || 0;
          const durationB = catalog.find(op => op.name === b.opName)?.time || 0;
          return durationB - durationA;
        });
      
      case 'priority':
        // Według priorytetu (jeśli zdefiniowany)
        return tasks.slice().sort((a, b) => {
          const prioA = a.priority || 0;
          const prioB = b.priority || 0;
          return prioB - prioA;
        });
      
      case 'date':
        // Według daty rozpoczęcia
        return tasks.slice().sort((a, b) => {
          const dateA = a.startPlanned || Infinity;
          const dateB = b.startPlanned || Infinity;
          return dateA - dateB;
        });
      
      default:
        return tasks;
    }
  }

  /**
   * Rebalansuje obciążenie pracowników poprzez przesunięcie zadań
   * @param {Object} options - Opcje rebalansowania
   * @returns {Object} Wynik rebalansowania
   */
  function rebalanceWorkload(options = {}) {
    const defaults = {
      dryRun: false,
      maxIterations: 10,
      targetUtilization: 0.8 // 80%
    };
    const opts = Object.assign({}, defaults, options);

    log('⚖️ Rozpoczynam rebalansowanie obciążenia...');

    const employees = getAllEmployees();
    const tasks = getAllTasks();
    const moves = [];

    // Identyfikuj przeciążonych i niedociążonych pracowników
    const employeeWorkloads = employees.map(emp => {
      const empId = normalizeEmployeeId(emp.id || emp);
      
      // Oblicz średnie obciążenie (wszystkie dni z zadaniami)
      const taskDates = new Set();
      tasks.forEach(t => {
        if (t.startPlanned && t.assignees && t.assignees.some(a => normalizeEmployeeId(a) === empId)) {
          taskDates.add(timestampToDate(t.startPlanned).toDateString());
        }
      });

      let totalWorkload = 0;
      let daysCount = taskDates.size || 1;
      
      taskDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const workload = calculateDailyWorkload(empId, date, tasks);
        totalWorkload += workload.ratio;
      });

      const avgUtilization = totalWorkload / daysCount;

      return {
        employee: emp,
        employeeId: empId,
        avgUtilization: avgUtilization,
        taskCount: tasks.filter(t => 
          t.assignees && t.assignees.some(a => normalizeEmployeeId(a) === empId)
        ).length
      };
    });

    // Sortuj: przeciążeni na początku
    employeeWorkloads.sort((a, b) => b.avgUtilization - a.avgUtilization);

    const overloaded = employeeWorkloads.filter(ew => ew.avgUtilization > opts.targetUtilization);
    const underloaded = employeeWorkloads.filter(ew => ew.avgUtilization < opts.targetUtilization * 0.7);

    log(`Przeciążeni: ${overloaded.length}, Niedociążeni: ${underloaded.length}`);

    if (overloaded.length === 0) {
      return {
        success: true,
        message: 'Brak przeciążonych pracowników',
        stats: { moves: 0 }
      };
    }

    // Próbuj przenieść zadania od przeciążonych do niedociążonych
    let iterations = 0;
    overloaded.forEach(overEmp => {
      if (iterations >= opts.maxIterations) return;

      // Znajdź zadania tego pracownika
      const empTasks = tasks.filter(t => 
        t.assignees && t.assignees.some(a => normalizeEmployeeId(a) === overEmp.employeeId)
      );

      // Sortuj według score (najniższy score = łatwiej przenieść)
      const tasksWithScores = empTasks.map(t => ({
        task: t,
        score: t._assignmentScore || 0
      })).sort((a, b) => a.score - b.score);

      // Próbuj przenieść zadania o niskim score
      for (let i = 0; i < tasksWithScores.length && iterations < opts.maxIterations; i++) {
        const { task } = tasksWithScores[i];
        
        // Znajdź lepszego kandydata wśród niedociążonych
        for (let j = 0; j < underloaded.length; j++) {
          const underEmp = underloaded[j];
          const newScore = calculateAssignmentScore(underEmp.employee, task, tasks);

          if (newScore.score > 30 && newScore.available) {
            // Przenieś zadanie
            if (!opts.dryRun) {
              task.assignees = [underEmp.employeeId];
              task._rebalanced = true;
            }

            moves.push({
              taskId: task.id,
              taskName: task.opName,
              from: overEmp.employeeId,
              to: underEmp.employeeId,
              newScore: newScore.score
            });

            iterations++;
            break;
          }
        }
      }
    });

    if (!opts.dryRun && moves.length > 0 && global.save) {
      global.save();
    }

    log(`✅ Przesunięto ${moves.length} zadań`);

    return {
      success: true,
      message: `Przesunięto ${moves.length} zadań`,
      stats: {
        moves: moves.length,
        overloaded: overloaded.length,
        underloaded: underloaded.length
      },
      details: {
        moves: moves,
        overloaded: overloaded.map(e => ({
          employeeId: e.employeeId,
          employeeName: e.employee.name,
          utilization: Math.round(e.avgUtilization * 100) + '%'
        }))
      },
      dryRun: opts.dryRun
    };
  }

  // ============================================================================
  // EKSPORT API
  // ============================================================================

  global.autoAssignAlgorithm = {
    // Core functions
    calculateAssignmentScore: calculateAssignmentScore,
    calculateScoresForTask: calculateScoresForTask,
    autoAssignTask: autoAssignTask,
    autoAssignAll: autoAssignAll,
    rebalanceWorkload: rebalanceWorkload,
    
    // Utility functions
    calculateSkillBonus: calculateSkillBonus,
    calculateDailyWorkload: calculateDailyWorkload,
    calculateWorkloadPenalty: calculateWorkloadPenalty,
    
    // Configuration
    config: CONFIG,
    
    // Version
    version: '1.0.0'
  };

  log('✅ Auto-assign algorithm module loaded');

})(window);
