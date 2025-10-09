// js/ui.js
const qs = (s) => document.querySelector(s);

function renderDash(state) {
  state = state || (typeof window!=='undefined' ? window.state : null);
  if(!state){ console.warn('[renderDash] brak state'); return; }
  try{
    const dOrders = qs('#dash-orders'); if (dOrders) dOrders.textContent = String((state.orders || []).length);
    const dProc = qs('#dash-proc'); if (dProc) dProc.textContent = String((state.processes || []).length);
    const dOps = qs('#dash-ops'); if (dOps) dOps.textContent = String((state.operationsCatalog || []).length);
  }catch(e){ console.warn('[renderDash] error', e&&e.message); }
}
// Eksport do globalnego scope (diagnostyka w index.html sprawdza window.renderDash)
if(typeof window!=='undefined' && !window.renderDash){ window.renderDash = renderDash; }

function populateProcessSelect(state) {
  const sel = qs('#o-proc');
  if (!sel) return;
  sel.innerHTML = '<option value="">Brak</option>';
  (state.processes || []).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function renderOrderPage(state) {
  state = state || (typeof window!=='undefined' ? window.state : null);
  if(!state){ console.warn('[renderOrderPage] brak state'); return; }
  try{
    populateProcessSelect(state);
    const host = qs('#ord-tb');
    if (!host) return;
    host.innerHTML = '';
    (state.orders || [])
      .slice()
      .reverse()
      .forEach((o) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${o.name || '-'}</td>
          <td>${o.client || '-'}</td>
          <td>${o.model || '-'}</td>
          <td>${o.quantity || '-'}</td>
          <td>${o.startDate || '-'}</td>
          <td>${o.endDate || '-'}</td>
          <td>${o.installDate || '-'}</td>
          <td>${((o.address || '') + ' ' + (o.postalCode || '')).trim() || '-'}</td>
          <td>
            <div class="row">
              <button class="btn" data-oed="${o.id}" type="button">Edytuj</button>
              <button class="btn red" data-od="${o.id}" type="button">Usuń</button>
            </div>
          </td>`;
        host.appendChild(tr);
      });
  }catch(e){ console.warn('[renderOrderPage] error', e&&e.message); }
}

function renderEmployees(state) {
  state = state || (typeof window!=='undefined' ? window.state : null);
  if(!state){ console.warn('[renderEmployees] brak state'); return; }
  try{
    const tb = qs('#emp-tb');
    if (!tb) return;
    tb.innerHTML = '';
    (state.employees || []).forEach((e) => {
      const tr = document.createElement('tr');
      const skills = (e.skills || []).join(';');
      const hours = (typeof e.hoursPerDay === 'number') ? Math.round(e.hoursPerDay*10)/10 : (e.hoursPerDay || 8);
      const cap = (typeof e.cap === 'number') ? Math.round(e.cap) : (e.cap || 100);
      tr.innerHTML = `
        <td>${e.name}</td>
        <td>${cap}%</td>
        <td>${hours}</td>
        <td>${skills}</td>
        <td>
          <button class="btn" data-emp-ed="${e.id}" type="button">Edytuj</button>
          <button class="btn red" data-emp-del="${e.id}" type="button">Usuń</button>
        </td>`;
      tb.appendChild(tr);
    });
  }catch(e){ console.warn('[renderEmployees] error', e&&e.message); }
}

function renderSettings(state) {
  const setMode = qs('#set-mode'); if (setMode) setMode.value = state.storage.mode;
  const setApp = qs('#set-appid'); if (setApp) setApp.value = state.storage.appId;
  const setUser = qs('#set-userid'); if (setUser) setUser.value = state.storage.userId;

  // jeśli puste, wypełnij textarea defaultowym JSON-em
  const cfgEl = qs('#set-fb');
  const current = state.storage.fbConfig || {};
  const text = Object.keys(current).length
    ? JSON.stringify(current, null, 2)
    : JSON.stringify({
        apiKey: "AIzaSyD93UqqsHWoAUBV7g8OVKAnajIfGDX_ZdY",
        authDomain: "doors-planner.firebaseapp.com",
        projectId: "doors-planner",
        storageBucket: "doors-planner.appspot.com",
        messagingSenderId: "513098608067",
        appId: "1:513098608067:web:1fe3855b3470ca7ef22176"
      }, null, 2);
  if (cfgEl) cfgEl.value = text;
}

function showEmployeeForm(employee = null) {
  // If the page already has a modal-based form (#emp-modal), use it.
  let modal = qs('#emp-modal');
  if (!modal) {
    // create a simple modal form if not present
    const modalHtml = `
      <div id="emp-modal" class="modal" style="display:flex;">
        <div class="modal-content">
          <h3 id="emp-modal-title">Dodaj pracownika</h3>
          <form id="emp-form">
            <input type="hidden" id="emp-id" />
            <div><label>Imię i nazwisko</label><input id="emp-name" required /></div>
            <div><label>Godziny h/d</label><input id="emp-hours" type="number" min="0" max="24" step="0.5" value="8" /></div>
            <div><label>Obciążenie (cap)</label><input id="emp-cap" type="number" min="0" max="100" value="100" /></div>
            <div><label>Kwalifikacje (oddziel średnikiem)</label><input id="emp-skills" /></div>
            <div style="margin-top:10px;"><button class="btn" type="submit">Zapisz</button> <button type="button" class="btn red" id="emp-cancel">Anuluj</button></div>
          </form>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = qs('#emp-modal');
    // ensure clicking overlay closes
    modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.style.display='none'; });
    const cancel = qs('#emp-cancel'); if (cancel) cancel.addEventListener('click', () => { modal.style.display='none'; });
  }
  // reset form
  const form = qs('#emp-form'); if (form) form.reset();
  // populate
  if (employee) {
    const titleEl = qs('#emp-modal-title'); if (titleEl) titleEl.textContent = 'Edytuj pracownika';
    const idEl = qs('#emp-id'); if (idEl) idEl.value = employee.id || '';
    const nameEl = qs('#emp-name'); if (nameEl) nameEl.value = employee.name || '';
    const hoursEl = qs('#emp-hours'); if (hoursEl) hoursEl.value = employee.hoursPerDay || 8;
    const capEl = qs('#emp-cap'); if (capEl) capEl.value = employee.cap || 100;
    const skillsEl = qs('#emp-skills'); if (skillsEl) skillsEl.value = (employee.skills || []).join(';');
  } else {
    const titleEl = qs('#emp-modal-title'); if (titleEl) titleEl.textContent = 'Dodaj pracownika';
    const idEl = qs('#emp-id'); if (idEl) idEl.value = '';
    const hoursEl = qs('#emp-hours'); if (hoursEl) hoursEl.value = 8;
    const capEl = qs('#emp-cap'); if (capEl) capEl.value = 100;
    const skillsEl = qs('#emp-skills'); if (skillsEl) skillsEl.value = '';
  }
  modal.style.display = 'flex';
}

