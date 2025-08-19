import http from 'http';

const testEndpoint = (path, port = 5000) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    isJson: res.headers['content-type']?.includes('application/json')
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
};

const runDiagnostics = async () => {
    console.log('🔍 Running API Diagnostics...\n');

    const endpoints = [
        '/health',
        '/api/test',
        '/api/v1/prescription-requests/test',
        '/api/v1/pharmacies/test',
        '/api/v1/prescription-requests/dev/mock-queue',
        '/api/v1/pharmacies/dashboard/stats'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing: ${endpoint}`);
            const result = await testEndpoint(endpoint);

            console.log(`  Status: ${result.status}`);
            console.log(`  Content-Type: ${result.headers['content-type'] || 'Not set'}`);
            console.log(`  Is JSON: ${result.isJson ? '✅' : '❌'}`);
            console.log(`  Body (first 100 chars): ${result.body.substring(0, 100)}`);

            if (result.isJson) {
                try {
                    const parsed = JSON.parse(result.body);
                    console.log(`  Parsed JSON: ${JSON.stringify(parsed, null, 2).substring(0, 200)}`);
                } catch (e) {
                    console.log(`  JSON Parse Error: ${e.message}`);
                }
            }

            console.log('');
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}\n`);
        }
    }
};

runDiagnostics().catch(console.error);