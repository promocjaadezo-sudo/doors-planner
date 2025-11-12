param(
    [string]$SourceRoot = (Resolve-Path "$PSScriptRoot/.."),
    [string]$TargetRoot = (Resolve-Path "$PSScriptRoot/../planer_6.0.0"),
    [string[]]$FilesToCopy = @(
        "index.html",
        "worker-app.html",
        "worker-app-v2.html",
        "firestore.rules",
        "firebase-credentials.sample.json",
        "production-dashboard.html",
        "verify-production.html",
        "verify-production.js"
    ),
    [string[]]$DirectoriesToMirror = @(
        "js",
        "state"
    ),
    [string[]]$ExcludedSubdirectories = @(
        ".git",
        "node_modules",
        "backups",
        "playwright-report",
        ".github",
        ".vscode"
    )
)

$ErrorActionPreference = "Stop"

Write-Host "=== Sync planner payload to 'planer_6.0.0' ==="
Write-Host "Source : $SourceRoot"
Write-Host "Target : $TargetRoot"

if (-not (Test-Path $TargetRoot)) {
    throw "Target location '$TargetRoot' does not exist. Create it first (git submodule init or manual folder)."
}

$copiedFiles = 0
$mirroredDirs = 0
$skippedItems = @()

foreach ($file in $FilesToCopy) {
    $sourcePath = Join-Path $SourceRoot $file
    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Skipped missing file: $file"
        $skippedItems += $file
        continue
    }

    $destinationPath = Join-Path $TargetRoot $file
    $destinationDirectory = Split-Path $destinationPath -Parent

    if (-not (Test-Path $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }

    Copy-Item -Path $sourcePath -Destination $destinationPath -Force
    Write-Host "Copied file -> $file"
    $copiedFiles++
}

$robocopyBaseArgs = @("/MIR", "/COPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NP", "/NJH", "/NJS")
if ($ExcludedSubdirectories.Count -gt 0) {
    $robocopyBaseArgs += @("/XD") + $ExcludedSubdirectories
}

foreach ($directory in $DirectoriesToMirror) {
    $sourceDirectory = Join-Path $SourceRoot $directory
    if (-not (Test-Path $sourceDirectory)) {
        Write-Warning "Skipped missing directory: $directory"
        $skippedItems += $directory
        continue
    }

    $destinationDirectory = Join-Path $TargetRoot $directory
    if (-not (Test-Path $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }

    $robocopyArgs = @($sourceDirectory, $destinationDirectory) + $robocopyBaseArgs
    & robocopy @robocopyArgs | Out-Null
    $exitCode = $LASTEXITCODE

    if ($exitCode -gt 7) {
        throw "Robocopy failed for '$directory' with exit code $exitCode."
    }

    Write-Host "Mirrored directory -> $directory (Robocopy exit code $exitCode)"
    $mirroredDirs++
}

Write-Host "=== Sync completed ==="
Write-Host "Files copied     : $copiedFiles"
Write-Host "Directories sync : $mirroredDirs"

if ($skippedItems.Count -gt 0) {
    Write-Host "Skipped items   :" ($skippedItems -join ", ")
}

Write-Host "You can now review changes in 'planer_6.0.0' and commit/push the submodule as needed."
