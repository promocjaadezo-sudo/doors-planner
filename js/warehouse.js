// Kod magazynu przywrócony jako adapter do nowych funkcji

function ensureWarehouseArrays() {
  if (!Array.isArray(window.warehouseItems)) {
    window.warehouseItems = [];
  }
  if (!Array.isArray(window.warehouseTransactions)) {
    window.warehouseTransactions = [];
  }
  if (!Array.isArray(window.warehouseReservations)) {
    window.warehouseReservations = [];
  }
  if (!Array.isArray(window.materialTemplates)) {
    window.materialTemplates = [];
  }
}

function findWarehouseItemIndexById(itemId) {
  ensureWarehouseArrays();
  return window.warehouseItems.findIndex(item => item && item.id === itemId);
}

function findWarehouseItemById(itemId) {
  const index = findWarehouseItemIndexById(itemId);
  return index >= 0 ? { index, item: window.warehouseItems[index] } : { index: -1, item: null };
}

if (!window.simpleWarehouse) {
  window.simpleWarehouse = {
    render() {
      try {
        renderWarehouse();
      } catch (error) {
        console.warn('[warehouse] render fallback error', error);
      }
    },
    showAddItemModal() {
      try {
        showAddWarehouseModal();
      } catch (error) {
        console.warn('[warehouse] add item modal error', error);
      }
    },
    exportData() {
      try {
        exportWarehouseToCSV();
      } catch (error) {
        console.warn('[warehouse] export fallback error', error);
      }
    },
    editItem(itemId) {
      const { index } = findWarehouseItemById(itemId);
      if (index === -1) {
        alert('Nie znaleziono pozycji magazynowej do edycji.');
        return;
      }
      try {
        showEditWarehouseModal(index);
      } catch (error) {
        console.error('[warehouse] edit fallback error', error);
      }
    },
    adjustQuantity(itemId) {
      const { index, item } = findWarehouseItemById(itemId);
      if (index === -1 || !item) {
        alert('Nie znaleziono pozycji magazynowej do korekty.');
        return;
      }
      try {
        showAdjustQuantityModal(index);
      } catch (error) {
        console.error('[warehouse] adjust quantity error', error);
      }
    },
    deleteItem(itemId) {
      const { index } = findWarehouseItemById(itemId);
      if (index === -1) {
        alert('Nie znaleziono pozycji magazynowej do usunięcia.');
        return;
      }
      try {
        deleteWarehouseItem(index);
      } catch (error) {
        console.error('[warehouse] delete fallback error', error);
      }
    }
  };
}

function setupWarehouseButtons() {
  console.log('[warehouse] setupWarehouseButtons invoked');

  ensureWarehouseArrays();

  const addBtn = document.getElementById('wh-add');
  if (addBtn) {
    addBtn.onclick = null;
    addBtn.addEventListener('click', (event) => {
      if (window.disableGlobalClickDelegation) {
        event.preventDefault();
        event.stopPropagation();
      }
      addWarehouseItem();
    });
  } else {
    console.warn('[warehouse] add button not found');
  }

  const searchInput = document.getElementById('wh-search');
  if (searchInput && !searchInput.dataset.whBound) {
    searchInput.dataset.whBound = 'true';
    searchInput.addEventListener('input', () => {
      renderWarehouse();
    });
  }

  updateShoppingListBadge();
}

// Automatyczne renderowanie magazynu
setTimeout(() => {
  if (window.simpleWarehouse) {
    console.log('Magazyn: Automatyczne renderowanie listy pozycji');
    window.simpleWarehouse.render();
  }
}, 1500);

// Jednorazowa inicjalizacja przy wejściu na zakładkę magazynu
let __warehouseInitialized = false;
function initWarehouse(){
  if(__warehouseInitialized){
    // Przywracamy normalną delegację kliknięć przy powrocie
    window.restoreNormalClickDelegation();
    // odśwież widok przy powrocie
    if(window.simpleWarehouse){
      try { window.simpleWarehouse.render(); } catch(e){ console.warn('[warehouse] re-render error', e); }
    }
    return;
  }
  console.log('[warehouse] initializing...');
  // Przywracamy normalną delegację kliknięć przy pierwszej inicjalizacji
  window.restoreNormalClickDelegation();
  
  // Upewnij się, że dane magazynu są załadowane
  if (!window.warehouseItems) {
    loadWarehouseFromStorage();
  }
  
  // Synchronizuj zadania magazynowe ze zleceniami
  if (typeof window.syncWarehouseTasks === 'function') {
    window.syncWarehouseTasks();
  }
  
  // Aktualizuj badge zadań
  if (typeof window.updateTasksBadge === 'function') {
    window.updateTasksBadge();
  }
  
  // upewnij się że sekcja jest widoczna (usuwamy ewentualnie hidden dopiero po listenerach)
  const section = document.getElementById('p-wh');
  if(section) section.classList.remove('hidden');
  // konfiguracja przycisków
  try { setupWarehouseButtons(); } catch(e){ console.warn('[warehouse] setup buttons error', e); }
  // pierwsze renderowanie
  if(window.simpleWarehouse){
    try { window.simpleWarehouse.render(); } catch(e){ console.warn('[warehouse] first render error', e); }
  } else {
    console.warn('[warehouse] simpleWarehouse not yet ready, retry in 500ms');
    setTimeout(()=>{
      if(window.simpleWarehouse){
        try { window.simpleWarehouse.render(); } catch(e){ console.warn('[warehouse] delayed render error', e); }
      }
    },500);
  }
  __warehouseInitialized = true;
  console.log('[warehouse] initialized');
}

// Globalne funkcje pomocnicze dla przycisków
function showAddItemModal() {
  showAddWarehouseModal();
}

function exportWarehouseData() {
  exportWarehouseToCSV();
}

// Kod DOMContentLoaded dla magazynu usunięty

function saveWarehouseToStorage() {
  localStorage.setItem('warehouseItems', JSON.stringify(window.warehouseItems));
  localStorage.setItem('warehouseTransactions', JSON.stringify(window.warehouseTransactions || []));
  localStorage.setItem('warehouseReservations', JSON.stringify(window.warehouseReservations || []));
  localStorage.setItem('materialTemplates', JSON.stringify(window.materialTemplates || []));
}

function loadWarehouseFromStorage() {
  const stored = localStorage.getItem('warehouseItems');
  if (stored) {
    window.warehouseItems = JSON.parse(stored);
  } else {
    window.warehouseItems = [];
  }
  
  // Historia transakcji (PZ/WZ)
  const transactions = localStorage.getItem('warehouseTransactions');
  if (transactions) {
    window.warehouseTransactions = JSON.parse(transactions);
  } else {
    window.warehouseTransactions = [];
  }
  
  // Rezerwacje pod zlecenia
  const reservations = localStorage.getItem('warehouseReservations');
  if (reservations) {
    window.warehouseReservations = JSON.parse(reservations);
  } else {
    window.warehouseReservations = [];
  }
  
  // Szablony materiałowe
  const templates = localStorage.getItem('materialTemplates');
  if (templates) {
    window.materialTemplates = JSON.parse(templates);
  } else {
    window.materialTemplates = [];
  }
  
  // Lista zakupów
  const shoppingList = localStorage.getItem('shoppingList');
  if (shoppingList) {
    window.shoppingList = JSON.parse(shoppingList);
  } else {
    window.shoppingList = [];
  }
  
  // Zaktualizuj badge listy zakupów
  updateShoppingListBadge();
}

// Domyślne ustawienie filtra pozycji do zamówienia
if (typeof window.showOnlyLowStock === 'undefined') {
  window.showOnlyLowStock = false;
}

