// Minimal safe app init using base-utils and base-store
(function(){
  const qs = (s) => document.querySelector(s); // Dodanie funkcji qs

  function showBanner(msg){
    const ex = document.querySelector('.app-error-banner');
    if(ex){ ex.textContent = msg; return; }
    const b = document.createElement('div'); b.className='app-error-banner'; b.textContent = msg; document.body.appendChild(b);
  }

  function initApp(){
    try{
      const st = (window.store && typeof window.store.load === 'function') ? window.store.load() : (window.store || {});
      const info = qs('#dash-info');
      safeText(info, 'Stan załadowany. Orders: '+(st.orders||[]).length);
      const btnTest = document.getElementById('btn-test');
      if (btnTest) btnTest.addEventListener('click', ()=>{ alert('OK - store size: '+ (st.orders||[]).length); });
    }catch(e){ console.error('init app error',e); showBanner('Błąd inicjalizacji: '+(e.message||e)); }
  }

  // provide a minimal global nav(page) function expected by full app
  if (!window.nav || typeof window.nav !== 'function') {
    window.nav = function(page){
      // simple show/hide panels by id prefix p-
      try{
        console.log(`Przełączanie na zakładkę: ${page}`); // Logowanie do debugowania
        document.querySelectorAll('[id^="p-"]').forEach(p=>p.classList.add('hidden'));
        const el = qs('#p-'+(page||'dash'));
        console.log('Element do wyświetlenia:', el);
        if(el) {
          el.classList.remove('hidden');
          console.log('Usunięto klasę hidden z elementu');
        } else {
          console.error('Nie znaleziono elementu #p-' + (page||'dash'));
        }
      }catch(err){
        console.error('Błąd podczas przełączania zakładki:', err);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const quickModeButton = document.querySelector('[data-nav="split"]');
    if (quickModeButton) {
      console.log('Znaleziono przycisk Szybki tryb:', quickModeButton);
      quickModeButton.addEventListener('click', () => {
        console.log('Kliknięto przycisk Szybki tryb');
        window.nav('split');
      });
    } else {
      console.error('Nie znaleziono przycisku Szybki tryb');
    }
    initApp();
  });
})();
