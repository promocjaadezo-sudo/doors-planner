import { test, expect, Page } from '@playwright/test';

const STORE_KEY = 'door_v50_state';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

type SeedOptions = {
  orderId: string;
  orderName: string;
  itemId: string;
  itemName: string;
  neededQuantity: number;
  availableQuantity: number;
};

async function bootstrapOrderData(page: Page, options: SeedOptions) {
  const {
    orderId,
    orderName,
    itemId,
    itemName,
    neededQuantity,
    availableQuantity,
  } = options;

  await page.goto('/index.html');
  await page.waitForFunction(() => {
    const globals = window as unknown as {
      state?: unknown;
      save?: unknown;
      saveState?: unknown;
      saveWarehouseToStorage?: unknown;
      renderOrderPage?: unknown;
    };
    return Boolean(globals.state && globals.save && globals.saveWarehouseToStorage && globals.renderOrderPage);
  });

  await page.evaluate(
    ({ orderPayload, itemPayload, storeKey }) => {
      const globals = window as unknown as {
        state?: any;
        store?: any;
        save?: () => void;
        saveState?: () => void;
        saveWarehouseToStorage?: () => void;
        renderOrderPage?: () => void;
        updateShoppingListBadge?: () => void;
      };

      if (!globals.state) {
        throw new Error('Aplikacja nie zainicjalizowała globalnego stanu');
      }

      const seededOrder = {
        ...orderPayload,
        materialChecklist: orderPayload.materialChecklist?.map((entry: any) => ({
          ...entry,
          issued: false,
          issuedQty: 0,
          issuedAt: null,
        })) ?? [],
      };

      const seededState = {
        ...globals.state,
        storage: {
          mode: 'local',
          appId: 'playwright-tests',
          userId: 'e2e-runner',
          fbConfig: {},
        },
        orders: [seededOrder],
        processes: [{ id: 'proc1', name: 'Proces testowy', operations: [] }],
        tasks: [],
        taskProcessMap: {},
        taskOrderMap: {},
        after: [],
        PROC_TMP: [],
        page: 'order',
        _timers: {},
        settings: globals.state.settings || {},
        scheduleConfig: globals.state.scheduleConfig || {
          workdayStartHour: 8,
          workdayLengthHours: 8,
          offWeekdays: [0, 6],
        },
      };

      Object.assign(globals.state, seededState);

      const persistedState = JSON.parse(JSON.stringify(seededState));
      localStorage.setItem(storeKey, JSON.stringify(persistedState));

      if (globals.store && typeof globals.store === 'object') {
        globals.store.storage = seededState.storage;
        globals.store.orders = persistedState.orders;
        globals.store.processes = persistedState.processes;
        globals.store.tasks = [];
        globals.store.after = [];
        globals.store.taskProcessMap = {};
        globals.store.taskOrderMap = {};
        globals.store.page = 'order';
      }

      const warehouseSeed = {
        ...itemPayload,
        quantity: itemPayload.quantity,
      };

      (window as unknown as { warehouseItems?: unknown[] }).warehouseItems = [warehouseSeed];
      (window as unknown as { warehouseTransactions?: unknown[] }).warehouseTransactions = [];
      (window as unknown as { warehouseReservations?: unknown[] }).warehouseReservations = [];
      (window as unknown as { shoppingList?: unknown[] }).shoppingList = [];

      localStorage.setItem('warehouseItems', JSON.stringify([warehouseSeed]));
      localStorage.setItem('warehouseTransactions', JSON.stringify([]));
      localStorage.setItem('warehouseReservations', JSON.stringify([]));
      localStorage.setItem('shoppingList', JSON.stringify([]));

      globals.updateShoppingListBadge?.();
      globals.save?.();
      globals.saveState?.();
      globals.saveWarehouseToStorage?.();
      globals.renderOrderPage?.();
    },
    {
      orderPayload: {
        id: orderId,
        name: orderName,
        client: 'Testowy klient',
        model: 'Model X',
        quantity: 1,
        startDate: '2025-10-01',
        endDate: '2025-10-10',
        installDate: '2025-10-17',
        processId: 'proc1',
        tasksGenerated: false,
        materialChecklist: [
          {
            itemId,
            itemName,
            quantity: neededQuantity,
            unit: 'szt',
            checked: false,
            checkedAt: null,
            checkedBy: null,
          },
        ],
      },
      itemPayload: {
        id: itemId,
        name: itemName,
        quantity: availableQuantity,
        unit: 'szt',
        price: 15,
        minStock: 1,
        location: { shelf: 'R1', rack: 'P2', sector: 'A' },
      },
      storeKey: STORE_KEY,
    }
  );
}

