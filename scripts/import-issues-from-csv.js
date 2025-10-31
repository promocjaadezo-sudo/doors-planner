#!/usr/bin/env node

/**
 * Import issues from CSV to GitHub repository
 * 
 * This script reads the sprint-backlog-import.csv file and creates GitHub issues
 * with proper labels, milestones, and assignees.
 * 
 * Usage:
 *   node scripts/import-issues-from-csv.js [--dry-run]
 * 
 * Environment variables required:
 *   GITHUB_TOKEN - GitHub personal access token with repo scope
 *   GITHUB_OWNER - Repository owner (default: promocjaadezo-sudo)
 *   GITHUB_REPO - Repository name (default: doors-planner)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'promocjaadezo-sudo';
const GITHUB_REPO = process.env.GITHUB_REPO || 'doors-planner';
const CSV_FILE = path.join(__dirname, '..', 'sprint-backlog-import.csv');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Parse CSV file into array of objects
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const header = parseCSVLine(lines[0]);
  
  // Parse rows
  const issues = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const issue = {};
    header.forEach((key, index) => {
      issue[key] = values[index] || '';
    });
    issues.push(issue);
  }
  
  return issues;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current);
  
  return result;
}

/**
 * Make GitHub API request
 */
function githubRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'User-Agent': 'doors-planner-import-script',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Get or create a label
 */
async function ensureLabel(labelName) {
  const encodedLabel = encodeURIComponent(labelName);
  
  try {
    // Try to get existing label
    await githubRequest('GET', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/labels/${encodedLabel}`);
    log(`  ✓ Label "${labelName}" already exists`, 'green');
    return;
  } catch (error) {
    // Label doesn't exist, create it
    const labelColors = {
      'High Priority': 'd73a4a',
      'Medium Priority': 'fbca04',
      'Low Priority': '0e8a16',
      'Feature': '0075ca',
      'Observability': '5319e7',
      'Planning': 'c5def5',
      'Integration': 'bfdadc',
      'Quality': '84b6eb',
      'UX': 'e99695',
      'Automation': 'd4c5f9',
      'TechDebt': 'f9d0c4',
    };
    
    const color = labelColors[labelName] || 'ededed';
    
    try {
      await githubRequest('POST', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/labels`, {
        name: labelName,
        color: color,
        description: `Auto-created label for ${labelName}`,
      });
      log(`  ✓ Created label "${labelName}"`, 'cyan');
    } catch (createError) {
      log(`  ✗ Failed to create label "${labelName}": ${createError.message}`, 'red');
    }
  }
}

/**
 * Get or create a milestone
 */
