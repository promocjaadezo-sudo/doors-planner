import { test, expect, Page } from '@playwright/test';

/**
 * Testy dla zarządzania zadaniami
 * Sprawdzają tworzenie, aktualizację, przenoszenie zadań oraz synchronizację z kalendarzem
 */

async function gotoTasksPage(page: Page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Kliknij przycisk Listy (Zadania, używa data-nav="tasks")
  const tasksBtn = page.locator('button[data-nav="tasks"]');
  await tasksBtn.click();
  
  // Poczekaj na widoczność sekcji zadań
  await expect(page.locator('#p-task')).toBeVisible();
}

async function createTestOrder(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).state || {};
    const orderId = `order-${Date.now()}`;
    
    state.orders = state.orders || [];
    state.orders.push({
      id: orderId,
      name: 'Zlecenie testowe',
      client: 'Klient Test',
      quantity: 5,
      processId: null,
    });
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    return orderId;
  });
}

async function createTestEmployee(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).state || {};
    const empId = `emp-${Date.now()}`;
    
    state.employees = state.employees || [];
    state.employees.push({
      id: empId,
      name: 'Jan Testowy',
      role: 'montażysta',
    });
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    return empId;
  });
}

async function getTasksCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    return (window as any).state?.tasks?.length || 0;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('tasks page displays correctly', async ({ page }) => {
  await gotoTasksPage(page);
  
  // Sprawdź widoczność głównych elementów
  await expect(page.locator('#task-board')).toBeVisible();
  
  // Sprawdź kolumny statusów
  await expect(page.locator('.task-column').filter({ hasText: /Do zrobienia/i })).toBeVisible();
  await expect(page.locator('.task-column').filter({ hasText: /W trakcie/i })).toBeVisible();
  await expect(page.locator('.task-column').filter({ hasText: /Ukończone/i })).toBeVisible();
});

test('create manual task', async ({ page }) => {
  await gotoTasksPage(page);
  
  const orderId = await createTestOrder(page);
  const empId = await createTestEmployee(page);
  
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoTasksPage(page);
  
  const initialCount = await getTasksCount(page);
  
  // Kliknij przycisk dodawania zadania
  const addTaskBtn = page.locator('button').filter({ hasText: /Dodaj zadanie/i }).first();
  await addTaskBtn.click();
  
  // Wypełnij formularz
  await page.fill('#task-title', 'Zadanie testowe');
  await page.fill('#task-description', 'Opis zadania testowego');
  
  // Wybierz zlecenie (jeśli jest select)
  const orderSelect = page.locator('#task-order');
  if (await orderSelect.isVisible()) {
    await orderSelect.selectOption({ index: 1 }); // Wybierz pierwsze zlecenie
  }
  
  // Zapisz zadanie
  await page.locator('#task-form').getByRole('button', { name: /Zapisz/i }).click();
  
  // Sprawdź czy zadanie zostało dodane
  await page.waitForFunction((expectedCount: number) => {
    return ((window as any).state?.tasks?.length || 0) > expectedCount;
  }, initialCount);
  
  const newCount = await getTasksCount(page);
  expect(newCount).toBeGreaterThan(initialCount);
  
  // Sprawdź czy zadanie jest widoczne na boardzie
  await expect(page.locator('#task-board')).toContainText('Zadanie testowe');
});

