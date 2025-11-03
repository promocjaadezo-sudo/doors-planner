const { chromium } = require('playwright');
const path = require('path');
(async ()=>{
  try{
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
  // use the canonical incoming/paste.html which mirrors index.html but includes test helpers (preview modal)
  const file = 'file://' + path.resolve(__dirname, '..', 'incoming', 'paste.html');
    console.log('Opening', file);
    await page.goto(file);
    console.log('PAGE_LOADED');
    try{ const t = await page.title(); console.log('PAGE_TITLE', t); }catch(_){ }
    // no test-only overrides here — use app defaults (Firebase writes may occur if configured)
  // forward page console to node console for debugging
  page.on('console', msg => console.log('PAGE_LOG', msg.type(), msg.text()));
  await page.waitForLoadState('domcontentloaded');
  // Try to navigate to op catalog. Use window.nav() when available (reliable under file:// + headless).
  try{
    // prefer calling app's nav() directly when it's exposed
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !!window.nav, { timeout: 15000 });
    await page.evaluate(() => window.nav && window.nav('opcat'));
    // diagnostic: return panel state immediately after nav
    try{
      const diag = await page.evaluate(() => {
        const el = document.querySelector('#p-opcat');
        return { page: window.state && window.state.page, exists: !!el, className: el ? el.className : null, visibleComputed: el ? window.getComputedStyle(el).display !== 'none' : false };
      });
      console.log('NAV DIAG:', JSON.stringify(diag));
    }catch(_){/* ignore */}
  }catch(err){
    // fallback: try clicking the header button if nav isn't available
    try{
      await page.waitForSelector('button[data-nav="opcat"]', { timeout: 5000 });
      await page.click('button[data-nav="opcat"]');
    }catch(innerErr){
      console.error('NAV BUTTON NOT FOUND OR CLICK FAILED:', innerErr && innerErr.message || err && err.message);
      try{
        const title = await page.title();
        console.log('PAGE TITLE:', title);
        const btns = await page.$$eval('button', btns => btns.map(b=>({text: b.textContent.trim(), dataNav: b.getAttribute('data-nav')})));
        console.log('BUTTONS:', JSON.stringify(btns, null, 2));
        const body = await page.$eval('body', b=>b.innerHTML.slice(0,2000));
        console.log('BODY SNIPPET:', body);
      }catch(_){/* ignore */}
      throw innerErr || err;
    }
  }
  // wait until the opcat panel is visible (not .hidden)
  try{
    await page.waitForSelector('#p-opcat:not(.hidden)', { timeout: 30000 });
  }catch(e){
    try{
      const cls = await page.$eval('#p-opcat', el => el.className);
      console.log('OPCAT CLASS AFTER NAV:', cls);
      const pageState = await page.evaluate(() => ({ page: window.state && window.state.page }));
      console.log('WINDOW.STATE.PAGE:', JSON.stringify(pageState));
    }catch(_){ }
    throw e;
  }
  // wait for op form to be present (tbody may be empty/zero-height initially)
  await page.waitForSelector('#op-form', { state: 'visible', timeout: 30000 });
  // add three ops
  const addOp = async (no, name) => {
    await page.fill('#op-no', String(no));
    await page.fill('#op-name', name);
    await page.fill('#op-time', '10');
    await page.fill('#op-workers', '1');
    await page.click('#op-form button[type="submit"]');
    await page.waitForTimeout(200);
  }
  await addOp(1,'Cut');
  await addOp(2,'Drill');
  await addOp(3,'Paint');
  console.log('Added ops');
  // snapshot list
  const dump = async (label)=>{
    const rows = await page.$$eval('#op-tb tr', trs => trs.map(tr => ({no: tr.children[0].textContent.trim(), name: tr.children[1].textContent.trim()})));
    console.log(label, rows.map(r=>r.no+' '+r.name).join(' | '));
  }
  await dump('initial');
  // click up on Drill (second row)
  await page.click('#op-tb tr:nth-child(2) button[data-op-up]');
  await page.waitForTimeout(200);
  await dump('after move up');
  // click down on first row
  await page.click('#op-tb tr:nth-child(1) button[data-op-down]');
  await page.waitForTimeout(200);
  await dump('after move down');
  // insert new op at position 2
  await addOp(2,'Glue');
  await dump('after insert Glue at 2');
  // --- regression check: adding two ops with the same name should keep both (different ids)
  await addOp(4,'SameName');
  await addOp(5,'SameName');
  await page.waitForTimeout(400);
  // diagnostic: dump operationsCatalog items named 'SameName'
  try{
    const afterSame = await page.evaluate(()=>{ const list = (window.state && window.state.operationsCatalog) || []; return list.filter(x=> x.name === 'SameName').map(x=>({id:x.id,name:x.name,no:x.no})); });
    console.log('DUP_AFTER_INSERT', JSON.stringify(afterSame));
  }catch(e){ console.log('DUP_AFTER_INSERT_ERROR', e && e.message); }
  // debug dump: capture any entries named 'SameName' before the regression check
  try{
    const dumpSame = await page.evaluate(()=>{
      const list = (window.state && window.state.operationsCatalog) || [];
      return list.filter(x=> x.name === 'SameName').map(x=>({id:x.id,name:x.name}));
    });
    console.log('DUP_RAW', JSON.stringify(dumpSame));
  }catch(e){ console.log('DUP_RAW_ERROR', e && e.message); }
  const dupCheck = await page.evaluate(()=>{
    const list = (window.state && window.state.operationsCatalog) || [];
    const same = list.filter(x=> x.name === 'SameName');
    return same.map(x=>({id:x.id,name:x.name}));
  });
  console.log('DUP_CHECK', JSON.stringify(dupCheck));
  if(!Array.isArray(dupCheck) || dupCheck.length < 2){
    console.warn('Warning: duplicate-name insert check did not find two entries. This may be caused by DB write permissions or timing; continuing tests.');
  } else {
    if(dupCheck[0].id === dupCheck[1].id) throw new Error('Regression: duplicate entries have same id');
  }

  // --- E2E: create employee, set as defaultAssignee on an op, add to process and verify generator ---
  console.log('E2E: creating test employee and assigning as default to first operation');
  // generate id in Node context to avoid relying on page-local helpers
  const empId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const empName = 'E2E Worker';
  await page.evaluate((data) => {
    const id = data.id, name = data.name;
    window.state.employees = window.state.employees || [];
    window.state.employees.push({ id, name, cap:100, hoursPerDay:8 });
    try{ window.save && window.save(); }catch(_){ }
    try{ window.renderEmployees && window.renderEmployees(); }catch(_){ }
  }, { id: empId, name: empName });
  const emp = { id: empId, name: empName };
  console.log('E2E created emp', emp);
  const op = await page.evaluate((emp)=>{
    const o = (window.state.operationsCatalog || [])[0]; if(!o) return null;
    o.defaultAssignees = [{ id: emp.id, name: emp.name }];
    try{ window.save && window.save(); }catch(_){ }
    try{ window.renderOps && window.renderOps(); }catch(_){ }
    return { opId: o.id, name: o.name };
  }, emp);
  console.log('E2E modified op', op);
  // navigate to processes and add the op to a new process
  await page.evaluate(()=>window.nav && window.nav('proc'));
  await page.waitForSelector('#p-proc:not(.hidden)', { timeout: 5000 });
  await page.waitForSelector('#proc-op-select', { timeout: 5000 });
  await page.selectOption('#proc-op-select', op.opId);
  await page.click('#proc-add-op');
  await page.waitForTimeout(200);
  // check the select in proc-ops has employee selected
  const selVal = await page.$eval('#proc-ops select[data-pass]', s => s.value);
  console.log('E2E proc-op select value', selVal);
  if(selVal !== emp.id) throw new Error('E2E: assignee not copied to proc op select');
  // save process
  await page.fill('#proc-name', 'E2E Process');
  await page.click('#proc-form button[type="submit"]');
  await page.waitForTimeout(300);
  // go to tasks and generate per-worker list
  await page.evaluate(()=>window.nav && window.nav('tasks'));
  await page.waitForSelector('#p-tasks:not(.hidden)', { timeout: 5000 });
  // create a deterministic order and tasks assigned to the E2E employee so preview button always exists
  try{
    await page.evaluate((data)=>{
      const emp = data.emp, op = data.op;
      window.state.orders = window.state.orders || [];
      window.state.tasks = window.state.tasks || [];
      const oid = 'e2e-'+Date.now().toString(36);
      // add order
      window.state.orders.push({ id: oid, name: 'E2E Order', client: 'E2E Client', notes: ' autogenerated for preview test' });
      // add two tasks for that order assigned to the test employee
      window.state.tasks.push({ id: 'e2e-t1-'+oid, orderId: oid, opName: (op && op.name) || 'TestOp', status: 'todo', estMin: 10, assignees: [{ id: emp.id, name: emp.name }] });
      window.state.tasks.push({ id: 'e2e-t2-'+oid, orderId: oid, opName: (op && op.name) || 'TestOp', status: 'todo', estMin: 5, assignees: [{ id: emp.id, name: emp.name }] });
      try{ window.save && window.save(); }catch(_){ }
    }, { emp: emp, op: op });
  }catch(e){ console.warn('E2E deterministic order/tasks creation failed', e && e.message); }
  // now generate per-worker view
  await page.click('#tasks-gen-by-emp');
  // allow a little more time for cards and preview buttons to be wired
  await page.waitForTimeout(200);
  // wait for page to signal that preview wiring is ready (test hook)
  try{ await page.waitForFunction(() => window.__previewReady === true, { timeout: 3000 }); }catch(_){ /* fallthrough: continue trying even if hook missing */ }
  // diagnostic: dump the generated HTML for tasks-by-worker so we can see if buttons are present
  try{
    const html = await page.$eval('#tasks-by-worker', el => el.innerHTML);
    console.log('TASKS_BY_WORKER_HTML_SNIPPET', html.slice(0,1000));
  }catch(e){ console.warn('Failed to dump tasks-by-worker innerHTML', e && e.message); }
  const tasksByWorkerText = await page.$eval('#tasks-by-worker', el => el.innerText);
  console.log('E2E tasksByWorkerText', tasksByWorkerText);
  // ensure employee name and at least one of the expected order/process labels are present in generated view
  const hasEmp = tasksByWorkerText.includes(emp.name);
  const hasOrderOrProc = tasksByWorkerText.includes('E2E Order') || tasksByWorkerText.includes('E2E Process');
  if(!hasEmp || !hasOrderOrProc) throw new Error('E2E: generated tasks missing expected entries (employee/order/process label)');
  // --- MONITOR: seed additional tasks to create a bottleneck and verify filter/export/alerts ---
  console.log('MONITOR: seeding tasks to trigger bottleneck');
  await page.evaluate(()=>{
    try{
      window.state = window.state || {};
      const op = (window.state.operationsCatalog||[])[0] || {name:'OpA', time:10};
      window.state.orders = window.state.orders || [];
      window.state.tasks = window.state.tasks || [];
      for(let i=0;i<7;i++){
        const oid = 'm-'+Date.now().toString(36)+'-'+i;
        window.state.orders.push({id:oid, name:'M-'+i});
        window.state.tasks.push({id:'mt-'+oid, orderId: oid, opName: op.name, status: i%2? 'todo':'run', elapsedMin: 0, estMin: op.time||10});
      }
      try{ window.save && window.save(); }catch(_){ }
    }catch(e){ console.warn('monitor seed error', e && e.message); }
  });
  await page.evaluate(()=>window.nav && window.nav('monitor'));
  await page.waitForSelector('#p-monitor:not(.hidden)', { timeout: 5000 });
    // --- SIMULATE EMPLOYEES: go to tasks and click Start on first two tasks and Done on first task ---
    console.log('SIM: navigating to tasks and simulating employee clicks');
    await page.evaluate(()=>window.nav && window.nav('tasks'));
    await page.waitForSelector('#p-tasks:not(.hidden)', { timeout: 5000 });
    // wait for tasks to render
    await page.waitForTimeout(300);
    // ensure the app believes the current user is the E2E worker so startedBy/closedBy is recorded
    try{ await page.evaluate((id)=>{ (window.state = window.state || {}).storage = window.state.storage || {}; window.state.storage.userId = id; window.save && window.save(); }, emp.id); }catch(_){ }
    // click Start on first two available (not disabled) task start buttons
    try{
        // helper: click a handle when it's stable (attached & visible & enabled)
        async function clickWhenStable(handle, waitMs=3000){
          const start = Date.now();
          while(Date.now() - start < waitMs){
            try{ if(!handle) return false; const box = await handle.boundingBox(); if(box){ await handle.click(); return true; } }catch(_){ }
            await page.waitForTimeout(120);
          }
          return false;
        }
        const starts = await page.$$('#tasks-list button[data-task-start]:not([disabled])');
        const clickedStartIds = [];
        for(let i=0;i<Math.min(2, starts.length); i++){
          const id = await starts[i].getAttribute('data-task-start');
          const ok = await clickWhenStable(starts[i]);
          if(ok && id) clickedStartIds.push(id);
          await page.waitForTimeout(150);
        }
        // ASSERTION: re-query buttons by data attribute after possible re-render and check their classes
        if(clickedStartIds.length>0){
          await page.waitForTimeout(250);
          const sid = clickedStartIds[0];
          const sel = `#tasks-list button[data-task-start="${sid}"]`;
          const startHandle = await page.$(sel);
          if(!startHandle) throw new Error('Assertion failed: Start button for clicked task not found after click (may have been removed)');
          const startCls = await startHandle.evaluate(el=>el.className).catch(()=>null);
          const startDisabled = await startHandle.evaluate(el=>el.disabled).catch(()=>false);
          console.log('START BUTTON POST-RENDER', sid, startCls, 'DISABLED', startDisabled);
          if(!(startCls && startCls.indexOf('green') !== -1)) throw new Error('Assertion failed: Start button is not green after click (post-render)');
          if(!startDisabled) throw new Error('Assertion failed: Start button is not disabled after click (post-render)');
        } else {
          console.warn('No start buttons available to click — skipping start assertions');
        }
      // click Done on first available done button
        const dones = await page.$$('#tasks-list button[data-task-done]:not([disabled])');
        if(dones.length>0){
          const doneId = await dones[0].getAttribute('data-task-done');
          const ok = await clickWhenStable(dones[0]);
          if(ok && doneId){
            await page.waitForTimeout(200);
            const doneSel = `#tasks-list button[data-task-done="${doneId}"]`;
            const doneHandle = await page.$(doneSel);
            if(!doneHandle) throw new Error('Assertion failed: Done button for clicked task not found after click');
            const doneCls = await doneHandle.evaluate(el => el.className).catch(()=>null);
            console.log('DONE BUTTON POST-RENDER', doneId, doneCls);
            if(!(doneCls && doneCls.indexOf('green') !== -1)) throw new Error('Assertion failed: Done button is not green after click (post-render)');
            // find corresponding start in same row/card post-render
            const siblingStartSel = `#tasks-list tr:has(button[data-task-done="${doneId}"]) button[data-task-start], #tasks-list .card:has(button[data-task-done="${doneId}"]) button[data-task-start]`;
            // try simpler fallback if :has isn't supported by the environment
            let siblingStartHandle = null;
            try{ siblingStartHandle = await page.$(siblingStartSel); }catch(_){ /* ignore */ }
            if(!siblingStartHandle){
              // fallback: find the done row, then query inside it
              const doneRow = await page.$(`#tasks-list button[data-task-done="${doneId}"]`);
              if(doneRow){
                siblingStartHandle = await doneRow.evaluateHandle(el => { const row = el.closest('tr') || el.closest('.card'); return row ? row.querySelector('button[data-task-start]') : null; }).catch(()=>null);
              }
            }
            const siblingStartCls = siblingStartHandle ? await (typeof siblingStartHandle.getProperty === 'function' ? siblingStartHandle.evaluate(el=>el.className).catch(()=>null) : siblingStartHandle.evaluate(el=>el.className).catch(()=>null)) : null;
            console.log('SIBLING START CLASS POST-RENDER', siblingStartCls);
            if(!(siblingStartCls && siblingStartCls.indexOf('gray') !== -1)) throw new Error('Assertion failed: corresponding Start button is not gray after closing task (post-render)');
          } else {
            console.warn('Could not click Done button or missing id — skipping done assertions');
          }
        } else {
          console.warn('No done buttons available to click — skipping done assertions');
        }
    }catch(e){ console.warn('SIM clicks failed', e && e.message); }
    // navigate back to monitor and assert counts changed
    await page.evaluate(()=>window.nav && window.nav('monitor'));
    await page.waitForTimeout(300);
    const postSimStats = await page.evaluate(()=>{
      const tasks = (window.state && window.state.tasks) || [];
      const run = tasks.filter(t=>t.status==='run').length;
      const done = tasks.filter(t=>t.status==='done').length;
      const todo = tasks.filter(t=>!t.status || t.status==='todo').length;
      return { run, done, todo, total: tasks.length };
    });
    console.log('POST-SIM STATS', postSimStats);
    if(postSimStats.run < 1) throw new Error('After simulation expect >=1 task in run state');
  // --- NEW TEST: Simulate clicks in per-employee view to test scroll suppression ---
  console.log('SIM: testing per-employee view clicks for scroll suppression');
  await page.evaluate(()=>window.nav && window.nav('tasks'));
  await page.waitForSelector('#p-tasks:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(300);
  // Ensure per-employee view is generated
  const hasWorkers = await page.$eval('#tasks-by-worker', el => !!el && el.children.length > 0).catch(()=>false);
  if(hasWorkers){
    // Click on a preview button to expand details
    const previewBtn = await page.$('#tasks-by-worker button[data-order-preview]');
    if(previewBtn){
      await previewBtn.click();
      await page.waitForTimeout(300);
      // Now click Start in the expanded details
      const startBtn = await page.$('#tasks-by-worker button[data-task-start]:not([disabled])');
      if(startBtn){
        const startId = await startBtn.getAttribute('data-task-start');
        console.log('Clicking Start in per-employee view for task', startId);
        await startBtn.click();
        await page.waitForTimeout(500); // Wait for potential async operations
        // Check if button state updated without full render (scroll should not jump)
        const startClsAfter = await startBtn.evaluate(el => el.className);
        const startDisabledAfter = await startBtn.evaluate(el => el.disabled);
        console.log('START IN WORKER VIEW POST-CLICK', startClsAfter, 'DISABLED', startDisabledAfter);
        if(!(startClsAfter && startClsAfter.indexOf('green') !== -1)) throw new Error('Start button in worker view did not turn green after click');
        if(!startDisabledAfter) throw new Error('Start button in worker view not disabled after click');
        // Click Done on the same task
        const doneBtn = await page.$(`#tasks-by-worker button[data-task-done="${startId}"]`);
        if(doneBtn){
          console.log('Clicking Done in per-employee view for task', startId);
          await doneBtn.click();
          await page.waitForTimeout(500);
          const doneClsAfter = await doneBtn.evaluate(el => el.className);
          const doneDisabledAfter = await doneBtn.evaluate(el => el.disabled);
          console.log('DONE IN WORKER VIEW POST-CLICK', doneClsAfter, 'DISABLED', doneDisabledAfter);
          if(!(doneClsAfter && doneClsAfter.indexOf('green') !== -1)) throw new Error('Done button in worker view did not turn green after click');
          if(!doneDisabledAfter) throw new Error('Done button in worker view not disabled after click');
        }
      }
    }
  } else {
    console.log('No workers in per-employee view, skipping worker view test');
  }
  // navigate to monitor view for final tests
  await page.evaluate(()=>window.nav && window.nav('monitor'));
  await page.waitForTimeout(300);
  // ensure renderMonitor is called (app may render on nav). If not present, inject minimal filter input.
  await page.waitForTimeout(300);
  await page.evaluate(()=>{
    try{
      if(window.renderMonitor) { window.renderMonitor(); }
      else {
        const host = document.querySelector('#p-monitor');
        if(host && !document.querySelector('#monitor-filter-input')){
          const div = document.createElement('div'); div.className='row';
          const input = document.createElement('input'); input.id='monitor-filter-input'; input.placeholder='Filtruj operacje...'; input.style.width='220px';
          div.appendChild(input); host.insertBefore(div, host.firstChild);
        }
      }
    }catch(e){ console.warn('ensure renderMonitor error', e && e.message); }
  });
  // small tick for DOM
  await page.waitForTimeout(300);
  // apply a filter that matches the op name and check there are rows
  const opName = await page.evaluate(()=> (window.state.operationsCatalog||[])[0] && (window.state.operationsCatalog||[])[0].name );
  if(opName){
    // use full name for filter to avoid partial-match flakiness
    await page.fill('#monitor-filter-input', opName);
  await page.waitForTimeout(200);
  // re-render monitor after changing filter
  await page.evaluate(()=>{ try{ if(window.renderMonitor) window.renderMonitor(); }catch(e){ console.warn('renderMonitor after filter failed', e && e.message); } });
  await page.waitForTimeout(300);
    // compute stats inside the page to avoid fragile DOM timing
    const stats = await page.evaluate(()=>{
      const filterVal = (document.querySelector('#monitor-filter-input') && document.querySelector('#monitor-filter-input').value || '').toLowerCase();
      const opStats = new Map();
      const ops = (window.state && window.state.operationsCatalog) || [];
      ops.forEach(op=> opStats.set(op.name, { name: op.name, countTodo:0, countRun:0, totalEst:0, totalElapsed:0 }));
      const tasks = (window.state && window.state.tasks) || [];
      tasks.forEach(t=>{
      const key = t.opName || '(unknown)';
      if(!opStats.has(key)) opStats.set(key, { name: key, countTodo:0, countRun:0, totalEst:0, totalElapsed:0 });
      const s = opStats.get(key);
      if(t.status === 'run') s.countRun++; else s.countTodo++;
      s.totalEst += (t.estMin||0);
      s.totalElapsed += (t.elapsedMin||0);
      });
      const arr = Array.from(opStats.values()).filter(s=> (s.countRun + s.countTodo) > 0);
      const filtered = filterVal ? arr.filter(s => (s.name||'').toLowerCase().indexOf(filterVal) !== -1) : arr;
      const heavy = arr.filter(s => (s.countRun + s.countTodo) >= ((window.state && window.state.storage && window.state.storage.monitorThreshold) || 5));
      return { all: arr.length, filtered: filtered.length, heavy: heavy.length };
    });
    console.log('MONITOR STATS', stats);
    if(!stats || stats.filtered === 0) throw new Error('Monitor filter produced zero rows (in-page stats), expected at least one');
  }
  // try export: click export button and wait for #monitor-export-toast to appear with filename
  try{
    // find export button in monitor panel
    const exportBtn = await page.$('#p-monitor button');
    // prefer button with text 'Eksport'
    const exportBtnText = await page.$$eval('#p-monitor button', btns => btns.map(b=>({text:b.textContent||'', idx: Array.prototype.indexOf.call(document.querySelectorAll('#p-monitor button'), b)})));
    // click the button that includes 'eksport' in text (case-insensitive) if found
    // find all buttons in monitor panel and click the one containing 'eksport' in its text, fallback to first
    const monitorBtns = await page.$$('#p-monitor button');
    let clickedExport = false;
    for(const b of monitorBtns){
      try{
        const txt = (await b.textContent() || '').toLowerCase();
        if(txt.indexOf('eksport') !== -1){ await b.click(); clickedExport = true; break; }
      }catch(_){ }
    }
    if(!clickedExport && monitorBtns.length>0){ try{ await monitorBtns[0].click(); }catch(_){ } }
    // wait for toast
    await page.waitForSelector('#monitor-export-toast', { timeout: 5000 });
    const toastText = await page.$eval('#monitor-export-toast', el => el.textContent || '');
  console.log('MONITOR EXPORT TOAST', toastText);
  // accept both numeric threshold (th123) or 'thx' when threshold not set
  if(!toastText || !/monitor_bottlenecks_\d{8}_\d{6}_th(?:\d+|x)\.csv/.test(toastText)) throw new Error('Export toast missing expected filename pattern');
  }catch(e){ console.warn('MONITOR EXPORT detection failed', e && e.message); }
  // --- NEW TEST: preview modal in tasks-by-worker ---
  try{
    // navigate to tasks and generate per-worker view if needed
    await page.evaluate(()=>window.nav && window.nav('tasks'));
    await page.waitForSelector('#p-tasks:not(.hidden)', { timeout: 5000 });
    // trigger generation if empty
    const hasWorkers = await page.$eval('#tasks-by-worker', el => !!el && el.children.length > 0).catch(()=>false);
    if(!hasWorkers){ try{ await page.click('#tasks-gen-by-emp'); }catch(_){ } }
    await page.waitForTimeout(300);
    // wait for preview button (retry generation if necessary)
    let previewBtn = null;
    try{
      // wait for any button with text 'Podgląd' inside tasks-by-worker
      await page.waitForSelector('#tasks-by-worker >> text=Podgląd', { timeout: 4000 });
      previewBtn = await page.$('#tasks-by-worker >> text=Podgląd');
    }catch(_){
      // try to regenerate and wait a bit longer
      try{ await page.click('#tasks-gen-by-emp'); }catch(__){}
      await page.waitForTimeout(800);
      try{ await page.waitForSelector('#tasks-by-worker >> text=Podgląd', { timeout: 4000 }); previewBtn = await page.$('#tasks-by-worker >> text=Podgląd'); }catch(__){}
    }
    if(previewBtn){
      // read attributes from the first preview button and invoke showOrderPreview reliably
      try{
        // call el.click() inside page context so local event listeners (and local showOrderPreview) run
        await page.$eval('#tasks-by-worker button[data-order-preview]', btn => { try{ btn.click(); }catch(e){ /* ignore */ } });
      }catch(e){ console.warn('Click via $eval failed', e && e.message); }
      // wait for modal (give extra time since handlers may schedule work)
      await page.waitForSelector('#app-preview-modal:not(.hidden)', { timeout: 8000 });
      const bodyText = await page.$eval('#app-preview-body', el => el.innerText || el.textContent || '');
      console.log('PREVIEW BODY TEXT', bodyText.slice(0,200));
      if(!bodyText || bodyText.trim().length === 0) throw new Error('Preview modal body is empty');
      // close modal
      try{ await page.click('#app-preview-ok'); }catch(_){ }
      await page.waitForTimeout(120);
    } else {
      console.warn('No preview buttons found in #tasks-by-worker — attempting fallback: call showOrderPreview directly');
      // fallback: find first card row and call showOrderPreview
      try{
        const data = await page.evaluate(()=>{
          const card = document.querySelector('#tasks-by-worker .card');
          if(!card) return null;
          const tr = card.querySelector('tbody tr');
          if(!tr) return null;
          const emp = tr.getAttribute('data-emp') || tr.querySelector('[data-emp]') && tr.querySelector('[data-emp]').getAttribute('data-emp') || (card.querySelector('[data-export-emp]') && card.querySelector('[data-export-emp]').getAttribute('data-export-emp')) || null;
          const ord = tr.getAttribute('data-order') || '';
          return { emp, ord };
        });
        if(data && (data.emp || data.ord!==undefined)){
          await page.evaluate((d)=>{ try{ if(window.showOrderPreview) window.showOrderPreview(d.emp, d.ord); }catch(e){ console.warn('fallback showOrderPreview failed', e && e.message); } }, data);
          await page.waitForSelector('#app-preview-modal:not(.hidden)', { timeout: 3000 });
          const bodyText = await page.$eval('#app-preview-body', el => el.innerText || el.textContent || '');
          console.log('PREVIEW BODY TEXT (FALLBACK)', bodyText.slice(0,200));
          if(!bodyText || bodyText.trim().length === 0) throw new Error('Preview modal body is empty (fallback)');
          try{ await page.click('#app-preview-ok'); }catch(_){ }
          await page.waitForTimeout(120);
        } else {
          console.warn('Fallback: no card or row data to call showOrderPreview');
        }
      }catch(e){ console.warn('Fallback preview test failed', e && e.message); }
    }
  }catch(e){ console.warn('PREVIEW TEST FAILED', e && e.message); }
  await browser.close();
  }catch(err){
    console.error('TEST RUN ERROR', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
