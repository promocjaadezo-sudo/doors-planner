/**
 * TEST REPORTER - Generator raportów testowych
 * 
 * Automatyczne generowanie szczegółowych raportów z wyników testów
 * w formatach HTML i JSON z wizualizacjami i analizą trendów.
 * 
 * @version 1.0.0
 * @created 2025-11-02
 */

(function(window) {
  'use strict';

  console.log('📊 [TestReporter] Inicjalizacja...');

  /**
   * GENEROWANIE RAPORTU HTML
   */
  function generateHTMLReport(reports) {
    const latestReport = reports[reports.length - 1];
    if (!latestReport) {
      return '<html><body><h1>Brak raportów</h1></body></html>';
    }

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Production Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2 px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    h1 {
      font-size: 32px;
      color: #1f2937;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #6b7280;
      font-size: 16px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #1f2937;
    }

    .stat-value.success {
      color: #10b981;
    }

    .stat-value.failure {
      color: #ef4444;
    }

    .stat-value.warning {
      color: #f59e0b;
    }

    .section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }

    .test-results {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .test-item {
      display: flex;
      align-items: center;
      padding: 15px;
      background: #f9fafb;
      border-radius: 6px;
      border-left: 4px solid #10b981;
    }

    .test-item.failed {
      border-left-color: #ef4444;
      background: #fef2f2;
    }

    .test-icon {
      font-size: 24px;
      margin-right: 15px;
    }

    .test-name {
      flex: 1;
      font-weight: 500;
      color: #1f2937;
    }

    .test-duration {
      color: #6b7280;
      font-size: 14px;
      margin-right: 15px;
    }

    .test-error {
      color: #dc2626;
      font-size: 14px;
      margin-top: 5px;
      font-family: 'Courier New', monospace;
    }

    .chart-container {
      height: 300px;
      margin-top: 20px;
    }

    .trend-chart {
      display: flex;
      align-items: flex-end;
      height: 200px;
      gap: 10px;
      padding: 20px 0;
    }

    .trend-bar {
      flex: 1;
      background: #3b82f6;
      border-radius: 4px 4px 0 0;
      position: relative;
      transition: all 0.3s;
    }

    .trend-bar:hover {
      opacity: 0.8;
    }

    .trend-bar.low {
      background: #ef4444;
    }

    .trend-bar.medium {
      background: #f59e0b;
    }

    .trend-bar.high {
      background: #10b981;
    }

    .trend-label {
      position: absolute;
      bottom: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
    }

    .trend-value {
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      font-weight: bold;
      color: #1f2937;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .analytics-card {
      padding: 20px;
      background: #f9fafb;
      border-radius: 6px;
    }

    .analytics-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 10px;
    }

    .analytics-list {
      list-style: none;
    }

    .analytics-list li {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
      color: #6b7280;
    }

    .analytics-list li:last-child {
      border-bottom: none;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }

    .badge.success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge.failure {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge.warning {
      background: #fef3c7;
      color: #92400e;
    }

    footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
    }

    @media print {
      body {
        background: white;
      }
      .stat-card, .section {
        box-shadow: none;
        border: 1px solid #e5e7eb;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 Production Test Report</h1>
      <p class="subtitle">
        Generated: ${new Date(latestReport.timestamp).toLocaleString('pl-PL')} | 
        Suite: ${latestReport.summary.name}
      </p>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Tests</div>
        <div class="stat-value">${latestReport.summary.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Passed</div>
        <div class="stat-value success">${latestReport.summary.passed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value failure">${latestReport.summary.failed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value ${latestReport.summary.successRate >= 80 ? 'success' : 'failure'}">
          ${latestReport.summary.successRate.toFixed(1)}%
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Duration</div>
        <div class="stat-value">${latestReport.summary.duration}ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Runs</div>
        <div class="stat-value">${latestReport.analytics.totalRuns}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📋 Test Results</h2>
      <div class="test-results">
        ${latestReport.results.map(result => `
          <div class="test-item ${result.status === 'failed' ? 'failed' : ''}">
            <div class="test-icon">${result.status === 'passed' ? '✅' : '❌'}</div>
            <div style="flex: 1;">
              <div class="test-name">${result.name}</div>
              ${result.error ? `<div class="test-error">${result.error}</div>` : ''}
            </div>
            <div class="test-duration">${result.duration}ms</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${latestReport.analytics.trends.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📈 Success Rate Trend (Last ${latestReport.analytics.trends.length} Runs)</h2>
      <div class="trend-chart">
        ${latestReport.analytics.trends.map((trend, index) => {
          const height = (trend.successRate / 100) * 200;
          const colorClass = trend.successRate >= 90 ? 'high' : trend.successRate >= 70 ? 'medium' : 'low';
          const date = new Date(trend.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="trend-bar ${colorClass}" style="height: ${height}px;">
              <div class="trend-value">${trend.successRate.toFixed(0)}%</div>
              <div class="trend-label">${date}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">📊 Analytics</h2>
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-title">Average Success Rate</div>
          <div style="font-size: 32px; font-weight: bold; color: ${latestReport.analytics.avgSuccessRate >= 80 ? '#10b981' : '#ef4444'}; margin-top: 10px;">
            ${latestReport.analytics.avgSuccessRate.toFixed(1)}%
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-title">Flaky Tests</div>
          ${latestReport.analytics.flakyTests.length > 0 ? `
            <ul class="analytics-list">
              ${latestReport.analytics.flakyTests.map(test => `
                <li>⚠️ ${test}</li>
              `).join('')}
            </ul>
          ` : '<p style="color: #10b981; margin-top: 10px;">No flaky tests detected</p>'}
        </div>

        <div class="analytics-card">
          <div class="analytics-title">Test Type Distribution</div>
          <ul class="analytics-list">
            <li>Smoke Tests <span class="badge success">${latestReport.summary.type === 'smoke' ? 'Current' : 'Scheduled'}</span></li>
            <li>Unit Tests <span class="badge ${latestReport.summary.type === 'unit' ? 'success' : 'warning'}">${latestReport.summary.type === 'unit' ? 'Current' : 'Scheduled'}</span></li>
            <li>Integration Tests <span class="badge ${latestReport.summary.type === 'integration' ? 'success' : 'warning'}">${latestReport.summary.type === 'integration' ? 'Current' : 'Scheduled'}</span></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">ℹ️ Report Information</h2>
      <ul class="analytics-list">
        <li>Report ID: <strong>${latestReport.timestamp}</strong></li>
        <li>Suite Name: <strong>${latestReport.summary.name}</strong></li>
        <li>Suite Type: <strong>${latestReport.summary.type}</strong></li>
        <li>Start Time: <strong>${new Date(latestReport.summary.startTime).toLocaleString('pl-PL')}</strong></li>
        <li>End Time: <strong>${new Date(latestReport.summary.endTime).toLocaleString('pl-PL')}</strong></li>
        <li>Total Duration: <strong>${latestReport.summary.duration}ms</strong></li>
      </ul>
    </div>

    <footer>
      <p>Generated by Production Test Runner v1.0.0</p>
      <p>© 2025 CentralnyMagazynStanu Testing Infrastructure</p>
    </footer>
  </div>

  <script>
    // Możliwość eksportu do PDF
    window.print = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    return html;
  }

  /**
   * GENEROWANIE RAPORTU JSON
   */
  function generateJSONReport(reports) {
    const latestReport = reports[reports.length - 1];
    if (!latestReport) {
      return JSON.stringify({ error: 'No reports available' }, null, 2);
    }

    // Rozszerzony raport JSON z dodatkowymi metrykami
    const report = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      summary: latestReport.summary,
      results: latestReport.results,
      analytics: {
        ...latestReport.analytics,
        performance: {
          avgDuration: latestReport.results.reduce((sum, r) => sum + r.duration, 0) / latestReport.results.length,
          minDuration: Math.min(...latestReport.results.map(r => r.duration)),
          maxDuration: Math.max(...latestReport.results.map(r => r.duration)),
          slowTests: latestReport.results.filter(r => r.duration > 1000).map(r => ({
            name: r.name,
            duration: r.duration
          }))
        },
        reliability: {
          successRate: latestReport.summary.successRate,
          failureRate: 100 - latestReport.summary.successRate,
          flakyTestCount: latestReport.analytics.flakyTests.length,
          consistencyScore: calculateConsistencyScore(reports)
        }
      },
      history: {
        totalReports: reports.length,
        recentReports: reports.slice(-5).map(r => ({
          timestamp: r.timestamp,
          successRate: r.summary.successRate,
          duration: r.summary.duration
        }))
      }
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * OBLICZANIE CONSISTENCY SCORE
   */
  function calculateConsistencyScore(reports) {
    if (reports.length < 2) return 100;

    const successRates = reports.map(r => r.summary.successRate);
    const variance = calculateVariance(successRates);
    
    // Im mniejsza wariancja, tym lepszy consistency score
    const score = Math.max(0, 100 - variance);
    return Math.round(score);
  }

  /**
   * OBLICZANIE WARIANCJI
   */
  function calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * EXPORT RAPORTU DO PLIKU
   */
  function exportReport(format = 'html') {
    if (!window.productionTestRunner) {
      console.error('❌ ProductionTestRunner nie jest załadowany');
      return;
    }

    const reports = window.productionTestRunner.getReports();
    if (reports.length === 0) {
      console.warn('⚠️ Brak raportów do eksportu');
      return;
    }

    let content, filename, mimeType;

    if (format === 'html') {
      content = generateHTMLReport(reports);
      filename = `test-report_${Date.now()}.html`;
      mimeType = 'text/html';
    } else if (format === 'json') {
      content = generateJSONReport(reports);
      filename = `test-report_${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      console.error('❌ Nieznany format:', format);
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`📥 Raport wyeksportowany: ${filename}`);
  }

  /**
   * OTWÓRZ RAPORT W NOWYM OKNIE
   */
  function openReport() {
    if (!window.productionTestRunner) {
      console.error('❌ ProductionTestRunner nie jest załadowany');
      return;
    }

    const reports = window.productionTestRunner.getReports();
    const html = generateHTMLReport(reports);

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();

    console.log('📊 Raport otwarty w nowym oknie');
  }

  /**
   * PUBLICZNE API
   */
  window.testReporter = {
    generateHTML: (reports) => generateHTMLReport(reports || window.productionTestRunner?.getReports()),
    generateJSON: (reports) => generateJSONReport(reports || window.productionTestRunner?.getReports()),
    exportHTML: () => exportReport('html'),
    exportJSON: () => exportReport('json'),
    openReport: openReport
  };

  console.log('✅ [TestReporter] Zainicjalizowany');

})(window);
