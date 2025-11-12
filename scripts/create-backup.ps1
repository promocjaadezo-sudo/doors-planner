param(
    [string[]]$SourceFiles = @("index.html"),
    [string]$BackupsRoot = "backups",
    [switch]$CreateZip = $false,
    [switch]$FullWorkspace = $false
)

if (-not (Test-Path $BackupsRoot)) {
    Write-Host "Creating backups root at $BackupsRoot"
    New-Item -ItemType Directory -Path $BackupsRoot -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

if ($FullWorkspace) {
    $workspaceRoot = Split-Path $PSScriptRoot -Parent
    $zipPath = Join-Path $BackupsRoot ("$timestamp-workspace.zip")
    Write-Host "[backup] Creating full workspace archive: $zipPath"
    try {
        Compress-Archive -Path (Join-Path $workspaceRoot '*') -DestinationPath $zipPath -Force
        Write-Host "[backup] Full archive ready at $zipPath"
        return
    } catch {
        Write-Error "[backup] Failed to create full archive: $($_.Exception.Message)"
        exit 1
    }
}

$targetDir = Join-Path $BackupsRoot $timestamp

Write-Host "Creating backup folder: $targetDir"
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

foreach ($file in $SourceFiles) {
    $resolved = Resolve-Path $file -ErrorAction SilentlyContinue
    if (-not $resolved) {
        Write-Warning "Skipping missing file: $file"
        continue
    }
    $destination = Join-Path $targetDir (Split-Path $resolved -Leaf)
    Write-Host "Copying $resolved -> $destination"
    Copy-Item -Path $resolved -Destination $destination -Force
}

Write-Host "Backup complete. Files stored in $targetDir"

if ($CreateZip) {
    try {
        $zipPath = "$targetDir.zip"
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        Write-Host "Creating archive: $zipPath"
        Compress-Archive -Path (Join-Path $targetDir '*') -DestinationPath $zipPath -Force
        Write-Host "ZIP archive ready: $zipPath"
    } catch {
        Write-Warning "Failed to create ZIP archive: $($_.Exception.Message)"
    }
}