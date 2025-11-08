param(
    [string[]]$SourceFiles = @("index.html"),
    [string]$BackupsRoot = "backups",
    [switch]$CreateZip = $false
)

if (-not (Test-Path $BackupsRoot)) {
    Write-Host "Creating backups root at $BackupsRoot"
    New-Item -ItemType Directory -Path $BackupsRoot -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
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