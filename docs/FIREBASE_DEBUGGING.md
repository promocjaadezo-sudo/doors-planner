# 🔍 Firebase Debugging Guide

## Overview
This guide provides comprehensive instructions for debugging Firestore data persistence issues in the Doors Planner application.

## Quick Start

### Enable Debug Mode
```javascript
// In browser console
window.firebaseDebug.enableDebugMode(true);
```

When debug mode is enabled, all Firebase operations will log detailed information including:
- Operation timestamps
- Duration of operations
- Document counts
- Error details
- Data comparisons

### Check Operation History
```javascript
// View recent operations
window.firebaseDebug.printOperationHistory();

// Get raw data
const history = window.firebaseDebug.getOperationHistory();
console.log(history);

// Clear history
window.firebaseDebug.clearOperationHistory();
```

## Common Debugging Scenarios

### 1. Data Not Persisting After Save

**Symptoms:**
- Changes disappear after page reload
- Data exists in localStorage but not in Firestore
- No errors in console

**Debugging Steps:**

1. Check if Firebase is initialized:
```javascript
console.log(firebase.apps.length); // Should be > 0
console.log(firebase.auth().currentUser); // Should not be null
```

2. Compare local vs remote data:
```javascript
const state = window.state || window.store;
const comparison = await window.firebaseDebug.compareLocalAndRemoteData(state);
console.table(comparison.differences);
```

3. Check operation history for errors:
```javascript
window.firebaseDebug.printOperationHistory();
```

4. Look for specific error patterns:
```javascript
const history = window.firebaseDebug.getOperationHistory();
const errors = history.filter(op => op.operation.includes('ERROR'));
console.log('Errors:', errors);
```

### 2. Deleted Items Reappearing

**Symptoms:**
- Items deleted locally come back after refresh
- Firestore still contains deleted documents

**Debugging Steps:**

1. Enable debug mode to track delete operations:
```javascript
window.firebaseDebug.enableDebugMode(true);
```

2. Delete an item and check the logs for SAVE operations

3. Verify the item was actually deleted from Firestore:
```javascript
const state = window.state || window.store;
const comparison = await window.firebaseDebug.compareLocalAndRemoteData(state);
```

4. Check if auto-load is overwriting local changes:
- Look for `LOAD_SKIPPED` in operation history
- Check timestamps: `comparison.local.timestamp` vs `comparison.remote.timestamp`

### 3. Timestamp Synchronization Issues

**Symptoms:**
- Local data newer than remote but still being overwritten
- Inconsistent timestamps between devices

**Debugging Steps:**

1. Check current timestamps:
```javascript
const state = window.state || window.store;
console.log('Local timestamp:', new Date(state.lastModified).toISOString());

const comparison = await window.firebaseDebug.compareLocalAndRemoteData(state);
console.log('Remote timestamp:', new Date(comparison.remote.timestamp).toISOString());
```

2. Monitor timestamp updates:
```javascript
window.firebaseDebug.enableDebugMode(true);
// Make a change
// Check logs for SAVE_SUCCESS with timestamp
```

3. Verify metadata is being saved:
```javascript
// Check Firestore console for metadata/sync document
// Or query directly:
const { appId, userId } = state.storage;
const metadataRef = firebase.firestore()
  .collection('planner').doc(appId)
  .collection('users').doc(userId)
  .collection('metadata').doc('sync');
  
const snap = await metadataRef.get();
console.log('Metadata:', snap.data());
```

### 4. Data Inconsistencies Between Collections

**Symptoms:**
- Some collections sync, others don't
- Document counts don't match

**Debugging Steps:**

1. Run comprehensive comparison:
```javascript
const state = window.state || window.store;
const comparison = await window.firebaseDebug.compareLocalAndRemoteData(state);

// View all differences
console.table(comparison.differences);

// Check specific collections
console.log('Orders - Local:', comparison.local.counts.orders);
console.log('Orders - Remote:', comparison.remote.counts.orders);
```

2. Verify data consistency:
```javascript
const isConsistent = await window.firebaseDebug.verifyDataConsistency(state);
console.log('Is consistent:', isConsistent);
```

3. Check for partial save failures:
```javascript
const history = window.firebaseDebug.getOperationHistory();
const saveOps = history.filter(op => op.operation === 'SAVE_SUCCESS' || op.operation === 'SAVE_COMMIT_ERROR');
console.log('Save operations:', saveOps);
```

## Understanding Log Messages

### Success Messages
- ✅ `Firebase zainicjalizowany i uwierzytelniony` - Firebase is ready
- ✅ `Zapisano X dokumentów do Firebase` - Save completed successfully
- ✅ `Wczytano X dokumentów z Firebase` - Load completed successfully
- ✅ `Data is consistent between local and remote` - No discrepancies found

### Warning Messages
- ⚠️ `Lokalne dane nowsze - POMIJAM wczytywanie` - Local data is newer, skipping load (normal)
- ⚠️ `Nie można wczytać metadanych` - Metadata not found (may be first run)
- ⚠️ `Data inconsistencies detected` - Local and remote data don't match

