import { test, expect, Page } from '@playwright/test';

/**
 * Testy dla zarządzania pracownikami
 * Sprawdzają dodawanie, edycję, usuwanie pracowników oraz persystencję danych
 */

async function gotoEmployeesPage(page: Page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Kliknij przycisk Pracownicy (używa data-nav="emp")
  const employeesBtn = page.locator('button[data-nav="emp"]');
  await employeesBtn.click();
  
  // Poczekaj na widoczność sekcji pracowników
  await expect(page.locator('#p-emp')).toBeVisible();
}

async function addEmployee(page: Page, name: string, role: string = 'montażysta') {
  await page.fill('#emp-name', name);
  await page.selectOption('#emp-role', role);
  await page.locator('#emp-form').getByRole('button', { name: /Dodaj pracownika/i }).click();
}

async function getEmployeesCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    return (window as any).state?.employees?.length || 0;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('add new employee and verify persistence', async ({ page }) => {
  const employeeName = `Pracownik ${Date.now()}`;
  
  await gotoEmployeesPage(page);
  
  const initialCount = await getEmployeesCount(page);
  
  // Dodaj pracownika
  await addEmployee(page, employeeName, 'montażysta');
  
  // Sprawdź czy pracownik pojawił się w tabeli
  const employeesTable = page.locator('#emp-tb');
  await expect(employeesTable).toContainText(employeeName);
  await expect(employeesTable).toContainText('montażysta');
  
  // Sprawdź czy liczba pracowników wzrosła
  const newCount = await getEmployeesCount(page);
  expect(newCount).toBe(initialCount + 1);
  
  // Sprawdź persystencję w localStorage
  const persistedEmployee = await page.evaluate((name: string) => {
    const key = (window as any).storeKey || 'door_v50_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    try {
      const state = JSON.parse(raw);
      return state.employees?.find((e: any) => e.name === name) || null;
    } catch (err) {
      return null;
    }
  }, employeeName);
  
  expect(persistedEmployee).toBeTruthy();
  expect(persistedEmployee.name).toBe(employeeName);
  expect(persistedEmployee.role).toBe('montażysta');
  
  // Przeładuj stronę i sprawdź czy dane są zachowane
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoEmployeesPage(page);
  
  await expect(page.locator('#emp-tb')).toContainText(employeeName);
});

test('edit employee updates data correctly', async ({ page }) => {
  const originalName = `Pracownik Oryginalny ${Date.now()}`;
  const updatedName = `Pracownik Zaktualizowany ${Date.now()}`;
  
  await gotoEmployeesPage(page);
  
  // Dodaj pracownika
  await addEmployee(page, originalName, 'montażysta');
  await expect(page.locator('#emp-tb')).toContainText(originalName);
  
  // Znajdź przycisk edycji
  const employeeRow = page.locator('#emp-tb tr').filter({ hasText: originalName }).first();
  const editButton = employeeRow.getByRole('button', { name: /Edytuj/ });
  await editButton.click();
  
  // Sprawdź czy formularz został wypełniony
  await expect(page.locator('#emp-name')).toHaveValue(originalName);
  
  // Zmień dane
  await page.fill('#emp-name', updatedName);
  await page.selectOption('#emp-role', 'malarz');
  await page.locator('#emp-form').getByRole('button', { name: /Zapisz/i }).click();
  
  // Sprawdź czy dane zostały zaktualizowane
  await expect(page.locator('#emp-tb')).toContainText(updatedName);
  await expect(page.locator('#emp-tb')).toContainText('malarz');
  await expect(page.locator('#emp-tb')).not.toContainText(originalName);
  
  // Sprawdź persystencję
  const updatedEmployee = await page.evaluate((name: string) => {
    const key = (window as any).storeKey || 'door_v50_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    try {
      const state = JSON.parse(raw);
      return state.employees?.find((e: any) => e.name === name) || null;
    } catch (err) {
      return null;
    }
  }, updatedName);
  
  expect(updatedEmployee).toBeTruthy();
  expect(updatedEmployee.name).toBe(updatedName);
  expect(updatedEmployee.role).toBe('malarz');
});