async function ensureMilestone(milestoneNumber) {
  if (!milestoneNumber) return null;
  
  try {
    // Get all milestones
    const milestones = await githubRequest('GET', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/milestones?state=all`);
    
    // Find milestone by number
    const milestone = milestones.find(m => m.number === parseInt(milestoneNumber));
    if (milestone) {
      log(`  ✓ Milestone ${milestoneNumber} found: "${milestone.title}"`, 'green');
      return milestone.number;
    }
    
    // Milestone doesn't exist, create it
    const newMilestone = await githubRequest('POST', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/milestones`, {
      title: `Sprint ${milestoneNumber}`,
      description: `Sprint backlog milestone ${milestoneNumber}`,
      state: 'open',
    });
    log(`  ✓ Created milestone ${milestoneNumber}: "${newMilestone.title}"`, 'cyan');
    return newMilestone.number;
  } catch (error) {
    log(`  ✗ Failed to ensure milestone ${milestoneNumber}: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Create a GitHub issue
 */
async function createIssue(issueData) {
  const labels = issueData.labels ? issueData.labels.split(';').map(l => l.trim()).filter(l => l) : [];
  const assignees = issueData.assignees ? issueData.assignees.split(',').map(a => a.trim()).filter(a => a) : [];
  const milestone = issueData.milestone ? parseInt(issueData.milestone) : null;

  const issue = {
    title: issueData.title,
    body: issueData.body,
    labels: labels,
  };

  if (assignees.length > 0) {
    issue.assignees = assignees;
  }

  if (milestone) {
    issue.milestone = milestone;
  }

  if (DRY_RUN) {
    log(`  [DRY RUN] Would create issue: "${issue.title}"`, 'yellow');
    log(`    Labels: ${labels.join(', ') || '(none)'}`, 'yellow');
    log(`    Milestone: ${milestone || '(none)'}`, 'yellow');
    log(`    Assignees: ${assignees.join(', ') || '(none)'}`, 'yellow');
    return { number: 'DRY_RUN' };
  }

  try {
    const result = await githubRequest('POST', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, issue);
    log(`  ✓ Created issue #${result.number}: "${result.title}"`, 'green');
    return result;
  } catch (error) {
    log(`  ✗ Failed to create issue: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  log('='.repeat(70), 'bright');
  log('CSV to GitHub Issues Import Script', 'bright');
  log('='.repeat(70), 'bright');
  log('');

  // Check for GitHub token
  if (!GITHUB_TOKEN && !DRY_RUN) {
    log('Error: GITHUB_TOKEN environment variable is not set!', 'red');
    log('Please set it with: export GITHUB_TOKEN=your_token_here', 'yellow');
    log('Or run in dry-run mode: node scripts/import-issues-from-csv.js --dry-run', 'yellow');
    process.exit(1);
  }

  // Configuration summary
  log(`Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`, 'cyan');
  log(`CSV File: ${CSV_FILE}`, 'cyan');
  log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`, DRY_RUN ? 'yellow' : 'green');
  log('');

  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    log(`Error: CSV file not found at ${CSV_FILE}`, 'red');
    process.exit(1);
  }

  // Read and parse CSV
  log('Reading CSV file...', 'cyan');
  const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
  const issues = parseCSV(csvContent);
  log(`Found ${issues.length} issues to import`, 'green');
  log('');

  // Collect unique labels and milestones
  const allLabels = new Set();
  const allMilestones = new Set();
  
  issues.forEach(issue => {
    if (issue.labels) {
      issue.labels.split(';').forEach(label => allLabels.add(label.trim()));
    }
    if (issue.milestone) {
      allMilestones.add(issue.milestone.trim());
    }
  });

  // Ensure labels exist
  if (allLabels.size > 0) {
    log('Ensuring labels exist...', 'cyan');
    for (const label of allLabels) {
      if (!DRY_RUN) {
        await ensureLabel(label);
      } else {
        log(`  [DRY RUN] Would ensure label: "${label}"`, 'yellow');
      }
    }
    log('');
  }

  // Ensure milestones exist and get their numbers
  const milestoneMap = {};
  if (allMilestones.size > 0) {
    log('Ensuring milestones exist...', 'cyan');
    for (const milestoneNum of allMilestones) {
      if (!DRY_RUN) {
        const number = await ensureMilestone(milestoneNum);
        if (number) {
          milestoneMap[milestoneNum] = number;
        }
      } else {
        log(`  [DRY RUN] Would ensure milestone: ${milestoneNum}`, 'yellow');
        milestoneMap[milestoneNum] = parseInt(milestoneNum);
      }
    }
    log('');
  }

  // Create issues
  log('Creating issues...', 'cyan');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    log(`\n[${i + 1}/${issues.length}] Processing: "${issue.title}"`, 'bright');
    
    try {
      // Update milestone number if needed
      if (issue.milestone && milestoneMap[issue.milestone]) {
        issue.milestone = milestoneMap[issue.milestone].toString();
      }
      
      await createIssue(issue);
      successCount++;
      
      // Rate limiting: wait 1 second between requests
      if (!DRY_RUN && i < issues.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      failCount++;
      log(`Failed to create issue: ${error.message}`, 'red');
    }
  }

  // Summary
  log('');
  log('='.repeat(70), 'bright');
  log('Import Summary', 'bright');
  log('='.repeat(70), 'bright');
  log(`Total issues: ${issues.length}`, 'cyan');
  log(`Successfully created: ${successCount}`, 'green');
  log(`Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');
  
  if (DRY_RUN) {
    log('', 'yellow');
    log('This was a dry run. No changes were made to GitHub.', 'yellow');
    log('Run without --dry-run flag to actually create the issues.', 'yellow');
  }
  
  log('');
}

// Run the script
main().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