### Error Messages
- ❌ `saveToDB: missing appId or userId` - Configuration error
- ❌ `Błąd zapisu do Firebase` - Save failed, check network/permissions
- ❌ `Błąd wczytywania z Firebase` - Load failed, check network/authentication

## Operation History Format

Each operation in the history includes:

```javascript
{
  timestamp: "2025-11-01T13:28:03.734Z",  // When it happened
  operation: "SAVE_SUCCESS",               // What operation
  duration: 1234,                          // How long (ms)
  collections: {                           // What was affected
    orders: 10,
    tasks: 25,
    employees: 5
  },
  totalDocuments: 40                       // Total docs processed
}
```

## Console Commands Reference

### Enable/Disable Debug Mode
```javascript
window.firebaseDebug.enableDebugMode(true);   // Enable
window.firebaseDebug.enableDebugMode(false);  // Disable
```

### View Operation History
```javascript
window.firebaseDebug.printOperationHistory();     // Pretty print
window.firebaseDebug.getOperationHistory();       // Get array
window.firebaseDebug.clearOperationHistory();     // Clear
```

### Compare Data
```javascript
const state = window.state || window.store;
await window.firebaseDebug.compareLocalAndRemoteData(state);
await window.firebaseDebug.verifyDataConsistency(state);
```

### Manual Save/Load (for testing)
```javascript
const state = window.state || window.store;

// Import firebase module functions
import { saveToDB, loadFromDB } from './js/firebase.js';

// Or if using inline script, use window.handleSaveToDB if available
if (window.handleSaveToDB) {
  window.handleSaveToDB();
}
```

## Advanced Debugging

### Export Debug Report
```javascript
const debugReport = {
  timestamp: new Date().toISOString(),
  operationHistory: window.firebaseDebug.getOperationHistory(),
  comparison: await window.firebaseDebug.compareLocalAndRemoteData(window.state),
  state: {
    storage: window.state.storage,
    lastModified: window.state.lastModified
  }
};

console.log(JSON.stringify(debugReport, null, 2));

// Download as file
const blob = new Blob([JSON.stringify(debugReport, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `firebase-debug-${Date.now()}.json`;
a.click();
```

### Monitor Real-Time Changes
```javascript
window.firebaseDebug.enableDebugMode(true);

// Keep console open and watch for:
// - 💾 SAVE operations
// - 📥 LOAD operations
// - ⚠️ LOAD_SKIPPED (local newer)
// - ❌ ERROR operations
```

### Test Data Persistence
```javascript
// 1. Make a change (e.g., add an order)
// 2. Wait for auto-save (look for "💾 Rozpoczęcie zapisu")
// 3. Check if saved successfully ("✅ Zapisano X dokumentów")
// 4. Reload page
// 5. Check if data persists
```

## Firestore Console Integration

### View Data in Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore Database
4. Path: `/planner/{appId}/users/{userId}/`

### Check Metadata
1. Navigate to: `/planner/{appId}/users/{userId}/metadata/sync`
2. Look for:
   - `lastModified` - Timestamp of last data change
   - `lastSaveTime` - Timestamp of last save operation
   - `documentCounts` - Count per collection

## Common Issues and Solutions

### Issue: "Firebase SDK nie jest dostępny"
**Solution:** Check network connection, verify Firebase CDN is accessible

### Issue: "missing appId or userId"
**Solution:** Check Settings page, ensure Firebase mode is configured with valid IDs

### Issue: All operations show errors
**Solution:** 
1. Check Firebase authentication: `firebase.auth().currentUser`
2. Verify Firestore rules allow read/write
3. Check browser console for CORS errors

### Issue: Data syncs from one device but not others
**Solution:**
1. Enable debug mode on both devices
2. Compare timestamps
3. Check if auto-load is working properly
4. Verify both devices use same appId/userId

## Performance Monitoring

### Check Operation Duration
```javascript
const history = window.firebaseDebug.getOperationHistory();
const saves = history.filter(op => op.operation === 'SAVE_SUCCESS');
const avgDuration = saves.reduce((sum, op) => sum + op.duration, 0) / saves.length;
console.log('Average save duration:', avgDuration, 'ms');
```

### Track Document Counts Over Time
```javascript
const history = window.firebaseDebug.getOperationHistory();
const saves = history.filter(op => op.operation === 'SAVE_SUCCESS');
saves.forEach(save => {
  console.log(save.timestamp, '- Total docs:', save.totalDocuments);
});
```

## Related Documentation
- [TEST_DELETE_MANUAL.md](../TEST_DELETE_MANUAL.md) - Testing deletion persistence
- [DOKUMENTACJA_WORKER_APP.md](../DOKUMENTACJA_WORKER_APP.md) - Worker app data sources
- [firebase-setup.md](./firebase-setup.md) - Initial Firebase configuration

## Support

If debugging doesn't resolve your issue:
1. Export a debug report (see Advanced Debugging section)
2. Check operation history for error patterns
3. Include browser console logs
4. Note the specific scenario that triggers the issue
