const http = require('http');

// Test backup API endpoints
async function testBackupAPI() {
  console.log('🧪 Testing Backup API Endpoints\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test if server is running
  try {
    const healthResponse = await makeRequest(`${baseUrl}/health`);
    console.log('✓ Server is running');
    console.log(`✓ Database: ${healthResponse.database}`);
    console.log(`✓ Status: ${healthResponse.status}\n`);
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    console.log('Run: npm start or node dist/index.js\n');
    return;
  }
  
  // Test backup endpoints (these will require authentication in real usage)
  const testEndpoints = [
    '/api/backup/tenants/00000000-0000-0000-0000-000000000000/backups',
    '/api/backup/tenants/00000000-0000-0000-0000-000000000000/backup-schedules',
    '/api/backup/tenants/00000000-0000-0000-0000-000000000000/backups/stats'
  ];
  
  console.log('Testing backup API endpoints (expecting 401/403 due to auth):');
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await makeRequest(`${baseUrl}${endpoint}`);
      console.log(`✓ ${endpoint} - Response received`);
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        console.log(`✓ ${endpoint} - Authentication required (expected)`);
      } else if (error.statusCode === 404) {
        console.log(`⚠️  ${endpoint} - Not found (route may not be registered)`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 Backup API endpoint tests completed!');
  console.log('\nNote: Actual backup operations require:');
  console.log('1. Valid authentication token');
  console.log('2. Proper tenant context');
  console.log('3. System admin or tenant admin privileges');
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(jsonData);
          } else {
            const error = new Error(`HTTP ${response.statusCode}: ${jsonData.error || jsonData.message || 'Unknown error'}`);
            error.statusCode = response.statusCode;
            reject(error);
          }
        } catch (parseError) {
          const error = new Error(`HTTP ${response.statusCode}: ${data}`);
          error.statusCode = response.statusCode;
          reject(error);
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Run the test
if (require.main === module) {
  testBackupAPI().catch(console.error);
}

module.exports = { testBackupAPI };