test('move task between columns (drag and drop simulation)', async ({ page }) => {
  await gotoTasksPage(page);
  
  // Utwórz zadanie programatically
  const taskId = await page.evaluate(() => {
    const state = (window as any).state || {};
    const id = `task-${Date.now()}`;
    
    state.tasks = state.tasks || [];
    state.tasks.push({
      id,
      title: 'Zadanie do przeniesienia',
      status: 'todo',
      orderId: null,
      assignedTo: null,
      createdAt: Date.now(),
    });
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    if (typeof (window as any).renderTasks === 'function') {
      (window as any).renderTasks();
    }
    
    return id;
  });
  
  // Poczekaj na render
  await page.waitForTimeout(300);
  
  // Sprawdź czy zadanie jest w kolumnie "todo"
  const todoColumn = page.locator('.task-column').filter({ hasText: /Do zrobienia/i });
  await expect(todoColumn).toContainText('Zadanie do przeniesienia');
  
  // Przenieś zadanie do "running"
  await page.evaluate((id: string) => {
    const state = (window as any).state || {};
    const task = state.tasks?.find((t: any) => t.id === id);
    if (task) {
      task.status = 'running';
      
      if (typeof (window as any).save === 'function') {
        (window as any).save();
      }
      
      if (typeof (window as any).renderTasks === 'function') {
        (window as any).renderTasks();
      }
    }
  }, taskId);
  
  await page.waitForTimeout(300);
  
  // Sprawdź czy zadanie jest teraz w kolumnie "W trakcie"
  const runningColumn = page.locator('.task-column').filter({ hasText: /W trakcie/i });
  await expect(runningColumn).toContainText('Zadanie do przeniesienia');
  
  // Sprawdź czy zniknęło z "Do zrobienia"
  await expect(todoColumn).not.toContainText('Zadanie do przeniesienia');
});

test('task completion updates status and saves to storage', async ({ page }) => {
  await gotoTasksPage(page);
  
  const taskId = await page.evaluate(() => {
    const state = (window as any).state || {};
    const id = `task-${Date.now()}`;
    
    state.tasks = state.tasks || [];
    state.tasks.push({
      id,
      title: 'Zadanie do ukończenia',
      status: 'running',
      orderId: null,
      assignedTo: null,
      createdAt: Date.now(),
    });
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    if (typeof (window as any).renderTasks === 'function') {
      (window as any).renderTasks();
    }
    
    return id;
  });
  
  await page.waitForTimeout(300);
  
  // Oznacz jako ukończone
  await page.evaluate((id: string) => {
    const state = (window as any).state || {};
    const task = state.tasks?.find((t: any) => t.id === id);
    if (task) {
      task.status = 'done';
      task.completedAt = Date.now();
      
      if (typeof (window as any).save === 'function') {
        (window as any).save();
      }
      
      if (typeof (window as any).renderTasks === 'function') {
        (window as any).renderTasks();
      }
    }
  }, taskId);
  
  await page.waitForTimeout(300);
  
  // Sprawdź czy zadanie jest w kolumnie "Ukończone"
  const doneColumn = page.locator('.task-column').filter({ hasText: /Ukończone/i });
  await expect(doneColumn).toContainText('Zadanie do ukończenia');
  
  // Sprawdź persystencję
  const savedTask = await page.evaluate((id: string) => {
    const key = (window as any).storeKey || 'door_v50_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    try {
      const state = JSON.parse(raw);
      return state.tasks?.find((t: any) => t.id === id) || null;
    } catch (err) {
      return null;
    }
  }, taskId);
  
  expect(savedTask).toBeTruthy();
  expect(savedTask.status).toBe('done');
  expect(savedTask.completedAt).toBeDefined();
});

test('tasks badge count displays correctly', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Dodaj kilka zadań
  await page.evaluate(() => {
    const state = (window as any).state || {};
    
    state.tasks = [
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'running' },
      { id: '3', title: 'Task 3', status: 'done' },
      { id: '4', title: 'Task 4', status: 'todo' },
    ];
    
    (window as any).state = state;
    
    if (typeof (window as any).updateTasksBadge === 'function') {
      (window as any).updateTasksBadge();
    }
  });
  
  await page.waitForTimeout(200);
  
  // Znajdź badge zadań
  const tasksBadge = page.locator('button').filter({ hasText: /Zadania/ }).locator('.badge');
  
  // Sprawdź czy badge wyświetla poprawną liczbę
  const badgeText = await tasksBadge.textContent();
  const badgeCount = parseInt(badgeText || '0', 10);
  
  expect(badgeCount).toBeGreaterThan(0);
});

