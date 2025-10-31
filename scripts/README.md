# Scripts

This directory contains utility scripts for the doors-planner project.

## import-issues-from-csv.js

Import issues from CSV file to GitHub repository.

### Prerequisites

- Node.js (v20 or higher recommended)
- GitHub Personal Access Token with `repo` scope

### Creating a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "doors-planner-import")
4. Select the `repo` scope (full control of private repositories)
5. Click "Generate token"
6. Copy the token (you won't be able to see it again)

### Usage

#### Dry Run (Recommended First)

Test the import without making any changes:

```bash
node scripts/import-issues-from-csv.js --dry-run
```

#### Live Import

Import issues to GitHub:

```bash
export GITHUB_TOKEN=your_github_token_here
node scripts/import-issues-from-csv.js
```

### Environment Variables

- `GITHUB_TOKEN` (required) - GitHub Personal Access Token with repo scope
- `GITHUB_OWNER` (optional) - Repository owner (default: `promocjaadezo-sudo`)
- `GITHUB_REPO` (optional) - Repository name (default: `doors-planner`)

### CSV File Format

The script reads `sprint-backlog-import.csv` from the project root. Expected format:

```csv
"title","body","labels","milestone","assignees"
"Issue Title","Issue description","Label1;Label2","1","username1,username2"
```

- **title**: Issue title (required)
- **body**: Issue description/body (optional)
- **labels**: Semicolon-separated list of labels (optional)
- **milestone**: Milestone number (optional, will be created if doesn't exist)
- **assignees**: Comma-separated list of GitHub usernames (optional)

### Features

- ✅ Parses CSV with proper quote handling
- ✅ Creates missing labels with appropriate colors
- ✅ Creates missing milestones automatically
- ✅ Assigns issues to users
- ✅ Dry-run mode for testing
- ✅ Rate limiting (1 second between requests)
- ✅ Detailed progress reporting
- ✅ Error handling and recovery

### Example Output

```
======================================================================
CSV to GitHub Issues Import Script
======================================================================

Repository: promocjaadezo-sudo/doors-planner
CSV File: /path/to/sprint-backlog-import.csv
Mode: LIVE

Reading CSV file...
Found 9 issues to import

Ensuring labels exist...
  ✓ Label "High Priority" already exists
  ✓ Created label "Feature"
  ✓ Created label "Observability"

Ensuring milestones exist...
  ✓ Created milestone 1: "Sprint 1"

Creating issues...
[1/9] Processing: "Moduł Mapy (#p-map): backend danych i eksport"
  ✓ Created issue #1: "Moduł Mapy (#p-map): backend danych i eksport"

...

======================================================================
Import Summary
======================================================================
Total issues: 9
Successfully created: 9
Failed: 0
```

### Troubleshooting

#### Authentication Error

```
Error: GITHUB_TOKEN environment variable is not set!
```

**Solution**: Set the GITHUB_TOKEN environment variable with a valid token.

#### Permission Error

```
GitHub API error: 403 - Resource not accessible by integration
```

**Solution**: Make sure your token has the `repo` scope and you have write access to the repository.

#### Rate Limiting

```
GitHub API error: 403 - API rate limit exceeded
```

**Solution**: Wait for the rate limit to reset (usually 1 hour) or use a token with higher rate limits.

### Notes

- The script automatically handles label creation with predefined colors
- Milestones are created as "Sprint X" where X is the milestone number
- The script waits 1 second between issue creation requests to respect GitHub's rate limits
- Use dry-run mode first to verify the import will work correctly
