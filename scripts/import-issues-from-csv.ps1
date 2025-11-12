param(
    [Parameter(Mandatory = $false)]
    [string]$CsvPath = "../sprint-backlog-import.csv",

    [Parameter(Mandatory = $false)]
    [string]$Owner = "promocjaadezo-sudo",

    [Parameter(Mandatory = $false)]
    [string]$Repo = "doors-planner"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $CsvPath)) {
    throw "Nie znaleziono pliku CSV: $CsvPath"
}

$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Zmienna środowiskowa GITHUB_TOKEN nie jest ustawiona. Ustaw ją na PAT z uprawnieniami repo:write."
}

$headers = @{
    Authorization = "token $token"
    "User-Agent" = "doors-planner-import-script"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$issues = Import-Csv -Path $CsvPath
if ($issues.Count -eq 0) {
    throw "Plik CSV nie zawiera żadnych rekordów."
}

foreach ($issue in $issues) {
    $labels = @()
    if (-not [string]::IsNullOrWhiteSpace($issue.labels)) {
        $labels = $issue.labels -split ";" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    }

    $assignees = @()
    if (-not [string]::IsNullOrWhiteSpace($issue.assignees)) {
        $assignees = $issue.assignees -split ";" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    }

    $payload = [ordered]@{
        title = $issue.title
        body = $issue.body
    }

    if ($labels.Count -gt 0) {
        $payload.labels = $labels
    }

    if (-not [string]::IsNullOrWhiteSpace($issue.milestone)) {
        $payload.milestone = [int]$issue.milestone
    }

    if ($assignees.Count -gt 0) {
        $payload.assignees = $assignees
    }

    $json = $payload | ConvertTo-Json -Depth 6 -Compress

    $uri = "https://api.github.com/repos/$Owner/$Repo/issues"
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

    try {
        $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8"
        Write-Host "Issue utworzony: #$($response.number) $($response.title)" -ForegroundColor Green
    }
    catch {
        Write-Host "Błąd tworzenia issue: $($issue.title)" -ForegroundColor Red
        Write-Host "Payload wysłany:" -ForegroundColor Yellow
        Write-Host $json
        throw
    }
}
