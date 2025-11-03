# 📋 Task Grouping Implementation

## Overview

Task grouping has been implemented to organize tasks by their associated orders (zlecenia) in the main tasks view. This makes it easier to see which tasks belong to which order and provides better visual organization.

## Features Implemented

### 1. **Task Grouping by Order**
- Tasks are now grouped by their `orderId` in the main tasks list
- Each group shows the order name and task count
- Groups are collapsible for better space management

### 2. **Group-Level Statistics**
Each task group displays:
- Total number of tasks in the group
- Number of tasks in "todo" status
- Number of tasks "in progress" (run)
- Number of "done" tasks

### 3. **Visual Improvements**
- Groups have a distinct header with order name
- Color-coded status badges for quick identification
- Tasks are indented within their groups
- Collapsible sections with expand/collapse functionality

## User Interface

### Group Header Format
```
📋 [Order Name]  [X zadań] • [Y todo] • [Z w trakcie] • [W zakończone]  ▼
```

### Example
```
📋 Zamówienie A123  5 zadań • 2 todo • 1 w trakcie • 2 zakończone  ▼
  ├─ Zadanie 1 (todo)
  ├─ Zadanie 2 (run)
  ├─ Zadanie 3 (done)
  ├─ Zadanie 4 (done)
  └─ Zadanie 5 (todo)
```

## Technical Implementation

### Code Location
- **File**: `index.html`
- **Function**: `renderTasks()` (around line 2812)

### Key Changes
1. Tasks are grouped into a `grouped` object keyed by `orderId`
2. Each group contains:
   - `orderId`: The order identifier
   - `orderName`: The order name (from state.orders)
   - `tasks`: Array of tasks belonging to this order

3. Groups are sorted alphabetically by order name
4. Each group renders as a collapsible section
5. Tasks within groups maintain their original display format

### Data Structure
```javascript
const grouped = {
  'order-id-1': {
    orderId: 'order-id-1',
    orderName: 'Zamówienie A',
    tasks: [task1, task2, task3]
  },
  'order-id-2': {
    orderId: 'order-id-2',
    orderName: 'Zamówienie B',
    tasks: [task4, task5]
  }
}
```

## Benefits

1. **Better Organization**: Tasks are logically grouped by their order
2. **Quick Overview**: See at a glance how many tasks belong to each order
3. **Status Visibility**: Easily identify which orders have tasks in progress
4. **Space Efficiency**: Collapsible groups save screen space
5. **Improved Navigation**: Easier to find and manage tasks by order

## Future Enhancements

Potential improvements for future versions:
- Sort groups by priority or deadline
- Filter/search within groups
- Bulk operations on entire groups
- Progress bars for each group
- Export groups to different formats
- Custom group sorting options
