// Minimal helpers (exposed globally)
(function(global){
  function qs(sel){return document.querySelector(sel);} 
  function qsa(sel){return Array.from(document.querySelectorAll(sel));}
  function uid(prefix='id'){
    try{
      if(window.appHelpers && typeof window.appHelpers.uid === 'function'){
        const u = window.appHelpers.uid();
        return prefix ? (String(prefix) + '-' + u) : u;
      }
    }catch(_){ }
    return prefix + '-' + Math.random().toString(36).slice(2,9);
  }
  // delegate common small helpers to centralized app-helpers when available
  function toInt(v, def){ try{ if(window.appHelpers && typeof window.appHelpers.toInt === 'function') return window.appHelpers.toInt(v, def); }catch(_){ } const n = Number.parseInt(String(v||''),10); return Number.isFinite(n) && !Number.isNaN(n) ? n : (def === undefined ? 0 : def); }
  function busy(on){ try{ if(window.appHelpers && typeof window.appHelpers.busy === 'function'){ return window.appHelpers.busy(on); } }catch(_){ } try{ document.body.style.cursor = on ? 'progress' : ''; }catch(_){ } }
  function escapeHtml(s){ try{ if(window.appHelpers && typeof window.appHelpers.escapeHtml === 'function') return window.appHelpers.escapeHtml(s); }catch(_){ } if(s==null) return ''; return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }
  function safeText(el, txt){ if(!el) return; el.textContent = txt; }
  global.qs = qs; global.qsa = qsa; global.uid = uid; global.safeText = safeText; global.toInt = toInt; global.busy = busy; global.escapeHtml = escapeHtml;
})(window);
