import React, { useState, useEffect } from 'react';
import { getTokenInfo, isAuthenticated, getUserRole } from '../../utils/authCheck';
import apiClient from '../../api/apiClient';

function ApiDebug() {
  const [debugInfo, setDebugInfo] = useState({
    hasToken: false,
    serverStatus: 'unknown',
    apiTests: []
  });

  useEffect(() => {
    runDebugTests();
  }, []);

  const testToken = async () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Token test - Raw token:', token ? `${token.substring(0, 50)}...` : 'No token');
    
    if (token) {
      try {
        // Decode the token to check its contents
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload:', payload);
        console.log('🔍 Token expires:', new Date(payload.exp * 1000));
        console.log('🔍 Token valid:', payload.exp * 1000 > Date.now());
      } catch (e) {
        console.log('❌ Token decode error:', e.message);
      }
    }
  };

  const createTestPharmacy = async () => {
    try {
      console.log('🔍 Creating test pharmacy...');
      await testToken(); // Test token first
      
      const response = await apiClient.post('/pharmacies/dev/create-test-pharmacy');
      console.log('✅ Create pharmacy response:', response.data);
      
      // Refresh the debug tests
      runDebugTests();
      
      return response.data;
    } catch (error) {
      console.error('❌ Error creating test pharmacy:', error);
      return { error: error.response?.data?.message || error.message };
    }
  };

  const runDebugTests = async () => {
    const token = localStorage.getItem('token');
    const tokenInfo = getTokenInfo(token);
    const isAuth = isAuthenticated();
    const userRole = getUserRole();
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    
    const publicTests = [
      {
        name: 'Health Check',
        url: `${baseUrl}/health`,
        useApiClient: false
      },
      {
        name: 'Prescription Test Route',
        url: `${apiUrl}/prescription-requests/test`,
        useApiClient: false
      },
      {
        name: 'Pharmacy Test Route',
        url: `${apiUrl}/pharmacies/test`,
        useApiClient: false
      },
      {
        name: 'Mock Queue',
        url: `${apiUrl}/prescription-requests/public-mock-queue`,
        useApiClient: false
      }
    ];

    const authenticatedTests = [
      {
        name: 'Auth Test',
        endpoint: '/prescription-requests/test-auth',
        useApiClient: true
      },
      {
        name: 'Pharmacy Queue (Real)',
        endpoint: '/prescription-requests/pharmacy/queue',
        useApiClient: true
      },
      {
        name: 'Dashboard Stats',
        endpoint: '/pharmacies/dashboard/stats',
        useApiClient: true
      }
    ];

    const results = [];
    
    // Test public endpoints with fetch
    for (const test of publicTests) {
      try {
        const response = await fetch(test.url);
        const contentType = response.headers.get('content-type');
        
        let result = {
          name: test.name,
          status: response.status,
          contentType,
          success: false,
          data: null,
          error: null
        };

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          result.success = data.success || response.ok;
          result.data = data;
        } else {
          const text = await response.text();
          result.error = `Non-JSON response: ${text.substring(0, 100)}...`;
        }

        results.push(result);
      } catch (error) {
        results.push({
          name: test.name,
          status: 'ERROR',
          error: error.message,
          success: false
        });
      }
    }

    // Test authenticated endpoints with apiClient
    const hasToken = !!localStorage.getItem('token');
    console.log('🔍 Debug: Has token in localStorage:', hasToken);
    
    for (const test of authenticatedTests) {
      try {
        console.log(`🔍 Testing authenticated endpoint: ${test.endpoint}`);
        const response = await apiClient.get(test.endpoint);
        console.log(`✅ Success: ${test.name}`, response.data);
        
        results.push({
          name: test.name,
          status: response.status,
          contentType: 'application/json',
          success: true,
          data: response.data,
          error: null
        });
      } catch (error) {
        console.log(`❌ Error: ${test.name}`, error.response?.data || error.message);
        results.push({
          name: test.name,
          status: error.response?.status || 'ERROR',
          error: error.response?.data?.message || error.message,
          success: false,
          data: error.response?.data
        });
      }
    }

    setDebugInfo({
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
      isAuthenticated: isAuth,
      userRole: userRole,
      tokenInfo: tokenInfo,
      serverStatus: results[0]?.success ? 'running' : 'error',
      apiTests: results
    });
  };

  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md text-xs z-50">
      <h3 className="font-bold mb-2">🐛 API Debug Info</h3>
      
      <div className="mb-2">
        <strong>Token:</strong> {debugInfo.hasToken ? '✅ Present' : '❌ Missing'}
        <br />
        <span className="text-gray-400">{debugInfo.tokenPreview}</span>
        <br />
        <strong>Auth:</strong> {debugInfo.isAuthenticated ? '✅ Valid' : '❌ Invalid/Expired'}
        <br />
        <strong>Role:</strong> {debugInfo.userRole || 'Unknown'}
        {debugInfo.tokenInfo && (
          <div className="text-gray-400 text-xs mt-1">
            Expires: {new Date(debugInfo.tokenInfo.exp * 1000).toLocaleString()}
          </div>
        )}
      </div>

      <div className="mb-2">
        <strong>Server:</strong> {debugInfo.serverStatus === 'running' ? '✅ Running' : '❌ Error'}
      </div>

      <div>
        <strong>API Tests:</strong>
        {debugInfo.apiTests.map((test, index) => (
          <div key={index} className="ml-2 mt-1">
            <span className={test.success ? 'text-green-400' : 'text-red-400'}>
              {test.success ? '✅' : '❌'}
            </span>
            <span className="ml-1">{test.name}</span>
            <span className="text-gray-400 ml-1">({test.status})</span>
            {test.error && (
              <div className="text-red-300 text-xs ml-4 mt-1">
                {test.error}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 space-x-2">
        <button
          onClick={runDebugTests}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          Refresh Tests
        </button>
        <button
          onClick={testToken}
          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
        >
          Test Token
        </button>
        <button
          onClick={createTestPharmacy}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
        >
          Create Pharmacy
        </button>
      </div>
      
      {debugInfo.apiTests.some(test => test.name === 'Pharmacy Queue (Real)' && test.error?.includes('pharmacy')) && (
        <div className="mt-2 p-2 bg-yellow-900 border border-yellow-600 rounded text-xs">
          <div className="text-yellow-300 font-bold">⚠️ Pharmacy Required</div>
          <div className="text-yellow-200">
            Click "Create Pharmacy" to associate a pharmacy with your account.
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiDebug;