# CSV to GitHub Issues Import - Quick Start Guide

This guide will help you import issues from the `sprint-backlog-import.csv` file to your GitHub repository.

## Prerequisites

✅ Node.js installed (v20+)  
✅ GitHub account with write access to the repository  
✅ CSV file ready (`sprint-backlog-import.csv`)

## Step-by-Step Instructions

### Step 1: Create a GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: `doors-planner-import`
4. Select scope: ✅ **repo** (Full control of private repositories)
5. Click "Generate token" at the bottom
6. **IMPORTANT:** Copy the token immediately - you won't see it again!

### Step 2: Test the Import (Dry Run)

First, test without making any changes:

```bash
npm run import:issues:dry-run
```

This will show you:
- How many issues will be created
- What labels will be added
- What milestones will be created
- All issue details

**No changes are made to GitHub during dry run!**

### Step 3: Run the Actual Import

Once you're happy with the dry run results:

```bash
# Set your GitHub token (replace with your actual token)
export GITHUB_TOKEN=ghp_YourActualTokenHere

# Run the import
npm run import:issues
```

The script will:
- Create labels if they don't exist
- Create milestones if they don't exist
- Create all issues with proper metadata
- Show progress for each issue
- Display a summary at the end

### Step 4: Verify on GitHub

Go to your repository's Issues page:
```
https://github.com/promocjaadezo-sudo/doors-planner/issues
```

You should see all 9 issues created with:
- ✅ Proper titles
- ✅ Detailed descriptions
- ✅ Correct labels (High/Medium/Low Priority + Feature/Observability/etc.)
- ✅ Assigned to milestones (Sprint 1, 2, or 3)

## Troubleshooting

### Error: "GITHUB_TOKEN environment variable is not set!"

**Solution:**
```bash
export GITHUB_TOKEN=your_token_here
npm run import:issues
```

### Error: "403 - Resource not accessible"

**Causes:**
- Token doesn't have `repo` scope
- You don't have write access to the repository
- Token has expired

**Solution:** Create a new token with the correct scope.

### Error: "Rate limit exceeded"

**Solution:** Wait 1 hour or use a different GitHub account token.

## Advanced Usage

### Import to a Different Repository

```bash
export GITHUB_TOKEN=your_token
export GITHUB_OWNER=different-owner
export GITHUB_REPO=different-repo
npm run import:issues
```

### Run Script Directly

```bash
# Dry run
node scripts/import-issues-from-csv.js --dry-run

# Live import
GITHUB_TOKEN=your_token node scripts/import-issues-from-csv.js
```

## What Gets Created?

### Labels (11 total)
- **High Priority** (red)
- **Medium Priority** (yellow)
- **Low Priority** (green)
- **Feature** (blue)
- **Observability** (purple)
- **Planning** (light blue)
- **Integration** (light green)
- **Quality** (blue-gray)
- **UX** (pink)
- **Automation** (purple-gray)
- **TechDebt** (orange)

### Milestones (3 total)
- Sprint 1
- Sprint 2
- Sprint 3

### Issues (9 total)
1. **Moduł Mapy**: backend danych i eksport
2. **Monitoring**: metryki i alerty
3. **Harmonogram**: rozszerzenie planowania zasobów
4. **MRP**: kalkulacja zapasów i lista zakupów
5. **Sync / worker-app**: testy e2e i feedback
6. **Backupy**: testy jednostkowe i smoke UI
7. **Dostępność i modularność** SPA
8. **Python agents**: CI i workflow deweloperski
9. **Walidacje** formularzy i testy

## Safety Features

✅ **Dry-run mode** - Test before making changes  
✅ **Rate limiting** - 1 second delay between API calls  
✅ **Error handling** - Continues on failure, shows summary  
✅ **Detailed logging** - See exactly what's happening  
✅ **No data loss** - Only creates new issues, never modifies existing ones

## Need Help?

- Read the full documentation: [scripts/README.md](scripts/README.md)
- Check the main README: [README.md](README.md)
- Review the script source: [scripts/import-issues-from-csv.js](scripts/import-issues-from-csv.js)

---

**Happy importing! 🚀**
