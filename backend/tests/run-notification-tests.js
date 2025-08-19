#!/usr/bin/env node

/**
 * Notification System Test Runner
 * Executes comprehensive unit and integration tests for the notification system
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const TEST_TIMEOUT = 60000; // 60 seconds
const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results');

class NotificationTestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      overall: {
        passed: 0,
        failed: 0,
        total: 0,
        duration: 0,
        coverage: null
      }
    };
  }

  async run() {
    console.log('🧪 Starting Notification System Test Suite');
    console.log('=' .repeat(60));

    const startTime = Date.now();

    try {
      // Ensure test results directory exists
      await this.ensureTestResultsDir();

      // Run unit tests
      console.log('\n📋 Running Unit Tests...');
      this.results.unit = await this.runUnitTests();

      // Run integration tests
      console.log('\n🔗 Running Integration Tests...');
      this.results.integration = await this.runIntegrationTests();

      // Calculate overall results
      this.calculateOverallResults(Date.now() - startTime);

      // Generate test report
      await this.generateTestReport();

      // Display results
      this.displayResults();

      // Exit with appropriate code
      process.exit(this.results.overall.failed > 0 ? 1 : 0);

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  async ensureTestResultsDir() {
    try {
      await fs.access(TEST_RESULTS_DIR);
    } catch {
      await fs.mkdir(TEST_RESULTS_DIR, { recursive: true });
    }
  }

  async runUnitTests() {
    console.log('  • Executing notification system unit tests...');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['run', 'test:unit', '--', 'notification-system-unit.test.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          JEST_TIMEOUT: TEST_TIMEOUT.toString()
        }
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      const timeout = setTimeout(() => {
        testProcess.kill('SIGKILL');
        reject(new Error('Unit tests timed out'));
      }, TEST_TIMEOUT);

      testProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        const result = this.parseTestOutput(stdout, stderr, code);
        result.type = 'unit';
        
        resolve(result);
      });

      testProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async runIntegrationTests() {
    console.log('  • Executing notification system integration tests...');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['run', 'test:integration', '--', 'notification-system-integration.test.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          JEST_TIMEOUT: TEST_TIMEOUT.toString()
        }
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      const timeout = setTimeout(() => {
        testProcess.kill('SIGKILL');
        reject(new Error('Integration tests timed out'));
      }, TEST_TIMEOUT);

      testProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        const result = this.parseTestOutput(stdout, stderr, code);
        result.type = 'integration';
        
        resolve(result);
      });

      testProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  parseTestOutput(stdout, stderr, exitCode) {
    const result = {
      exitCode,
      passed: 0,
      failed: 0,
      total: 0,
      duration: 0,
      coverage: null,
      output: stdout,
      errors: stderr
    };

    try {
      // Parse Jest output for test results
      const testSummaryMatch = stdout.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (testSummaryMatch) {
        result.failed = parseInt(testSummaryMatch[1]);
        result.passed = parseInt(testSummaryMatch[2]);
        result.total = parseInt(testSummaryMatch[3]);
      } else {
        // Alternative parsing for different Jest output formats
        const passedMatch = stdout.match(/(\d+)\s+passed/);
        const failedMatch = stdout.match(/(\d+)\s+failed/);
        const totalMatch = stdout.match(/(\d+)\s+total/);

        if (passedMatch) result.passed = parseInt(passedMatch[1]);
        if (failedMatch) result.failed = parseInt(failedMatch[1]);
        if (totalMatch) result.total = parseInt(totalMatch[1]);
      }

      // Parse duration
      const durationMatch = stdout.match(/Time:\s+([\d.]+)\s*s/);
      if (durationMatch) {
        result.duration = parseFloat(durationMatch[1]) * 1000; // Convert to ms
      }

      // Parse coverage if available
      const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      if (coverageMatch) {
        result.coverage = {
          statements: parseFloat(coverageMatch[1]),
          branches: parseFloat(coverageMatch[2]),
          functions: parseFloat(coverageMatch[3]),
          lines: parseFloat(coverageMatch[4])
        };
      }

    } catch (error) {
      console.warn('⚠️  Could not parse test output:', error.message);
    }

    return result;
  }

  calculateOverallResults(totalDuration) {
    this.results.overall.passed = (this.results.unit?.passed || 0) + (this.results.integration?.passed || 0);
    this.results.overall.failed = (this.results.unit?.failed || 0) + (this.results.integration?.failed || 0);
    this.results.overall.total = (this.results.unit?.total || 0) + (this.results.integration?.total || 0);
    this.results.overall.duration = totalDuration;

    // Calculate average coverage if available
    const coverages = [this.results.unit?.coverage, this.results.integration?.coverage].filter(Boolean);
    if (coverages.length > 0) {
      this.results.overall.coverage = {
        statements: coverages.reduce((sum, c) => sum + c.statements, 0) / coverages.length,
        branches: coverages.reduce((sum, c) => sum + c.branches, 0) / coverages.length,
        functions: coverages.reduce((sum, c) => sum + c.functions, 0) / coverages.length,
        lines: coverages.reduce((sum, c) => sum + c.lines, 0) / coverages.length
      };
    }
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.overall,
      details: {
        unit: this.results.unit,
        integration: this.results.integration
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        testTimeout: TEST_TIMEOUT
      }
    };

    const reportPath = path.join(TEST_RESULTS_DIR, 'notification-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    await this.generateHTMLReport(report);

    console.log(`\n📊 Test report generated: ${reportPath}`);
  }

  async generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification System Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric.passed { border-left: 4px solid #28a745; }
        .metric.failed { border-left: 4px solid #dc3545; }
        .metric.total { border-left: 4px solid #007bff; }
        .metric.duration { border-left: 4px solid #6f42c1; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .test-result { background: #f8f9fa; padding: 15px; border-radius: 6px; }
        .test-result h3 { margin-top: 0; }
        .coverage { margin-top: 20px; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .timestamp { color: #666; font-size: 0.9em; text-align: center; margin-top: 20px; }
        .status-badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; font-weight: bold; }
        .status-passed { background-color: #28a745; }
        .status-failed { background-color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Notification System Test Report</h1>
            <div class="status-badge ${report.summary.failed === 0 ? 'status-passed' : 'status-failed'}">
                ${report.summary.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}
            </div>
        </div>

        <div class="section">
            <h2>📊 Test Summary</h2>
            <div class="summary">
                <div class="metric passed">
                    <div class="metric-value">${report.summary.passed}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric failed">
                    <div class="metric-value">${report.summary.failed}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric total">
                    <div class="metric-value">${report.summary.total}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric duration">
                    <div class="metric-value">${(report.summary.duration / 1000).toFixed(2)}s</div>
                    <div class="metric-label">Duration</div>
                </div>
            </div>
        </div>

        ${report.summary.coverage ? `
        <div class="section">
            <h2>📈 Code Coverage</h2>
            <div class="coverage">
                <div>
                    <strong>Statements:</strong> ${report.summary.coverage.statements.toFixed(1)}%
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.summary.coverage.statements}%"></div>
                    </div>
                </div>
                <div>
                    <strong>Branches:</strong> ${report.summary.coverage.branches.toFixed(1)}%
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.summary.coverage.branches}%"></div>
                    </div>
                </div>
                <div>
                    <strong>Functions:</strong> ${report.summary.coverage.functions.toFixed(1)}%
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.summary.coverage.functions}%"></div>
                    </div>
                </div>
                <div>
                    <strong>Lines:</strong> ${report.summary.coverage.lines.toFixed(1)}%
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.summary.coverage.lines}%"></div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>🔍 Test Details</h2>
            <div class="test-details">
                <div class="test-result">
                    <h3>📋 Unit Tests</h3>
                    <p><strong>Status:</strong> <span class="status-badge ${report.details.unit?.failed === 0 ? 'status-passed' : 'status-failed'}">${report.details.unit?.failed === 0 ? 'PASSED' : 'FAILED'}</span></p>
                    <p><strong>Passed:</strong> ${report.details.unit?.passed || 0}</p>
                    <p><strong>Failed:</strong> ${report.details.unit?.failed || 0}</p>
                    <p><strong>Total:</strong> ${report.details.unit?.total || 0}</p>
                    <p><strong>Duration:</strong> ${((report.details.unit?.duration || 0) / 1000).toFixed(2)}s</p>
                </div>
                <div class="test-result">
                    <h3>🔗 Integration Tests</h3>
                    <p><strong>Status:</strong> <span class="status-badge ${report.details.integration?.failed === 0 ? 'status-passed' : 'status-failed'}">${report.details.integration?.failed === 0 ? 'PASSED' : 'FAILED'}</span></p>
                    <p><strong>Passed:</strong> ${report.details.integration?.passed || 0}</p>
                    <p><strong>Failed:</strong> ${report.details.integration?.failed || 0}</p>
                    <p><strong>Total:</strong> ${report.details.integration?.total || 0}</p>
                    <p><strong>Duration:</strong> ${((report.details.integration?.duration || 0) / 1000).toFixed(2)}s</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🖥️ Environment</h2>
            <p><strong>Node.js Version:</strong> ${report.environment.nodeVersion}</p>
            <p><strong>Platform:</strong> ${report.environment.platform} (${report.environment.arch})</p>
            <p><strong>Test Timeout:</strong> ${report.environment.testTimeout}ms</p>
        </div>

        <div class="timestamp">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(TEST_RESULTS_DIR, 'notification-test-report.html');
    await fs.writeFile(htmlPath, html);
  }

  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 NOTIFICATION SYSTEM TEST RESULTS');
    console.log('='.repeat(60));

    // Overall summary
    console.log(`\n📊 Overall Summary:`);
    console.log(`   ✅ Passed: ${this.results.overall.passed}`);
    console.log(`   ❌ Failed: ${this.results.overall.failed}`);
    console.log(`   📝 Total:  ${this.results.overall.total}`);
    console.log(`   ⏱️  Duration: ${(this.results.overall.duration / 1000).toFixed(2)}s`);

    // Unit tests
    if (this.results.unit) {
      console.log(`\n📋 Unit Tests:`);
      console.log(`   Status: ${this.results.unit.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Tests: ${this.results.unit.passed}/${this.results.unit.total} passed`);
      console.log(`   Duration: ${(this.results.unit.duration / 1000).toFixed(2)}s`);
    }

    // Integration tests
    if (this.results.integration) {
      console.log(`\n🔗 Integration Tests:`);
      console.log(`   Status: ${this.results.integration.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Tests: ${this.results.integration.passed}/${this.results.integration.total} passed`);
      console.log(`   Duration: ${(this.results.integration.duration / 1000).toFixed(2)}s`);
    }

    // Coverage
    if (this.results.overall.coverage) {
      console.log(`\n📈 Code Coverage:`);
      console.log(`   Statements: ${this.results.overall.coverage.statements.toFixed(1)}%`);
      console.log(`   Branches:   ${this.results.overall.coverage.branches.toFixed(1)}%`);
      console.log(`   Functions:  ${this.results.overall.coverage.functions.toFixed(1)}%`);
      console.log(`   Lines:      ${this.results.overall.coverage.lines.toFixed(1)}%`);
    }

    // Final status
    console.log('\n' + '='.repeat(60));
    if (this.results.overall.failed === 0) {
      console.log('🎉 ALL NOTIFICATION SYSTEM TESTS PASSED!');
    } else {
      console.log('💥 SOME NOTIFICATION SYSTEM TESTS FAILED!');
      console.log(`   Please check the test output above for details.`);
    }
    console.log('='.repeat(60));
  }
}

// Run the test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new NotificationTestRunner();
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default NotificationTestRunner;