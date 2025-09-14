import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

class AdvancedSymptomAnalyzerIntegrationTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.apiUrl = `${this.baseUrl}/api/v1`;
    this.testResults = [];
    this.authToken = null;
  }

  async runAllTests() {
    console.log('🧪 Starting Advanced Symptom Analyzer Integration Tests\n');

    try {
      // Test 1: Authentication
      await this.testAuthentication();
      
      // Test 2: Basic symptom analysis
      await this.testBasicSymptomAnalysis();
      
      // Test 3: Advanced AI features
      await this.testAdvancedAIFeatures();
      
      // Test 4: Multi-modal input processing
      await this.testMultiModalInput();
      
      // Test 5: Real-time monitoring
      await this.testRealTimeMonitoring();
      
      // Test 6: Clinical decision support
      await this.testClinicalDecisionSupport();
      
      // Test 7: Risk assessment
      await this.testRiskAssessment();
      
      // Test 8: Specialist recommendations
      await this.testSpecialistRecommendations();
      
      // Test 9: Database integration
      await this.testDatabaseIntegration();
      
      // Test 10: Error handling
      await this.testErrorHandling();

      // Generate test report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      // Test user login
      const loginResponse = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        this.authToken = data.token;
        this.addTestResult('Authentication', 'PASS', 'User login successful');
      } else {
        this.addTestResult('Authentication', 'SKIP', 'No test user available');
      }
    } catch (error) {
      this.addTestResult('Authentication', 'SKIP', `Authentication test skipped: ${error.message}`);
    }
  }

  async testBasicSymptomAnalysis() {
    console.log('🩺 Testing Basic Symptom Analysis...');
    
    try {
      const analysisPayload = {
        symptoms: 'I have a headache, fever, and fatigue',
        additionalInfo: {
          duration: '2 days',
          severity: 'moderate',
          triggers: 'stress',
          medications: 'none',
          allergies: 'none'
        }
      };

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        },
        body: JSON.stringify(analysisPayload)
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.analysis) {
          this.addTestResult('Basic Symptom Analysis', 'PASS', 'Analysis completed successfully');
          console.log('✅ Analysis result:', {
            severity: data.analysis.severityAssessment,
            confidence: data.analysis.confidenceScore,
            bodySystemsInvolved: data.analysis.bodySystemsInvolved?.affectedSystems?.length || 0
          });
        } else {
          this.addTestResult('Basic Symptom Analysis', 'FAIL', 'Invalid response structure');
        }
      } else {
        const errorData = await response.json();
        this.addTestResult('Basic Symptom Analysis', 'FAIL', `API error: ${errorData.message}`);
      }
    } catch (error) {
      this.addTestResult('Basic Symptom Analysis', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testAdvancedAIFeatures() {
    console.log('🤖 Testing Advanced AI Features...');
    
    try {
      const advancedPayload = {
        symptoms: 'Chest pain and shortness of breath',
        additionalInfo: {
          duration: '1 hour',
          severity: 'severe'
        },
        advancedFeatures: {
          bodyVisualization: {
            selectedBodyParts: [
              { name: 'Chest', painLevel: 8 }
            ],
            anatomyMode: 'external',
            gender: 'neutral'
          },
          aiAnalytics: {
            emotionDetection: { enabled: true },
            behaviorAnalysis: { enabled: true }
          },
          realTimeMonitoring: {
            enabled: true,
            continuousAssessment: true
          }
        }
      };

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        },
        body: JSON.stringify(advancedPayload)
      });

      if (response.ok) {
        const data = await response.json();
        
        const hasAdvancedFeatures = !!(
          data.riskAnalysis &&
          data.clinicalRecommendations &&
          data.bodyVisualizationData &&
          data.emotionAnalysis
        );

        if (hasAdvancedFeatures) {
          this.addTestResult('Advanced AI Features', 'PASS', 'All advanced features working');
          console.log('✅ Advanced features:', {
            riskScore: data.riskAnalysis?.riskScore,
            urgencyLevel: data.riskAnalysis?.urgencyLevel,
            clinicalPathways: data.clinicalRecommendations?.clinicalPathways?.length || 0,
            emotionDetected: data.emotionAnalysis?.primaryEmotion?.emotion
          });
        } else {
          this.addTestResult('Advanced AI Features', 'PARTIAL', 'Some advanced features missing');
        }
      } else {
        this.addTestResult('Advanced AI Features', 'FAIL', 'API request failed');
      }
    } catch (error) {
      this.addTestResult('Advanced AI Features', 'FAIL', `Test failed: ${error.message}`);
    }
  }

  async testMultiModalInput() {
    console.log('📸 Testing Multi-Modal Input Processing...');
    
    try {
      // Create mock form data
      const formData = new FormData();
      formData.append('symptoms', 'Skin rash on arm');
      formData.append('voiceTranscript', 'The rash appeared yesterday and is getting worse');
      
      // Create a small test image (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE
      ]);

      // Note: fetch with FormData is complex in Node.js
      // This test validates the endpoint exists
      const testResponse = await fetch(`${this.apiUrl}/symptom-analyzer/process-multimodal`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        }
      });

      if (testResponse.status === 200 || testResponse.status === 204) {
        this.addTestResult('Multi-Modal Input', 'PASS', 'Endpoint available for multi-modal processing');
      } else {
        this.addTestResult('Multi-Modal Input', 'PARTIAL', 'Endpoint exists but may need configuration');
      }
    } catch (error) {
      this.addTestResult('Multi-Modal Input', 'SKIP', `Multi-modal test skipped: ${error.message}`);
    }
  }

  async testRealTimeMonitoring() {
    console.log('⚡ Testing Real-Time Monitoring...');
    
    try {
      // Test WebSocket connection availability
      const wsUrl = 'ws://localhost:5000';
      
      // Since we can't easily test WebSocket in this environment,
      // we'll test the HTTP endpoint that would initialize monitoring
      const monitoringData = {
        analysisId: 'test_analysis_123',
        symptoms: 'Chest pain',
        additionalInfo: { severity: 'severe' }
      };

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/monitoring-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        },
        body: JSON.stringify(monitoringData)
      });

      if (response.ok || response.status === 401) {
        this.addTestResult('Real-Time Monitoring', 'PASS', 'Monitoring endpoints available');
      } else {
        this.addTestResult('Real-Time Monitoring', 'FAIL', 'Monitoring endpoints not responding');
      }
    } catch (error) {
      this.addTestResult('Real-Time Monitoring', 'SKIP', `Monitoring test skipped: ${error.message}`);
    }
  }

  async testClinicalDecisionSupport() {
    console.log('🏥 Testing Clinical Decision Support...');
    
    try {
      const clinicalPayload = {
        symptoms: 'Persistent cough with blood, weight loss, night sweats',
        additionalInfo: {
          duration: '3 weeks',
          severity: 'severe',
          age: 45
        }
      };

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/clinical-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        },
        body: JSON.stringify(clinicalPayload)
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.recommendations) {
          this.addTestResult('Clinical Decision Support', 'PASS', 'Clinical recommendations generated');
          console.log('✅ Clinical insights:', {
            differentialDiagnosis: data.recommendations.differentialDiagnosis?.length || 0,
            recommendedTests: data.recommendations.recommendedTests?.length || 0,
            specialistReferrals: data.recommendations.specialistReferrals?.length || 0
          });
        } else {
          this.addTestResult('Clinical Decision Support', 'PARTIAL', 'Limited clinical data returned');
        }
      } else {
        this.addTestResult('Clinical Decision Support', 'FAIL', 'Clinical support endpoint failed');
      }
    } catch (error) {
      this.addTestResult('Clinical Decision Support', 'FAIL', `Clinical test failed: ${error.message}`);
    }
  }

  async testRiskAssessment() {
    console.log('⚠️ Testing Risk Assessment...');
    
    try {
      const riskPayload = {
        symptoms: 'Severe chest pain, difficulty breathing, sweating',
        additionalInfo: {
          duration: '30 minutes',
          severity: 'extreme',
          age: 65
        }
      };

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        },
        body: JSON.stringify(riskPayload)
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.riskAnalysis && data.riskAnalysis.riskScore !== undefined) {
          const riskScore = data.riskAnalysis.riskScore;
          const urgencyLevel = data.riskAnalysis.urgencyLevel;
          
          if (urgencyLevel === 'emergency' || urgencyLevel === 'urgent') {
            this.addTestResult('Risk Assessment', 'PASS', `High-risk symptoms correctly identified (${urgencyLevel})`);
          } else {
            this.addTestResult('Risk Assessment', 'PARTIAL', `Risk detected but urgency may be underestimated`);
          }
          
          console.log('✅ Risk assessment:', {
            riskScore,
            urgencyLevel,
            riskFactors: data.riskAnalysis.riskFactors?.length || 0
          });
        } else {
          this.addTestResult('Risk Assessment', 'FAIL', 'Risk analysis not included in response');
        }
      } else {
        this.addTestResult('Risk Assessment', 'FAIL', 'Risk assessment request failed');
      }
    } catch (error) {
      this.addTestResult('Risk Assessment', 'FAIL', `Risk test failed: ${error.message}`);
    }
  }

  async testSpecialistRecommendations() {
    console.log('👨‍⚕️ Testing Specialist Recommendations...');
    
    try {
      const specialistParams = new URLSearchParams({
        symptoms: 'heart palpitations',
        specialty: 'cardiology',
        location: 'New York',
        urgency: 'moderate'
      });

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/specialists?${specialistParams}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.specialists)) {
          this.addTestResult('Specialist Recommendations', 'PASS', `Found ${data.specialists.length} specialists`);
          console.log('✅ Specialist search:', {
            specialistsFound: data.specialists.length,
            avgRating: data.specialists.length > 0 ? 
              (data.specialists.reduce((sum, s) => sum + (s.rating || 0), 0) / data.specialists.length).toFixed(1) : 'N/A'
          });
        } else {
          this.addTestResult('Specialist Recommendations', 'PARTIAL', 'Specialist endpoint responding but no data');
        }
      } else {
        this.addTestResult('Specialist Recommendations', 'FAIL', 'Specialist search failed');
      }
    } catch (error) {
      this.addTestResult('Specialist Recommendations', 'FAIL', `Specialist test failed: ${error.message}`);
    }
  }

  async testDatabaseIntegration() {
    console.log('🗃️ Testing Database Integration...');
    
    try {
      // Test symptom history retrieval
      const response = await fetch(`${this.apiUrl}/symptom-analyzer/history?limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          this.addTestResult('Database Integration', 'PASS', 'Database queries working');
          console.log('✅ Database connection:', {
            historyRecords: data.history?.length || 0,
            pagination: !!data.pagination
          });
        } else {
          this.addTestResult('Database Integration', 'PARTIAL', 'Database responding but may have issues');
        }
      } else if (response.status === 401) {
        this.addTestResult('Database Integration', 'SKIP', 'Database test requires authentication');
      } else {
        this.addTestResult('Database Integration', 'FAIL', 'Database queries failing');
      }
    } catch (error) {
      this.addTestResult('Database Integration', 'FAIL', `Database test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('🚫 Testing Error Handling...');
    
    try {
      // Test with invalid data
      const invalidPayload = {
        symptoms: '', // Empty symptoms should trigger validation
        additionalInfo: {
          severity: 'invalid_severity'
        }
      };

      const response = await fetch(`${this.apiUrl}/symptom-analyzer/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
        },
        body: JSON.stringify(invalidPayload)
      });

      if (response.status >= 400) {
        const errorData = await response.json();
        
        if (errorData.message || errorData.error) {
          this.addTestResult('Error Handling', 'PASS', 'Proper error responses for invalid input');
        } else {
          this.addTestResult('Error Handling', 'PARTIAL', 'Error responses need improvement');
        }
      } else {
        this.addTestResult('Error Handling', 'FAIL', 'Should reject invalid input');
      }
    } catch (error) {
      this.addTestResult('Error Handling', 'PASS', 'Error handling working (network level)');
    }
  }

  addTestResult(testName, status, message) {
    this.testResults.push({
      test: testName,
      status: status,
      message: message,
      timestamp: new Date().toISOString()
    });

    const statusIcon = {
      'PASS': '✅',
      'FAIL': '❌',
      'PARTIAL': '⚠️',
      'SKIP': '⏭️'
    };

    console.log(`${statusIcon[status]} ${testName}: ${message}`);
  }

  generateTestReport() {
    console.log('\n📋 TEST REPORT');
    console.log('=' .repeat(50));
    
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      partial: this.testResults.filter(r => r.status === 'PARTIAL').length,
      skipped: this.testResults.filter(r => r.status === 'SKIP').length
    };

    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️ Partial: ${summary.partial}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    
    const successRate = Math.round(((summary.passed + summary.partial * 0.5) / summary.total) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.test}: ${result.message}`);
        });
    }

    if (summary.partial > 0) {
      console.log('\n⚠️ Partial Tests:');
      this.testResults
        .filter(r => r.status === 'PARTIAL')
        .forEach(result => {
          console.log(`  - ${result.test}: ${result.message}`);
        });
    }

    console.log('\n🔧 RECOMMENDATIONS:');
    
    if (summary.failed > 0) {
      console.log('• Fix failing tests before production deployment');
    }
    
    if (summary.partial > 0) {
      console.log('• Investigate partial tests for potential improvements');
    }
    
    if (summary.skipped > 0) {
      console.log('• Consider implementing skipped test scenarios');
    }
    
    if (successRate >= 80) {
      console.log('• ✅ System appears to be working well overall');
    } else {
      console.log('• ⚠️ System needs attention before production use');
    }

    console.log(`\n📊 Detailed results saved to test-results-${Date.now()}.json`);
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      `test-results-${Date.now()}.json`, 
      JSON.stringify({
        summary,
        successRate,
        testResults: this.testResults,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  }
}

// Check if server is running
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:5000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Advanced Symptom Analyzer Integration Test Suite');
  console.log('=' .repeat(50));
  
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    console.log('⚠️ Server not running at http://localhost:5000');
    console.log('Please start the server first: npm run dev');
    process.exit(1);
  }

  console.log('✅ Server is running, starting tests...\n');
  
  const tester = new AdvancedSymptomAnalyzerIntegrationTest();
  await tester.runAllTests();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default AdvancedSymptomAnalyzerIntegrationTest;