function hideEmployeeForm() {
  const modal = qs('#emp-modal'); if (modal) modal.style.display='none';
}

function renderTaskMappings(state) {
  const host = qs('#task-mappings');
  if (!host) return;
  host.innerHTML = '';

  Object.keys(state.taskProcessMap || {}).forEach((taskId) => {
    const processId = state.taskProcessMap[taskId];
    const orderId = state.taskOrderMap[taskId];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${taskId}</td>
      <td>${processId || '-'}</td>
      <td>${orderId || '-'}</td>
    `;
    host.appendChild(tr);
  });
}

function renderClientWindow(state) {
  const clientWindow = qs('#client-window');
  if (!clientWindow) return;

  const client = state.selectedClient || {};
  clientWindow.innerHTML = `
    <div class="client-details">
      <h2>${client.name || 'Nieznany klient'}</h2>
      <p><strong>Adres:</strong> ${client.address || 'Brak danych'}</p>
      <p><strong>Email:</strong> ${client.email || 'Brak danych'}</p>
      <p><strong>Telefon:</strong> ${client.phone || 'Brak danych'}</p>
    </div>
  `;
}

function renderAll(state) {
  state = state || (typeof window!=='undefined' ? window.state : null);
  if(!state){ console.warn('[renderAll] brak state'); return; }
  renderDash(state);
  renderSettings(state);
  renderOrderPage(state);
  renderEmployees(state);
  renderTaskMappings(state);
  renderClientWindow(state);
}

function showNotification(message, type = 'info') {
  const infoEl = qs('#set-info');
  if (!infoEl) return;
  const typeMap = { success: '✅', error: '❌', info: 'ℹ️' };
  infoEl.className = 'muted';
  if (type === 'success') infoEl.classList.add('oktxt');
  if (type === 'error') infoEl.classList.add('err');
  infoEl.textContent = `${typeMap[type] || ''} ${message}`;
}

// Global export (legacy non-module environment)
if(typeof window!=='undefined'){
  if(!window.renderDash) window.renderDash = renderDash;
  window.showEmployeeForm = showEmployeeForm;
  window.hideEmployeeForm = hideEmployeeForm;
  window.renderAll = renderAll;
  window.showNotification = showNotification;
}
