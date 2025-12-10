// console-logger.js
// Bezpieczny, idempotentny logger konsoli. Wklej ten kod do konsoli lub załaduj przez <script src="js/console-logger.js"></script>
(function(){
  if(window.__collectedLogsActive){ console.warn('Logger już aktywny'); return; }
  window.__collectedLogs = window.__collectedLogs || [];
  const levels = ['log','info','warn','error','debug'];
  window.__origConsole = window.__origConsole || {};
  levels.forEach(l => {
    try{
      window.__origConsole[l] = console[l].bind(console);
      console[l] = function(...args){
        try{
          // serialize args safely
          const safeArgs = args.map(a => {
            try{ if (typeof a === 'object' && a !== null) return JSON.parse(JSON.stringify(a)); } catch(e){ /* fallthrough */ }
            try{ return String(a); } catch(e){ return '[unserializable]'; }
          });
          window.__collectedLogs.push({level: l, time: new Date().toISOString(), args: safeArgs});
        }catch(e){}
        window.__origConsole[l].apply(console, args);
      };
    }catch(e){}
  });
  window.__collectedLogsActive = true;

  // copy logs to clipboard (JSON)
  window.copyCollectedLogs = async function(){
    try{
      const txt = JSON.stringify(window.__collectedLogs, null, 2);
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(txt);
        console.log('Logs copied to clipboard.');
      } else {
        const w = window.open('about:blank','_blank');
        if(w){ w.document.write('<pre>'+txt.replace(/</g,'&lt;')+'</pre>'); }
      }
    }catch(e){ console.error('copyCollectedLogs error', e); }
  };

  // download logs as file
  window.downloadCollectedLogs = function(filename = 'collected-logs.json'){
    try{
      const blob = new Blob([JSON.stringify(window.__collectedLogs, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }catch(e){ console.error('downloadCollectedLogs error', e); }
  };

  window.clearCollectedLogs = function(){ window.__collectedLogs = []; console.log('Collected logs cleared'); };
  window.stopCollectedLogs = function(){
    try{
      if(!window.__collectedLogsActive) return;
      levels.forEach(l => { if(window.__origConsole && window.__origConsole[l]) console[l] = window.__origConsole[l]; });
      window.__collectedLogsActive = false; console.log('Logger stopped');
    }catch(e){ console.error('stopCollectedLogs error', e); }
  };

  console.log('Console logger installed. Use window.copyCollectedLogs(), window.downloadCollectedLogs(), window.clearCollectedLogs(), window.stopCollectedLogs()');
})();
