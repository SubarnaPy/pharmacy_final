// Quick test to check server status
console.log('Testing server endpoints...');

// Test if server is running
fetch('http://localhost:5000/health')
  .then(response => {
    console.log('Health endpoint status:', response.status);
    return response.text();
  })
  .then(data => {
    console.log('Health endpoint response:', data);
  })
  .catch(error => {
    console.error('Server not running or health endpoint failed:', error.message);
  });

// Test mock endpoint
fetch('http://localhost:5000/api/v1/prescription-requests/dev/mock-queue')
  .then(response => {
    console.log('Mock endpoint status:', response.status);
    return response.text();
  })
  .then(data => {
    console.log('Mock endpoint response (first 200 chars):', data.substring(0, 200));
  })
  .catch(error => {
    console.error('Mock endpoint failed:', error.message);
  });