async function openMaterialsModal(page: Page, orderName: string) {
  await page.getByRole('button', { name: /Zlecenia/i }).click();
  await expect(page.locator('#p-order')).toBeVisible();
  await page.waitForFunction((name) => {
    return Array.from(document.querySelectorAll('#ord-tb tr')).some((row) =>
      row.textContent?.includes(name)
    );
  }, orderName);
  const orderRow = page.locator('#ord-tb tr', { hasText: orderName }).first();
  await expect(orderRow).toBeVisible();
  await orderRow.getByRole('button', { name: /Materiały/i }).click();
  const modal = page.locator('#custom-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function readLocalStorage<T>(page: Page, key: string) {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, key) as Promise<T>;
}

test('issuing materials debits warehouse stock when availability is sufficient', async ({ page }) => {
  const orderId = 'ord-wz-ok';
  const itemId = 'item-ok';
  await bootstrapOrderData(page, {
    orderId,
    orderName: 'Zlecenie WZ OK',
    itemId,
    itemName: 'Belka testowa',
    neededQuantity: 3,
    availableQuantity: 8,
  });

  const ordersCount = await page.evaluate(() => {
    const globals = window as unknown as { state?: { orders?: unknown[] } };
    return Array.isArray(globals.state?.orders) ? globals.state.orders.length : 0;
  });
  expect(ordersCount).toBe(1);

  const modal = await openMaterialsModal(page, 'Zlecenie WZ OK');

  page.once('dialog', (dialog) => dialog.accept());
  await modal.getByRole('button', { name: /Obciąż magazyn/i }).click();

  const reportModal = page.locator('#custom-modal');
  await expect(reportModal).toBeVisible();
  await expect(reportModal).toContainText('Raport wydania');
  await expect(reportModal).toContainText('✅ Wydane materiały');
  await expect(reportModal).not.toContainText('⚠️ Wydane częściowo');
  await expect(reportModal).not.toContainText('🛒 Dodano do listy zakupów');

  const warehouseItems = await readLocalStorage<Array<any>>(page, 'warehouseItems');
  expect(warehouseItems?.[0].quantity).toBe(5);

  const transactions = await readLocalStorage<Array<any>>(page, 'warehouseTransactions');
  expect(transactions?.length).toBeGreaterThan(0);
  const lastTransaction = transactions![transactions!.length - 1];
  expect(lastTransaction).toMatchObject({
    type: 'WZ',
    itemId,
    orderId,
    quantity: -3,
  });

  const shoppingList = await readLocalStorage<Array<any>>(page, 'shoppingList');
  expect(shoppingList).toEqual([]);

  const state = await readLocalStorage<any>(page, STORE_KEY);
  expect(state?.orders?.[0]?.materialChecklist?.[0]).toMatchObject({
    issued: true,
    issuedQty: 3,
  });

  await reportModal.getByRole('button', { name: 'Zamknij' }).click();
});

test('issuing materials adds shortages to shopping list when stock is insufficient', async ({ page }) => {
  const orderId = 'ord-wz-short';
  const itemId = 'item-short';
  await bootstrapOrderData(page, {
    orderId,
    orderName: 'Zlecenie z brakami',
    itemId,
    itemName: 'Okleina testowa',
    neededQuantity: 5,
    availableQuantity: 2,
  });

  const ordersCount = await page.evaluate(() => {
    const globals = window as unknown as { state?: { orders?: unknown[] } };
    return Array.isArray(globals.state?.orders) ? globals.state.orders.length : 0;
  });
  expect(ordersCount).toBe(1);

  const modal = await openMaterialsModal(page, 'Zlecenie z brakami');

  page.once('dialog', (dialog) => dialog.accept());
  await modal.getByRole('button', { name: /Obciąż magazyn/i }).click();

  const reportModal = page.locator('#custom-modal');
  await expect(reportModal).toBeVisible();
  await expect(reportModal).toContainText('Raport wydania');
  await expect(reportModal).toContainText('⚠️ Wydane częściowo');
  await expect(reportModal).toContainText('🛒 Dodano do listy zakupów');

  const warehouseItems = await readLocalStorage<Array<any>>(page, 'warehouseItems');
  expect(warehouseItems?.[0].quantity).toBe(-3);

  const transactions = await readLocalStorage<Array<any>>(page, 'warehouseTransactions');
  expect(transactions?.length).toBeGreaterThan(0);
  const lastTransaction = transactions![transactions!.length - 1];
  expect(lastTransaction).toMatchObject({
    type: 'WZ',
    itemId,
    orderId,
    quantity: -5,
  });

  const shoppingList = await readLocalStorage<Array<any>>(page, 'shoppingList');
  expect(shoppingList?.length).toBe(1);
  expect(shoppingList?.[0]).toMatchObject({
    itemId,
    orderId,
    quantity: 3,
    status: 'pending',
  });

  const state = await readLocalStorage<any>(page, STORE_KEY);
  expect(state?.orders?.[0]?.materialChecklist?.[0]).toMatchObject({
    issued: false,
    issuedQty: 5,
    issuedFromStock: 2,
    shortageQty: 3,
  });

  await reportModal.getByRole('button', { name: 'Zamknij' }).click();
});
