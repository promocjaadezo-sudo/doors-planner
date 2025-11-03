/**
 * @jest-environment jsdom
 *
 * Przykładowe testy automatyczne panelu DevLog.
 * Plik demonstruje, jak można testować panel przy użyciu Jest + jsdom.
 */

const fs = require('fs');
const path = require('path');

describe('DevLogPanel', () => {
  let DevLogPanel;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Załaduj implementację panelu DevLog
    const scriptPath = path.join(__dirname, '..', 'js', 'devlog-panel.js');
    const source = fs.readFileSync(scriptPath, 'utf8');
    // Uruchom kod w kontekście przeglądarki (jsdom)
    // eslint-disable-next-line no-new-func
    new Function(source)();
    DevLogPanel = window.DevLogPanel;
  });

  test('rotuje logi po przekroczeniu limitu', () => {
    const panel = new DevLogPanel({ maxEntries: 3 }).init();
    panel.info('Log #1');
    panel.info('Log #2');
    panel.info('Log #3');
    panel.info('Log #4');

    expect(panel.entries).toHaveLength(3);
    expect(panel.entries[0].message).toContain('Log #4');
    expect(panel.entries[panel.entries.length - 1].message).toContain('Log #2');
  });

  test('filtruje logi po poziomie i treści', () => {
    const panel = new DevLogPanel({ maxEntries: 10 }).init();
    panel.info('Rendered dashboard');
    panel.warning('Missing SKU', { sku: 'A-123' });
    panel.error('Sync failed', { code: 'E_CONN' });

    panel.filters = new Set(['error']);
    panel.searchTerm = 'sync';
    panel.render();

    const items = panel.entries.filter(entry => panel.filters.has(entry.level) && entry.message.toLowerCase().includes(panel.searchTerm));
    expect(items).toHaveLength(1);
    expect(items[0].message).toBe('Sync failed');
  });

  test('eksportuje logi do JSON', async () => {
    const panel = new DevLogPanel({ maxEntries: 2 }).init();
    panel.error('Critical failure', { reason: 'timeout' });

    const createElementSpy = jest.spyOn(document, 'createElement');
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL');

    // Stub href i click na generowanym elemencie <a/>
    createElementSpy.mockImplementation((tag) => {
      if (tag === 'a') {
        return {
          set href(value) { this._href = value; },
          get href() { return this._href; },
          set download(value) { this._download = value; },
          click: jest.fn(),
        };
      }
      return document.createElement(tag);
    });

    await panel.exportLogs('json');

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});
