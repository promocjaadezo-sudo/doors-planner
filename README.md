# Doors Planner

A comprehensive planning and management application for door manufacturing processes.

## Features

- Order management
- Process planning
- Employee scheduling
- Gantt chart visualization
- Warehouse management
- MRP calculations
- Reporting and analytics

## Development

### Prerequisites

- Node.js v20 or higher
- npm

### Installation

```bash
npm install
```

### Testing

Run end-to-end tests with Playwright:

```bash
# Run tests headless
npm run test:e2e

# Run tests with browser UI
npm run test:e2e:headed

# Run tests in interactive UI mode
npm run test:e2e:ui
```

## CSV to GitHub Issues Import

This project includes a utility script to import issues from CSV files to GitHub.

### Quick Start

1. **Dry run (recommended first):**
   ```bash
   npm run import:issues:dry-run
   ```

2. **Import issues to GitHub:**
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   npm run import:issues
   ```

### Creating a GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "doors-planner-import")
4. Select the `repo` scope
5. Click "Generate token"
6. Copy the token immediately (you won't be able to see it again)

### CSV File Format

The script reads `sprint-backlog-import.csv` from the project root. Format:

```csv
"title","body","labels","milestone","assignees"
"Issue Title","Issue description","Label1;Label2","1","username1,username2"
```

- **title**: Issue title (required)
- **body**: Issue description (optional)
- **labels**: Semicolon-separated labels (optional)
- **milestone**: Milestone number (optional, created if doesn't exist)
- **assignees**: Comma-separated GitHub usernames (optional)

### Environment Variables

- `GITHUB_TOKEN` - (required) Personal Access Token with repo scope
- `GITHUB_OWNER` - (optional) Repository owner (default: promocjaadezo-sudo)
- `GITHUB_REPO` - (optional) Repository name (default: doors-planner)

### Example

```bash
# Set your GitHub token
export GITHUB_TOKEN=ghp_yourTokenHere

# Test with dry-run
npm run import:issues:dry-run

# Import to GitHub
npm run import:issues
```

For more details, see [scripts/README.md](scripts/README.md).

## Project Structure

```
.
├── index.html              # Main application entry point
├── js/                     # JavaScript modules
│   ├── main.js            # Main application logic
│   ├── firebase.js        # Firebase integration
│   ├── ui.js              # UI components
│   └── ...
├── scripts/               # Utility scripts
│   ├── import-issues-from-csv.js  # CSV import script
│   └── README.md          # Scripts documentation
├── tests/                 # E2E tests
├── sprint-backlog-import.csv  # Issues to import
└── package.json          # Project dependencies
```

## Documentation

- [Scripts Documentation](scripts/README.md) - Utility scripts and tools
- [INSTRUKCJA_DOKONCZENIA.md](INSTRUKCJA_DOKONCZENIA.md) - Implementation guide (Polish)

## License

Private project.
