import { test, expect, Page } from '@playwright/test';

async function openWarehouse(page: Page) {
  await page.goto('/index.html');
  await page.getByRole('button', { name: /Magazyn/i }).click();
  await expect(page.locator('#p-wh')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as any).simpleWarehouse));
  await page.waitForTimeout(200);
  await expect(page.locator('#wh-list')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('user can add a warehouse item via modal', async ({ page }) => {
  await openWarehouse(page);
  await expect(page.locator('#wh-list')).toContainText(/Brak pozycji/i);

  await page.getByRole('button', { name: /Dodaj pozycję/i }).click();
  const modal = page.locator('#custom-modal').last();
  await expect(modal).toBeVisible();

  await modal.locator('#wh-modal-name').fill('Testowa deska');
  await modal.locator('#wh-modal-quantity').fill('10');
  await modal.locator('#wh-modal-unit').selectOption('szt');
  await modal.locator('#wh-modal-price').fill('25');
  await modal.locator('#wh-modal-min-stock').fill('3');
  await modal.locator('#wh-modal-shelf').fill('R1');
  await modal.locator('#wh-modal-rack').fill('P2');
  await modal.locator('#wh-modal-sector').fill('A');
  await modal.getByRole('button', { name: /^Dodaj$/ }).click();
  await expect(modal).not.toBeVisible({ timeout: 5000 });

  const list = page.locator('#wh-list');
  await expect(list).toContainText('Testowa deska');
  await expect(list).toContainText('10');

  const storedItems = await page.evaluate(() => JSON.parse(localStorage.getItem('warehouseItems') ?? '[]'));
  expect(storedItems).toHaveLength(1);
  expect(storedItems[0]).toMatchObject({
    name: 'Testowa deska',
    quantity: 10,
    unit: 'szt',
    minStock: 3,
  });
});

test('quantity correction creates a transaction entry', async ({ page }) => {
  await openWarehouse(page);

  // Create initial item via UI reuse helper
  await page.getByRole('button', { name: /Dodaj pozycję/i }).click();
  const modal = page.locator('#custom-modal').last();
  await expect(modal).toBeVisible();
  await modal.locator('#wh-modal-name').fill('Korekta testowa');
  await modal.locator('#wh-modal-quantity').fill('5');
  await modal.locator('#wh-modal-unit').selectOption('szt');
  await modal.locator('#wh-modal-price').fill('10');
  await modal.locator('#wh-modal-min-stock').fill('1');
  await modal.getByRole('button', { name: /^Dodaj$/ }).click();
  await expect(modal).not.toBeVisible({ timeout: 5000 });

  await expect(page.locator('#wh-list')).toContainText('Korekta testowa');

  // Trigger adjust modal via exposed API
  await page.evaluate(() => {
    const first = (window as any).warehouseItems?.[0];
    (window as any).simpleWarehouse.adjustQuantity(first.id);
  });

  const adjustModal = page.locator('#custom-modal').last();
  await expect(adjustModal).toBeVisible();

  await adjustModal.locator('input[id^="wh-adjust-quantity"]').fill('8');
  await adjustModal.locator('textarea[id^="wh-adjust-note"]').fill('Testowa korekta');

  const dialogPromise = page.waitForEvent('dialog');
  await Promise.all([
    dialogPromise.then(dialog => dialog.accept()),
    adjustModal.getByRole('button', { name: /Zapisz korektę/i }).click(),
  ]);
  await expect(adjustModal).not.toBeVisible({ timeout: 5000 });

  // Switch to transactions tab and verify entry
  await page.getByRole('button', { name: /Przychód/i }).click();
  const transactionsView = page.locator('#wh-transactions-list');
  await expect(transactionsView).toContainText('Korekta testowa');
  await expect(transactionsView).toContainText('Korekta: Testowa korekta');

  const storedTransactions = await page.evaluate(() => JSON.parse(localStorage.getItem('warehouseTransactions') ?? '[]'));
  expect(storedTransactions.length).toBeGreaterThan(0);
  const lastTransaction = storedTransactions[storedTransactions.length - 1];
  expect(lastTransaction).toMatchObject({
    itemName: 'Korekta testowa',
    correction: true,
    newQuantity: 8,
  });
});
