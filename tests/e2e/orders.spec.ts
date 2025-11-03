import { test, expect, Page } from '@playwright/test';

async function getPersistedState(page: Page) {
  return page.evaluate(() => {
    const key = (window as any).storeKey || 'door_v5627_state';
    const raw = window.localStorage.getItem(key);
    let parsed: any = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.warn('Invalid JSON in persisted store', err);
        parsed = null;
      }
    }
    return { key, state: parsed };
  });
}

async function gotoOrdersPage(page: Page) {
  await page.goto('/index.html');
  await openOrdersTab(page);
}

async function openOrdersTab(page: Page) {
  await page.waitForFunction(() => Boolean((window as any).state));
  await page.getByRole('button', { name: /Zlecenia/i }).click();
  await expect(page.locator('#p-order')).toBeVisible();
  await page.waitForFunction(() => {
    const state = (window as any).state;
    return !!state && Array.isArray(state.orders);
  });
}

async function seedHandoverScenario(page: Page) {
  const timestamp = Date.now();
  const ids = {
    itemId: `wh-${timestamp}`,
    templateId: `tmpl-${timestamp}`,
    processId: `proc-${timestamp}`,
    orderId: `order-${timestamp}`,
  };

  await page.evaluate(({ ids, timestamp }) => {
    const item = {
      id: ids.itemId,
      name: 'Płyta testowa Handover',
      quantity: 1,
      unit: 'szt',
      minStock: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    (window as any).warehouseItems = [item];
    localStorage.setItem('warehouseItems', JSON.stringify((window as any).warehouseItems));

    const template = {
      id: ids.templateId,
      name: 'Szablon przekazania',
      materials: [
        {
          itemId: ids.itemId,
          itemName: 'Płyta testowa Handover',
          quantity: 2,
          unit: 'szt',
        },
      ],
      createdAt: timestamp,
    };

    (window as any).materialTemplates = [template];
    localStorage.setItem('materialTemplates', JSON.stringify((window as any).materialTemplates));

    const process = {
      id: ids.processId,
      name: 'Proces przekazania',
      materialTemplateId: ids.templateId,
      operations: [],
    };

    const order = {
      id: ids.orderId,
      name: 'Zlecenie do magazynu',
      client: 'Klient Handover',
      model: 'MODEL-H',
      quantity: 1,
      startDate: '',
      endDate: '',
      installDate: '',
      address: '',
      postalCode: '',
      phone: '',
      notes: '',
      processId: ids.processId,
      materialChecklist: template.materials.map(material => ({
        itemId: material.itemId,
        itemName: material.itemName,
        quantity: material.quantity,
        unit: material.unit,
        checked: false,
        checkedAt: null,
        checkedBy: null,
      })),
    };

    const state = (window as any).state || {};
    state.orders = [order];
    state.processes = [process];
    state.tasks = [];
    state.after = state.after || [];
    (window as any).state = state;

    if (typeof (window as any).save === 'function') {
      (window as any).save();
    }
    if (typeof (window as any).renderOrderPage === 'function') {
      (window as any).renderOrderPage();
    }
    if (typeof (window as any).updateTasksBadge === 'function') {
      (window as any).updateTasksBadge();
    }
  }, { ids, timestamp });

  return ids;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('order persists across reloads and updates local storage', async ({ page }) => {
  const orderName = `Zlecenie testowe ${Date.now()}`;
  const initialClient = 'Klient Testowy';
  const updatedClient = 'Klient Po Aktualizacji';

  await gotoOrdersPage(page);

  await page.fill('#o-name', orderName);
  await page.fill('#o-client', initialClient);
  await page.fill('#o-model', 'Model X');
  await page.fill('#o-qty', '4');
  await page.fill('#o-notes', 'Sprawdzenie lokalnego zapisu');
  await page.locator('#order-form').getByRole('button', { name: /Zapisz zlecenie/i }).click();

  const ordersTable = page.locator('#ord-tb');
  await expect(ordersTable).toContainText(orderName);
  await expect(ordersTable).toContainText(initialClient);

  await page.waitForFunction(() => {
    const key = (window as any).storeKey || 'door_v5627_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.orders) && parsed.orders.length > 0;
    } catch (err) {
      console.warn('Failed to read store during wait', err);
      return false;
    }
  });

  const { state: savedAfterCreate } = await getPersistedState(page);

  expect(savedAfterCreate?.orders).toBeDefined();
  expect(savedAfterCreate.orders).toHaveLength(1);
  expect(savedAfterCreate.orders[0]).toMatchObject({
    name: orderName,
    client: initialClient,
    quantity: 4,
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openOrdersTab(page);

  await expect(page.locator('#ord-tb')).toContainText(orderName);
  await expect(page.locator('#ord-tb')).toContainText(initialClient);

  const editButton = page.locator('#ord-tb tr').first().getByRole('button', { name: /^Edytuj$/ });
  await editButton.click();

  await expect(page.locator('#o-id')).not.toHaveValue('');
  await page.fill('#o-client', updatedClient);
  await page.locator('#order-form').getByRole('button', { name: /Zapisz zlecenie/i }).click();

  await expect(page.locator('#ord-tb')).toContainText(updatedClient);

  await page.waitForFunction(({ name, expectedClient }: { name: string; expectedClient: string }) => {
    const key = (window as any).storeKey || 'door_v5627_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      const match = Array.isArray(parsed?.orders) ? parsed.orders.find((o: any) => o?.name === name) : null;
      return !!match && match.client === expectedClient;
    } catch (err) {
      console.warn('Failed to parse store while waiting for update', err);
      return false;
    }
  }, { name: orderName, expectedClient: updatedClient });

  const { state: savedAfterUpdate } = await getPersistedState(page);

  const storedOrder = savedAfterUpdate?.orders?.find((o: any) => o.name === orderName);
  expect(storedOrder).toBeDefined();
  expect(storedOrder.client).toBe(updatedClient);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openOrdersTab(page);

  await expect(page.locator('#ord-tb')).toContainText(updatedClient);
});

test('handover from orders view creates warehouse task and keeps actions read-only', async ({ page }) => {
  await gotoOrdersPage(page);
  const ids = await seedHandoverScenario(page);

  const ordersTable = page.locator('#ord-tb');
  await expect(ordersTable).toContainText('Zlecenie do magazynu');

  await page.evaluate((orderId) => {
    const win = window as any;
    if (typeof win.showMaterialChecklist !== 'function') {
      throw new Error('showMaterialChecklist is not available');
    }
    win.showMaterialChecklist(orderId, { readOnly: true, source: 'orders' });
  }, ids.orderId);

  const modal = page.locator('#custom-modal').last();
  await expect(modal).toBeVisible();
    await expect(modal).toContainText('Checklist materiałów - Zlecenie do magazynu');
  await expect(modal).toContainText('Zakładka Zlecenia ma charakter informacyjny');
  await expect(modal.getByText('👷 Obsługa magazynu')).toBeVisible();

  await expect(modal.getByRole('button', { name: /📤 WYDAJ/ })).toHaveCount(0);
  await expect(modal.getByRole('button', { name: /🛒 ZAMÓW/ })).toHaveCount(0);

  const dialogPromise = page.waitForEvent('dialog');
  await Promise.all([
    dialogPromise.then((dialog) => {
      expect(dialog.message()).toContain('zadanie magazynowe');
      return dialog.accept();
    }),
    modal.getByRole('button', { name: /Przekaż do magazynu/ }).click(),
  ]);

  await openOrdersTab(page);

  const stateAfter = await page.evaluate(() => ({
    order: (window as any).state.orders?.[0],
    tasks: ((window as any).state.tasks || []).filter((task: any) => task.type === 'warehouse-preparation'),
  }));

  expect(stateAfter.order?.warehouseStatus).toBe('pending');
  expect(stateAfter.tasks).toHaveLength(1);
  expect(stateAfter.tasks[0].orderId).toBe(ids.orderId);

  await page.evaluate((orderId) => {
    const win = window as any;
    if (typeof win.showMaterialChecklist !== 'function') {
      throw new Error('showMaterialChecklist is not available');
    }
    win.showMaterialChecklist(orderId, { readOnly: true, source: 'orders' });
  }, ids.orderId);

  const checklistModal = page.locator('#custom-modal').last();
  await expect(checklistModal).toBeVisible();
  await expect(checklistModal).toContainText('Zakładka Zlecenia ma charakter informacyjny');
  await expect(checklistModal.getByText('👷 Obsługa magazynu')).toBeVisible();
});

test('delete order persists across page reloads', async ({ page }) => {
  const orderName = `Zlecenie do usunięcia ${Date.now()}`;
  const client = 'Klient Testowy';

  await gotoOrdersPage(page);

  // Utwórz zlecenie
  await page.fill('#o-name', orderName);
  await page.fill('#o-client', client);
  await page.fill('#o-model', 'Model Z');
  await page.fill('#o-qty', '2');
  await page.locator('#order-form').getByRole('button', { name: /Zapisz zlecenie/i }).click();

  // Sprawdź czy zlecenie zostało utworzone
  const ordersTable = page.locator('#ord-tb');
  await expect(ordersTable).toContainText(orderName);
  await expect(ordersTable).toContainText(client);

  // Pobierz ID zlecenia
  const orderId = await page.evaluate((name) => {
    const state = (window as any).state;
    const order = state.orders?.find((o: any) => o.name === name);
    return order?.id;
  }, orderName);

  expect(orderId).toBeDefined();

  // Sprawdź że zlecenie jest w localStorage
  const { state: stateBeforeDelete } = await getPersistedState(page);
  expect(stateBeforeDelete?.orders).toBeDefined();
  const orderBeforeDelete = stateBeforeDelete.orders.find((o: any) => o.id === orderId);
  expect(orderBeforeDelete).toBeDefined();
  expect(orderBeforeDelete.name).toBe(orderName);

  // Usuń zlecenie używając przycisku Usuń w tabeli
  const deleteButton = page.locator(`[data-od="${orderId}"]`).first();
  await deleteButton.click();

  // Poczekaj na usunięcie
  await page.waitForTimeout(500);

  // Sprawdź że zlecenie zniknęło z tabeli
  await expect(ordersTable).not.toContainText(orderName);

  // Sprawdź że zlecenie zostało usunięte z localStorage
  await page.waitForFunction((name) => {
    const key = (window as any).storeKey || 'door_v5627_state';
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      const order = parsed?.orders?.find((o: any) => o.name === name);
      return !order; // Oczekujemy że zlecenie nie istnieje
    } catch (err) {
      console.warn('Failed to parse store', err);
      return false;
    }
  }, orderName);

  const { state: stateAfterDelete } = await getPersistedState(page);
  const orderAfterDelete = stateAfterDelete?.orders?.find((o: any) => o.id === orderId);
  expect(orderAfterDelete).toBeUndefined();

  // KRYTYCZNY TEST: Odśwież stronę i sprawdź czy zlecenie NIE wróciło
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openOrdersTab(page);

  // Zlecenie nie powinno być widoczne po odświeżeniu
  await expect(page.locator('#ord-tb')).not.toContainText(orderName);

  // Sprawdź ponownie localStorage po odświeżeniu
  const { state: stateAfterReload } = await getPersistedState(page);
  const orderAfterReload = stateAfterReload?.orders?.find((o: any) => o.id === orderId);
  expect(orderAfterReload).toBeUndefined();
});