// Eksport listy pozycji magazynowych do CSV
function exportWarehouseToCSV() {
  ensureWarehouseArrays();

  if (!window.warehouseItems || window.warehouseItems.length === 0) {
    alert('Brak pozycji do eksportu');
    return;
  }

  const csvContent = 'Nazwa,Ilość,Jednostka,Cena,Stan minimalny\n' +
    window.warehouseItems.map(item =>
      `"${item.name}",${item.quantity},"${item.unit}",${item.price},${item.minStock || 0}`
    ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'magazyn.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.exportWarehouseToCSV = exportWarehouseToCSV;

// Przełącz filtr pozycji wymagających zamówienia
window.toggleOrderFilter = function toggleOrderFilter() {
  window.showOnlyLowStock = !window.showOnlyLowStock;
  const button = document.querySelector('button[onclick="toggleOrderFilter()"]');
  if (button) {
    button.textContent = window.showOnlyLowStock ? '🔴 Do zamówienia (WŁĄCZONE)' : '🔴 Do zamówienia';
    button.className = window.showOnlyLowStock ? 'btn red' : 'btn orange';
  }
  renderWarehouse();
};

// Renderowanie widoku pozycji magazynowych
function renderWarehouse() {
  ensureWarehouseArrays();

  const list = document.getElementById('wh-list');
  if (!list) return;

  const searchTerm = document.getElementById('wh-search')?.value.toLowerCase() || '';
  let filteredItems = window.warehouseItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  );

  if (window.showOnlyLowStock) {
    filteredItems = filteredItems.filter(item =>
      item.minStock && item.quantity <= item.minStock
    );
  }

  if (filteredItems.length === 0) {
    const message = window.showOnlyLowStock
      ? 'Brak pozycji do zamówienia (wszystkie mają wystarczający stan).'
      : 'Brak pozycji spełniających kryteria wyszukiwania.';
    list.innerHTML = `<div style="text-align:center;padding:40px;color:#999">${message}</div>`;
    return;
  }

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;background:#2c3e50;box-shadow:0 1px 3px rgba(0,0,0,0.3)">
      <thead>
        <tr style="background:#34495e;border-bottom:2px solid #1a252f">
          <th style="padding:12px;text-align:left;font-weight:700;font-size:14px;color:#ffffff !important">Nazwa</th>
          <th style="padding:12px;text-align:center;font-weight:700;font-size:14px;color:#ffffff !important;width:100px">Ilość</th>
          <th style="padding:12px;text-align:center;font-weight:700;font-size:14px;color:#ffffff !important;width:80px">Jedn.</th>
          <th style="padding:12px;text-align:right;font-weight:700;font-size:14px;color:#ffffff !important;width:100px">Cena (zł)</th>
          <th style="padding:12px;text-align:center;font-weight:700;font-size:14px;color:#ffffff !important;width:80px">Min</th>
          <th style="padding:12px;text-align:left;font-weight:700;font-size:14px;color:#ffffff !important;width:180px">📍 Lokalizacja</th>
          <th style="padding:12px;text-align:center;font-weight:700;font-size:14px;color:#ffffff !important;width:180px">Akcje</th>
        </tr>
      </thead>
      <tbody>
        ${filteredItems.map((item, index) => {
          const isLowStock = item.minStock && item.quantity <= item.minStock;
          const rowStyle = isLowStock ? 'background:#c0392b' : (index % 2 === 0 ? 'background:#34495e' : 'background:#2c3e50');

          let locationStr = '-';
          if (item.location && (item.location.shelf || item.location.rack || item.location.sector)) {
            const parts = [];
            if (item.location.shelf) parts.push(`R:${item.location.shelf}`);
            if (item.location.rack) parts.push(`P:${item.location.rack}`);
            if (item.location.sector) parts.push(`S:${item.location.sector}`);
            locationStr = parts.join(' • ');
          }

          const itemIndex = window.warehouseItems.indexOf(item);

          return `
            <tr style="${rowStyle};border-bottom:1px solid #1a252f">
              <td style="padding:12px">
                <div style="font-weight:600;font-size:15px;color:#ffffff !important">${item.name}</div>
                ${isLowStock ? '<div style="font-size:12px;color:#ffeb3b !important;font-weight:700;margin-top:2px">⚠️ DO ZAMÓWIENIA</div>' : ''}
              </td>
              <td style="padding:12px;text-align:center;font-weight:700;font-size:15px;color:${isLowStock ? '#ffeb3b' : '#ffffff'} !important">${item.quantity}</td>
              <td style="padding:12px;text-align:center;font-size:14px;color:#ffffff !important">${item.unit || '-'}</td>
              <td style="padding:12px;text-align:right;font-weight:600;font-size:14px;color:#ffffff !important">${(item.price || 0).toFixed(2)}</td>
              <td style="padding:12px;text-align:center;font-size:14px;color:#ffffff !important">${item.minStock || '-'}</td>
              <td style="padding:12px;font-size:14px;color:#ffffff !important">${locationStr}</td>
              <td style="padding:12px;text-align:center">
                <div style="display:flex;gap:4px;justify-content:center">
                  <button class="btn small" onclick="editWarehouseItem(${itemIndex})" style="padding:6px 12px;font-size:13px">Edytuj</button>
                  <button class="btn red small" onclick="deleteWarehouseItem(${itemIndex})" style="padding:6px 12px;font-size:13px">Usuń</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  list.innerHTML = tableHtml;
}

window.renderWarehouse = renderWarehouse;

// Napraw checklisty w zleceniach - znajdź itemId po nazwie materiału
window.fixChecklistItemIds = function() {
  const state = window.STATE || JSON.parse(localStorage.getItem('production_planner_state') || '{}');
  const orders = state.orders || [];
  
  // Wczytaj magazyn
  const warehouseItems = JSON.parse(localStorage.getItem('warehouseItems') || '[]');
  
  let fixedCount = 0;
  let totalChecked = 0;
  
  orders.forEach(order => {
    if (!order.materialChecklist) return;
    
    order.materialChecklist.forEach(item => {
      totalChecked++;
      
      // Jeśli itemId już istnieje, pomiń
      if (item.itemId) return;
      
      // Znajdź w magazynie po nazwie
      const warehouseItem = warehouseItems.find(w => 
        w.name.toLowerCase().trim() === item.itemName.toLowerCase().trim()
      );
      
      if (warehouseItem) {
        item.itemId = warehouseItem.id;
        fixedCount++;
        console.log(`✅ Naprawiono: ${item.itemName} → ${warehouseItem.id}`);
      } else {
        console.warn(`⚠️ Nie znaleziono w magazynie: ${item.itemName}`);
      }
    });
  });
  
  // Zapisz stan
  if (fixedCount > 0) {
    state.orders = orders;
    window.STATE = state;
    localStorage.setItem('production_planner_state', JSON.stringify(state));
  }
  
  console.log(`🔧 Sprawdzono ${totalChecked} pozycji w checklistach, naprawiono ${fixedCount}`);
  alert(`Naprawiono ${fixedCount} pozycji w checklistach zleceń.\n\nTeraz uruchom window.cleanupShoppingList() żeby usunąć stare pozycje z listy zakupów.`);
};

// Uruchom wszystkie naprawy ID w systemie
window.fixAllItemIds = function() {
  console.log('🚀 Rozpoczynam kompleksową naprawę systemu ID...');
  
  try {
    // 1. Napraw istniejące pozycje w magazynie
    console.log('\n📦 Krok 1: Naprawa ID w magazynie...');
    window.fixWarehouseIds();
    
    // 2. Napraw szablony materiałowe
    console.log('\n📋 Krok 2: Naprawa szablonów materiałowych...');
    window.fixTemplateItemIds();
    
    // 3. Napraw checklisty w zleceniach
    console.log('\n✅ Krok 3: Naprawa checklist w zleceniach...');
    window.fixChecklistItemIds();
    
    // 4. Wyczyść nieprawidłowe pozycje z listy zakupów
    console.log('\n🧹 Krok 4: Czyszczenie listy zakupów...');
    window.cleanupShoppingList();
    
    // 5. Sprawdź diagnozę
    console.log('\n🔍 Krok 5: Końcowa diagnoza systemu...');
    setTimeout(() => {
      window.diagnoseItemIdProblem();
      console.log('\n🎉 Wszystkie naprawy zostały zakończone!');
      alert('🎉 Wszystkie naprawy systemu ID zostały zakończone!\n\nOdśwież stronę (F5) aby zobaczyć efekty.');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Błąd podczas napraw:', error);
    alert('❌ Wystąpił błąd podczas napraw: ' + error.message);
  }
};

// Diagnostyka problemu z itemId
window.diagnoseItemIdProblem = function() {
  console.log('🔍 DIAGNOZA PROBLEMU Z ITEMID');
  console.log('=====================================');
  
  // 1. Sprawdź szablony materiałowe
  const templates = window.materialTemplates || [];
  console.log(`📋 SZABLONY (${templates.length}):`);
  templates.forEach((tmpl, idx) => {
    console.log(`  ${idx + 1}. "${tmpl.name}" (${tmpl.materials?.length || 0} materiałów):`);
    (tmpl.materials || []).forEach((mat, matIdx) => {
      const status = mat.itemId ? '✅' : '❌';
      console.log(`    ${matIdx + 1}. ${status} ${mat.itemName}: itemId=${mat.itemId}`);
    });
  });
  
  // 2. Sprawdź checklisty w zleceniach
  const state = window.STATE || JSON.parse(localStorage.getItem('production_planner_state') || '{}');
  const orders = state.orders || [];
  console.log(`\n📝 CHECKLISTY W ZLECENiach (${orders.filter(o => o.materialChecklist).length}):`);
  orders.forEach(order => {
    if (!order.materialChecklist) return;
    console.log(`  Zlecenie "${order.name}" (${order.materialChecklist.length} pozycji):`);
    order.materialChecklist.forEach((item, idx) => {
      const status = item.itemId ? '✅' : '❌';
      console.log(`    ${idx + 1}. ${status} ${item.itemName}: itemId=${item.itemId}`);
    });
  });
  
  // 3. Sprawdź listę zakupów
  const shoppingList = window.shoppingList || [];
  const pending = shoppingList.filter(item => item.status === 'pending');
  console.log(`\n🛒 LISTA ZAKUPÓW (${shoppingList.length} łącznie, ${pending.length} oczekujących):`);
  pending.forEach((item, idx) => {
    const status = item.itemId ? '✅' : '❌';
    console.log(`    ${idx + 1}. ${status} ${item.itemName}: itemId=${item.itemId}, order=${item.orderName}`);
  });
  
  // 4. Sprawdź magazyn
  const warehouseItems = window.warehouseItems || [];
  console.log(`\n📦 MAGAZYN (${warehouseItems.length} pozycji):`);
  warehouseItems.forEach((item, idx) => {
    console.log(`    ${idx + 1}. ${item.name}: id=${item.id}`);
  });
  
  console.log('\n=====================================');
  console.log('🔍 KONIEC DIAGNOZY');
};

// Napraw istniejące pozycje w magazynie - dodaj brakujące ID
window.fixWarehouseIds = function() {
  const warehouseItems = window.warehouseItems || [];
  let fixedCount = 0;
  
  warehouseItems.forEach(item => {
    if (!item.id) {
      item.id = generateId();
      fixedCount++;
      console.log(`✅ Dodano ID dla: ${item.name} → ${item.id}`);
    }
  });
  
  if (fixedCount > 0) {
    localStorage.setItem('warehouseItems', JSON.stringify(window.warehouseItems));
    console.log(`🔧 Naprawiono ${fixedCount} pozycji w magazynie`);
  } else {
    console.log(`✅ Wszystkie pozycje w magazynie mają ID`);
  }
  
  alert(`Naprawiono ${fixedCount} pozycji w magazynie.\n\nTeraz uruchom window.fixTemplateItemIds() żeby naprawić szablony.`);
};

// Napraw szablony materiałowe - znajdź itemId po nazwie materiału
window.fixTemplateItemIds = function() {
  const templates = window.materialTemplates || [];
  const warehouseItems = window.warehouseItems || [];
  
  let fixedCount = 0;
  let totalChecked = 0;
  
  templates.forEach(template => {
    if (!template.materials) return;
    
    template.materials.forEach(material => {
      totalChecked++;
      
      // Jeśli itemId już istnieje i jest prawidłowy, pomiń
      if (material.itemId && warehouseItems.find(w => w.id === material.itemId)) return;
      
      // Znajdź w magazynie po nazwie
      const warehouseItem = warehouseItems.find(w => 
        w.name.toLowerCase().trim() === material.itemName.toLowerCase().trim()
      );
      
      if (warehouseItem) {
        material.itemId = warehouseItem.id;
        fixedCount++;
        console.log(`✅ Naprawiono szablon "${template.name}": ${material.itemName} → ${warehouseItem.id}`);
      } else {
        console.warn(`⚠️ Nie znaleziono w magazynie dla szablonu "${template.name}": ${material.itemName}`);
      }
    });
  });
  
  // Zapisz szablony
  if (fixedCount > 0) {
    localStorage.setItem('materialTemplates', JSON.stringify(window.materialTemplates));
  }
  
  console.log(`🔧 Sprawdzono ${totalChecked} materiałów w szablonach, naprawiono ${fixedCount}`);
  alert(`Naprawiono ${fixedCount} materiałów w szablonach.\n\nTeraz uruchom window.fixChecklistItemIds() żeby naprawić checklisty w zleceniach.`);
};

// Wyczyść nieprawidłowe pozycje z listy zakupów (bez itemId)
window.cleanupShoppingList = function() {
  if (!window.shoppingList) return;
  
  const before = window.shoppingList.length;
  window.shoppingList = window.shoppingList.filter(item => item.itemId);
  const after = window.shoppingList.length;
  
  localStorage.setItem('shoppingList', JSON.stringify(window.shoppingList));
  updateShoppingListBadge();
  
  console.log(`🧹 Wyczyszczono listę zakupów: ${before - after} pozycji bez itemId usuniętych`);
  alert(`Wyczyszczono ${before - after} nieprawidłowych pozycji z listy zakupów.\n\nOdśwież stronę (F5) aby zobaczyć zmiany.`);
};

// Aktualizuj badge listy zakupów
function updateShoppingListBadge() {
  const badge = document.getElementById('shopping-badge');
  if (!badge) return;
  
  if (!window.shoppingList) {
    window.shoppingList = [];
  }
  
  // Zlicz unikalne materiały (itemId) z statusem pending
  const pending = window.shoppingList.filter(item => item.status === 'pending');
  const uniqueItems = new Set(pending.map(item => item.itemId));
  const pendingCount = uniqueItems.size;
  
  console.log('🔢 Badge update:', { 
    totalPending: pending.length, 
    uniqueMaterials: pendingCount,
    itemIds: Array.from(uniqueItems)
  });
  
  if (pendingCount > 0) {
    badge.textContent = pendingCount;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// Przełączanie zakładek magazynu
function switchWarehouseTab(tab) {
  // Ukryj wszystkie widoki
  const views = ['items', 'transactions', 'reservations', 'tasks', 'templates'];
  views.forEach(v => {
    const viewEl = document.getElementById(`wh-view-${v}`);
    const tabBtn = document.getElementById(`wh-tab-${v}`);
    if (viewEl) viewEl.classList.add('hidden');
    if (tabBtn) tabBtn.classList.remove('amber');
  });
  
  // Pokaż wybrany widok
  const activeView = document.getElementById(`wh-view-${tab}`);
  const activeBtn = document.getElementById(`wh-tab-${tab}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) activeBtn.classList.add('amber');
  
  // Renderuj odpowiednią zawartość
  if (tab === 'items') {
    renderWarehouse();
  } else if (tab === 'transactions') {
    renderTransactions();
  } else if (tab === 'reservations') {
    renderReservations();
  } else if (tab === 'tasks') {
    renderWarehouseTasks();
  } else if (tab === 'templates') {
    renderTemplates();
  }
}

// Udostępnij globalnie
window.switchWarehouseTab = switchWarehouseTab;

// Generowanie unikalnego ID
function generateId() {
  return 'wh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showEditWarehouseModal(index) {
  const item = window.warehouseItems[index];
  if (!item) return;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Nazwa pozycji:</label>
        <input type="text" id="wh-edit-modal-name" value="${item.name}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Ilość:</label>
          <input type="number" id="wh-edit-modal-quantity" value="${item.quantity}" min="0" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Jednostka:</label>
          <select id="wh-edit-modal-unit" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="szt" ${item.unit === 'szt' ? 'selected' : ''}>szt</option>
            <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
            <option value="m" ${item.unit === 'm' ? 'selected' : ''}>m</option>
            <option value="m²" ${item.unit === 'm²' ? 'selected' : ''}>m²</option>
            <option value="m³" ${item.unit === 'm³' ? 'selected' : ''}>m³</option>
            <option value="l" ${item.unit === 'l' ? 'selected' : ''}>l</option>
            <option value="opak" ${item.unit === 'opak' ? 'selected' : ''}>opak</option>
          </select>
        </div>
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Cena (PLN):</label>
        <input type="number" id="wh-edit-modal-price" value="${item.price}" min="0" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Stan minimalny:</label>
        <input type="number" id="wh-edit-modal-min-stock" value="${item.minStock || 0}" min="0" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <small style="color: #666; font-size: 12px;">Poniżej tego poziomu pozycja będzie oznaczona do zamówienia</small>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0">
      <div style="display:flex;gap:16px;">
        <div style="flex:1">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">📍 Regał:</label>
          <input type="text" id="wh-edit-modal-shelf" value="${item.location?.shelf || ''}" placeholder="np. R1" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex:1">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Półka:</label>
          <input type="text" id="wh-edit-modal-rack" value="${item.location?.rack || ''}" placeholder="np. P3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex:1">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Sektor:</label>
          <input type="text" id="wh-edit-modal-sector" value="${item.location?.sector || ''}" placeholder="np. A" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
      </div>
    </div>
  `;

  showModal('✏️ Edytuj pozycję', content, [
    {
      text: 'Anuluj',
      action: () => {}
    },
    {
      text: 'Zapisz',
      action: () => {
        const name = document.getElementById('wh-edit-modal-name').value.trim();
        const quantity = parseFloat(document.getElementById('wh-edit-modal-quantity').value);
        const unit = document.getElementById('wh-edit-modal-unit').value;
        const price = parseFloat(document.getElementById('wh-edit-modal-price').value);
        const minStock = parseFloat(document.getElementById('wh-edit-modal-min-stock').value) || 0;

        if (!name) {
          alert('Nazwa pozycji jest wymagana!');
          return;
        }

        if (isNaN(quantity) || quantity < 0) {
          alert('Podaj prawidłową ilość!');
          return;
        }

        if (isNaN(price) || price < 0) {
          alert('Podaj prawidłową cenę!');
          return;
        }

        if (isNaN(minStock) || minStock < 0) {
          alert('Podaj prawidłowy stan minimalny!');
          return;
        }

        const shelf = document.getElementById('wh-edit-modal-shelf').value.trim();
        const rack = document.getElementById('wh-edit-modal-rack').value.trim();
        const sector = document.getElementById('wh-edit-modal-sector').value.trim();

        window.warehouseItems[index] = { 
          name, 
          quantity, 
          unit, 
          price, 
          minStock,
          location: { shelf, rack, sector }
        };
        saveWarehouseToStorage();
        renderWarehouse();
      }
    }
  ]);
}

// Rozszerzony magazyn z edycją
function editWarehouseItem(index) {
  showEditWarehouseModal(index);
}

function deleteWarehouseItem(index) {
  if (confirm('Usunąć pozycję?')) {
    window.warehouseItems.splice(index, 1);
    saveWarehouseToStorage();
    renderWarehouse();
  }
}

function showAdjustQuantityModal(index) {
  ensureWarehouseArrays();

  const item = window.warehouseItems[index];
  if (!item) {
    alert('Nie znaleziono pozycji magazynowej do korekty.');
    return;
  }

  const modalIds = {
    quantity: `wh-adjust-quantity-${index}`,
    note: `wh-adjust-note-${index}`
  };

  const content = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:#0f172a0d;padding:12px;border-radius:8px;line-height:1.6">
        <div style="font-weight:600;font-size:16px;">${item.name}</div>
        <div style="color:#64748b;font-size:14px;">Aktualny stan: <strong>${item.quantity} ${item.unit}</strong></div>
        <div style="color:#64748b;font-size:14px;">Stan minimalny: ${item.minStock || 0} ${item.unit}</div>
      </div>
      <div>
        <label style="display:block;margin-bottom:4px;font-weight:bold;">Nowy stan magazynowy:</label>
        <input type="number" id="${modalIds.quantity}" value="${item.quantity}" min="0" step="0.01" style="width:100%;padding:8px;border:1px solid #cbd5f5;border-radius:6px;">
        <small style="color:#64748b;font-size:12px;display:block;margin-top:4px;">Podaj stan docelowy po korekcie.</small>
      </div>
      <div>
        <label style="display:block;margin-bottom:4px;font-weight:bold;">Uwagi (opcjonalnie):</label>
        <textarea id="${modalIds.note}" rows="2" placeholder="np. Inwentaryzacja, korekta ręczna" style="width:100%;padding:8px;border:1px solid #cbd5f5;border-radius:6px;"></textarea>
      </div>
    </div>
  `;

  showModal('📊 Korekta stanu magazynowego', content, [
    { text: 'Anuluj', action: () => {} },
    {
      text: 'Zapisz korektę',
      action: () => {
        const targetValue = parseFloat(document.getElementById(modalIds.quantity).value);
        const note = document.getElementById(modalIds.note).value.trim();

        if (Number.isNaN(targetValue) || targetValue < 0) {
          alert('Podaj poprawny docelowy stan magazynowy (≥ 0).');
          return;
        }

        const delta = parseFloat((targetValue - item.quantity).toFixed(2));
        if (Math.abs(delta) < 0.0001) {
          alert('Brak zmian — stan magazynowy pozostaje bez aktualizacji.');
          return;
        }

        const type = delta > 0 ? 'in' : 'out';
        const quantity = Math.abs(delta);

        item.quantity = targetValue;

        const transaction = {
          id: generateId(),
          type,
          itemId: index,
          itemName: item.name,
          quantity,
          unit: item.unit,
          person: 'System',
          notes: note ? `Korekta: ${note}` : 'Korekta stanu magazynowego',
          date: new Date().toISOString(),
          timestamp: Date.now(),
          correction: true,
          previousQuantity: parseFloat((targetValue - delta).toFixed(2)),
          newQuantity: targetValue
        };

        window.warehouseTransactions.push(transaction);
        saveWarehouseToStorage();
        renderWarehouse();
        renderTransactions();

        alert(`✅ Korekta zapisana. Zmiana: ${delta > 0 ? '+' : '-'}${quantity} ${item.unit}.`);
      }
    }
  ]);
}

function showAddWarehouseModal() {
  const content = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Nazwa pozycji:</label>
        <input type="text" id="wh-modal-name" placeholder="np. Deska sosnowa 2x4" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Ilość:</label>
          <input type="number" id="wh-modal-quantity" placeholder="0" min="0" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Jednostka:</label>
          <select id="wh-modal-unit" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="szt">szt</option>
            <option value="kg">kg</option>
            <option value="m">m</option>
            <option value="m²">m²</option>
            <option value="m³">m³</option>
            <option value="l">l</option>
            <option value="opak">opak</option>
          </select>
        </div>
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Cena (PLN):</label>
        <input type="number" id="wh-modal-price" placeholder="0.00" min="0" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Stan minimalny:</label>
        <input type="number" id="wh-modal-min-stock" placeholder="0" min="0" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <small style="color: #666; font-size: 12px;">Poniżej tego poziomu pozycja będzie oznaczona do zamówienia</small>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0">
      <div style="display:flex;gap:16px;">
        <div style="flex:1">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">📍 Regał:</label>
          <input type="text" id="wh-modal-shelf" placeholder="np. R1" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex:1">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Półka:</label>
          <input type="text" id="wh-modal-rack" placeholder="np. P3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex:1">
          <label style="display: block; margin-bottom: 4px; font-weight: bold;">Sektor:</label>
          <input type="text" id="wh-modal-sector" placeholder="np. A" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
      </div>
    </div>
  `;

  showModal('➕ Dodaj pozycję do magazynu', content, [
    {
      text: 'Anuluj',
      action: () => {}
    },
    {
      text: 'Dodaj',
      action: () => {
        const name = document.getElementById('wh-modal-name').value.trim();
        const quantity = parseFloat(document.getElementById('wh-modal-quantity').value);
        const unit = document.getElementById('wh-modal-unit').value;
        const price = parseFloat(document.getElementById('wh-modal-price').value);
        const minStock = parseFloat(document.getElementById('wh-modal-min-stock').value) || 0;

        if (!name) {
          alert('Nazwa pozycji jest wymagana!');
          return;
        }

        if (isNaN(quantity) || quantity < 0) {
          alert('Podaj prawidłową ilość!');
          return;
        }

        if (isNaN(price) || price < 0) {
          alert('Podaj prawidłową cenę!');
          return;
        }

        if (isNaN(minStock) || minStock < 0) {
          alert('Podaj prawidłowy stan minimalny!');
          return;
        }

        const shelf = document.getElementById('wh-modal-shelf').value.trim();
        const rack = document.getElementById('wh-modal-rack').value.trim();
        const sector = document.getElementById('wh-modal-sector').value.trim();

        window.warehouseItems.push({ 
          id: generateId(),
          name, 
          quantity, 
          unit, 
          price, 
          minStock,
          location: { shelf, rack, sector }
        });
        saveWarehouseToStorage();
        renderWarehouse();
      }
    }
  ]);
}

function addWarehouseItem() {
  showAddWarehouseModal();
}

// ===== TRANSAKCJE MAGAZYNOWE (PZ/WZ) =====

function showTransactionModal(type) {
  const title = type === 'in' ? '📥 Przyjęcie towaru (PZ)' : '📤 Wydanie towaru (WZ)';
  const action = type === 'in' ? 'Przyjmij' : 'Wydaj';
  
  // Lista pozycji do wyboru
  const itemsOptions = window.warehouseItems.map((item, idx) => 
    `<option value="${idx}">${item.name} (stan: ${item.quantity} ${item.unit})</option>`
  ).join('');
  
  const content = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Pozycja:</label>
        <select id="wh-trans-item" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          ${itemsOptions}
        </select>
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Ilość:</label>
        <input type="number" id="wh-trans-quantity" min="0.01" step="0.01" placeholder="np. 10" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Osoba odpowiedzialna:</label>
        <input type="text" id="wh-trans-person" placeholder="np. Jan Kowalski" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Uwagi:</label>
        <textarea id="wh-trans-notes" placeholder="Opcjonalne uwagi..." rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
      </div>
    </div>
  `;

  showModal(title, content, [
    { text: 'Anuluj', action: () => {} },
    {
      text: action,
      action: () => {
        const itemIdx = parseInt(document.getElementById('wh-trans-item').value);
        const quantity = parseFloat(document.getElementById('wh-trans-quantity').value);
        const person = document.getElementById('wh-trans-person').value.trim();
        const notes = document.getElementById('wh-trans-notes').value.trim();

        if (isNaN(itemIdx) || isNaN(quantity) || quantity <= 0) {
          alert('Podaj poprawną ilość');
          return;
        }

        const item = window.warehouseItems[itemIdx];
        if (!item) {
          alert('Nie znaleziono pozycji');
          return;
        }

        // Dla wydania - sprawdź czy jest wystarczająca ilość
        if (type === 'out' && item.quantity < quantity) {
          if (!confirm(`Niewystarczający stan! Dostępne: ${item.quantity} ${item.unit}. Kontynuować?`)) {
            return;
          }
        }

        // Utwórz transakcję
        const transaction = {
          id: generateId(),
          type: type, // 'in' lub 'out'
          itemId: itemIdx,
          itemName: item.name,
          quantity: quantity,
          unit: item.unit,
          person: person || '—',
          notes: notes,
          date: new Date().toISOString(),
          timestamp: Date.now()
        };

        // Zaktualizuj stan magazynowy
        if (type === 'in') {
          item.quantity += quantity;
        } else {
          item.quantity -= quantity;
        }

        // Zapisz transakcję
        if (!window.warehouseTransactions) {
          window.warehouseTransactions = [];
        }
        window.warehouseTransactions.push(transaction);

        saveWarehouseToStorage();
        alert(`✅ ${type === 'in' ? 'Przyjęto' : 'Wydano'} ${quantity} ${item.unit} - ${item.name}`);
        renderTransactions();
        renderWarehouse(); // Odśwież też listę pozycji
      }
    }
  ]);
}

function renderTransactions() {
  const list = document.getElementById('wh-transactions-list');
  if (!list) return;

  const filter = document.getElementById('wh-transaction-filter')?.value || '';
  let transactions = (window.warehouseTransactions || []).slice().reverse(); // Najnowsze na górze

  if (filter) {
    transactions = transactions.filter(t => t.type === filter);
  }

  if (transactions.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#999">Brak transakcji</div>';
    return;
  }

  list.innerHTML = transactions.map(trans => {
    const date = new Date(trans.date);
    const dateStr = date.toLocaleDateString('pl-PL');
    const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const typeIcon = trans.type === 'in' ? '📥' : '📤';
    const typeLabel = trans.type === 'in' ? 'Przyjęcie (PZ)' : 'Wydanie (WZ)';
    const typeColor = trans.type === 'in' ? '#10b981' : '#f59e0b';

    return `
      <div class="card" style="margin-bottom:8px;border-left:4px solid ${typeColor}">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <div style="font-weight:600;margin-bottom:4px">
              ${typeIcon} ${typeLabel}
            </div>
            <div style="font-size:14px;color:#64748b">
              <strong>${trans.itemName}</strong> - ${trans.quantity} ${trans.unit}
            </div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">
              ${dateStr} ${timeStr} • Osoba: ${trans.person}
            </div>
            ${trans.notes ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;font-style:italic">${trans.notes}</div>` : ''}
          </div>
          <button class="btn red small" onclick="deleteTransaction('${trans.id}')">Usuń</button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteTransaction(transId) {
  if (!confirm('Usunąć transakcję? To nie cofnie zmian w stanie magazynowym!')) {
    return;
  }
  window.warehouseTransactions = window.warehouseTransactions.filter(t => t.id !== transId);
  saveWarehouseToStorage();
  renderTransactions();
}

// ===== REZERWACJE POD ZLECENIA =====

// Aktualizacja listy materiałów po wyborze zlecenia
function updateMaterialsForOrder() {
  const orderSelect = document.getElementById('wh-res-order');
  const itemSelect = document.getElementById('wh-res-item');
  const orderId = orderSelect.value;
  
  if (!orderId) {
    itemSelect.innerHTML = '<option value="">— najpierw wybierz zlecenie —</option>';
    return;
  }
  
  const order = (state.orders || []).find(o => o.id === orderId);
  
  if (!order || !order.materialChecklist || order.materialChecklist.length === 0) {
    itemSelect.innerHTML = '<option value="">— to zlecenie nie ma checklisty materiałów —</option>';
    return;
  }
  
  // Pokaż tylko materiały z checklisty zlecenia
  const options = order.materialChecklist.map((item, idx) => {
    const warehouseItem = (window.warehouseItems || []).find(w => w.id === item.itemId);
    const available = warehouseItem ? warehouseItem.quantity : 0;
    const checkMark = item.checked ? '✅ ' : '';
    return `<option value="${item.itemId}">${checkMark}${item.itemName} (dostępne: ${available} ${item.unit})</option>`;
  }).join('');
  
  itemSelect.innerHTML = options;
}

function showReservationModal() {
  const itemsOptions = window.warehouseItems.map((item, idx) => 
    `<option value="${idx}">${item.name} (dostępne: ${item.quantity} ${item.unit})</option>`
  ).join('');

  const ordersOptions = (state.orders || []).map(order =>
    `<option value="${order.id}">${order.name}</option>`
  ).join('');

  const content = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Zlecenie:</label>
        <select id="wh-res-order" onchange="updateMaterialsForOrder()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          <option value="">— wybierz zlecenie —</option>
          ${ordersOptions}
        </select>
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Materiał:</label>
        <select id="wh-res-item" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          <option value="">— najpierw wybierz zlecenie —</option>
        </select>
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Ilość do zarezerwowania:</label>
        <input type="number" id="wh-res-quantity" min="0.01" step="0.01" placeholder="np. 5" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Uwagi:</label>
        <textarea id="wh-res-notes" placeholder="Opcjonalne uwagi..." rows="2" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
      </div>
    </div>
  `;

  showModal('🔒 Nowa rezerwacja', content, [
    { text: 'Anuluj', action: () => {} },
    {
      text: 'Zarezerwuj',
      action: () => {
        const orderId = document.getElementById('wh-res-order').value;
        const itemId = document.getElementById('wh-res-item').value;
        const quantity = parseFloat(document.getElementById('wh-res-quantity').value);
        const notes = document.getElementById('wh-res-notes').value.trim();

        if (!orderId) {
          alert('Wybierz zlecenie');
          return;
        }

        if (!itemId || isNaN(quantity) || quantity <= 0) {
          alert('Wybierz materiał i podaj poprawną ilość');
          return;
        }

        const item = (window.warehouseItems || []).find(w => w.id === itemId);
        const order = (state.orders || []).find(o => o.id === orderId);
        
        if (!item || !order) {
          alert('Nie znaleziono pozycji lub zlecenia');
          return;
        }

        // Sprawdź dostępność
        const existingReservations = (window.warehouseReservations || [])
          .filter(r => r.itemId === itemId && r.status === 'active')
          .reduce((sum, r) => sum + r.quantity, 0);
        
        const available = item.quantity - existingReservations;

        if (available < quantity) {
          alert(`Niewystarczająca ilość! Dostępne: ${available} ${item.unit} (stan: ${item.quantity}, zarezerwowane: ${existingReservations})`);
          return;
        }

        // Utwórz rezerwację
        const reservation = {
          id: generateId(),
          orderId: order.id,
          orderName: order.name,
          itemId: item.id,
          itemName: item.name,
          quantity: quantity,
          unit: item.unit,
          notes: notes,
          date: new Date().toISOString(),
          timestamp: Date.now(),
          status: 'active' // active, used, cancelled
        };

        if (!window.warehouseReservations) {
          window.warehouseReservations = [];
        }
        window.warehouseReservations.push(reservation);

        saveWarehouseToStorage();
        alert(`✅ Zarezerwowano ${quantity} ${item.unit} - ${item.name} dla zlecenia ${order.name}`);
        renderReservations();
      }
    }
  ]);
}

function getReservedQuantity(itemIdx) {
  if (!window.warehouseReservations) return 0;
  return window.warehouseReservations
    .filter(r => r.itemId === itemIdx && r.status === 'active')
    .reduce((sum, r) => sum + r.quantity, 0);
}

function renderReservations() {
  const list = document.getElementById('wh-reservations-list');
  if (!list) return;

  // Zapamiętaj otwarte szczegóły PRZED renderowaniem
  const openDetails = [];
  document.querySelectorAll('[id^="details-"]').forEach(el => {
    if (el.style.display !== 'none') {
      openDetails.push(el.id);
    }
  });

  const reservations = (window.warehouseReservations || []).filter(r => r.status === 'active');

  if (reservations.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#999">Brak aktywnych rezerwacji</div>';
    return;
  }

  // Grupuj rezerwacje po orderId (zleceniu)
  const grouped = {};
  reservations.forEach(res => {
    if (!grouped[res.orderId]) {
      grouped[res.orderId] = {
        orderId: res.orderId,
        orderName: res.orderName,
        materials: []
      };
    }
    grouped[res.orderId].materials.push(res);
  });

  // Renderuj zgrupowane rezerwacje po zleceniu
  list.innerHTML = Object.values(grouped).map(group => {
    const detailsId = `details-${group.orderId}`;
    
    // Sprawdź status wszystkich materiałów w zleceniu - na podstawie receivedDate
    let allReceived = true;
    let someReceived = false;
    let allIssued = true;
    
    group.materials.forEach(mat => {
      if (mat.receivedDate) {
        someReceived = true;
      } else {
        allReceived = false;
      }
      
      if (!mat.issuedDate) {
        allIssued = false;
      }
    });
    
    // Określ kolor ramki i status zlecenia
    let borderColor = '#3b82f6'; // niebieski - zarezerwowane
    let statusBadge = '';
    
    if (allIssued) {
      // Wszystko wydane
      borderColor = '#8b5cf6'; // fioletowy - wydane
      statusBadge = `<span style="display:inline-block;padding:4px 8px;background:#8b5cf6;color:white;border-radius:4px;font-size:12px;font-weight:600;margin-right:6px">📦 Wszystko wydane</span>`;
    } else if (allReceived) {
      // Wszystko przyjęte do magazynu
      borderColor = '#10b981'; // zielony - przyjęte
      statusBadge = `<span style="display:inline-block;padding:4px 8px;background:#10b981;color:white;border-radius:4px;font-size:12px;font-weight:600;margin-right:6px">✅ Wszystko przyjęte</span>`;
    } else if (someReceived) {
      // Częściowo przyjęte
      borderColor = '#f59e0b'; // pomarańczowy - częściowo
      statusBadge = `<span style="display:inline-block;padding:4px 8px;background:#f59e0b;color:white;border-radius:4px;font-size:12px;font-weight:600;margin-right:6px">⚠️ Częściowo przyjęte</span>`;
    } else {
      // Nic nie przyjęte
      borderColor = '#ef4444'; // czerwony - oczekuje
      statusBadge = `<span style="display:inline-block;padding:4px 8px;background:#ef4444;color:white;border-radius:4px;font-size:12px;font-weight:600;margin-right:6px">⏳ Oczekuje na przyjęcie</span>`;
    }
    
    // Oblicz daty przyjęcia i wydania dla całego zlecenia
    let earliestReceived = null;
    let latestIssued = null;
    
    group.materials.forEach(mat => {
      if (mat.receivedDate) {
        const rd = new Date(mat.receivedDate);
        if (!earliestReceived || rd < earliestReceived) {
          earliestReceived = rd;
        }
      }
      if (mat.issuedDate) {
        const id = new Date(mat.issuedDate);
        if (!latestIssued || id > latestIssued) {
          latestIssued = id;
        }
      }
    });
    
    // Formatuj daty dla nagłówka
    let orderDateBadges = '';
    if (earliestReceived) {
      const receivedStr = earliestReceived.toLocaleDateString('pl-PL', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
      });
      orderDateBadges += `<div style="font-size:14px;margin-bottom:4px;padding:4px 8px;background:#d1fae5;border-left:3px solid #10b981;border-radius:4px">
        <span style="color:#065f46;font-weight:600">✅ Przyjęto:</span>
        <span style="color:#000;font-weight:600;margin-left:6px">${receivedStr}</span>
      </div>`;
    }
    if (latestIssued) {
      const issuedStr = latestIssued.toLocaleDateString('pl-PL', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
      });
      orderDateBadges += `<div style="font-size:14px;margin-bottom:4px;padding:4px 8px;background:#dbeafe;border-left:3px solid #3b82f6;border-radius:4px">
        <span style="color:#1e40af;font-weight:600">📦 Wydano:</span>
        <span style="color:#000;font-weight:600;margin-left:6px">${issuedStr}</span>
      </div>`;
    }
    
    return `
      <div class="card" style="margin-bottom:12px;border-left:4px solid ${borderColor}">
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="flex:1">
              <div style="font-size:16px;margin-bottom:8px;padding:6px 12px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px">
                <span style="color:#92400e;font-weight:600">📋 Nr zlecenia:</span>
                <span style="color:#000;font-weight:700;font-size:18px;margin-left:8px">${group.orderName}</span>
              </div>
              ${orderDateBadges}
              <div style="margin-bottom:8px">
                ${statusBadge}
                <span style="display:inline-block;padding:4px 8px;background:#e2e8f0;color:#334155;border-radius:4px;font-size:12px;font-weight:600">📦 ${group.materials.length} ${group.materials.length === 1 ? 'materiał' : 'materiałów'}</span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-left:12px">
              <button class="btn small blue" onclick="toggleDetails('${detailsId}')">
                Szczegóły ▼
              </button>
              <button class="btn small" onclick="exportIssuedMaterials('${group.orderId}', '${group.orderName}')" style="background:#10b981;color:white">
                📄 Wydano (Excel)
              </button>
              <button class="btn small" onclick="completeOrder('${group.orderId}')" style="background:#8b5cf6;color:white">
                🏁 Zakończ zlecenie
              </button>
            </div>
          </div>
        </div>
        
        <div id="${detailsId}" style="display:none;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:8px">
          ${group.materials.map(mat => {
            // Formatuj daty
            const reservedDate = mat.date ? new Date(mat.date).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Brak daty';
            const receivedDateStr = mat.receivedDate ? new Date(mat.receivedDate).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;
            const issuedDateStr = mat.issuedDate ? new Date(mat.issuedDate).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;
            
            // Sprawdź status materiału na podstawie dat
            let statusBadge = '';
            let bgColor = '#f8fafc';
            
            if (mat.issuedDate) {
              statusBadge = `<span style="display:inline-block;padding:3px 6px;background:#3b82f6;color:white;border-radius:3px;font-size:11px;font-weight:600;margin-left:8px">📦 Wydano</span>`;
              bgColor = '#eff6ff';
            } else if (mat.receivedDate) {
              statusBadge = `<span style="display:inline-block;padding:3px 6px;background:#10b981;color:white;border-radius:3px;font-size:11px;font-weight:600;margin-left:8px">✅ Przyjęto</span>`;
              bgColor = '#f0fdf4';
            } else {
              statusBadge = `<span style="display:inline-block;padding:3px 6px;background:#f59e0b;color:white;border-radius:3px;font-size:11px;font-weight:600;margin-left:8px">⏳ Oczekuje</span>`;
              bgColor = '#fffbeb';
            }
            
            return `
              <div style="padding:12px;background:${bgColor};border-radius:6px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                  <div style="flex:1">
                    <div style="font-size:15px;font-weight:600;color:#334155;margin-bottom:6px">
                      📦 ${mat.itemName}
                      ${statusBadge}
                    </div>
                    <div style="font-size:14px;color:#64748b;margin-bottom:6px">
                      Ilość: <strong style="color:#1e293b;font-size:16px">${mat.quantity} ${mat.unit}</strong>
                    </div>
                    <div style="font-size:13px;color:#64748b;line-height:1.6">
                      📅 <strong>Zarezerwowano:</strong> ${reservedDate}
                      ${receivedDateStr ? `<br>✅ <strong style="color:#059669">Przyjęto:</strong> ${receivedDateStr}` : ''}
                      ${issuedDateStr ? `<br>📦 <strong style="color:#2563eb">Wydano:</strong> ${issuedDateStr}` : ''}
                    </div>
                    ${mat.notes ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px;font-style:italic;padding:6px;background:#f8fafc;border-radius:4px">💬 ${mat.notes}</div>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;gap:6px;min-width:140px">
                    ${!mat.receivedDate ? `<button class="btn small green" onclick="markAsReceived('${mat.id}')" style="width:100%;font-size:13px;padding:8px">
                      Przyjmij
                    </button>` : `<button class="btn small" disabled style="width:100%;font-size:13px;padding:8px;background:#d1fae5;color:#065f46;cursor:not-allowed">
                      ✅ Przyjęto
                    </button>`}
                    ${mat.receivedDate && !mat.issuedDate ? `<button class="btn small blue" onclick="markAsIssued('${mat.id}')" style="width:100%;font-size:13px;padding:8px">
                      📦 Wydaj
                    </button>` : mat.issuedDate ? `<button class="btn small" disabled style="width:100%;font-size:13px;padding:8px;background:#dbeafe;color:#1e40af;cursor:not-allowed">
                      📦 Wydano
                    </button>` : ''}
                    <button class="btn small red" onclick="cancelReservation('${mat.id}')" style="width:100%;font-size:13px;padding:8px">
                      ✕ Anuluj
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Przywróć otwarte szczegóły PO renderowaniu
  requestAnimationFrame(() => {
    openDetails.forEach(detailsId => {
      const details = document.getElementById(detailsId);
      if (details) {
        details.style.display = 'block';
        // Zmień tekst przycisku
        const button = document.querySelector(`button[onclick="toggleDetails('${detailsId}')"]`);
        if (button) {
          button.textContent = 'Ukryj ▲';
        }
      }
    });
  });
}

// Udostępnij globalnie
window.renderReservations = renderReservations;

// Funkcja do przełączania szczegółów
window.toggleDetails = function(detailsId) {
  const details = document.getElementById(detailsId);
  if (!details) return;
  
  const isHidden = details.style.display === 'none';
  details.style.display = isHidden ? 'block' : 'none';
  
  // Zmień tekst przycisku
  const button = document.querySelector(`button[onclick="toggleDetails('${detailsId}')"]`);
  if (button) {
    button.textContent = isHidden ? 'Ukryj ▲' : 'Szczegóły ▼';
  }
};

// Oznacz materiał jako przyjęty (dostępny w magazynie)
window.markAsReceived = function(resId) {
  if (!window.warehouseReservations || !Array.isArray(window.warehouseReservations)) {
    alert('Błąd: Brak danych rezerwacji');
    return;
  }
  
  // Znajdź dokładnie tę jedną rezerwację
  const reservation = window.warehouseReservations.find(r => r.id === resId);
  
  if (!reservation) {
    alert('Błąd: Nie znaleziono rezerwacji');
    return;
  }
  
  // Sprawdź czy już nie jest przyjęta
  if (reservation.receivedDate) {
    alert('Ten materiał jest już oznaczony jako przyjęty');
    return;
  }
  
  if (confirm(`Przyjąć materiał do magazynu?\n\n📦 ${reservation.itemName}\nIlość: ${reservation.quantity} ${reservation.unit}\nZlecenie: ${reservation.orderName}`)) {
    // Oznacz jako przyjęty - dodaj datę
    reservation.receivedDate = new Date().toISOString();
    
    // Zapisz do localStorage
    saveWarehouseToStorage();
    
    // Odśwież widok - NIE zamykaj otwartych szczegółów
    alert(`✅ Przyjęto: ${reservation.itemName}`);
    
    // Zapamiętaj, które szczegóły są otwarte
    window._keepDetailsOpen = true;
    renderReservations();
  }
};

// Oznacz materiał jako wydany (wydano z magazynu do zlecenia)
window.markAsIssued = function(resId) {
  if (!window.warehouseReservations || !Array.isArray(window.warehouseReservations)) {
    alert('Błąd: Brak danych rezerwacji');
    return;
  }
  
  // Znajdź dokładnie tę jedną rezerwację
  const reservation = window.warehouseReservations.find(r => r.id === resId);
  
  if (!reservation) {
    alert('Błąd: Nie znaleziono rezerwacji');
    return;
  }
  
  // Sprawdź czy materiał został przyjęty
  if (!reservation.receivedDate) {
    alert('Najpierw oznacz materiał jako przyjęty');
    return;
  }
  
  // Sprawdź czy już nie jest wydany
  if (reservation.issuedDate) {
    alert('Ten materiał jest już oznaczony jako wydany');
    return;
  }
  
  if (confirm(`Wydać materiał z magazynu?\n\n📦 ${reservation.itemName}\nIlość: ${reservation.quantity} ${reservation.unit}\nZlecenie: ${reservation.orderName}\n\n⚠️ Stan magazynu zostanie zmniejszony`)) {
    // Oznacz jako wydany - dodaj datę
    reservation.issuedDate = new Date().toISOString();
    
    // Zmniejsz stan magazynu
    const warehouseItem = (window.warehouseItems || []).find(w => w.id === reservation.itemId);
    if (warehouseItem) {
      warehouseItem.quantity -= reservation.quantity;
      
      // Utwórz transakcję WZ (wydanie zewnętrzne)
      const transaction = {
        id: generateId(),
        type: 'WZ',
        itemId: reservation.itemId,
        itemName: reservation.itemName,
        quantity: reservation.quantity,
        unit: reservation.unit,
        date: new Date().toISOString(),
        notes: `Wydano dla zlecenia: ${reservation.orderName}`,
        orderId: reservation.orderId,
        orderName: reservation.orderName
      };
      
      if (!window.warehouseTransactions) {
        window.warehouseTransactions = [];
      }
      window.warehouseTransactions.push(transaction);
    }
    
    // Zapisz do localStorage
    saveWarehouseToStorage();
    
    // Odśwież widok - NIE zamykaj otwartych szczegółów
    alert(`📦 Wydano: ${reservation.itemName}\n\nStan magazynu: ${warehouseItem ? warehouseItem.quantity : '?'} ${reservation.unit}`);
    
    // Zapamiętaj, które szczegóły są otwarte
    window._keepDetailsOpen = true;
    renderReservations();
    if (typeof renderWarehouse === 'function') renderWarehouse();
  }
};

// Anuluj rezerwację
window.cancelReservation = function(resId) {
  if (!window.warehouseReservations || !Array.isArray(window.warehouseReservations)) {
    alert('Błąd: Brak danych rezerwacji');
    return;
  }
  
  // Znajdź dokładnie tę jedną rezerwację
  const reservation = window.warehouseReservations.find(r => r.id === resId);
  
  if (!reservation) {
    alert('Błąd: Nie znaleziono rezerwacji');
    return;
  }
  
  if (confirm(`Anulować rezerwację?\n\n📦 ${reservation.itemName}\nIlość: ${reservation.quantity} ${reservation.unit}\nZlecenie: ${reservation.orderName}\n\n⚠️ Rezerwacja zostanie usunięta`)) {
    // Zmień status na 'cancelled'
    reservation.status = 'cancelled';
    reservation.cancelledDate = new Date().toISOString();
    
    // Zapisz do localStorage
    saveWarehouseToStorage();
    
    // Odśwież widok - NIE zamykaj otwartych szczegółów
    alert(`✕ Anulowano rezerwację: ${reservation.itemName}`);
    
    // Zapamiętaj, które szczegóły są otwarte
    window._keepDetailsOpen = true;
    renderReservations();
  }
};

// Zakończ zlecenie - przenieś rezerwacje do archiwum
window.completeOrder = function(orderId) {
  const reservations = (window.warehouseReservations || []).filter(r => r.orderId === orderId && r.status === 'active');
  
  if (reservations.length === 0) {
    alert('Brak aktywnych rezerwacji dla tego zlecenia');
    return;
  }
  
  const orderName = reservations[0].orderName;
  
  if (confirm(`Zakończyć zlecenie "${orderName}"?\n\n✓ Wszystkie rezerwacje zostaną zamknięte\n✓ Zlecenie przejdzie do archiwum\n✓ Historia zostanie zachowana\n\nLiczba rezerwacji: ${reservations.length}`)) {
    // Zmień status wszystkich rezerwacji na 'completed'
    reservations.forEach(res => {
      res.status = 'completed';
      res.completedDate = new Date().toISOString();
    });
    
    saveWarehouseToStorage();
    alert(`🏁 Zlecenie "${orderName}" zakończone!\n\n${reservations.length} rezerwacji przeniesiono do archiwum.`);
    renderReservations();
  }
};

// Eksport wydanych materiałów do Excel/CSV
window.exportIssuedMaterials = function(orderId, orderName) {
  const reservations = (window.warehouseReservations || [])
    .filter(r => r.orderId === orderId && r.status === 'active');
  
  if (reservations.length === 0) {
    alert('Brak materiałów do eksportu dla tego zlecenia');
    return;
  }
  
  // Przygotuj dane do eksportu
  let csvContent = '\uFEFF'; // BOM dla UTF-8
  csvContent += `KARTA WYDANIA MATERIAŁÓW\n`;
  csvContent += `Zlecenie nr: ${orderName}\n`;
  csvContent += `Data wydruku: ${new Date().toLocaleDateString('pl-PL', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit' 
  })}\n\n`;
  
  // Nagłówki tabeli
  csvContent += `Lp.;Materiał;Ilość;Jednostka;Data przyjęcia;Data wydania;Status\n`;
  
  // Dane materiałów
  reservations.forEach((mat, index) => {
    const lp = index + 1;
    const itemName = mat.itemName || '';
    const quantity = mat.quantity || 0;
    const unit = mat.unit || 'szt';
    
    const receivedDate = mat.receivedDate 
      ? new Date(mat.receivedDate).toLocaleDateString('pl-PL', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit' 
        })
      : 'Oczekuje';
    
    const issuedDate = mat.issuedDate 
      ? new Date(mat.issuedDate).toLocaleDateString('pl-PL', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit' 
        })
      : '-';
    
    const status = mat.issuedDate 
      ? 'Wydano' 
      : (mat.receivedDate ? 'Przyjęto' : 'Oczekuje');
    
    csvContent += `${lp};${itemName};${quantity};${unit};${receivedDate};${issuedDate};${status}\n`;
  });
  
  // Podsumowanie
  csvContent += `\n`;
  csvContent += `Razem materiałów: ${reservations.length}\n`;
  csvContent += `Wydanych: ${reservations.filter(r => r.issuedDate).length}\n`;
  csvContent += `Oczekujących: ${reservations.filter(r => ! r.issuedDate).length}\n`;
  
  // Podpisy
  csvContent += `\n\n`;
  csvContent += `Wydał: ________________  Data: ________  Podpis: ________________\n`;
  csvContent += `\n`;
  csvContent += `Odebrał: ________________  Data: ________  Podpis: ________________\n`;
  
  // Utwórz plik i pobierz
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Wydanie_materialy_zlecenie_${orderName}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  alert(`📄 Wyeksportowano kartę wydania materiałów\n\nZlecenie: ${orderName}\nMateriałów: ${reservations.length}\n\nPlik CSV można otworzyć w Excel`);
};

// ============ SYSTEM ZADAŃ MAGAZYNIERA ============

// Inicjalizacja zadań magazyniera w localStorage
if (!window.warehouseTasks) {
  window.warehouseTasks = JSON.parse(localStorage.getItem('warehouseTasks') || '[]');
}

// Synchronizuj zadania magazynowe ze zleceniami (wywoływane po każdym zapisie stanu)
window.syncWarehouseTasks = function() {
  if (!window.state || !window.state.orders) return;
  
  // Dla każdego aktywnego zlecenia sprawdź materiały
  window.state.orders.forEach(order => {
    if (order.materialChecklist && order.materialChecklist.length > 0) {
      generateWarehouseTasksForOrder(order);
    }
  });
  
  // Aktualizuj badge
  if (typeof window.updateTasksBadge === 'function') {
    window.updateTasksBadge();
  }
};

// Generuj automatyczne zadania dla zlecenia
window.generateWarehouseTasksForOrder = function(order) {
  if (!order || !order.id) return;
  
  const orderStartDate = order.startDate ? new Date(order.startDate) : null;
  const materialsNeeded = order.materialChecklist || [];
  
  if (materialsNeeded.length === 0) return;
  
  // Oblicz daty ostrzeżeń (3 dni przed start produkcji)
  const warningDate = orderStartDate ? new Date(orderStartDate) : new Date();
  warningDate.setDate(warningDate.getDate() - 3);
  
  // Sprawdź, czy materiały są w magazynie
  materialsNeeded.forEach(material => {
    const warehouseItem = (window.warehouseItems || []).find(w => w.id === material.itemId);
    const inStock = warehouseItem ? warehouseItem.quantity : 0;
    const needed = material.quantity || 0;
    
    if (inStock < needed) {
      // Brakuje materiału - utwórz zadanie zamówienia
      const task = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: 'order_material', // typ: order_material, receive_material, prepare_material, issue_material
        orderId: order.id,
        orderName: order.name,
        itemId: material.itemId,
        itemName: material.itemName,
        unit: material.unit || 'szt.',
        quantityNeeded: needed,
        quantityInStock: inStock,
        quantityToOrder: needed - inStock,
        status: 'pending', // pending, in_progress, completed, cancelled
        priority: 'normal', // normal, urgent
        dueDate: warningDate.toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: 'System',
        assignedTo: 'Magazynier'
      };
      
      // Sprawdź czy nie ma już takiego zadania
      const existingTask = window.warehouseTasks.find(t => 
        t.orderId === order.id && 
        t.itemId === material.itemId && 
        t.type === 'order_material' && 
        t.status !== 'cancelled'
      );
      
      if (!existingTask) {
        window.warehouseTasks.push(task);
      }
    }
  });
  
  // Zapisz zadania
  localStorage.setItem('warehouseTasks', JSON.stringify(window.warehouseTasks));
};

// Renderuj zadania magazyniera - NOWA WERSJA z grupowaniem po zleceniach
window.renderWarehouseTasks = function() {
  const list = document.getElementById('wh-tasks-list');
  if (!list) return;
  
  // Zapamiętaj otwarte szczegóły
  const openDetails = [];
  document.querySelectorAll('[id^="task-details-"]').forEach(el => {
    if (el.style.display !== 'none') {
      openDetails.push(el.id);
    }
  });
  
  const tasks = window.warehouseTasks || [];
  const activeTasks = tasks.filter(t => t.status !== 'cancelled');
  
  if (activeTasks.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#999">Brak zadań dla magazyniera</div>';
    return;
  }
  
  // Grupuj zadania po zleceniach
  const grouped = {};
  activeTasks.forEach(task => {
    if (!grouped[task.orderId]) {
      grouped[task.orderId] = {
        orderId: task.orderId,
        orderName: task.orderName,
        tasks: []
      };
    }
    grouped[task.orderId].tasks.push(task);
  });
  
  // Sortuj zlecenia: najpilniejsze zadania na górze
  const orderArray = Object.values(grouped).map(group => {
    const urgentCount = group.tasks.filter(t => t.priority === 'urgent' && t.status !== 'cancelled' && t.status !== 'completed').length;
    const pendingCount = group.tasks.filter(t => t.status === 'pending').length;
    const inProgressCount = group.tasks.filter(t => t.status === 'in_progress').length;
    const completedCount = group.tasks.filter(t => t.status === 'completed').length;
    
    // Znajdź najpilniejszy termin
    const earliestDueDate = group.tasks
      .filter(t => t.status !== 'completed')
      .map(t => new Date(t.dueDate))
      .sort((a, b) => a - b)[0];
    
    return {
      ...group,
      urgentCount,
      pendingCount,
      inProgressCount,
      completedCount,
      earliestDueDate
    };
  }).sort((a, b) => {
    if (a.urgentCount !== b.urgentCount) return b.urgentCount - a.urgentCount;
    if (a.earliestDueDate && b.earliestDueDate) return a.earliestDueDate - b.earliestDueDate;
    return 0;
  });
  
  list.innerHTML = orderArray.map(group => {
    // Badge z liczbami
    let countBadge = '';
    if (group.urgentCount > 0) {
      countBadge = `<span style="background:#dc2626;color:white;padding:4px 8px;border-radius:6px;font-size:13px;margin-left:8px">⚠️ ${group.urgentCount} pilne</span>`;
    }
    if (group.inProgressCount > 0) {
      countBadge += `<span style="background:#3b82f6;color:white;padding:4px 8px;border-radius:6px;font-size:13px;margin-left:8px">⏳ ${group.inProgressCount} w trakcie</span>`;
    }
    if (group.pendingCount > 0) {
      countBadge += `<span style="background:#6b7280;color:white;padding:4px 8px;border-radius:6px;font-size:13px;margin-left:8px">${group.pendingCount} oczekujące</span>`;
    }
    
    const borderColor = group.urgentCount > 0 ? '#dc2626' : '#3b82f6';
    
    // Sortuj zadania w ramach zlecenia
    const sortedTasks = group.tasks.sort((a, b) => {
      const isUrgentA = new Date(a.dueDate) < new Date();
      const isUrgentB = new Date(b.dueDate) < new Date();
      const statusOrder = { pending: 0, in_progress: 1, completed: 2 };
      
      if (isUrgentA !== isUrgentB) return isUrgentB - isUrgentA;
      if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
      
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    const taskListHTML = sortedTasks.map(task => {
      const isUrgent = new Date(task.dueDate) < new Date();
      const isCompleted = task.status === 'completed';
      
      let statusBadge = '';
      let borderColor = '#e5e7eb';
      
      if (isCompleted) {
        statusBadge = `<span style="background:#10b981;color:white;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px">✅ Zakończone</span>`;
      } else if (isUrgent) {
        statusBadge = `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px">⚠️ PILNE</span>`;
        borderColor = '#dc2626';
      } else if (task.status === 'in_progress') {
        statusBadge = `<span style="background:#3b82f6;color:white;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px">⏳ W trakcie</span>`;
      } else {
        statusBadge = `<span style="background:#6b7280;color:white;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px">⏸️ Oczekujące</span>`;
      }
      
      const dueDate = new Date(task.dueDate).toLocaleDateString('pl-PL', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      
      let taskIcon = '📦';
      let taskTitle = '';
      let taskDescription = '';
      
      if (task.type === 'order_material') {
        taskIcon = '🛒';
        taskTitle = `Zamówić materiał: ${task.itemName}`;
        taskDescription = `Brakuje: ${task.quantityToOrder} ${task.unit || 'szt.'}<br>W magazynie: ${task.quantityInStock} ${task.unit || 'szt.'}, Potrzeba: ${task.quantityNeeded} ${task.unit || 'szt.'}`;
      } else if (task.type === 'receive_material') {
        taskIcon = '📥';
        taskTitle = `Przyjąć dostawę: ${task.itemName}`;
        taskDescription = `Ilość: ${task.quantity} ${task.unit || 'szt.'}`;
      } else if (task.type === 'prepare_material') {
        taskIcon = '📦';
        taskTitle = `Przygotować materiały`;
        taskDescription = `Wszystkie materiały dla zlecenia`;
      } else if (task.type === 'issue_material') {
        taskIcon = '📤';
        taskTitle = `Wydać materiał: ${task.itemName}`;
        taskDescription = `Ilość: ${task.quantity} ${task.unit || 'szt.'}`;
      }
      
      return `
        <div style="background:#f9fafb;border-left:3px solid ${borderColor};padding:12px;margin-bottom:8px;border-radius:4px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px;color:#1f2937">
                ${taskIcon} ${taskTitle}${statusBadge}
              </div>
              <div style="font-size:13px;color:#6b7280;margin-top:6px">
                ${taskDescription}
              </div>
              <div style="font-size:12px;color:#9ca3af;margin-top:6px">
                📅 Termin: ${dueDate}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;min-width:120px">
              ${!isCompleted ? `
                <button class="btn small green" onclick="completeWarehouseTask('${task.id}')" style="width:100%;font-size:12px;padding:6px 10px">
                  ✅ Zakończ
                </button>
                <button class="btn small blue" onclick="startWarehouseTask('${task.id}')" style="width:100%;font-size:12px;padding:6px 10px">
                  ▶️ Rozpocznij
                </button>
              ` : ''}
              <button class="btn small red" onclick="cancelWarehouseTask('${task.id}')" style="width:100%;font-size:12px;padding:6px 10px">
                ✕ Anuluj
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div style="background:white;border:2px solid ${borderColor};border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-weight:700;font-size:18px;color:#1f2937">
              📋 Zlecenie ${group.orderName}
              ${countBadge}
            </div>
            <div style="color:#6b7280;font-size:13px;margin-top:4px">
              ${group.tasks.length} zadań (${group.completedCount} zakończone)
            </div>
          </div>
          <button onclick="toggleTaskDetails('${group.orderId}')" 
                  id="task-toggle-${group.orderId}"
                  style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px">
            ▼ Szczegóły
          </button>
        </div>
        <div id="task-details-${group.orderId}" style="display:none">
          ${taskListHTML}
        </div>
      </div>
    `;
  }).join('');
  
  // Przywróć stan otwartych szczegółów
  requestAnimationFrame(() => {
    openDetails.forEach(detailsId => {
      const details = document.getElementById(detailsId);
      const toggleBtn = document.getElementById(detailsId.replace('task-details-', 'task-toggle-'));
      if (details && toggleBtn) {
        details.style.display = 'block';
        toggleBtn.textContent = '▲ Ukryj';
      }
    });
  });
  
  // Aktualizuj badge z liczbą pilnych zadań
  updateTasksBadge();
};

// Toggle szczegółów zadań dla zlecenia
window.toggleTaskDetails = function(orderId) {
  const details = document.getElementById(`task-details-${orderId}`);
  const toggleBtn = document.getElementById(`task-toggle-${orderId}`);
  
  if (!details || !toggleBtn) return;
  
  const isHidden = details.style.display === 'none';
  details.style.display = isHidden ? 'block' : 'none';
  toggleBtn.textContent = isHidden ? '▲ Ukryj' : '▼ Szczegóły';
};

// Aktualizuj badge z liczbą zadań
window.updateTasksBadge = function() {
  const badge = document.getElementById('tasks-badge');
  if (!badge) return;
  
  const tasks = window.warehouseTasks || [];
  const urgentTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    const isUrgent = new Date(t.dueDate) < new Date();
    return isUrgent;
  });
  
  if (urgentTasks.length > 0) {
    badge.textContent = urgentTasks.length;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
};

// Zakończ zadanie
window.completeWarehouseTask = function(taskId) {
  const task = window.warehouseTasks.find(t => t.id === taskId);
  if (!task) return;
  
  if (confirm(`Oznaczyć zadanie jako zakończone?\n\n${task.itemName || 'Zadanie'}`)) {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    
    localStorage.setItem('warehouseTasks', JSON.stringify(window.warehouseTasks));
    alert(`✅ Zadanie zakończone`);
    
    window._keepDetailsOpen = true;
    renderWarehouseTasks();
    updateTasksBadge();
  }
};

// Rozpocznij zadanie
window.startWarehouseTask = function(taskId) {
  const task = window.warehouseTasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.status = 'in_progress';
  task.startedAt = new Date().toISOString();
  
  localStorage.setItem('warehouseTasks', JSON.stringify(window.warehouseTasks));
  alert(`▶️ Zadanie rozpoczęte`);
  
  window._keepDetailsOpen = true;
  renderWarehouseTasks();
  updateTasksBadge();
};

// Anuluj zadanie
window.cancelWarehouseTask = function(taskId) {
  const task = window.warehouseTasks.find(t => t.id === taskId);
  if (!task) return;
  
  if (confirm(`Anulować zadanie?\n\n${task.itemName || 'Zadanie'}`)) {
    task.status = 'cancelled';
    task.cancelledAt = new Date().toISOString();
    
    localStorage.setItem('warehouseTasks', JSON.stringify(window.warehouseTasks));
    alert(`✕ Zadanie anulowane`);
    
    window._keepDetailsOpen = true;
    renderWarehouseTasks();
    updateTasksBadge();
  }
};

// Filtruj zadania
window.filterWarehouseTasks = function(filter) {
  // TODO: implementacja filtrowania
  renderWarehouseTasks();
};

function useReservation(resId) {
  const res = window.warehouseReservations.find(r => r.id === resId);
  if (!res) return;

  if (confirm(`Oznaczyć jako wykorzystaną? To wyda ${res.quantity} ${res.unit} z magazynu.`)) {
    res.status = 'used';
    
    // Utwórz transakcję wydania
    const item = window.warehouseItems[res.itemId];
    if (item) {
      item.quantity -= res.quantity;
      
      const transaction = {
        id: generateId(),
        type: 'out',
        itemId: res.itemId,
        itemName: res.itemName,
        quantity: res.quantity,
        unit: res.unit,
        person: `Zlecenie: ${res.orderName}`,
        notes: `Wykorzystanie rezerwacji ${resId}`,
        date: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      if (!window.warehouseTransactions) {
        window.warehouseTransactions = [];
      }
      window.warehouseTransactions.push(transaction);
    }
    
    saveWarehouseToStorage();
    renderReservations();
    renderWarehouse();
  }
}

// ===== SZABLONY MATERIAŁOWE =====

function showTemplateModal(templateId = null) {
  const isEdit = templateId !== null;
  const template = isEdit ? window.materialTemplates.find(t => t.id === templateId) : null;
  
  const materialsHtml = (template?.materials || []).map((mat, idx) => {
    return `
      <div class="row" style="gap:8px;margin-bottom:8px;align-items:center" data-mat-idx="${idx}">
        <select class="template-mat-select" style="flex:2;padding:8px;border:1px solid #ccc;border-radius:4px">
          ${window.warehouseItems.map((item, itemIdx) => 
            `<option value="${itemIdx}" ${mat.itemId === itemIdx ? 'selected' : ''}>${item.name} (${item.unit})</option>`
          ).join('')}
        </select>
        <input type="number" class="template-mat-qty" value="${mat.quantity}" min="0.01" step="0.01" placeholder="Ilość" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px">
        <button class="btn red small" onclick="removeTemplateMaterial(${idx})">✕</button>
      </div>
    `;
  }).join('');

  const content = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Nazwa szablonu:</label>
        <input type="text" id="template-modal-name" value="${template?.name || ''}" placeholder="np. Zestaw drzwi sosnowych" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div>
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Materiały:</label>
        <div id="template-materials-list">
          ${materialsHtml || '<div style="color:#999;text-align:center;padding:20px">Brak materiałów. Kliknij "Dodaj materiał"</div>'}
        </div>
        <button class="btn blue small" onclick="addTemplateMaterial()" style="margin-top:8px">+ Dodaj materiał</button>
      </div>
    </div>
  `;

  showModal(isEdit ? '✏️ Edytuj szablon' : '📑 Nowy szablon', content, [
    { text: 'Anuluj', action: () => {} },
    {
      text: isEdit ? 'Zapisz' : 'Utwórz',
      action: () => {
        const name = document.getElementById('template-modal-name').value.trim();
        if (!name) {
          alert('Podaj nazwę szablonu');
          return;
        }

        // Zbierz materiały
        const materials = [];
        document.querySelectorAll('#template-materials-list > div[data-mat-idx]').forEach(row => {
          const select = row.querySelector('.template-mat-select');
          const qtyInput = row.querySelector('.template-mat-qty');
          const itemIdx = parseInt(select.value);
          const quantity = parseFloat(qtyInput.value);
          
          if (!isNaN(itemIdx) && !isNaN(quantity) && quantity > 0) {
            const item = window.warehouseItems[itemIdx];
            materials.push({
              itemId: item.id,  // ✅ Używamy prawdziwego ID z magazynu, nie indeksu!
              itemName: item.name,
              quantity: quantity,
              unit: item.unit
            });
          }
        });

        if (materials.length === 0) {
          alert('Dodaj przynajmniej jeden materiał');
          return;
        }

        if (isEdit) {
          // Edycja
          const idx = window.materialTemplates.findIndex(t => t.id === templateId);
          window.materialTemplates[idx] = {
            id: templateId,
            name: name,
            materials: materials,
            updatedAt: Date.now()
          };
        } else {
          // Nowy
          window.materialTemplates.push({
            id: generateId(),
            name: name,
            materials: materials,
            createdAt: Date.now()
          });
        }

        saveWarehouseToStorage();
        renderTemplates();
        alert(`✅ Szablon "${name}" został ${isEdit ? 'zaktualizowany' : 'utworzony'}`);
      }
    }
  ]);
}

function addTemplateMaterial() {
  const list = document.getElementById('template-materials-list');
  if (!list) return;
  
  const emptyMsg = list.querySelector('div[style*="color:#999"]');
  if (emptyMsg) emptyMsg.remove();
  
  const newIdx = list.querySelectorAll('div[data-mat-idx]').length;
  const newRow = document.createElement('div');
  newRow.className = 'row';
  newRow.style = 'gap:8px;margin-bottom:8px;align-items:center';
  newRow.setAttribute('data-mat-idx', newIdx);
  newRow.innerHTML = `
    <select class="template-mat-select" style="flex:2;padding:8px;border:1px solid #ccc;border-radius:4px">
      ${window.warehouseItems.map((item, itemIdx) => 
        `<option value="${itemIdx}">${item.name} (${item.unit})</option>`
      ).join('')}
    </select>
    <input type="number" class="template-mat-qty" value="1" min="0.01" step="0.01" placeholder="Ilość" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px">
    <button class="btn red small" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(newRow);
}

function removeTemplateMaterial(idx) {
  const row = document.querySelector(`#template-materials-list > div[data-mat-idx="${idx}"]`);
  if (row) row.remove();
}

function renderTemplates() {
  const list = document.getElementById('wh-templates-list');
  if (!list) return;

  const templates = window.materialTemplates || [];

  if (templates.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#999">Brak szablonów materiałowych. Kliknij "Nowy szablon".</div>';
    return;
  }

  list.innerHTML = templates.map(tmpl => {
    const materials = tmpl.materials || [];
    const materialsCount = materials.length;
    
    // Wygeneruj checklistę materiałów
    let checklistHtml = '';
    if (materialsCount === 0) {
      checklistHtml = '<div style="text-align:center;padding:20px;color:#94a3b8">Brak materiałów</div>';
    } else {
      checklistHtml = materials.map((m, idx) => `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #e2e8f0;background:white">
          <input type="checkbox" disabled style="cursor:not-allowed;width:16px;height:16px">
          <span style="flex:1;font-size:15px;color:#000000;font-weight:500">${m.itemName || 'Bez nazwy'}</span>
          <span style="font-size:14px;color:#475569;font-weight:600">${m.quantity || 0} ${m.unit || 'szt'}</span>
        </div>
      `).join('');
    }

    return `
      <div class="card" style="margin-bottom:8px">
        <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div style="flex:1">
            <div style="font-weight:600;margin-bottom:4px">📋 ${tmpl.name}</div>
            <div style="font-size:12px;color:#64748b">
              ${materialsCount} ${materialsCount === 1 ? 'pozycja' : materialsCount < 5 ? 'pozycje' : 'pozycji'} do sprawdzenia
            </div>
          </div>
          <div class="row" style="gap:4px">
            <button class="btn small" onclick="showTemplateModal('${tmpl.id}')">Edytuj</button>
            <button class="btn red small" onclick="deleteTemplate('${tmpl.id}')">Usuń</button>
          </div>
        </div>
        <div style="background:#f8fafc;padding:12px;border-radius:4px;max-height:200px;overflow-y:auto">
          ${checklistHtml}
        </div>
      </div>
    `;
  }).join('');
}

function deleteTemplate(templateId) {
  const template = window.materialTemplates.find(t => t.id === templateId);
  if (!template) return;
  
  if (confirm(`Usunąć szablon "${template.name}"?`)) {
    window.materialTemplates = window.materialTemplates.filter(t => t.id !== templateId);
    saveWarehouseToStorage();
    renderTemplates();
  }
}

// Checklist materiałów dla zlecenia
function showMaterialChecklist(orderId, options = {}) {
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) {
    alert('Nie znaleziono zlecenia');
    return;
  }

  if (!order.processId) {
    alert('To zlecenie nie ma przypisanego procesu');
    return;
  }

  const process = (state.processes || []).find(p => p.id === order.processId);
  if (!process || !process.materialTemplateId) {
    alert('Proces nie ma przypisanego szablonu materiałowego');
    return;
  }

  const template = (window.materialTemplates || []).find(t => t.id === process.materialTemplateId);
  if (!template) {
    alert('Nie znaleziono szablonu materiałowego');
    return;
  }

  const readOnlyMode = !!(options && options.readOnly);
  const invokedFromOrders = options?.source === 'orders';
  window.currentChecklistContext = {
    readOnly: readOnlyMode,
    source: options?.source || null
  };

  // Inicjalizuj stan checklisty jeśli nie istnieje
  if (!order.materialChecklist) {
    order.materialChecklist = template.materials.map((m, idx) => ({
      itemId: m.itemId,
      itemName: m.itemName,
      quantity: m.quantity,
      unit: m.unit,
      checked: false,
      checkedAt: null,
      checkedBy: null
    }));
    save();
  }

  // Wygeneruj HTML checklisty (CUSTOM CHECKBOX - bez input)
  const checklistHtml = order.materialChecklist.map((item, idx) => {
    const isChecked = item.checked;
    const checkedStyle = isChecked ? 'text-decoration:line-through;color:#94a3b8' : '';
    const checkInfo = isChecked && item.checkedAt ? 
      `<div style="font-size:10px;color:#94a3b8;margin-top:2px">✓ ${new Date(item.checkedAt).toLocaleString('pl-PL')}</div>` : '';
    
    const checkboxStyle = isChecked 
      ? 'background:#16a34a;border:2px solid #16a34a;color:white' 
      : 'background:#ffffff;border:2px solid #cbd5e1;color:transparent';
    
    return `
      <div onclick="event.stopPropagation(); window.toggleChecklistItem('${orderId}', ${idx})" 
           style="display:flex;align-items:flex-start;gap:14px;padding:14px;border-bottom:1px solid #e2e8f0;background:#ffffff;transition:all 0.2s;cursor:pointer !important"
           onmouseover="this.style.background='#f0fdf4';this.style.transform='translateX(4px)'" 
           onmouseout="this.style.background='#ffffff';this.style.transform='translateX(0)'">
        <div style="width:26px;height:26px;min-width:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;transition:all 0.2s;margin-top:2px;flex-shrink:0;cursor:pointer !important;${checkboxStyle}">
          ${isChecked ? '✓' : ''}
        </div>
        <div style="flex:1;cursor:pointer !important">
          <div style="${checkedStyle};font-size:16px;font-weight:600;color:#000000;transition:all 0.2s">${item.itemName}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;font-weight:500">${item.quantity} ${item.unit}</div>
          ${checkInfo}
        </div>
      </div>
    `;
  }).join('');

  const checkedCount = order.materialChecklist.filter(i => i.checked).length;
  const totalCount = order.materialChecklist.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const infoBlock = (readOnlyMode && invokedFromOrders) ? `
    <div style="margin-bottom:16px;padding:16px;border-radius:12px;background:#e0f2fe;border:1px solid #bae6fd">
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px">👷 Obsługa magazynu</div>
      <div style="font-size:13px;color:#0f172a;line-height:1.6">
        Zakładka Zlecenia ma charakter informacyjny. Przekaż checklistę do magazynu, aby zespół magazynu mógł przygotować materiały i potwierdzić wydanie.
      </div>
    </div>
  ` : '';

  const content = `
    ${infoBlock}
    <div style="margin-bottom:16px">
      <div style="font-size:14px;color:#64748b;margin-bottom:8px">
        Szablon: <strong>${template.name}</strong>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="flex:1;background:#e2e8f0;border-radius:8px;height:24px;overflow:hidden">
          <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#16a34a,#a3e635);transition:width 0.3s"></div>
        </div>
        <div style="font-size:14px;font-weight:600;color:#16a34a">${checkedCount}/${totalCount}</div>
      </div>
    </div>
    <div id="checklist-scroll-container" style="max-height:600px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px">
      ${checklistHtml}
    </div>
  `;

  const buttons = [];

  if (readOnlyMode && invokedFromOrders) {
    buttons.push({
      text: 'Przekaż do magazynu',
      action: () => {
        window.checklistScrollPosition = undefined;
        try {
          if (!Array.isArray(state.tasks)) {
            state.tasks = [];
          }

          const orderRef = (state.orders || []).find(o => o.id === orderId);
          if (!orderRef) {
            alert('Nie znaleziono zlecenia w stanie.');
            return false;
          }

          orderRef.warehouseStatus = 'pending';

          const existingTask = state.tasks.find(t => t.type === 'warehouse-preparation' && t.orderId === orderId);
          if (!existingTask) {
            const taskId = typeof uid === 'function' ? uid() : `warehouse-${Date.now()}`;
            const totalItems = order.materialChecklist?.length || 0;

            state.tasks.push({
              id: taskId,
              type: 'warehouse-preparation',
              orderId,
              orderName: order.name,
              status: 'pending',
              createdAt: new Date().toISOString(),
              priority: 'high',
              assignedTo: 'Magazyn',
              details: `Checklist materiałów obejmuje ${totalItems} ${totalItems === 1 ? 'pozycję' : totalItems < 5 ? 'pozycje' : 'pozycji'}.`,
              source: 'orders-view'
            });
          }

          save();
          if (typeof renderOrderPage === 'function') {
            renderOrderPage();
          }
          if (typeof renderTasks === 'function') {
            renderTasks();
          }

          alert('✅ Utworzono zadanie magazynowe do obsługi checklisty.');
          window.currentChecklistContext = null;
        } catch (error) {
          console.error('[warehouse] przekazanie checklisty do magazynu nie powiodło się', error);
          alert('❌ Nie udało się utworzyć zadania magazynowego.');
          return false;
        }
      }
    });

    buttons.push({
      text: 'Zamknij',
      action: () => {
        window.checklistScrollPosition = undefined;
        window.currentChecklistContext = null;
        renderOrderPage();
      }
    });
  } else {
    buttons.push({
      text: '🔒 Auto-rezerwuj zaznaczone',
      action: () => {
        window.checklistScrollPosition = undefined;
        window.currentChecklistContext = null;
        // Zamknij modal przed rezerwacją
        const modal = document.getElementById('custom-modal');
        if (modal) {
          modal.remove();
        }
        // Wykonaj rezerwację
        autoReserveFromChecklist(orderId);
        // Odśwież tabelę zleceń
        if (typeof renderOrderPage === 'function') {
          setTimeout(() => {
            renderOrderPage();
            console.log('✅ Tabela zleceń odświeżona po rezerwacji');
          }, 300);
        }
      }
    });

    buttons.push({
      text: 'Zamknij',
      action: () => {
        window.checklistScrollPosition = undefined;
        window.currentChecklistContext = null;
        renderOrderPage();
      }
    });
  }

  showModal(`Checklist materiałów - ${order.name}`, content, buttons);
  
  // Przywróć pozycję scrolla jeśli była zapamiętana
  if (window.checklistScrollPosition !== undefined) {
    setTimeout(() => {
      const scrollContainer = document.getElementById('checklist-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = window.checklistScrollPosition;
        console.log('📜 Przywrócono scroll na pozycję:', window.checklistScrollPosition);
      }
    }, 50);
  }
}

// Flaga blokująca wielokrotne wywołanie
let isTogglingChecklistItem = false;

function toggleChecklistItem(orderId, itemIndex) {
  // Blokada wielokrotnego wywołania
  if (isTogglingChecklistItem) {
    console.warn('⚠️ toggleChecklistItem już w trakcie wykonywania, pomijam...');
    return;
  }

  if (window.currentChecklistContext?.readOnly) {
    console.warn('🛑 Checklist w trybie tylko do odczytu – zmiana stanu zablokowana.');
    return;
  }
  
  isTogglingChecklistItem = true;
  console.log('🔄 toggleChecklistItem:', orderId, itemIndex);
  
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order || !order.materialChecklist) {
    console.error('❌ Nie znaleziono zlecenia lub checklisty');
    isTogglingChecklistItem = false;
    return;
  }

  const item = order.materialChecklist[itemIndex];
  const oldChecked = item.checked;
  item.checked = !item.checked;
  item.checkedAt = item.checked ? Date.now() : null;
  item.checkedBy = item.checked ? 'Użytkownik' : null;

  console.log('✅ Zmieniono stan:', oldChecked, '→', item.checked, 'dla:', item.itemName);
  
  save();
  console.log('💾 Stan zapisany, odświeżam modal...');
  
  // Zapamiętaj pozycję scrolla przed usunięciem modalu
  const scrollContainer = document.getElementById('checklist-scroll-container');
  if (scrollContainer) {
    window.checklistScrollPosition = scrollContainer.scrollTop;
    console.log('📜 Zapamiętano pozycję scrolla:', window.checklistScrollPosition);
  }
  
  // Usuń stary modal przed utworzeniem nowego
  const oldModal = document.getElementById('custom-modal');
  if (oldModal) {
    oldModal.remove();
  }
  
  // Odśwież modal
  showMaterialChecklist(orderId);
  
  // Odśwież tabelę zleceń aby pokazać zaktualizowany status materiałów
  if (typeof renderOrderPage === 'function') {
    renderOrderPage();
  }
  
  // Odblokuj po krótkim czasie (pozwól modal się wyrenderować)
  setTimeout(() => {
    isTogglingChecklistItem = false;
    console.log('✅ toggleChecklistItem odblokowany');
  }, 100);
}

// Wyświetl modal z materiałami zlecenia i opcją wydania z magazynu
window.showOrderMaterials = function(orderId) {
  console.log('📦 showOrderMaterials:', orderId);
  
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) {
    alert('Nie znaleziono zlecenia');
    return;
  }
  
  if (!order.materialChecklist || order.materialChecklist.length === 0) {
    alert('To zlecenie nie ma przypisanych materiałów');
    return;
  }
  
  const warehouseItems = window.warehouseItems || [];
  const reservations = window.warehouseReservations || [];
  
  // Przygotuj listę materiałów z informacją o dostępności
  const materialsHtml = order.materialChecklist.map((item, idx) => {
    const warehouseItem = warehouseItems.find(w => w.id === item.itemId);
    
    if (!warehouseItem) {
      return `
        <div style="padding:16px;background:#fef2f2;border:2px solid #fecaca;border-radius:8px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:32px">❌</div>
            <div style="flex:1">
              <div style="font-size:16px;font-weight:600;color:#dc2626">${item.itemName}</div>
              <div style="font-size:14px;color:#991b1b;margin-top:4px">Potrzebne: ${item.quantity} ${item.unit}</div>
              <div style="font-size:13px;color:#991b1b;margin-top:4px;font-weight:600">⚠️ Materiał nie znaleziony w magazynie</div>
            </div>
          </div>
        </div>
      `;
    }
    
    const reserved = reservations.filter(r => r.itemId === item.itemId && r.status === 'active').reduce((sum, r) => sum + (r.quantity || 0), 0);
    const available = warehouseItem.quantity - reserved;
    const needed = item.quantity;
    
    let statusIcon = '';
    let statusText = '';
    let statusColor = '';
    let bgColor = '';
    let borderColor = '';
    
    if (available >= needed) {
      statusIcon = '✅';
      statusText = 'Dostępne';
      statusColor = '#16a34a';
      bgColor = '#f0fdf4';
      borderColor = '#bbf7d0';
    } else if (available > 0) {
      statusIcon = '⚠️';
      statusText = `Dostępne tylko ${available} ${item.unit} (brakuje ${needed - available})`;
      statusColor = '#f59e0b';
      bgColor = '#fffbeb';
      borderColor = '#fcd34d';
    } else {
      statusIcon = '❌';
      statusText = 'Brak w magazynie';
      statusColor = '#dc2626';
      bgColor = '#fef2f2';
      borderColor = '#fecaca';
    }
    
    return `
      <div style="padding:16px;background:${bgColor};border:2px solid ${borderColor};border-radius:8px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:32px">${statusIcon}</div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:600;color:#1e293b">${item.itemName}</div>
            <div style="font-size:14px;color:#64748b;margin-top:4px">Potrzebne: <strong>${needed} ${item.unit}</strong></div>
            <div style="font-size:14px;color:#64748b">W magazynie: <strong>${warehouseItem.quantity} ${item.unit}</strong></div>
            ${reserved > 0 ? `<div style="font-size:13px;color:#64748b">Zarezerwowane: <strong>${reserved} ${item.unit}</strong></div>` : ''}
            <div style="font-size:14px;color:${statusColor};margin-top:4px;font-weight:600">${statusText}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Sprawdź czy można wydać materiały (wszystkie dostępne lub częściowo dostępne)
  let canIssue = false;
  let allAvailable = true;
  let hasPartial = false;
  let allZero = true; // Czy wszystkie materiały mają 0 w magazynie
  
  order.materialChecklist.forEach(item => {
    const warehouseItem = warehouseItems.find(w => w.id === item.itemId);
    if (!warehouseItem) {
      allAvailable = false;
      return;
    }
    const reserved = reservations.filter(r => r.itemId === item.itemId && r.status === 'active').reduce((sum, r) => sum + (r.quantity || 0), 0);
    const available = warehouseItem.quantity - reserved;
    
    if (available > 0) {
      canIssue = true;
      allZero = false;
    }
    if (available < item.quantity) {
      allAvailable = false;
      if (available > 0) {
        hasPartial = true;
      }
    }
  });
  
  // Jeśli wszystkie materiały są w magazynie (nawet jeśli quantity=0), pozwól na "obciążenie"
  // To spowoduje dodanie wszystkich do listy zakupów
  const allMaterialsExist = order.materialChecklist.every(item => 
    warehouseItems.find(w => w.id === item.itemId)
  );
  
  if (allMaterialsExist && allZero) {
    canIssue = true; // Pozwól dodać wszystko do listy zakupów
  }
  
  const content = `
    <div style="margin-bottom:16px">
      <div style="font-size:14px;color:#64748b">
        Zlecenie: <strong>${order.name}</strong> | Klient: <strong>${order.client || '-'}</strong>
      </div>
    </div>
    <div style="max-height:500px;overflow-y:auto">
      ${materialsHtml}
    </div>
  `;
  
  const buttons = [];
  
  if (canIssue) {
    let issueText = '🔄 Obciąż magazyn';
    let buttonStyle = 'background:#16a34a;color:white;font-weight:600';
    
    if (allZero) {
      issueText = '🛒 Dodaj wszystko do listy zakupów';
      buttonStyle = 'background:#f59e0b;color:white;font-weight:600';
    } else if (!allAvailable) {
      issueText = '🔄 Obciąż magazyn (częściowo)';
    }
    
    buttons.push({
      text: issueText,
      style: buttonStyle,
      action: () => {
        document.getElementById('custom-modal')?.remove();
        issueOrderMaterials(orderId);
      }
    });
  }
  
  buttons.push({
    text: 'Zamknij',
    action: () => {}
  });
  
  showModal(`📦 Materiały - ${order.name}`, content, buttons);
};

// Blokada wielokrotnego wydawania
let isIssuingMaterials = false;

// Wydanie materiałów z magazynu dla zlecenia (WZ)
function issueOrderMaterials(orderId) {
  if (isIssuingMaterials) {
    console.warn('⚠️ Wydawanie materiałów już w trakcie...');
    return;
  }
  
  isIssuingMaterials = true;
  console.log('🔄 Rozpoczynam wydawanie materiałów dla zlecenia:', orderId);
  
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order || !order.materialChecklist) {
    alert('Nie znaleziono zlecenia lub checklisty');
    isIssuingMaterials = false;
    return;
  }
  
  // Sprawdź czy materiały nie zostały już wydane
  const alreadyIssued = order.materialChecklist.every(item => item.issued);
  if (alreadyIssued) {
    alert('⚠️ Materiały dla tego zlecenia zostały już wydane!');
    isIssuingMaterials = false;
    return;
  }
  
  const warehouseItems = window.warehouseItems || [];
  const warehouseTransactions = window.warehouseTransactions || [];
  const reservations = window.warehouseReservations || [];
  
  // Inicjalizacja listy zakupów jeśli nie istnieje
  if (!window.shoppingList) {
    window.shoppingList = [];
  }
  
  const results = {
    issued: [],        // Wydane materiały
    partial: [],       // Wydane częściowo
    shortage: [],      // Braki dodane do listy zakupów
    notFound: []       // Materiał nie istnieje
  };
  
  // Potwierdź operację
  const confirmMsg = `Czy na pewno chcesz wydać materiały z magazynu dla zlecenia "${order.name}"?\n\nOperacja utworzy dokument WZ i zmniejszy stany magazynowe.`;
  if (!confirm(confirmMsg)) {
    isIssuingMaterials = false;
    return;
  }
  
  // Przetwarzaj każdy materiał
  order.materialChecklist.forEach(item => {
    const warehouseItem = warehouseItems.find(w => w.id === item.itemId);
    
    if (!warehouseItem) {
      results.notFound.push(item);
      // Dodaj do listy zakupów
      addToShoppingList(item.itemId, item.itemName, item.quantity, item.unit, orderId, order.name, 'Materiał nie znaleziony w magazynie');
      results.shortage.push(item);
      return;
    }
    
    const reserved = reservations.filter(r => r.itemId === item.itemId && r.status === 'active').reduce((sum, r) => sum + (r.quantity || 0), 0);
    const available = warehouseItem.quantity - reserved;
    const needed = item.quantity;
    
    if (available <= 0) {
      // Brak w magazynie - dodaj do listy zakupów
      addToShoppingList(item.itemId, item.itemName, needed, item.unit, orderId, order.name, 'Brak w magazynie');
      results.shortage.push(item);
      return;
    }
    
    const issueQty = Math.min(available, needed);
    
    // Utwórz transakcję WZ
    const transaction = {
      id: 'wz-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      itemId: item.itemId,
      itemName: item.itemName,
      type: 'WZ',
      quantity: -issueQty, // ujemna wartość = wydanie
      unit: item.unit,
      date: new Date().toISOString().split('T')[0],
      notes: `Wydanie dla zlecenia: ${order.name}`,
      orderId: orderId,
      createdAt: Date.now()
    };
    
    warehouseTransactions.push(transaction);
    
    // Zmniejsz stan magazynowy
    warehouseItem.quantity -= issueQty;
    
    // Oznacz jako wydane w checkliście
    item.issued = true;
    item.issuedQty = issueQty;
    item.issuedAt = Date.now();
    
    if (issueQty === needed) {
      results.issued.push({...item, issuedQty: issueQty});
    } else {
      results.partial.push({...item, issuedQty: issueQty, shortageQty: needed - issueQty});
      // Dodaj brakującą ilość do listy zakupów
      addToShoppingList(item.itemId, item.itemName, needed - issueQty, item.unit, orderId, order.name, 'Wydano częściowo');
      results.shortage.push({...item, shortageQty: needed - issueQty});
    }
    
    // Oznacz rezerwację jako wykorzystaną (jeśli była)
    const orderReservations = reservations.filter(r => r.itemId === item.itemId && r.orderId === orderId && r.status === 'active');
    orderReservations.forEach(r => {
      r.status = 'used';
      r.usedAt = Date.now();
    });
  });
  
  // Zapisz zmiany
  window.warehouseTransactions = warehouseTransactions;
  window.warehouseReservations = reservations;
  saveWarehouseToStorage();
  save();
  
  console.log('✅ Wydawanie materiałów zakończone:', results);
  
  // Odblokuj
  isIssuingMaterials = false;
  
  // Pokaż raport (odświeżenie tabeli nastąpi po zamknięciu modalu)
  showIssueReport(orderId, results);
}

// Dodaj materiał do listy zakupów
function addToShoppingList(itemId, itemName, quantity, unit, orderId, orderName, reason) {
  if (!window.shoppingList) {
    window.shoppingList = [];
  }
  
  // Sprawdź czy już jest na liście (dla tego samego zlecenia i materiału)
  const existing = window.shoppingList.find(s => 
    s.itemId === itemId && 
    s.orderId === orderId && 
    s.status === 'pending'
  );
  
  if (existing) {
    // Zwiększ ilość
    existing.quantity += quantity;
    existing.updatedAt = Date.now();
    console.log('📝 Zwiększono ilość na liście zakupów:', existing);
  } else {
    // Dodaj nowy wpis
    const item = {
      id: 'shop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      itemId: itemId,
      itemName: itemName,
      quantity: quantity,
      unit: unit,
      orderId: orderId,
      orderName: orderName,
      reason: reason,
      status: 'pending', // pending | ordered | received
      addedAt: Date.now(),
      updatedAt: Date.now()
    };
    window.shoppingList.push(item);
    console.log('📝 Dodano do listy zakupów:', item);
  }
  
  // Zapisz do localStorage
  localStorage.setItem('shoppingList', JSON.stringify(window.shoppingList));
  updateShoppingListBadge();
}

// Pokaż raport wydania materiałów
function showIssueReport(orderId, results) {
  const order = (state.orders || []).find(o => o.id === orderId);
  const orderName = order ? order.name : orderId;
  
  let html = `<div style="max-height:500px;overflow-y:auto">`;
  
  // Wydane w pełni
  if (results.issued.length > 0) {
    html += `<div style="margin-bottom:20px">
      <h4 style="color:#16a34a;margin-bottom:12px">✅ Wydane materiały (${results.issued.length})</h4>`;
    results.issued.forEach(item => {
      html += `<div style="padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:600">${item.itemName}</div>
        <div style="font-size:14px;color:#16a34a">Wydano: ${item.issuedQty} ${item.unit}</div>
      </div>`;
    });
    html += `</div>`;
  }
  
  // Wydane częściowo
  if (results.partial.length > 0) {
    html += `<div style="margin-bottom:20px">
      <h4 style="color:#f59e0b;margin-bottom:12px">⚠️ Wydane częściowo (${results.partial.length})</h4>`;
    results.partial.forEach(item => {
      html += `<div style="padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:600">${item.itemName}</div>
        <div style="font-size:14px;color:#f59e0b">Wydano: ${item.issuedQty} ${item.unit}</div>
        <div style="font-size:14px;color:#dc2626">Brakuje: ${item.shortageQty} ${item.unit} (dodano do listy zakupów)</div>
      </div>`;
    });
    html += `</div>`;
  }
  
  // Braki
  if (results.shortage.length > 0) {
    html += `<div style="margin-bottom:20px">
      <h4 style="color:#dc2626;margin-bottom:12px">🛒 Dodano do listy zakupów (${results.shortage.length})</h4>`;
    results.shortage.forEach(item => {
      const qty = item.shortageQty || item.quantity;
      html += `<div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:600">${item.itemName}</div>
        <div style="font-size:14px;color:#dc2626">Do zamówienia: ${qty} ${item.unit}</div>
      </div>`;
    });
    html += `</div>`;
  }
  
  // Nie znaleziono
  if (results.notFound.length > 0) {
    html += `<div style="margin-bottom:20px">
      <h4 style="color:#dc2626;margin-bottom:12px">❌ Nie znaleziono (${results.notFound.length})</h4>`;
    results.notFound.forEach(item => {
      html += `<div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:600">${item.itemName}</div>
        <div style="font-size:14px;color:#dc2626">Materiał nie istnieje w magazynie (dodano do listy zakupów)</div>
      </div>`;
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  
  showModal(`📄 Raport wydania - ${orderName}`, html, [
    {
      text: '🛒 Pokaż listę zakupów',
      style: 'background:#3b82f6;color:white',
      action: () => {
        document.getElementById('custom-modal')?.remove();
        showShoppingList();
      }
    },
    {
      text: 'Zamknij',
      action: () => {
        // Odśwież tabelę zleceń po zamknięciu raportu
        renderOrderPage();
      }
    }
  ]);
}

// Wyświetl listę zakupów
window.showShoppingList = function() {
  console.log('🛒 showShoppingList');
  
  // Wczytaj listę z localStorage
  if (!window.shoppingList) {
    const stored = localStorage.getItem('shoppingList');
    window.shoppingList = stored ? JSON.parse(stored) : [];
  }
  
  const pending = window.shoppingList.filter(item => item.status === 'pending');
  console.log('📝 Pozycje pending:', pending.length, pending);
  const ordered = window.shoppingList.filter(item => item.status === 'ordered');
  const received = window.shoppingList.filter(item => item.status === 'received');
  
  let html = `<div style="max-height:500px;overflow-y:auto">`;
  
  // Oczekujące zamówienia
  if (pending.length > 0) {
    html += `<div style="margin-bottom:24px">
      <h4 style="color:#f59e0b;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <span>📝 Do zamówienia (${pending.length})</span>
      </h4>`;
    
    // Grupuj po materiale
    const grouped = {};
    pending.forEach(item => {
      // Debug: sprawdź czy itemId istnieje
      if (!item.itemId) {
        console.warn('⚠️ Pozycja bez itemId:', item);
        return; // Pomiń pozycje bez itemId
      }
      
      if (!grouped[item.itemId]) {
        grouped[item.itemId] = {
          itemId: item.itemId,
          itemName: item.itemName,
          unit: item.unit,
          totalQty: 0,
          orders: []
        };
      }
      grouped[item.itemId].totalQty += item.quantity;
      grouped[item.itemId].orders.push(item);
    });
    
    Object.values(grouped).forEach(group => {
      html += `<div style="padding:16px;background:#fffbeb;border:2px solid #fcd34d;border-radius:8px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
          <div>
            <div style="font-size:18px;font-weight:600;color:#1e293b">${group.itemName}</div>
            <div style="font-size:16px;color:#f59e0b;font-weight:600;margin-top:4px">Razem: ${group.totalQty} ${group.unit}</div>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #fcd34d">
          <div style="font-size:13px;color:#64748b;margin-bottom:6px;font-weight:600">Potrzebne dla zleceń:</div>`;
      
      group.orders.forEach(order => {
        html += `<div style="font-size:13px;color:#64748b;margin-bottom:4px">
          • ${order.orderName}: ${order.quantity} ${order.unit} <span style="color:#94a3b8">(${order.reason})</span>
        </div>`;
      });
      
      html += `</div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn primary" onclick="window.markAsOrdered('${group.itemId}')" style="background:#16a34a">✅ Zamówiono</button>
          <button class="btn" onclick="window.removeFromShoppingList('${group.itemId}')" style="background:#dc2626;color:white">🗑️ Usuń</button>
        </div>
      </div>`;
    });
    
    html += `</div>`;
  } else {
    html += `<div style="padding:20px;text-align:center;color:#94a3b8">
      <div style="font-size:48px;margin-bottom:12px">✅</div>
      <div>Brak materiałów do zamówienia</div>
    </div>`;
  }
  
  // Zamówione
  if (ordered.length > 0) {
    html += `<div style="margin-bottom:24px">
      <h4 style="color:#3b82f6;margin-bottom:12px">📦 Zamówione (${ordered.length})</h4>`;
    
    ordered.forEach(item => {
      const orderDate = new Date(item.updatedAt).toLocaleDateString();
      html += `<div style="padding:12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:600">${item.itemName}</div>
        <div style="font-size:14px;color:#3b82f6">Ilość: ${item.quantity} ${item.unit}</div>
        <div style="font-size:13px;color:#64748b">Zlecenie: ${item.orderName}</div>
        <div style="font-size:12px;color:#94a3b8">Zamówiono: ${orderDate}</div>
        <div style="margin-top:8px">
          <button class="btn primary" onclick="window.markAsReceivedFromShoppingList('${item.id}')" style="background:#16a34a">✅ Dostarczono</button>
        </div>
      </div>`;
    });
    
    html += `</div>`;
  }
  
  // Dostarczone (ostatnie 10)
  if (received.length > 0) {
    html += `<div style="margin-bottom:24px">
      <h4 style="color:#16a34a;margin-bottom:12px">✅ Dostarczone (ostatnie ${Math.min(10, received.length)})</h4>`;
    
    received.slice(0, 10).forEach(item => {
      const receiveDate = new Date(item.updatedAt).toLocaleDateString();
      html += `<div style="padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:600">${item.itemName}</div>
        <div style="font-size:14px;color:#16a34a">Ilość: ${item.quantity} ${item.unit}</div>
        <div style="font-size:13px;color:#64748b">Zlecenie: ${item.orderName}</div>
        <div style="font-size:12px;color:#94a3b8">Dostarczono: ${receiveDate}</div>
      </div>`;
    });
    
    html += `</div>`;
  }
  
  html += `</div>`;
  
  showModal('🛒 Lista zakupów', html, [
    {
      text: 'Odśwież',
      action: () => {
        document.getElementById('custom-modal')?.remove();
        window.showShoppingList();
      }
    },
    {
      text: 'Zamknij',
      action: () => {}
    }
  ]);
};

// Oznacz materiał jako zamówiony (wszystkie oczekujące pozycje tego materiału)
window.markAsOrdered = function(itemId) {
  if (!window.shoppingList) return;
  
  let updated = 0;
  window.shoppingList.forEach(item => {
    if (item.itemId === itemId && item.status === 'pending') {
      item.status = 'ordered';
      item.updatedAt = Date.now();
      updated++;
    }
  });
  
  localStorage.setItem('shoppingList', JSON.stringify(window.shoppingList));
  updateShoppingListBadge();
  console.log(`✅ Oznaczono ${updated} pozycji jako zamówione`);
  
  // Odśwież modal
  document.getElementById('custom-modal')?.remove();
  window.showShoppingList();
};

// Oznacz materiał jako dostarczony (LISTA ZAKUPÓW - stara funkcja)
window.markAsReceivedFromShoppingList = function(itemId) {
  if (!window.shoppingList) return;
  
  const item = window.shoppingList.find(i => i.id === itemId);
  if (!item) return;
  
  item.status = 'received';
  item.updatedAt = Date.now();
  
  localStorage.setItem('shoppingList', JSON.stringify(window.shoppingList));
  updateShoppingListBadge();
  console.log('✅ Oznaczono jako dostarczone:', item.itemName);
  
  // Opcjonalnie: dodaj do magazynu (PZ)
  const addToWarehouse = confirm(`Czy chcesz dodać "${item.itemName}" (${item.quantity} ${item.unit}) do magazynu?\n\nZostanie utworzony dokument PZ.`);
  
  if (addToWarehouse) {
    const warehouseItems = window.warehouseItems || [];
    const warehouseItem = warehouseItems.find(w => w.id === item.itemId);
    
    if (warehouseItem) {
      // Zwiększ stan
      warehouseItem.quantity += item.quantity;
      
      // Utwórz transakcję PZ
      const transaction = {
        id: 'pz-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        itemId: item.itemId,
        itemName: item.itemName,
        type: 'PZ',
        quantity: item.quantity,
        unit: item.unit,
        date: new Date().toISOString().split('T')[0],
        notes: `Przyjęcie z listy zakupów (zlecenie: ${item.orderName})`,
        orderId: item.orderId,
        createdAt: Date.now()
      };
      
      if (!window.warehouseTransactions) {
        window.warehouseTransactions = [];
      }
      window.warehouseTransactions.push(transaction);
      
      saveWarehouseToStorage();
      console.log('✅ Dodano do magazynu:', item.itemName, '+', item.quantity, item.unit);
      alert(`✅ Dodano ${item.itemName} (+${item.quantity} ${item.unit}) do magazynu`);
    } else {
      alert('⚠️ Materiał nie istnieje w magazynie. Najpierw dodaj go ręcznie.');
    }
  }
  
  // Odśwież modal
  document.getElementById('custom-modal')?.remove();
  window.showShoppingList();
};

// Usuń z listy zakupów (wszystkie oczekujące pozycje tego materiału)
window.removeFromShoppingList = function(itemId) {
  if (!window.shoppingList) return;
  
  const toRemove = window.shoppingList.filter(i => i.itemId === itemId && i.status === 'pending');
  
  if (toRemove.length === 0) return;
  
  const confirmMsg = `Czy na pewno usunąć ${toRemove.length} pozycji materiału "${toRemove[0].itemName}" z listy zakupów?`;
  if (!confirm(confirmMsg)) return;
  
  window.shoppingList = window.shoppingList.filter(i => !(i.itemId === itemId && i.status === 'pending'));
  
  localStorage.setItem('shoppingList', JSON.stringify(window.shoppingList));
  updateShoppingListBadge();
  console.log('🗑️ Usunięto z listy zakupów:', toRemove.length, 'pozycji');
  
  // Odśwież modal
  document.getElementById('custom-modal')?.remove();
  window.showShoppingList();
};

// Auto-rezerwacja materiałów z checklisty
function autoReserveFromChecklist(orderId) {
  console.log('🔒 Rozpoczynam auto-rezerwację dla zlecenia:', orderId);
  
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order || !order.materialChecklist) {
    alert('Nie znaleziono zlecenia lub checklisty');
    return;
  }

  // Pobierz tylko zaznaczone materiały
  const checkedItems = order.materialChecklist.filter(item => item.checked);
  
  if (checkedItems.length === 0) {
    alert('Nie zaznaczono żadnych materiałów do rezerwacji');
    return;
  }

  const results = {
    reserved: [],      // Udane rezerwacje
    insufficient: [],  // Niewystarczająca ilość
    notFound: []       // Materiał nie istnieje w magazynie
  };

  // Sprawdź każdy zaznaczony materiał
  checkedItems.forEach(item => {
    const warehouseItem = (window.warehouseItems || []).find(w => w.id === item.itemId);
    
    if (!warehouseItem) {
      results.notFound.push({
        orderId: orderId,
        orderName: order.name,
        name: item.itemName,
        needed: item.quantity,
        unit: item.unit
      });
      return;
    }

    // Oblicz dostępną ilość (zapas - już zarezerwowane)
    const existingReservations = (window.warehouseReservations || [])
      .filter(r => r.itemId === item.itemId && r.status === 'active')
      .reduce((sum, r) => sum + r.quantity, 0);
    
    const available = warehouseItem.quantity - existingReservations;

    if (available < item.quantity) {
      results.insufficient.push({
        orderId: orderId,
        orderName: order.name,
        name: item.itemName,
        needed: item.quantity,
        available: available,
        unit: item.unit
      });
      return;
    }

    // Utwórz rezerwację
    const reservation = {
      id: generateId(),
      itemId: item.itemId,
      itemName: item.itemName,
      orderId: orderId,
      orderName: order.name,
      quantity: item.quantity,
      unit: item.unit,
      status: 'active',
      createdAt: Date.now(),
      createdBy: 'Auto-rezerwacja'
    };

    if (!window.warehouseReservations) {
      window.warehouseReservations = [];
    }
    window.warehouseReservations.push(reservation);

    results.reserved.push({
      orderId: orderId,
      orderName: order.name,
      name: item.itemName,
      quantity: item.quantity,
      unit: item.unit
    });

    console.log('✅ Zarezerwowano:', item.itemName, item.quantity, item.unit);
  });

  // Zapisz stan magazynu
  saveWarehouseToStorage();
  
  console.log('💾 Stan zapisany, rezerwacji w localStorage:', window.warehouseReservations.length);
  console.log('📋 Wszystkie rezerwacje:', window.warehouseReservations);
  
  // Przełącz na zakładkę Rezerwacje i odśwież widok
  if (typeof switchWarehouseTab === 'function') {
    console.log('🔄 Przełączam na zakładkę Rezerwacje...');
    switchWarehouseTab('reservations');
  } else if (typeof renderReservations === 'function') {
    console.log('🔄 Odświeżam widok rezerwacji...');
    renderReservations();
  } else {
    console.warn('⚠️ Brak dostępnych funkcji do odświeżenia!');
  }
  
  // Odśwież tabelę zleceń (jeśli jest dostępna w tym scope)
  try {
    if (typeof renderOrderPage === 'function') {
      console.log('🔄 Odświeżam tabelę zleceń...');
      renderOrderPage();
    }
  } catch (e) {
    console.log('ℹ️ renderOrderPage nie jest dostępna w tym kontekście (to normalne)');
  }

  // Zmień kolor przycisku na zielony
  const modal = document.getElementById('custom-modal');
  if (modal) {
    const buttons = modal.querySelectorAll('.btn');
    buttons.forEach(btn => {
      if (btn.textContent.includes('Auto-rezerwuj')) {
        btn.style.background = '#16a34a';
        btn.style.color = '#ffffff';
        btn.style.border = '2px solid #16a34a';
        btn.textContent = '✅ Zarezerwowano';
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        btn.style.opacity = '0.8';
      }
    });
  }

  // Pokaż raport
  showReservationReport(results);
}

// Pokaż raport z rezerwacji
function showReservationReport(results) {
  let html = '<div style="font-family:system-ui,-apple-system,sans-serif">';

  // Sekcja: Zarezerwowano
  if (results.reserved.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h4 style="color:#16a34a;margin:0 0 10px 0;display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">✅</span>
          <span>Zarezerwowano (${results.reserved.length})</span>
        </h4>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:10px">
          ${results.reserved.map(r => `
            <div style="padding:6px 0;border-bottom:1px solid #86efac40">
              <strong>${r.name}</strong> - ${r.quantity} ${r.unit}
              ${r.orderId ? `<div style="color:#059669;font-size:11px;margin-top:2px;cursor:pointer;text-decoration:underline" onclick="document.getElementById('custom-modal').remove(); window.showMaterialChecklist('${r.orderId}')">📋 Zlecenie: ${r.orderName}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Sekcja: Niewystarczająca ilość
  if (results.insufficient.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h4 style="color:#f59e0b;margin:0 0 10px 0;display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">⚠️</span>
          <span>Niewystarczająca ilość (${results.insufficient.length})</span>
        </h4>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px">
          ${results.insufficient.map(r => `
            <div style="padding:6px 0;border-bottom:1px solid #fcd34d40">
              <strong>${r.name}</strong><br>
              <span style="font-size:13px;color:#92400e">
                Potrzeba: ${r.needed} ${r.unit} | Dostępne: ${r.available} ${r.unit}
              </span>
              ${r.orderId ? `<div style="color:#b45309;font-size:11px;margin-top:2px;cursor:pointer;text-decoration:underline" onclick="document.getElementById('custom-modal').remove(); window.showMaterialChecklist('${r.orderId}')">📋 Zlecenie: ${r.orderName}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Sekcja: Nie znaleziono
  if (results.notFound.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h4 style="color:#dc2626;margin:0 0 10px 0;display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">❌</span>
          <span>Nie znaleziono w magazynie (${results.notFound.length})</span>
        </h4>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px">
          ${results.notFound.map(r => `
            <div style="padding:6px 0;border-bottom:1px solid #fca5a540">
              <strong>${r.name}</strong> - ${r.needed} ${r.unit}
              ${r.orderId ? `<div style="color:#dc2626;font-size:11px;margin-top:2px;cursor:pointer;text-decoration:underline" onclick="document.getElementById('custom-modal').remove(); window.showMaterialChecklist('${r.orderId}')">📋 Zlecenie: ${r.orderName}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';

  showModal('📊 Raport rezerwacji', html, [
    { 
      text: 'OK', 
      action: () => {
        // Odśwież tabelę zleceń po zamknięciu raportu
        if (typeof renderOrderPage === 'function') {
          renderOrderPage();
          console.log('✅ Tabela zleceń odświeżona po zamknięciu raportu');
        }
      } 
    }
  ]);
}

// Auto-rezerwacja dla wszystkich zleceń
function autoReserveForOrders() {
  console.log('⚡ Rozpoczynam auto-rezerwację dla wszystkich zleceń...');
  
  if (!state.orders || state.orders.length === 0) {
    alert('Brak zleceń do przetworzenia');
    return;
  }

  // Zbierz wszystkie zlecenia z procesami i szablonami
  const ordersToProcess = [];
  
  state.orders.forEach(order => {
    if (!order.processId) return;
    
    const process = (state.processes || []).find(p => p.id === order.processId);
    if (!process || !process.materialTemplateId) return;
    
    const template = (window.materialTemplates || []).find(t => t.id === process.materialTemplateId);
    if (!template) return;
    
    ordersToProcess.push({
      order: order,
      process: process,
      template: template
    });
  });

  if (ordersToProcess.length === 0) {
    alert('Nie znaleziono zleceń z przypisanymi szablonami materiałowymi');
    return;
  }

  const globalResults = {
    reserved: [],
    insufficient: [],
    notFound: [],
    ordersProcessed: 0
  };

  // Przetwórz każde zlecenie
  ordersToProcess.forEach(({ order, process, template }) => {
    console.log(`📋 Przetwarzam zlecenie: ${order.name}`);
    
    // Inicjalizuj checklistę jeśli nie istnieje
    if (!order.materialChecklist) {
      order.materialChecklist = template.materials.map((m) => ({
        itemId: m.itemId,
        itemName: m.itemName,
        quantity: m.quantity,
        unit: m.unit,
        checked: false,
        checkedAt: null,
        checkedBy: null
      }));
    }

    // Przetwórz wszystkie materiały z szablonu (nie tylko zaznaczone)
    template.materials.forEach(material => {
      const warehouseItem = (window.warehouseItems || []).find(w => w.id === material.itemId);
      
      if (!warehouseItem) {
        globalResults.notFound.push({
          orderId: order.id,
          orderName: order.name,
          name: material.itemName,
          needed: material.quantity,
          unit: material.unit
        });
        return;
      }

      // Oblicz dostępną ilość
      const existingReservations = (window.warehouseReservations || [])
        .filter(r => r.itemId === material.itemId && r.status === 'active')
        .reduce((sum, r) => sum + r.quantity, 0);
      
      const available = warehouseItem.quantity - existingReservations;

      // Sprawdź czy już jest rezerwacja dla tego zlecenia i materiału
      const existingReservation = (window.warehouseReservations || [])
        .find(r => r.orderId === order.id && r.itemId === material.itemId && r.status === 'active');

      if (existingReservation) {
        console.log(`ℹ️ Rezerwacja już istnieje dla ${material.itemName} w zleceniu ${order.name}`);
        return;
      }

      if (available < material.quantity) {
        globalResults.insufficient.push({
          orderId: order.id,
          orderName: order.name,
          name: material.itemName,
          needed: material.quantity,
          available: available,
          unit: material.unit
        });
        return;
      }

      // Utwórz rezerwację
      const reservation = {
        id: generateId(),
        itemId: material.itemId,
        itemName: material.itemName,
        orderId: order.id,
        orderName: order.name,
        quantity: material.quantity,
        unit: material.unit,
        status: 'active',
        createdAt: Date.now(),
        createdBy: 'Auto-rezerwacja (dla zleceń)'
      };

      if (!window.warehouseReservations) {
        window.warehouseReservations = [];
      }
      window.warehouseReservations.push(reservation);

      globalResults.reserved.push({
        orderId: order.id,
        orderName: order.name,
        name: material.itemName,
        quantity: material.quantity,
        unit: material.unit
      });

      console.log(`✅ Zarezerwowano: ${material.itemName} (${material.quantity} ${material.unit}) dla ${order.name}`);
    });

    globalResults.ordersProcessed++;
  });

  // Zapisz stan magazynu
  saveWarehouseToStorage();
  
  console.log('💾 Stan zapisany, rezerwacji w localStorage:', window.warehouseReservations.length);
  
  // Przełącz na zakładkę Rezerwacje i odśwież widok
  if (typeof switchWarehouseTab === 'function') {
    console.log('🔄 Przełączam na zakładkę Rezerwacje...');
    switchWarehouseTab('reservations');
  } else if (typeof renderReservations === 'function') {
    console.log('🔄 Odświeżam widok rezerwacji...');
    renderReservations();
  }
  
  // Odśwież tabelę zleceń (jeśli jest dostępna)
  try {
    if (typeof renderOrderPage === 'function') {
      renderOrderPage();
    }
  } catch (e) {
    // ignoruj błędy scope
  }

  // Pokaż globalny raport
  showGlobalReservationReport(globalResults, ordersToProcess.length);
}

// Pokaż globalny raport z rezerwacji dla wszystkich zleceń
function showGlobalReservationReport(results, totalOrders) {
  let html = '<div style="font-family:system-ui,-apple-system,sans-serif">';

  html += `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-bottom:20px">
      <strong>Przetworzono zleceń:</strong> ${results.ordersProcessed} / ${totalOrders}
    </div>
  `;

  // Sekcja: Zarezerwowano
  if (results.reserved.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h4 style="color:#16a34a;margin:0 0 10px 0;display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">✅</span>
          <span>Zarezerwowano (${results.reserved.length})</span>
        </h4>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:10px;max-height:300px;overflow-y:auto">
          ${results.reserved.map(r => `
            <div style="padding:6px 0;border-bottom:1px solid #86efac40;font-size:13px">
              <strong>${r.name}</strong> - ${r.quantity} ${r.unit}
              <div style="color:#059669;font-size:11px">Zlecenie: ${r.orderName}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Sekcja: Niewystarczająca ilość
  if (results.insufficient.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h4 style="color:#f59e0b;margin:0 0 10px 0;display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">⚠️</span>
          <span>Niewystarczająca ilość (${results.insufficient.length})</span>
        </h4>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px;max-height:300px;overflow-y:auto">
          ${results.insufficient.map(r => `
            <div style="padding:6px 0;border-bottom:1px solid #fcd34d40;font-size:13px">
              <strong>${r.name}</strong><br>
              <span style="font-size:12px;color:#92400e">
                Potrzeba: ${r.needed} ${r.unit} | Dostępne: ${r.available} ${r.unit}
              </span>
              <div style="color:#b45309;font-size:11px">Zlecenie: ${r.orderName}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Sekcja: Nie znaleziono
  if (results.notFound.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h4 style="color:#dc2626;margin:0 0 10px 0;display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">❌</span>
          <span>Nie znaleziono w magazynie (${results.notFound.length})</span>
        </h4>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px;max-height:300px;overflow-y:auto">
          ${results.notFound.map(r => `
            <div style="padding:6px 0;border-bottom:1px solid #fca5a540;font-size:13px">
              <strong>${r.name}</strong> - ${r.needed} ${r.unit}
              <div style="color:#dc2626;font-size:11px">Zlecenie: ${r.orderName}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';

  showModal('📊 Raport masowej rezerwacji', html, [
    { text: 'OK', action: () => {
      // Odśwież widok rezerwacji
      if (typeof renderReservations === 'function') {
        renderReservations();
      }
    }}
  ]);
}

// Migracja starych szablonów (naprawa błędnych ID)
function migrateTemplateIds() {
  console.log('🔧 Rozpoczynam migrację szablonów materiałowych...');
  
  if (!window.materialTemplates || window.materialTemplates.length === 0) {
    console.log('ℹ️ Brak szablonów do migracji');
    return { migrated: 0, failed: 0 };
  }

  let migratedCount = 0;
  let failedCount = 0;

  window.materialTemplates.forEach(template => {
    console.log(`📋 Sprawdzam szablon: ${template.name}`);
    
    let templateChanged = false;

    template.materials.forEach((material, idx) => {
      // Sprawdź czy itemId to liczba mała (prawdopodobnie indeks)
      if (typeof material.itemId === 'number' && material.itemId < 1000) {
        // Spróbuj znaleźć materiał po nazwie
        const matchingItem = (window.warehouseItems || []).find(w => w.name === material.itemName);
        
        if (matchingItem) {
          console.log(`✅ Naprawiam: ${material.itemName} (${material.itemId} → ${matchingItem.id})`);
          material.itemId = matchingItem.id;
          templateChanged = true;
        } else {
          console.warn(`⚠️ Nie znaleziono materiału: ${material.itemName}`);
          failedCount++;
        }
      }
    });

    if (templateChanged) {
      migratedCount++;
      template.migratedAt = Date.now();
    }
  });

  if (migratedCount > 0) {
    saveWarehouseToStorage();
    console.log(`✅ Zmigrowano ${migratedCount} szablonów`);
  }

  if (failedCount > 0) {
    console.warn(`⚠️ Nie udało się naprawić ${failedCount} materiałów`);
  }

  return { migrated: migratedCount, failed: failedCount };
}

// Diagnoza szablonów - pokaż szczegóły
function diagnoseShablon() {
  let html = '<div style="font-family:monospace;font-size:12px">';
  
  html += '<h3>📊 Diagnoza szablonów materiałowych</h3>';
  
  html += `<p><strong>Liczba szablonów:</strong> ${(window.materialTemplates || []).length}</p>`;
  html += `<p><strong>Liczba pozycji magazynowych:</strong> ${(window.warehouseItems || []).length}</p><hr>`;
  
  (window.materialTemplates || []).forEach((template, idx) => {
    html += `<div style="margin-bottom:20px;padding:10px;background:#f0f0f0;border-radius:6px">`;
    html += `<h4>Szablon #${idx + 1}: "${template.name}"</h4>`;
    html += `<p><strong>ID szablonu:</strong> ${template.id}</p>`;
    html += `<p><strong>Liczba materiałów:</strong> ${template.materials.length}</p>`;
    
    template.materials.forEach((mat, matIdx) => {
      const warehouseItem = (window.warehouseItems || []).find(w => w.id === mat.itemId);
      const status = warehouseItem ? '✅ OK' : '❌ NIE ZNALEZIONO';
      const color = warehouseItem ? '#16a34a' : '#dc2626';
      
      html += `<div style="margin:5px 0;padding:5px;background:white;border-left:3px solid ${color}">`;
      html += `<strong>${matIdx + 1}. ${mat.itemName}</strong><br>`;
      html += `itemId: <code>${mat.itemId}</code> (typ: ${typeof mat.itemId})<br>`;
      html += `ilość: ${mat.quantity} ${mat.unit}<br>`;
      html += `<span style="color:${color}">${status}</span>`;
      
      if (!warehouseItem && typeof mat.itemId === 'number' && mat.itemId < 100) {
        html += `<br><span style="color:#f59e0b">⚠️ To wygląda na indeks (${mat.itemId}), a nie ID!</span>`;
        
        // Spróbuj znaleźć po nazwie
        const byName = (window.warehouseItems || []).find(w => w.name === mat.itemName);
        if (byName) {
          html += `<br><span style="color:#059669">💡 Znaleziono w magazynie po nazwie! Prawdziwe ID: ${byName.id}</span>`;
        }
      }
      
      html += '</div>';
    });
    
    html += '</div>';
  });
  
  html += '</div>';
  
  showModal('🔍 Diagnoza szablonów', html, [
    { text: 'Zamknij', action: () => {} }
  ]);
}

// Automatyczna migracja przy starcie (jeśli potrzebna)
function autoMigrateIfNeeded() {
  // Sprawdź czy są szablony do migracji
  const needsMigration = (window.materialTemplates || []).some(template => 
    template.materials.some(m => typeof m.itemId === 'number' && m.itemId < 1000 && !template.migratedAt)
  );

  if (needsMigration) {
    console.log('🔍 Wykryto stare szablony, uruchamiam migrację...');
    const result = migrateTemplateIds();
    
    if (result.migrated > 0) {
      alert(`✅ Automatycznie naprawiono ${result.migrated} szablonów materiałowych.\n\nTwoje szablony zostały zaktualizowane i teraz używają poprawnych ID z magazynu.`);
    }
    
    if (result.failed > 0) {
      alert(`⚠️ ${result.failed} materiałów nie udało się naprawić.\n\nNie znaleziono ich w magazynie. Sprawdź czy wszystkie materiały z szablonów istnieją w zakładce "Pozycje".`);
    }
  }
}

// Odśwież wszystkie checklisty zleceń z szablonów
function refreshAllChecklists() {
  if (!confirm('⚠️ To usunie wszystkie stare checklisty i wygeneruje je na nowo z aktualnych szablonów.\n\nKontynuować?')) {
    return;
  }
  
  console.log('♻️ Odświeżam checklisty dla wszystkich zleceń...');
  
  let refreshed = 0;
  let skipped = 0;
  let errors = 0;
  
  (state.orders || []).forEach(order => {
    if (!order.processId) {
      skipped++;
      return;
    }
    
    const process = (state.processes || []).find(p => p.id === order.processId);
    if (!process || !process.materialTemplateId) {
      skipped++;
      return;
    }
    
    const template = (window.materialTemplates || []).find(t => t.id === process.materialTemplateId);
    if (!template) {
      console.warn(`⚠️ Nie znaleziono szablonu ${process.materialTemplateId} dla procesu ${process.name}`);
      errors++;
      return;
    }
    
    // Usuń stary checklist i utwórz nowy
    order.materialChecklist = template.materials.map((m) => ({
      itemId: m.itemId,
      itemName: m.itemName,
      quantity: m.quantity,
      unit: m.unit,
      checked: false,
      checkedAt: null,
      checkedBy: null
    }));
    
    refreshed++;
    console.log(`✅ Odświeżono checklist dla zlecenia: ${order.name}`);
  });
  
  if (refreshed > 0) {
    save();
    alert(`✅ Odświeżono ${refreshed} checklistów\n⏭️ Pominięto: ${skipped}\n❌ Błędy: ${errors}\n\nChecklisty zostały wygenerowane na nowo z aktualnych szablonów.`);
  } else {
    alert(`ℹ️ Nie znaleziono checklistów do odświeżenia.\n⏭️ Pominięto: ${skipped}\n❌ Błędy: ${errors}`);
  }
}

// Przypisz funkcje do window (dla kompatybilności z istniejącymi wywołaniami)
window.showMaterialChecklist = showMaterialChecklist;
window.toggleChecklistItem = toggleChecklistItem;
window.autoReserveFromChecklist = autoReserveFromChecklist;
window.autoReserveForOrders = autoReserveForOrders;
window.migrateTemplateIds = migrateTemplateIds;
window.diagnoseShablon = diagnoseShablon;
window.refreshAllChecklists = refreshAllChecklists;

// Uruchom auto-migrację po załadowaniu
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(autoMigrateIfNeeded, 1000);
  });
} else {
  setTimeout(autoMigrateIfNeeded, 1000);
}
