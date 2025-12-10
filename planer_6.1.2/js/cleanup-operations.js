/**
 * Skrypt do naprawy katalogu operacji
 * Uruchom w konsoli przeglądarki na stronie planera
 * 
 * Użycie:
 * 1. Otwórz planer w przeglądarce
 * 2. Otwórz konsolę (F12 -> Console)
 * 3. Wklej zawartość tego pliku lub załaduj: 
 *    const s = document.createElement('script'); s.src='js/cleanup-operations.js'; document.body.appendChild(s);
 */

(function() {
    console.log('🔧 NAPRAWA KATALOGU OPERACJI - START');
    
    // 1. Pokaż aktualny stan
    const localOps = (window.state && window.state.operationsCatalog) || [];
    console.log(`📊 Aktualna liczba operacji w state: ${localOps.length}`);
    
    // 2. Pokaż duplikaty (operacje o tej samej nazwie)
    const nameCount = {};
    const duplicates = [];
    localOps.forEach(op => {
        const key = (op.name || '').toLowerCase().trim();
        if (!key) return;
        nameCount[key] = (nameCount[key] || 0) + 1;
        if (nameCount[key] > 1) {
            duplicates.push({ name: op.name, id: op.id, count: nameCount[key] });
        }
    });
    
    if (duplicates.length > 0) {
        console.log(`⚠️ Znaleziono ${duplicates.length} duplikatów:`, duplicates);
    } else {
        console.log('✅ Brak duplikatów po nazwie');
    }
    
    // 3. Pokaż wszystkie unikalne nazwy operacji
    const uniqueNames = [...new Set(localOps.map(op => op.name))].sort();
    console.log(`📋 Unikalne nazwy operacji (${uniqueNames.length}):`, uniqueNames);
    
    // 4. Funkcja do czyszczenia do wybranych operacji
    window.cleanupOperations = function(keepNames) {
        if (!Array.isArray(keepNames) || keepNames.length === 0) {
            console.error('❌ Podaj listę nazw operacji do zachowania');
            return;
        }
        
        const keepSet = new Set(keepNames.map(n => n.toLowerCase().trim()));
        const before = window.state.operationsCatalog.length;
        
        // Zachowaj tylko operacje z listy
        window.state.operationsCatalog = window.state.operationsCatalog.filter(op => {
            const key = (op.name || '').toLowerCase().trim();
            return keepSet.has(key);
        });
        
        // Przenumeruj
        window.state.operationsCatalog.forEach((op, i) => { op.no = i + 1; });
        
        const after = window.state.operationsCatalog.length;
        console.log(`🧹 Wyczyszczono: ${before} -> ${after} operacji`);
        
        // Zapisz
        if (typeof save === 'function') save();
        if (typeof renderOps === 'function') renderOps();
        
        return window.state.operationsCatalog;
    };
    
    // 5. Funkcja do deduplikacji
    window.dedupeOperationsNow = function() {
        const before = window.state.operationsCatalog.length;
        const seen = new Set();
        const deduped = [];
        
        window.state.operationsCatalog.forEach(op => {
            const key = (op.name || '').toLowerCase().trim();
            if (!key || seen.has(key)) {
                console.log(`🗑️ Usuwam duplikat: "${op.name}" (ID: ${op.id})`);
                return;
            }
            seen.add(key);
            deduped.push(op);
        });
        
        // Przenumeruj
        deduped.forEach((op, i) => { op.no = i + 1; });
        
        window.state.operationsCatalog = deduped;
        
        const after = window.state.operationsCatalog.length;
        console.log(`✅ Deduplikacja: ${before} -> ${after} operacji (usunięto ${before - after})`);
        
        // Zapisz
        if (typeof save === 'function') save();
        if (typeof renderOps === 'function') renderOps();
        
        return window.state.operationsCatalog;
    };
    
    // 6. Funkcja do synchronizacji z Firebase (nadpisanie)
    window.pushOperationsToFirebase = async function() {
        if (!window.firestore) {
            console.error('❌ Brak połączenia z Firebase');
            return;
        }
        
        const ops = window.state.operationsCatalog || [];
        console.log(`📤 Wysyłam ${ops.length} operacji do Firebase...`);
        
        try {
            const r = window.fbRoot ? window.fbRoot() : null;
            if (!r) {
                console.error('❌ Brak fbRoot()');
                return;
            }
            
            const colRef = r.collection('operationsCatalog');
            
            // Pobierz istniejące dokumenty
            const existing = await colRef.get();
            const existingIds = existing.docs.map(d => d.id);
            console.log(`📥 W Firebase jest ${existingIds.length} operacji`);
            
            // Usuń wszystkie istniejące
            const batch1 = window.firestore.batch();
            existing.docs.forEach(doc => {
                batch1.delete(doc.ref);
            });
            await batch1.commit();
            console.log(`🗑️ Usunięto ${existingIds.length} starych operacji z Firebase`);
            
            // Dodaj nowe
            const batch2 = window.firestore.batch();
            ops.forEach(op => {
                const docRef = colRef.doc(op.id);
                batch2.set(docRef, JSON.parse(JSON.stringify(op)));
            });
            await batch2.commit();
            console.log(`✅ Dodano ${ops.length} operacji do Firebase`);
            
            // Aktualizuj timestamp
            const metaRef = r.collection('metadata').doc('sync');
            await metaRef.set({ lastModified: Date.now() }, { merge: true });
            
            console.log('✅ Synchronizacja zakończona!');
        } catch (err) {
            console.error('❌ Błąd synchronizacji:', err);
        }
    };
    
    // Pokaż instrukcje
    console.log('');
    console.log('🛠️ DOSTĘPNE KOMENDY:');
    console.log('  dedupeOperationsNow()     - Usuń duplikaty po nazwie');
    console.log('  pushOperationsToFirebase() - Wyślij oczyszczone operacje do Firebase');
    console.log('  cleanupOperations([...])  - Zachowaj tylko operacje z podanej listy');
    console.log('');
})();
