# Test Runner Scripts
# Skrypty PowerShell do zarządzania testami

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 CENTRALNY MAGAZYN STANU - Test Runner Menu" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Wybierz opcję:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1) 🚀 Uruchom testy jednorazowo (Node.js)" -ForegroundColor Green
Write-Host "  2) 👁️  Uruchom watcher (automatyczne testy przy zmianach)" -ForegroundColor Green
Write-Host "  3) 🌐 Otwórz interfejs HTML (przeglądarka)" -ForegroundColor Green
Write-Host "  4) 📊 Pokaż ostatni raport testów" -ForegroundColor Green
Write-Host "  5) 🗑️  Wyczyść wszystkie raporty" -ForegroundColor Green
Write-Host "  6) ❌ Wyjdź" -ForegroundColor Red
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Twój wybór (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Uruchamiam testy jednostkowe..." -ForegroundColor Yellow
        Write-Host ""
        node "$PSScriptRoot\run-tests-node.js"
        Write-Host ""
        Write-Host "✅ Testy zakończone!" -ForegroundColor Green
        Write-Host ""
        Read-Host "Naciśnij Enter aby kontynuować"
    }
    "2" {
        Write-Host ""
        Write-Host "👁️  Uruchamiam watcher testów..." -ForegroundColor Yellow
        Write-Host "   (Naciśnij Ctrl+C aby zatrzymać)" -ForegroundColor Gray
        Write-Host ""
        node "$PSScriptRoot\watch-tests.js"
    }
    "3" {
        Write-Host ""
        Write-Host "🌐 Otwieram interfejs HTML..." -ForegroundColor Yellow
        Start-Process "http://localhost:5500/state/tests/run-unit-tests.html"
        Write-Host "✅ Interfejs otwarty w przeglądarce!" -ForegroundColor Green
        Write-Host ""
        Read-Host "Naciśnij Enter aby kontynuować"
    }
    "4" {
        Write-Host ""
        $reportsDir = Join-Path $PSScriptRoot "reports"
        if (Test-Path $reportsDir) {
            $latestReport = Get-ChildItem $reportsDir -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latestReport) {
                Write-Host "📊 Ostatni raport testów:" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "📄 Plik: $($latestReport.Name)" -ForegroundColor Cyan
                Write-Host "📅 Data: $($latestReport.LastWriteTime)" -ForegroundColor Cyan
                Write-Host ""
                $content = Get-Content $latestReport.FullName | ConvertFrom-Json
                Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host "  Wszystkie testy: $($content.summary.total)" -ForegroundColor White
                Write-Host "  ✅ Zaliczone: $($content.summary.passed)" -ForegroundColor Green
                Write-Host "  ❌ Niezaliczone: $($content.summary.failed)" -ForegroundColor Red
                Write-Host "  📈 Wskaźnik sukcesu: $($content.summary.successRate)%" -ForegroundColor Yellow
                Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host ""
            } else {
                Write-Host "⚠️  Brak raportów testów" -ForegroundColor Yellow
                Write-Host ""
            }
        } else {
            Write-Host "⚠️  Katalog raportów nie istnieje" -ForegroundColor Yellow
            Write-Host ""
        }
        Read-Host "Naciśnij Enter aby kontynuować"
    }
    "5" {
        Write-Host ""
        $reportsDir = Join-Path $PSScriptRoot "reports"
        if (Test-Path $reportsDir) {
            $confirm = Read-Host "Czy na pewno chcesz usunąć wszystkie raporty? (tak/nie)"
            if ($confirm -eq "tak") {
                Remove-Item "$reportsDir\*.json" -Force
                Write-Host "✅ Wszystkie raporty zostały usunięte" -ForegroundColor Green
            } else {
                Write-Host "❌ Anulowano" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  Katalog raportów nie istnieje" -ForegroundColor Yellow
        }
        Write-Host ""
        Read-Host "Naciśnij Enter aby kontynuować"
    }
    "6" {
        Write-Host ""
        Write-Host "👋 Do widzenia!" -ForegroundColor Green
        Write-Host ""
        exit
    }
    default {
        Write-Host ""
        Write-Host "❌ Nieprawidłowy wybór!" -ForegroundColor Red
        Write-Host ""
        Read-Host "Naciśnij Enter aby kontynuować"
    }
}