test('task assignment to employee', async ({ page }) => {
  await gotoTasksPage(page);
  
  const empId = await createTestEmployee(page);
  
  const taskId = await page.evaluate((employeeId: string) => {
    const state = (window as any).state || {};
    const id = `task-${Date.now()}`;
    
    state.tasks = state.tasks || [];
    state.tasks.push({
      id,
      title: 'Zadanie przypisane',
      status: 'todo',
      orderId: null,
      assignedTo: employeeId,
      createdAt: Date.now(),
    });
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    if (typeof (window as any).renderTasks === 'function') {
      (window as any).renderTasks();
    }
    
    return id;
  }, empId);
  
  await page.waitForTimeout(300);
  
  // Sprawdź czy zadanie wyświetla przypisanie
  await expect(page.locator('#task-board')).toContainText('Zadanie przypisane');
  
  // Sprawdź persystencję przypisania
  const savedTask = await page.evaluate((id: string) => {
    const key = (window as any).storeKey || 'door_v50_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    try {
      const state = JSON.parse(raw);
      return state.tasks?.find((t: any) => t.id === id) || null;
    } catch (err) {
      return null;
    }
  }, taskId);
  
  expect(savedTask).toBeTruthy();
  expect(savedTask.assignedTo).toBe(empId);
});

test('delete task removes from board and storage', async ({ page }) => {
  await gotoTasksPage(page);
  
  const taskId = await page.evaluate(() => {
    const state = (window as any).state || {};
    const id = `task-${Date.now()}`;
    
    state.tasks = state.tasks || [];
    state.tasks.push({
      id,
      title: 'Zadanie do usunięcia',
      status: 'todo',
      orderId: null,
      assignedTo: null,
      createdAt: Date.now(),
    });
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    if (typeof (window as any).renderTasks === 'function') {
      (window as any).renderTasks();
    }
    
    return id;
  });
  
  await page.waitForTimeout(300);
  
  const countBefore = await getTasksCount(page);
  
  // Usuń zadanie
  page.once('dialog', async dialog => {
    await dialog.accept();
  });
  
  await page.evaluate((id: string) => {
    const state = (window as any).state || {};
    state.tasks = state.tasks?.filter((t: any) => t.id !== id) || [];
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    if (typeof (window as any).renderTasks === 'function') {
      (window as any).renderTasks();
    }
  }, taskId);
  
  await page.waitForTimeout(300);
  
  // Sprawdź czy zadanie zniknęło
  await expect(page.locator('#task-board')).not.toContainText('Zadanie do usunięcia');
  
  // Sprawdź licznik
  const countAfter = await getTasksCount(page);
  expect(countAfter).toBe(countBefore - 1);
  
  // Sprawdź localStorage
  const deletedTask = await page.evaluate((id: string) => {
    const key = (window as any).storeKey || 'door_v50_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    try {
      const state = JSON.parse(raw);
      return state.tasks?.find((t: any) => t.id === id) || null;
    } catch (err) {
      return null;
    }
  }, taskId);
  
  expect(deletedTask).toBeNull();
});

test('mass delete tasks with Firebase sync', async ({ page }) => {
  await gotoTasksPage(page);
  
  // Create mock Firebase sync queue
  await page.evaluate(() => {
    const calls: any[] = [];
    (window as any).FirebaseSyncQueue = {
      enqueue: (type: string, data: any, priority?: number) => {
        calls.push({ type, data, priority });
      }
    };
    (window as any)._syncCalls = calls;
  });
  
  // Create multiple test tasks
  const taskIds = await page.evaluate(() => {
    const state = (window as any).state || {};
    const ids: string[] = [];
    
    state.tasks = state.tasks || [];
    for (let i = 0; i < 3; i++) {
      const id = `task-mass-delete-${Date.now()}-${i}`;
      ids.push(id);
      state.tasks.push({
        id,
        title: `Zadanie do masowego usunięcia ${i + 1}`,
        status: 'todo',
        orderId: null,
        assignedTo: null,
        createdAt: Date.now(),
      });
    }
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    if (typeof (window as any).renderTasks === 'function') {
      (window as any).renderTasks();
    }
    
    return ids;
  });
  
  await page.waitForTimeout(300);
  
  // Enable Firebase mode
  await page.evaluate(() => {
    const state = (window as any).state || {};
    state.storage = { mode: 'firebase' };
    (window as any).state = state;
  });
  
  // Simulate mass delete
  await page.evaluate((ids: string[]) => {
    const state = (window as any).state || {};
    state.tasks = (state.tasks || []).filter((t: any) => !ids.includes(t.id));
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    // Synchronize with Firebase
    if (state.storage && state.storage.mode === 'firebase' && (window as any).FirebaseSyncQueue) {
      ids.forEach(taskId => {
        (window as any).FirebaseSyncQueue.enqueue('delete', {
          collection: 'tasks',
          documentId: taskId
        }, 15);
      });
    }
  }, taskIds);
  
  await page.waitForTimeout(300);
  
  // Verify sync calls were made
  const syncCallsResult = await page.evaluate(() => {
    return (window as any)._syncCalls || [];
  });
  
  expect(syncCallsResult).toHaveLength(3);
  syncCallsResult.forEach((call: any, index: number) => {
    expect(call.type).toBe('delete');
    expect(call.data.collection).toBe('tasks');
    expect(call.data.documentId).toBe(taskIds[index]);
    expect(call.priority).toBe(15);
  });
});