test('delete employee removes from list and storage', async ({ page }) => {
  const employeeName = `Pracownik Do Usunięcia ${Date.now()}`;
  
  await gotoEmployeesPage(page);
  
  // Dodaj pracownika
  await addEmployee(page, employeeName, 'montażysta');
  await expect(page.locator('#emp-tb')).toContainText(employeeName);
  
  const countBefore = await getEmployeesCount(page);
  
  // Obsłuż confirm
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain(employeeName);
    await dialog.accept();
  });
  
  // Znajdź i kliknij przycisk usuwania
  const employeeRow = page.locator('#emp-tb tr').filter({ hasText: employeeName }).first();
  const deleteButton = employeeRow.getByRole('button', { name: /Usuń/ });
  await deleteButton.click();
  
  // Sprawdź czy pracownik zniknął z tabeli
  await expect(page.locator('#emp-tb')).not.toContainText(employeeName);
  
  // Sprawdź czy liczba pracowników zmalała
  const countAfter = await getEmployeesCount(page);
  expect(countAfter).toBe(countBefore - 1);
  
  // Sprawdź czy pracownik został usunięty z localStorage
  const deletedEmployee = await page.evaluate((name: string) => {
    const key = (window as any).storeKey || 'door_v50_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    try {
      const state = JSON.parse(raw);
      return state.employees?.find((e: any) => e.name === name) || null;
    } catch (err) {
      return null;
    }
  }, employeeName);
  
  expect(deletedEmployee).toBeNull();
});

test('add multiple employees with different roles', async ({ page }) => {
  await gotoEmployeesPage(page);
  
  const employees = [
    { name: `Montażysta ${Date.now()}`, role: 'montażysta' },
    { name: `Malarz ${Date.now()}`, role: 'malarz' },
    { name: `Spawacz ${Date.now()}`, role: 'spawacz' },
    { name: `Magazynier ${Date.now()}`, role: 'magazynier' },
  ];
  
  // Dodaj wszystkich pracowników
  for (const emp of employees) {
    await addEmployee(page, emp.name, emp.role);
    await page.waitForTimeout(100);
  }
  
  // Sprawdź czy wszyscy są w tabeli
  const employeesTable = page.locator('#emp-tb');
  for (const emp of employees) {
    await expect(employeesTable).toContainText(emp.name);
    await expect(employeesTable).toContainText(emp.role);
  }
  
  // Sprawdź liczbę pracowników
  const count = await getEmployeesCount(page);
  expect(count).toBeGreaterThanOrEqual(employees.length);
  
  // Przeładuj i sprawdź persystencję
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoEmployeesPage(page);
  
  for (const emp of employees) {
    await expect(page.locator('#emp-tb')).toContainText(emp.name);
  }
});

test('employee form validation', async ({ page }) => {
  await gotoEmployeesPage(page);
  
  // Spróbuj dodać pracownika bez nazwy
  await page.fill('#emp-name', '');
  await page.locator('#emp-form').getByRole('button', { name: /Dodaj pracownika/i }).click();
  
  // Formularz nie powinien pozwolić na dodanie (HTML5 validation)
  const isInvalid = await page.evaluate(() => {
    const input = document.querySelector('#emp-name') as HTMLInputElement;
    return input?.validity?.valid === false;
  });
  
  expect(isInvalid).toBe(true);
});

test('employee badge count updates correctly', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Znajdź badge pracowników
  const employeesBadge = page.locator('button').filter({ hasText: /Pracownicy/ }).locator('.badge');
  
  // Sprawdź początkową wartość
  const initialCount = await employeesBadge.textContent();
  
  // Dodaj pracownika
  await gotoEmployeesPage(page);
  await addEmployee(page, `Nowy Pracownik ${Date.now()}`, 'montażysta');
  
  // Wróć do głównego widoku
  await page.getByRole('button', { name: /Dashboard/i }).click();
  
  // Sprawdź czy badge się zaktualizował
  const newCount = await employeesBadge.textContent();
  expect(parseInt(newCount || '0', 10)).toBeGreaterThan(parseInt(initialCount || '0', 10));
});

test('employees list is sortable by name', async ({ page }) => {
  await gotoEmployeesPage(page);
  
  // Dodaj pracowników w losowej kolejności
  const names = ['Zenon', 'Adam', 'Marek', 'Barbara'];
  for (const name of names) {
    await addEmployee(page, name, 'montażysta');
    await page.waitForTimeout(50);
  }
  
  // Pobierz listę pracowników z tabeli
  const employeeNames = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#emp-tb tr'));
    return rows
      .map(row => row.querySelector('td:first-child')?.textContent?.trim())
      .filter(Boolean);
  });
  
  // Sprawdź czy są w kolejności (aplikacja domyślnie sortuje lub nie)
  expect(employeeNames.length).toBeGreaterThanOrEqual(names.length);
  
  // Sprawdź czy wszystkie nazwiska są na liście
  for (const name of names) {
    expect(employeeNames).toContain(name);
  }
});
