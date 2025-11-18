import { test, expect, Page } from '@playwright/test';

/**
 * Testy dla systemu backupów
 * Sprawdzają automatyczne tworzenie backupów, przywracanie i eksport
 */

async function gotoSettingsPage(page: Page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Kliknij przycisk Backup (używa data-nav="backup")
  const backupBtn = page.locator('button[data-nav="backup"]');
  await backupBtn.click();
  
  // Poczekaj na widoczność sekcji backupów
  await expect(page.locator('#p-backup')).toBeVisible();
}

async function createTestData(page: Page) {
  await page.evaluate(() => {
    const state = (window as any).state || {};
    
    // Dodaj testowe dane
    state.employees = [
      { id: 'emp1', name: 'Jan Kowalski', role: 'montażysta' },
      { id: 'emp2', name: 'Anna Nowak', role: 'malarz' }
    ];
    
    state.operations = [
      { id: 'op1', name: 'Montaż', duration: 60 },
      { id: 'op2', name: 'Malowanie', duration: 120 }
    ];
    
    state.orders = [
      { 
        id: 'order1', 
        name: 'Zlecenie testowe', 
        client: 'Klient Test',
        quantity: 5
      }
    ];
    
    (window as any).state = state;
    
    // Zapisz
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
  });
}

async function getBackupCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      const backups = (window as any).BackupManager.list();
      return backups.length;
    }
    return 0;
  });
}

async function getLatestBackup(page: Page): Promise<any> {
  return page.evaluate(() => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      const backups = (window as any).BackupManager.list();
      return backups[0] || null;
    }
    return null;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('BackupManager module is loaded and available', async ({ page }) => {
  await page.goto('/index.html');
  
  const backupManagerExists = await page.evaluate(() => {
    return typeof (window as any).BackupManager !== 'undefined';
  });
  
  expect(backupManagerExists).toBe(true);
});

test('automatic backup is created on state save', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Sprawdź początkową liczbę backupów
  const initialCount = await getBackupCount(page);
  
  // Utwórz testowe dane i zapisz
  await createTestData(page);
  
  // Poczekaj na utworzenie backupu
  await page.waitForFunction((expectedCount: number) => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      const backups = (window as any).BackupManager.list();
      return backups.length > expectedCount;
    }
    return false;
  }, initialCount);
  
  // Sprawdź czy backup został utworzony
  const newCount = await getBackupCount(page);
  expect(newCount).toBeGreaterThan(initialCount);
  
  // Sprawdź czy backup zawiera dane
  const latestBackup = await getLatestBackup(page);
  expect(latestBackup).toBeTruthy();
  expect(latestBackup.reason).toBe('auto-before-save');
  expect(latestBackup.data).toBeDefined();
});

test('manual backup creation from UI', async ({ page }) => {
  await gotoSettingsPage(page);
  
  const initialCount = await getBackupCount(page);
  
  // Obsłuż prompt
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('Test manualny');
  });
  
  // Kliknij przycisk tworzenia backupu
  await page.locator('#backup-create').click();
  
  // Obsłuż alert o sukcesie
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('utworzony pomyślnie');
    await dialog.accept();
  });
  
  // Poczekaj na utworzenie backupu
  await page.waitForFunction((expectedCount: number) => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      const backups = (window as any).BackupManager.list();
      return backups.length > expectedCount;
    }
    return false;
  }, initialCount);
  
  // Sprawdź czy backup został utworzony
  const newCount = await getBackupCount(page);
  expect(newCount).toBeGreaterThan(initialCount);
  
  // Sprawdź czy backup ma poprawną nazwę
  const latestBackup = await getLatestBackup(page);
  expect(latestBackup.reason).toBe('Test manualny');
});

test('backup restore functionality', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Utwórz początkowe dane
  await page.evaluate(() => {
    const state = (window as any).state || {};
    state.employees = [
      { id: 'emp1', name: 'Pracownik Oryginalny', role: 'montażysta' }
    ];
    (window as any).state = state;
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
  });
  
  // Poczekaj na backup
  await page.waitForTimeout(500);
  
  // Pobierz ID pierwszego backupu
  const backupId = await page.evaluate(() => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      const backups = (window as any).BackupManager.list();
      return backups[0]?.id || null;
    }
    return null;
  });
  
  expect(backupId).toBeTruthy();
  
  // Zmień dane
  await page.evaluate(() => {
    const state = (window as any).state || {};
    state.employees = [
      { id: 'emp2', name: 'Pracownik Nowy', role: 'malarz' }
    ];
    (window as any).state = state;
    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
  });
  
  await page.waitForTimeout(300);
  
  // Przywróć backup
  await page.evaluate((id: string) => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      // Obsłuż confirm
      const originalConfirm = window.confirm;
      window.confirm = () => true;
      
      (window as any).restoreFromBackup(id);
      
      window.confirm = originalConfirm;
    }
  }, backupId);
  
  await page.waitForTimeout(500);
  
  // Sprawdź czy dane zostały przywrócone
  const restoredData = await page.evaluate(() => {
    return (window as any).state?.employees || [];
  });
  
  expect(restoredData).toHaveLength(1);
  expect(restoredData[0].name).toBe('Pracownik Oryginalny');
});