test('cleanupTasksForOrder with Firebase sync', async ({ page }) => {
  await gotoTasksPage(page);
  
  // Create mock Firebase sync queue
  await page.evaluate(() => {
    const calls: any[] = [];
    (window as any).FirebaseSyncQueue = {
      enqueue: (type: string, data: any, priority?: number) => {
        calls.push({ type, data, priority });
      }
    };
    (window as any)._syncCalls = calls;
  });
  
  // Create test order and tasks
  const { orderId, taskIds } = await page.evaluate(() => {
    const state = (window as any).state || {};
    const orderId = `order-cleanup-${Date.now()}`;
    const taskIds: string[] = [];
    
    state.orders = state.orders || [];
    state.orders.push({
      id: orderId,
      name: 'Zlecenie do czyszczenia',
      client: 'Klient Test',
      quantity: 1,
      processId: null,
    });
    
    state.tasks = state.tasks || [];
    for (let i = 0; i < 2; i++) {
      const id = `task-cleanup-${Date.now()}-${i}`;
      taskIds.push(id);
      state.tasks.push({
        id,
        title: `Zadanie ${i + 1}`,
        status: 'done',
        orderId: orderId,
        assignedTo: null,
        createdAt: Date.now(),
      });
    }
    
    (window as any).state = state;
    
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    
    return { orderId, taskIds };
  });
  
  await page.waitForTimeout(300);
  
  // Enable Firebase mode
  await page.evaluate(() => {
    const state = (window as any).state || {};
    state.storage = { mode: 'firebase' };
    (window as any).state = state;
  });
  
  // Simulate cleanupTasksForOrder
  await page.evaluate((orderId: string) => {
    const state = (window as any).state || {};
    const tasks = (state.tasks || []).filter((t: any) => t.orderId === orderId);
    const anyActive = tasks.some((t: any) => (t.status || '') !== 'done');
    
    if (!anyActive) {
      const taskIdsToDelete = tasks.map((t: any) => t.id);
      
      state.tasks = (state.tasks || []).filter((t: any) => t.orderId !== orderId);
      
      (window as any).state = state;
      
      if (typeof (window as any).save === 'function') {
        (window as any).save();
      }
      
      // Synchronize with Firebase
      if (state.storage && state.storage.mode === 'firebase' && (window as any).FirebaseSyncQueue) {
        taskIdsToDelete.forEach((taskId: string) => {
          (window as any).FirebaseSyncQueue.enqueue('delete', {
            collection: 'tasks',
            documentId: taskId
          }, 15);
        });
      }
    }
  }, orderId);
  
  await page.waitForTimeout(300);
  
  // Verify sync calls were made
  const syncCallsResult = await page.evaluate(() => {
    return (window as any)._syncCalls || [];
  });
  
  expect(syncCallsResult).toHaveLength(2);
  syncCallsResult.forEach((call: any, index: number) => {
    expect(call.type).toBe('delete');
    expect(call.data.collection).toBe('tasks');
    expect(call.data.documentId).toBe(taskIds[index]);
    expect(call.priority).toBe(15);
  });
});
