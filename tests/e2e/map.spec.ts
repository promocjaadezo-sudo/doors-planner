import { test, expect, Page } from '@playwright/test';

const mapState = {
  storage: {
    mode: 'local',
    appId: 'unit-test',
    userId: 'map-spec',
    fbConfig: {},
    autoSaveAssign: false,
  },
  employees: [
    { id: 'emp-1', name: 'Adam Nowak', hoursPerDay: 8, cap: 100, skills: ['Cięcie'], isProductionWorker: true },
    { id: 'emp-2', name: 'Ewa Zielińska', hoursPerDay: 8, cap: 100, skills: ['Montaż'], isProductionWorker: true },
    { id: 'emp-3', name: 'Anna Lis', hoursPerDay: 8, cap: 100, skills: ['Lakiernia'], isProductionWorker: true },
  ],
  operationsCatalog: [
    {
      id: 'prep',
      name: 'Przygotowanie powierzchni',
      timePerUnit: 18,
      defaultWorkers: ['Jan Malewski'],
      skills: ['Szlifowanie'],
    },
    {
      id: 'paint',
      name: 'Lakierowanie końcowe',
      durationTotal: 120,
      defaultWorkers: ['Anna Lis'],
      skills: ['Lakiernia'],
    },
  ],
  processes: [
    {
      id: 'proc-assembly',
      name: 'Składanie skrzydła',
      operations: [
        {
          id: 'cutting',
          name: 'Cięcie profili',
          timePerUnit: 12,
          defaultWorkers: ['Adam Nowak'],
          skills: ['Cięcie'],
        },
        {
          id: 'assembly',
          name: 'Montaż skrzydła',
          durationTotal: 150,
          defaultWorkers: ['Ewa Zielińska'],
          skills: ['Montaż'],
        },
      ],
    },
    {
      id: 'proc-paint',
      name: 'Lakierowanie premium',
      operationsSequence: ['prep', 'paint'],
    },
  ],
  orders: [
    {
      id: 'ord-1',
      name: 'Drzwi Aero X',
      client: 'Klient X',
      model: 'Aero X',
      processId: 'proc-assembly',
      quantity: 8,
      status: 'W toku',
      startDate: '2025-01-05',
      endDate: '2025-01-20',
    },
    {
      id: 'ord-2',
      name: 'Drzwi Aero X (pilne)',
      client: 'Klient Y',
      model: 'Aero X',
      processId: 'proc-assembly',
      quantity: 4,
      status: 'Planowane',
      startDate: '2025-01-10',
      endDate: '2025-02-01',
    },
    {
      id: 'ord-3',
      name: 'Seria Nova Y',
      client: 'Klient Z',
      model: 'Nova Y',
      processId: 'proc-paint',
      quantity: 3,
      status: 'Zakończone',
      startDate: '2025-01-07',
      endDate: '2025-01-18',
    },
  ],
  tasks: [],
  taskProcessMap: {},
  taskOrderMap: {},
  after: [],
  processesAssignments: [],
  ordersAssignments: [],
  page: 'dash',
  _timers: {},
  scheduleConfig: {
    mode: 'perEmployee',
    workdayStartHour: 8,
    workdayLengthHours: 8,
    offWeekdays: [0, 6],
    holidays: [],
    autoAssignEmployees: true,
    allowOvertime: false,
  },
};

async function openMap(page: Page) {
  await page.goto('/index.html');
  await page.getByRole('button', { name: /Mapy/i }).click();
  await expect(page.locator('#p-map')).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll('.map-card').length > 0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.addInitScript((state) => {
    localStorage.setItem('door_v50_state', JSON.stringify(state));
  }, mapState);
});

test('map view aggregates orders and supports filters', async ({ page }) => {
  await openMap(page);

  const cards = page.locator('.map-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Model: Aero X');
  await expect(cards.last()).toContainText('Model: Nova Y');
  await expect(page.locator('#map-stats')).toContainText('Widok (filtry)');
  await expect(cards.first()).toContainText('⚙️ 2 operacji');
  await expect(cards.first()).toContainText('📦 2 zleceń');
  await expect(cards.first()).toContainText('Status: Planowane');

  await page.selectOption('#map-filter-model', 'Nova Y');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Model: Nova Y');

  await page.selectOption('#map-filter-model', '__ALL__');
  await expect(cards).toHaveCount(2);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#map-export-json').click();
  const download = await downloadPromise;
  const suggestedName = download.suggestedFilename();
  expect.soft(suggestedName).toContain('mapy-procesow');
});
