import { test, expect } from '@playwright/test';

test.describe('Filtrowanie zadań', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log('[browser console]', msg.type(), msg.text());
    });
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('pokazuje przypisania po grupowaniu po pracowniku @smoke', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => {
      const w = window as any;
      if (!w.state && w.store && typeof w.store.get === 'function') {
        w.state = w.store.get();
      }
      return Boolean(w.state);
    }, null, { timeout: 60000 });
    await page.waitForSelector('#tasks-group-by');

  const stageFlag = await page.evaluate(() => (window as any).__stage0 ?? null);
  console.log('stageFlag-after-load', stageFlag);
  const pageHtml = await page.content();
  console.log('html-contains-stage0?', pageHtml.includes('stage 0'));
    const scriptInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const match = scripts.find(s => (s.textContent || '').includes('stage 0'));
      if(!match) return null;
      return {
        parentTag: match.parentElement ? match.parentElement.tagName : null,
        isConnected: match.isConnected,
        type: match.type || 'classic',
        defer: match.defer || false,
        async: match.async || false,
        hasNonce: Boolean(match.nonce),
        dataset: { ...match.dataset },
        preview: match.textContent?.slice(0, 120) || '',
        evaluatedFlag: (() => {
          try {
            if(!(window as any).__stage0 && match.textContent){
              // Try evaluating the script content manually in a sandboxed Function
              new Function(match.textContent)();
            }
            return (window as any).__stage0 ?? null;
          } catch (e) {
            return { error: (e as Error).message };
          }
        })(),
      };
    });
    console.log('stage-script-info', scriptInfo);

    const tasksBtn = page.locator('button[data-nav="tasks"]');
    await tasksBtn.click();
    await expect(page.locator('#p-tasks')).toBeVisible();

    await page.evaluate(() => {
      const state = (window as any).state || {};

      state.employees = [
        {
          id: 'emp-playwright',
          name: 'Jan Testowy',
          role: 'montażysta',
        },
      ];

      state.tasks = [
        {
          id: 'task-playwright',
          name: 'Kontrola jakosci',
          status: 'todo',
          orderId: 'order-1',
          assignees: [{ id: 'emp-playwright' }],
          createdAt: Date.now(),
        },
      ];

      state.orders = [
        {
          id: 'order-1',
          name: 'Testowe zlecenie',
        },
      ];

      (window as any).state = state;

      if (typeof (window as any).save === 'function') {
        (window as any).save();
      }

    });

    await page.waitForFunction(() => {
      const w = window as any;
      return typeof w.renderTasks === 'function' && typeof w.renderTasksGrouped === 'function';
    }, null, { timeout: 10000 }).catch(() => undefined);

    const windowInfo = await page.evaluate(() => {
      const keys = Object.keys(window).filter((k) => k.toLowerCase().includes('render')).slice(0, 20);
      return {
        typeofRenderTasks: typeof (window as any).renderTasks,
        typeofRenderTasksGrouped: typeof (window as any).renderTasksGrouped,
        renderKeys: keys,
        renderTasksExportedFlag: (window as any).__renderTasksExported ?? null,
        renderTasksGroupedExportedFlag: (window as any).__renderTasksGroupedExported ?? null,
      };
    });
    console.log('windowInfo', windowInfo);

    await page.evaluate(() => {
      if (typeof (window as any).renderTasks === 'function') {
        (window as any).renderTasks();
      }
    });

    const tasksInState = await page.evaluate(() => {
      const current = (window as any).state;
      return Array.isArray(current?.tasks) ? current.tasks.length : 0;
    });
    expect(tasksInState).toBeGreaterThan(0);

    const groupSelect = page.locator('#tasks-group-by');
    await expect(groupSelect).toBeVisible();
    await groupSelect.selectOption('assignee');
    const renderResult = await page.evaluate(() => {
      try {
        if (typeof (window as any).renderTasks === 'function') {
          (window as any).renderTasks();
          return 'ok';
        }
        return 'missing';
      } catch (err) {
        const e = err as Error;
        return { error: e.message, stack: e.stack };
      }
    });
    console.log('renderResult', renderResult);

    const debugBeforeExpect = await page.evaluate(() => {
      const w = window as any;
      return {
        tasks: Array.isArray(w.state?.tasks) ? w.state.tasks.map((t: any) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          assignees: t.assignees,
        })) : [],
        filters: {
          order: (document.querySelector('#tasks-filter-order') as HTMLSelectElement)?.value || '',
          status: (document.querySelector('#tasks-filter-status') as HTMLSelectElement)?.value || '',
          group: (document.querySelector('#tasks-group-by') as HTMLSelectElement)?.value || '',
        },
        listInnerHTML: document.querySelector('#tasks-list')?.innerHTML || '',
        typeofRenderTasks: typeof w.renderTasks,
        typeofRenderTasksGrouped: typeof w.renderTasksGrouped,
        renderTasksExportedFlag: w.__renderTasksExported ?? null,
        renderTasksGroupedExportedFlag: w.__renderTasksGroupedExported ?? null,
        stage0Flag: (w as any).__stage0 ?? null,
      };
    });
    console.log('debugBeforeExpect', debugBeforeExpect);

    await expect(page.locator('#tasks-list')).toContainText('Kontrola jakosci');
    const taskCard = page.locator('#tasks-list .card', { hasText: 'Kontrola jakosci' }).first();
    await expect(taskCard).toBeVisible();
    await expect(taskCard).toContainText('Jan Testowy');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const w = window as any;
      if (!w.state && w.store && typeof w.store.get === 'function') {
        w.state = w.store.get();
      }
      return Boolean(w.state);
    }, null, { timeout: 60000 });
    await page.waitForSelector('#tasks-group-by');
    await page.waitForFunction(() => {
      const w = window as any;
      return typeof w.renderTasks === 'function' && typeof w.renderTasksGrouped === 'function';
    }, null, { timeout: 10000 }).catch(() => undefined);

    await page.evaluate(() => {
      if (typeof (window as any).renderTasks === 'function') {
        (window as any).renderTasks();
      }
    });

    await tasksBtn.click();
    await expect(page.locator('#p-tasks')).toBeVisible();

    const groupSelectAfterReload = page.locator('#tasks-group-by');
    await expect(groupSelectAfterReload).toBeVisible();
    await groupSelectAfterReload.selectOption('assignee');
    await page.evaluate(() => {
      if (typeof (window as any).renderTasks === 'function') {
        (window as any).renderTasks();
      }
    });

    await expect(page.locator('#tasks-list')).toContainText('Kontrola jakosci');
    const cardAfterReload = page.locator('#tasks-list .card', { hasText: 'Kontrola jakosci' }).first();
    await expect(cardAfterReload).toBeVisible();
    await expect(cardAfterReload).toContainText('Jan Testowy');
    await expect(cardAfterReload).not.toContainText('Nieprzypisane');
  });
});
