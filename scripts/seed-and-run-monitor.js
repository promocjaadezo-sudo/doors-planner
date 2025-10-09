const { chromium } = require('playwright');
const path = require('path');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const file = 'file://' + path.resolve(__dirname, '..', 'index.html');
  console.log('OPEN', file);
  await page.goto(file);
  page.on('console', msg => console.log('PAGE_LOG', msg.type(), msg.text()));
  await page.waitForLoadState('domcontentloaded');
  // seed tasks: pick first operation name and create 8 tasks across different orderIds
  await page.evaluate(()=>{
    try{
      window.state = window.state || {};
      const ops = window.state.operationsCatalog || [];
      const op = ops[0] || {name:'SampleOp'};
      // create 8 dummy orders and tasks for the same op
      window.state.orders = window.state.orders || [];
      window.state.tasks = window.state.tasks || [];
      for(let i=0;i<8;i++){
        const oid = 'ord-'+Date.now().toString(36)+'-'+i;
        window.state.orders.push({id:oid, name:'AUTO-'+i, client:'Auto', model:'M', quantity:1, startDate:'2025-10-01', endDate:'2025-10-10'});
        window.state.tasks.push({id:'t-'+oid, orderId: oid, opName: op.name, status: i%3===0? 'run' : 'todo', elapsedMin: i*2, estMin: op.time || 10});
      }
      try{ window.save && window.save(); }catch(_){ }
      try{ window.renderTasks && window.renderTasks(); }catch(_){ }
    }catch(e){ console.warn('seed error', e && e.message); }
  });
  // navigate to monitor and render
  try{ await page.waitForFunction(()=>!!window.nav, {timeout:5000}); await page.evaluate(()=>window.nav('monitor')); }catch(e){ try{ await page.click('button[data-nav="monitor"]'); }catch(_){ } }
  // wait longer for the app scripts to define renderMonitor; if not present create a small fallback renderer
  try{
    await page.waitForFunction(()=>!!window.renderMonitor, {timeout:30000});
    await page.evaluate(()=>{ try{ window.renderMonitor(); }catch(e){ console.warn('renderMonitor fail', e && e.message); } });
  }catch(e){
    console.warn('renderMonitor not found after timeout, injecting fallback renderer');
    await page.evaluate(()=>{
      try{
        window.renderMonitorFallback = function(){
          const host = document.querySelector('#p-monitor'); if(!host) return;
          host.innerHTML = '';
          const totalOrders = (window.state && window.state.orders || []).length;
          const totalTasks = (window.state && window.state.tasks || []).length;
          const running = (window.state && window.state.tasks || []).filter(t=>t.status==='run').length;
          const todo = (window.state && window.state.tasks || []).filter(t=>!t.status || t.status==='todo').length;
          host.innerText = `Monitoring postępów\nZlecenia:${totalOrders} Zadania:${totalTasks} run:${running} todo:${todo}`;
        };
        window.renderMonitorFallback();
      }catch(_){ }
    });
  }
  await page.waitForTimeout(300);
  const text = await page.$eval('#p-monitor', el => el.innerText);
  console.log('\n--- MONITOR TEXT ---\n');
  console.log(text);
  const rows = await page.$$eval('#p-monitor table tbody tr', trs => trs.map(tr => Array.from(tr.children).map(td=>td.textContent.trim())));
  console.log('\n--- MONITOR ROWS ---\n', JSON.stringify(rows, null, 2));
  await browser.close();
})();
