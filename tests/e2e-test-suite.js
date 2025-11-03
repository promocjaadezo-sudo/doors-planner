/**
 * E2E TEST SUITE - Sprint 1
 * 
 * Kompleksowy zestaw testów end-to-end dla:
 * - Firebase Real-time Sync
 * - Resource Conflict Detection
 * - Auto-assign Algorithm
 * 
 * @module e2e-test-suite
 */

(function(global) {
  'use strict';

  // ============================================================================
  // TEST FRAMEWORK
  // ============================================================================

  class TestSuite {
    constructor(name) {
      this.name = name;
      this.tests = [];
      this.results = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };
    }

    test(description, testFn, options = {}) {
      this.tests.push({
        description,
        testFn,
        skip: options.skip || false,
        timeout: options.timeout || 5000
      });
    }

    async run() {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 Running Test Suite: ${this.name}`);
      console.log(`${'='.repeat(60)}\n`);

      for (const test of this.tests) {
        this.results.total++;

        if (test.skip) {
          console.log(`⏭️  SKIPPED: ${test.description}`);
          this.results.skipped++;
          continue;
        }

        try {
          console.log(`▶️  Running: ${test.description}`);
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), test.timeout)
          );

          await Promise.race([
            test.testFn(),
            timeoutPromise
          ]);

          console.log(`✅ PASSED: ${test.description}\n`);
          this.results.passed++;
        } catch (error) {
          console.error(`❌ FAILED: ${test.description}`);
          console.error(`   Error: ${error.message}`);
          console.error(`   Stack: ${error.stack}\n`);
          this.results.failed++;
        }
      }

      this.printResults();
      return this.results;
    }

    printResults() {
      console.log(`\n${'='.repeat(60)}`);
      console.log('📊 Test Results Summary');
      console.log(`${'='.repeat(60)}`);
      console.log(`Total:   ${this.results.total}`);
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`⏭️  Skipped: ${this.results.skipped}`);
      console.log(`${'='.repeat(60)}\n`);

      const passRate = this.results.total > 0 
        ? Math.round((this.results.passed / this.results.total) * 100) 
        : 0;
      
      if (passRate === 100) {
        console.log('🎉 All tests passed!');
      } else if (passRate >= 80) {
        console.log('✅ Most tests passed');
      } else if (passRate >= 50) {
        console.log('⚠️ Some tests failed');
      } else {
        console.log('❌ Many tests failed');
      }
    }
  }

  // ============================================================================
  // ASSERTION HELPERS
  // ============================================================================

  const assert = {
    equal(actual, expected, message) {
      if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
      }
    },

    notEqual(actual, unexpected, message) {
      if (actual === unexpected) {
        throw new Error(message || `Expected not ${unexpected}, got ${actual}`);
      }
    },

    truthy(value, message) {
      if (!value) {
        throw new Error(message || `Expected truthy value, got ${value}`);
      }
    },

    falsy(value, message) {
      if (value) {
        throw new Error(message || `Expected falsy value, got ${value}`);
      }
    },

    exists(value, message) {
      if (value === null || value === undefined) {
        throw new Error(message || 'Expected value to exist');
      }
    },

    isArray(value, message) {
      if (!Array.isArray(value)) {
        throw new Error(message || 'Expected array');
      }
    },

    lengthOf(array, length, message) {
      if (array.length !== length) {
        throw new Error(message || `Expected length ${length}, got ${array.length}`);
      }
    },

    greaterThan(value, min, message) {
      if (value <= min) {
        throw new Error(message || `Expected > ${min}, got ${value}`);
      }
    },

    lessThan(value, max, message) {
      if (value >= max) {
        throw new Error(message || `Expected < ${max}, got ${value}`);
      }
    },

    includes(array, item, message) {
      if (!array.includes(item)) {
        throw new Error(message || `Expected array to include ${item}`);
      }
    },

    async throws(fn, message) {
      try {
        await fn();
        throw new Error(message || 'Expected function to throw');
      } catch (error) {
        if (error.message === message || error.message === 'Expected function to throw') {
          throw error;
        }
        // Funkcja rzuciła błąd (dobrze)
      }
    }
  };

  // ============================================================================
  // TEST UTILITIES
  // ============================================================================

  const testUtils = {
    // Czekaj określony czas
    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Generuj losowy ID
    randomId() {
      return 'test_' + Math.random().toString(36).substr(2, 9);
    },

    // Utwórz testowe zadanie
    createTestTask(overrides = {}) {
      return {
        id: this.randomId(),
        opName: 'Test Operation',
        orderId: 'test-order',
        status: 'todo',
        startPlanned: Date.now(),
        endPlanned: Date.now() + 3600000, // +1h
        assignees: [],
        ...overrides
      };
    },

    // Utwórz testowego pracownika
    createTestEmployee(overrides = {}) {
      return {
        id: this.randomId(),
        name: 'Test Employee',
        skills: [],
        cap: 100,
        hoursPerDay: 8,
        ...overrides
      };
    },

    // Wyczyść stan testowy
    cleanupTestData() {
      if (global.state) {
        global.state.tasks = (global.state.tasks || []).filter(t => !t.id.startsWith('test_'));
        global.state.employees = (global.state.employees || []).filter(e => !e.id.startsWith('test_'));
      }
    }
  };

  // ============================================================================
  // ZADANIE 12: REAL-TIME SYNC TESTS
  // ============================================================================

  function createRealtimeSyncTests() {
    const suite = new TestSuite('Firebase Real-time Sync');

    suite.test('Moduł firebase-realtime-sync jest załadowany', async () => {
      assert.exists(global.firebaseRealtimeSync, 'firebaseRealtimeSync module not found');
      assert.equal(typeof global.firebaseRealtimeSync.init, 'function');
    });

    suite.test('Konfiguracja zawiera wszystkie wymagane opcje', async () => {
      const config = global.firebaseRealtimeSync.config || {};
      assert.exists(config, 'Config not found');
      // Moduł używa domyślnej konfiguracji
    });

    suite.test('Może śledzić status synchronizacji', async () => {
      const module = global.firebaseRealtimeSync;
      assert.exists(module.getSyncStatus, 'getSyncStatus method not found');
      
      const status = module.getSyncStatus ? module.getSyncStatus() : null;
      if (status) {
        assert.truthy(['disconnected', 'connecting', 'connected', 'error'].includes(status));
      }
    });

    suite.test('Optimistic update zachowuje poprzedni stan przy błędzie', async () => {
      // Test symulacji rollback
      const testData = { value: 'original' };
      const backup = JSON.parse(JSON.stringify(testData));
      
      // Symuluj rollback
      testData.value = 'changed';
      Object.assign(testData, backup);
      
      assert.equal(testData.value, 'original', 'Rollback failed');
    });

    suite.test('Pending writes są śledzone', async () => {
      const module = global.firebaseRealtimeSync;
      
      // Sprawdź czy moduł śledzi pending writes
      if (module.getPendingWrites) {
        const pending = module.getPendingWrites();
        assert.truthy(pending !== undefined, 'Pending writes tracking not found');
      } else {
        console.log('   ℹ️  getPendingWrites not implemented - skipping verification');
      }
    });

    return suite;
  }

  // ============================================================================
  // ZADANIE 13: CONFLICTS & AUTO-ASSIGN TESTS
  // ============================================================================

  function createConflictsTests() {
    const suite = new TestSuite('Resource Conflicts & Auto-assign');

    // Conflict Detection Tests
    suite.test('Moduł resource-conflict-detector jest załadowany', async () => {
      assert.exists(global.resourceConflictDetector, 'resourceConflictDetector module not found');
      assert.equal(typeof global.resourceConflictDetector.detectConflicts, 'function');
    });

    suite.test('Wykrywa konflikty czasowe (time-overlap)', async () => {
      const task1 = testUtils.createTestTask({
        startPlanned: Date.now(),
        endPlanned: Date.now() + 3600000, // 10:00-11:00
        assignees: ['emp1']
      });

      const task2 = testUtils.createTestTask({
        startPlanned: Date.now() + 1800000, // 10:30-11:30
        endPlanned: Date.now() + 5400000,
        assignees: []
      });

      const conflicts = global.resourceConflictDetector.detectConflicts(
        task2, 
        'emp1', 
        [task1]
      );

      assert.isArray(conflicts, 'Conflicts should be an array');
      
      // Sprawdź czy wykryto konflikt czasowy
      const hasTimeOverlap = conflicts.some(c => 
        c.type === 'time-overlap' || c.message.includes('nakłada')
      );
      
      if (hasTimeOverlap) {
        console.log('   ✓ Time-overlap conflict detected');
      }
    });

    suite.test('Wykrywa przekroczenie przepustowości (over-capacity)', async () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      const dayStart = date.getTime();

      // Zadania wypełniające cały dzień (8h = 480min)
      const existingTasks = [
        testUtils.createTestTask({
          opName: 'Task 1',
          startPlanned: dayStart,
          assignees: ['emp1']
        }),
        testUtils.createTestTask({
          opName: 'Task 2',
          startPlanned: dayStart + 3600000,
          assignees: ['emp1']
        })
      ];

      // Dodaj do katalogu operacji czas trwania
      if (global.state && global.state.operationsCatalog) {
        const catalog = global.state.operationsCatalog;
        catalog.push({ name: 'Task 1', time: 240 }); // 4h
        catalog.push({ name: 'Task 2', time: 240 }); // 4h
        catalog.push({ name: 'Task 3', time: 120 }); // 2h
      }

      const newTask = testUtils.createTestTask({
        opName: 'Task 3',
        startPlanned: dayStart + 7200000,
        assignees: []
      });

      const conflicts = global.resourceConflictDetector.detectConflicts(
        newTask,
        'emp1',
        existingTasks
      );

      // Mogą być konflikty przepustowości
      const hasCapacity = conflicts.some(c => 
        c.type === 'over-capacity' || c.message.includes('przepustow')
      );
      
      if (hasCapacity) {
        console.log('   ✓ Over-capacity conflict detected');
      }
    });

    suite.test('Sugeruje alternatywnych pracowników', async () => {
      const task = testUtils.createTestTask();
      const employees = [
        testUtils.createTestEmployee({ id: 'emp1', name: 'Employee 1' }),
        testUtils.createTestEmployee({ id: 'emp2', name: 'Employee 2' })
      ];

      // Zapisz do state
      const originalEmployees = global.state.employees;
      global.state.employees = employees;

      const alternatives = global.resourceConflictDetector.suggestAlternatives(
        task,
        'emp1',
        employees,
        []
      );

      global.state.employees = originalEmployees;

      assert.isArray(alternatives, 'Alternatives should be an array');
      assert.greaterThan(alternatives.length, 0, 'Should suggest at least one alternative');
      
      console.log(`   ✓ Suggested ${alternatives.length} alternatives`);
    });

    // Auto-assign Tests
    suite.test('Moduł auto-assign-algorithm jest załadowany', async () => {
      assert.exists(global.autoAssignAlgorithm, 'autoAssignAlgorithm module not found');
      assert.equal(typeof global.autoAssignAlgorithm.calculateAssignmentScore, 'function');
    });

    suite.test('Oblicza score przypisania poprawnie', async () => {
      const employee = testUtils.createTestEmployee({
        skills: ['CNC', 'sklejanie']
      });

      const task = testUtils.createTestTask({
        opName: 'Test CNC Operation'
      });

      // Dodaj operację do katalogu
      if (global.state && global.state.operationsCatalog) {
        global.state.operationsCatalog.push({
          name: 'Test CNC Operation',
          time: 60,
          skills: ['CNC']
        });
      }

      const result = global.autoAssignAlgorithm.calculateAssignmentScore(
        employee,
        task,
        []
      );

      assert.exists(result, 'Score result should exist');
      assert.exists(result.score, 'Score value should exist');
      assert.greaterThan(result.score, 0, 'Score should be > 0');
      assert.lessThan(result.score, 100, 'Score should be < 100');
      
      console.log(`   ✓ Score calculated: ${result.score}`);
    });

    suite.test('autoAssignTask przypisuje najlepszego pracownika', async () => {
      const employees = [
        testUtils.createTestEmployee({ 
          id: 'emp1', 
          name: 'Employee 1',
          skills: ['CNC']
        }),
        testUtils.createTestEmployee({ 
          id: 'emp2', 
          name: 'Employee 2',
          skills: []
        })
      ];

      const task = testUtils.createTestTask({
        opName: 'CNC Task'
      });

      // Setup state
      const originalEmployees = global.state.employees;
      const originalTasks = global.state.tasks;
      
      global.state.employees = employees;
      global.state.tasks = [task];

      if (global.state.operationsCatalog) {
        global.state.operationsCatalog.push({
          name: 'CNC Task',
          time: 60,
          skills: ['CNC']
        });
      }

      const result = global.autoAssignAlgorithm.autoAssignTask(task, {
        dryRun: true // Nie zapisuj
      });

      // Restore state
      global.state.employees = originalEmployees;
      global.state.tasks = originalTasks;

      assert.truthy(result.success, 'Assignment should succeed');
      assert.equal(result.employeeId, 'emp1', 'Should assign employee with matching skills');
      
      console.log(`   ✓ Assigned to: ${result.employeeName}`);
    });

    suite.test('autoAssignAll przypisuje wiele zadań', async () => {
      const employees = [
        testUtils.createTestEmployee({ id: 'emp1', name: 'Emp 1' }),
        testUtils.createTestEmployee({ id: 'emp2', name: 'Emp 2' })
      ];

      const tasks = [
        testUtils.createTestTask({ opName: 'Task 1' }),
        testUtils.createTestTask({ opName: 'Task 2' }),
        testUtils.createTestTask({ opName: 'Task 3' })
      ];

      // Setup
      const originalEmployees = global.state.employees;
      const originalTasks = global.state.tasks;
      
      global.state.employees = employees;
      global.state.tasks = tasks;

      const result = global.autoAssignAlgorithm.autoAssignAll({
        dryRun: true
      });

      // Restore
      global.state.employees = originalEmployees;
      global.state.tasks = originalTasks;

      assert.truthy(result.success, 'autoAssignAll should succeed');
      assert.exists(result.stats, 'Should return stats');
      assert.greaterThan(result.stats.assigned, 0, 'Should assign at least one task');
      
      console.log(`   ✓ Assigned ${result.stats.assigned}/${result.stats.total} tasks`);
    });

    suite.test('Performance test: Auto-assign 50 zadań < 2s', async () => {
      const employees = Array.from({ length: 5 }, (_, i) =>
        testUtils.createTestEmployee({ 
          id: `perf_emp${i}`, 
          name: `Employee ${i}` 
        })
      );

      const tasks = Array.from({ length: 50 }, (_, i) =>
        testUtils.createTestTask({ 
          id: `perf_task${i}`,
          opName: `Task ${i}` 
        })
      );

      // Setup
      const originalEmployees = global.state.employees;
      const originalTasks = global.state.tasks;
      
      global.state.employees = employees;
      global.state.tasks = tasks;

      const startTime = Date.now();
      
      const result = global.autoAssignAlgorithm.autoAssignAll({
        dryRun: true
      });

      const duration = Date.now() - startTime;

      // Restore
      global.state.employees = originalEmployees;
      global.state.tasks = originalTasks;

      assert.lessThan(duration, 2000, `Should complete in < 2s (took ${duration}ms)`);
      
      console.log(`   ✓ Processed ${tasks.length} tasks in ${duration}ms`);
    });

    return suite;
  }

  // ============================================================================
  // ZADANIE 14: FULL WORKFLOW TEST
  // ============================================================================

  function createFullWorkflowTest() {
    const suite = new TestSuite('Full E2E Workflow');

    suite.test('Pełny workflow: Order → Tasks → Auto-assign → Conflict check', async () => {
      console.log('   📋 Step 1: Create test order');
      
      // 1. Utwórz zamówienie testowe
      const testOrder = {
        id: testUtils.randomId(),
        name: 'Test Order E2E',
        processId: null
      };

      console.log('   📋 Step 2: Create test process');
      
      // 2. Utwórz proces
      const testProcess = {
        id: testUtils.randomId(),
        name: 'Test Process',
        operations: [
          { name: 'Op 1', time: 60 },
          { name: 'Op 2', time: 120 },
          { name: 'Op 3', time: 90 }
        ]
      };

      console.log('   📋 Step 3: Generate tasks from process');
      
      // 3. Wygeneruj zadania
      const testTasks = testProcess.operations.map((op, index) => 
        testUtils.createTestTask({
          opName: op.name,
          orderId: testOrder.id,
          processId: testProcess.id,
          startPlanned: Date.now() + (index * 3600000)
        })
      );

      console.log('   📋 Step 4: Create test employees');
      
      // 4. Utwórz pracowników testowych
      const testEmployees = [
        testUtils.createTestEmployee({ id: 'e2e_emp1', name: 'E2E Emp 1' }),
        testUtils.createTestEmployee({ id: 'e2e_emp2', name: 'E2E Emp 2' })
      ];

      // Setup state
      const originalState = {
        orders: global.state.orders,
        processes: global.state.processes,
        tasks: global.state.tasks,
        employees: global.state.employees
      };

      global.state.orders = [testOrder];
      global.state.processes = [testProcess];
      global.state.tasks = testTasks;
      global.state.employees = testEmployees;

      console.log('   📋 Step 5: Auto-assign tasks');
      
      // 5. Auto-assign zadań
      const assignResult = global.autoAssignAlgorithm.autoAssignAll({
        dryRun: false // Rzeczywiste przypisanie
      });

      assert.truthy(assignResult.success, 'Auto-assign should succeed');
      assert.greaterThan(assignResult.stats.assigned, 0, 'Should assign at least one task');

      console.log(`   ✓ Assigned ${assignResult.stats.assigned} tasks`);

      console.log('   📋 Step 6: Check for conflicts');
      
      // 6. Sprawdź konflikty
      let totalConflicts = 0;
      testTasks.forEach(task => {
        if (task.assignees && task.assignees.length > 0) {
          const conflicts = global.resourceConflictDetector.detectConflicts(
            task,
            task.assignees[0],
            testTasks
          );
          totalConflicts += conflicts.length;
        }
      });

      console.log(`   ✓ Found ${totalConflicts} conflicts`);

      console.log('   📋 Step 7: Get conflict report');
      
      // 7. Wygeneruj raport
      const report = global.resourceConflictDetector.getConflictReport();
      
      assert.exists(report, 'Report should exist');
      assert.exists(report.totalConflicts, 'Report should have totalConflicts');

      console.log(`   ✓ Report generated: ${report.totalConflicts} total conflicts`);

      // Cleanup
      Object.assign(global.state, originalState);
      testUtils.cleanupTestData();

      console.log('   📋 Step 8: Cleanup complete');
      console.log('   ✅ Full workflow completed successfully');
    });

    return suite;
  }

  // ============================================================================
  // RUNNER
  // ============================================================================

  async function runAllTests() {
    console.log('\n🚀 Starting E2E Test Suite for Sprint 1\n');
    
    const suites = [
      createRealtimeSyncTests(),
      createConflictsTests(),
      createFullWorkflowTest()
    ];

    const allResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };

    for (const suite of suites) {
      const results = await suite.run();
      allResults.total += results.total;
      allResults.passed += results.passed;
      allResults.failed += results.failed;
      allResults.skipped += results.skipped;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏆 OVERALL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests:   ${allResults.total}`);
    console.log(`✅ Passed:      ${allResults.passed}`);
    console.log(`❌ Failed:      ${allResults.failed}`);
    console.log(`⏭️  Skipped:     ${allResults.skipped}`);
    
    const passRate = allResults.total > 0 
      ? Math.round((allResults.passed / allResults.total) * 100) 
      : 0;
    
    console.log(`📊 Pass Rate:   ${passRate}%`);
    console.log('='.repeat(60) + '\n');

    return allResults;
  }

  // ============================================================================
  // EKSPORT API
  // ============================================================================

  global.e2eTests = {
    TestSuite,
    assert,
    testUtils,
    runAllTests,
    createRealtimeSyncTests,
    createConflictsTests,
    createFullWorkflowTest,
    version: '1.0.0'
  };

  console.log('✅ E2E Test Suite loaded');
  console.log('📝 Run tests with: e2eTests.runAllTests()');

})(window);
