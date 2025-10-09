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
  // wait for nav helper to exist, navigate to monitor
  try{ await page.waitForFunction(()=>!!window.nav, {timeout:10000}); await page.evaluate(()=>window.nav('monitor')); }catch(e){ try{ await page.click('button[data-nav="monitor"]'); }catch(_){ } }
  // wait until renderMonitor is available, then call it and give DOM a tick
  try{
    await page.waitForFunction(()=>!!window.renderMonitor, { timeout: 10000 });
    await page.evaluate(()=>{ try{ window.renderMonitor(); }catch(e){ console.warn('renderMonitor call failed', e && e.message); } });
    await page.waitForTimeout(300);
  }catch(e){ /* continue, may still work */ }
  await page.waitForSelector('#p-monitor', { timeout: 5000 });
  // capture monitor html and computed metrics
  const html = await page.$eval('#p-monitor', el => el.innerText);
  console.log('MONITOR_TEXT:\n', html);
  // capture presence of alert banner
  const hasAlert = await page.$eval('#p-monitor', el => !!el.querySelector('.card.err'));
  console.log('MONITOR_ALERT_PRESENT:', hasAlert);
  // capture top table rows
  const rows = await page.$$eval('#p-monitor table tbody tr', trs => trs.map(tr => Array.from(tr.children).map(td=>td.textContent.trim())));
  console.log('MONITOR_ROWS:', JSON.stringify(rows,null,2));
  await browser.close();
})();
