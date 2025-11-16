# FirebaseSyncQueue - Manual Testing Guide

## Overview
This guide describes how to manually test the FirebaseSyncQueue implementation to verify that order deletion and Firebase synchronization work correctly without race conditions.

## Prerequisites
- Application running with Firebase mode enabled
- Valid Firebase configuration
- At least one order with associated tasks and after entries

## Test Scenarios

### Test 1: Basic Queue Functionality

1. Open browser console
2. Check that FirebaseSyncQueue is initialized:
   ```javascript
   console.log(window.FirebaseSyncQueue.getStatus());
   ```
   Expected: `{ enabled: false, processing: false, queueSize: 0, currentOperation: null }`

3. Enable the queue:
   ```javascript
   window.FirebaseSyncQueue.enable();
   ```
   Expected: Console log showing "[FirebaseSyncQueue] Enabled"

### Test 2: Order Deletion Flow

1. Create a test order with tasks:
   - Go to Orders page
   - Add a new order
   - Generate tasks for the order

2. Open browser console and monitor:
   ```javascript
   // Monitor queue status
   setInterval(() => {
     const status = window.FirebaseSyncQueue.getStatus();
     if (status.queueSize > 0 || status.processing) {
       console.log('Queue status:', status);
     }
   }, 100);
   ```

3. Delete the order by clicking the delete button

4. Verify in console:
   - Should see: `[FirebaseSyncQueue] Enqueued delete operation (priority: 20, queue size: 1)`
   - Should see: `[FirebaseSyncQueue] Enqueued save operation (priority: 10, queue size: 2)`
   - Should see: `[FirebaseSyncQueue] Processing delete (id: ..., priority: 20)`
   - Should see: `[FirebaseSyncQueue] Successfully completed delete`
   - Should see: `[FirebaseSyncQueue] Processing save (id: ..., priority: 10)`
   - Should see: `[FirebaseSyncQueue] Successfully completed save`
   - Should see: `[FirebaseSyncQueue] Queue processing completed`

5. Verify in Firebase Console:
   - Order document should be deleted
   - Associated tasks should be deleted
   - Associated after entries should be deleted

### Test 3: Priority Ordering

1. Manually enqueue operations with different priorities:
   ```javascript
   window.FirebaseSyncQueue.enqueue('save', { state: window.state }, 5);
   window.FirebaseSyncQueue.enqueue('delete', { collection: 'orders', documentId: 'test' }, 15);
   window.FirebaseSyncQueue.enqueue('save', { state: window.state }, 10);
   ```

2. Verify processing order in console:
   - Should process delete (priority 15) first
   - Then save with priority 10
   - Then save with priority 5

### Test 4: Retry Logic

1. Disable Firebase (e.g., disconnect network or set invalid credentials)

2. Try to delete an order

3. Verify in console:
   - Should see error message
   - Should see retry attempts with increasing delays:
     - Retry 1: 1000ms delay
     - Retry 2: 2000ms delay
     - Retry 3: 4000ms delay
   - After 3 retries, should see: `[FirebaseSyncQueue] Max retries reached`

4. Re-enable Firebase connection

5. Queue should process remaining operations successfully

### Test 5: Race Condition Prevention

1. Create multiple orders quickly

2. Delete multiple orders in rapid succession (click delete on several orders quickly)

3. Verify:
   - All delete operations are queued with proper priorities
   - Operations are processed in order without overlap
   - No Firebase errors about concurrent modifications
   - All orders are deleted from both local state and Firebase

### Test 6: UI Updates

1. Delete an order

2. Verify:
   - Order is immediately removed from UI (within 50ms)
   - Tasks are removed from Tasks page
   - After entries are removed from After-Sales page
   - Dashboard updates to reflect changes
   - Gantt chart updates to reflect changes

## Expected Results

✅ **Pass Criteria:**
- All operations complete without errors
- Firebase documents are deleted in correct order
- No orphaned documents remain in Firebase
- UI updates correctly and consistently
- No race conditions or concurrent modification errors
- Retry logic works when Firebase is unavailable

❌ **Fail Criteria:**
- Operations fail with errors
- Orphaned documents remain in Firebase
- UI shows stale data
- Race conditions occur
- Queue gets stuck or doesn't process

## Troubleshooting

### Queue is not processing
- Check: `window.FirebaseSyncQueue.getStatus()`
- Ensure queue is enabled: `window.FirebaseSyncQueue.enable()`
- Check Firebase initialization: `firebase.apps.length > 0`

### Operations fail immediately
- Check Firebase credentials
- Verify network connection
- Check browser console for errors
- Verify `window.saveToDB` is available

### UI not updating
- Check that order deletion code is calling `save()` after local state changes
- Verify UI refresh is triggered after 50ms delay
- Check console for rendering errors

## Notes

- The queue uses priority-based processing (higher number = higher priority)
- Delete operations are given priority 20
- Full state saves are given priority 10
- Retry logic uses exponential backoff (1s, 2s, 4s)
- Maximum 3 retry attempts before operation is skipped