test('backup list is displayed correctly', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Utwórz kilka backupów
  for (let i = 0; i < 3; i++) {
    await page.evaluate((index: number) => {
      if (typeof (window as any).BackupManager !== 'undefined') {
        (window as any).BackupManager.create(`Backup-${index}`);
      }
    }, i);
    await page.waitForTimeout(100);
  }
  
  // Przejdź do ustawień
  await gotoSettingsPage(page);
  
  // Sprawdź czy lista backupów jest widoczna
  const backupList = page.locator('#backup-list');
  await expect(backupList).toBeVisible();
  
  // Sprawdź czy backupy są wyświetlone
  const backupItems = backupList.locator('.backup-item');
  const count = await backupItems.count();
  expect(count).toBeGreaterThanOrEqual(3);
  
  // Sprawdź czy każdy backup ma przyciski akcji
  const firstBackup = backupItems.first();
  await expect(firstBackup.getByRole('button', { name: /Przywróć/ })).toBeVisible();
  await expect(firstBackup.getByRole('button', { name: /Eksport/ })).toBeVisible();
  await expect(firstBackup.getByRole('button', { name: /Usuń/ })).toBeVisible();
});

test('backup cleanup removes oldest backups', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Utwórz więcej backupów niż maksymalna liczba (5)
  for (let i = 0; i < 7; i++) {
    await page.evaluate((index: number) => {
      if (typeof (window as any).BackupManager !== 'undefined') {
        (window as any).BackupManager.create(`Backup-${index}`);
      }
    }, i);
    await page.waitForTimeout(50);
  }
  
  // Sprawdź ile backupów zostało
  const countBeforeCleanup = await getBackupCount(page);
  expect(countBeforeCleanup).toBeGreaterThan(5);
  
  // Wywołaj cleanup
  await page.evaluate(() => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      (window as any).BackupManager.cleanup();
    }
  });
  
  // Sprawdź czy zostało maksymalnie 5 backupów
  const countAfterCleanup = await getBackupCount(page);
  expect(countAfterCleanup).toBeLessThanOrEqual(5);
});

test('backup statistics are updated correctly', async ({ page }) => {
  await gotoSettingsPage(page);
  
  // Sprawdź początkowe statystyki
  const backupCount = page.locator('#backup-count');
  await expect(backupCount).toBeVisible();
  
  const initialCountText = await backupCount.textContent();
  const initialCount = parseInt(initialCountText || '0', 10);
  
  // Utwórz nowy backup
  page.once('dialog', async dialog => {
    await dialog.accept('Nowy backup');
  });
  await page.locator('#backup-create').click();
  
  page.once('dialog', async dialog => {
    await dialog.accept();
  });
  
  // Odśwież listę
  await page.locator('#backup-refresh').click();
  
  // Sprawdź czy licznik się zwiększył
  await expect(backupCount).toHaveText((initialCount + 1).toString());
  
  // Sprawdź czy inne statystyki są widoczne
  const backupLatest = page.locator('#backup-latest');
  const backupSize = page.locator('#backup-size');
  
  await expect(backupLatest).not.toHaveText('-');
  await expect(backupSize).toBeVisible();
});

test('backup delete functionality', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => Boolean((window as any).state));
  
  // Utwórz backup
  const backupId = await page.evaluate(() => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      return (window as any).BackupManager.create('Backup do usunięcia');
    }
    return null;
  });
  
  expect(backupId).toBeTruthy();
  
  const countBefore = await getBackupCount(page);
  
  // Usuń backup
  await page.evaluate((id: string) => {
    // Obsłuż confirm
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    
    if (typeof (window as any).deleteBackup === 'function') {
      (window as any).deleteBackup(id);
    }
    
    window.confirm = originalConfirm;
  }, backupId);
  
  // Sprawdź czy backup został usunięty
  const countAfter = await getBackupCount(page);
  expect(countAfter).toBe(countBefore - 1);
  
  // Sprawdź czy backup już nie istnieje
  const backupExists = await page.evaluate((id: string) => {
    if (typeof (window as any).BackupManager !== 'undefined') {
      const backups = (window as any).BackupManager.list();
      return backups.some((b: any) => b.id === id);
    }
    return false;
  }, backupId);
  
  expect(backupExists).toBe(false);
});
