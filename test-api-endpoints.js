const https = require('https');
const http = require('http');

// Test function to check endpoints
async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing ${description}: ${url}`);
    
    const req = http.get(url, (res) => {
      let data = '';
      
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📊 Headers:`, res.headers);
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log(`✅ Success: ${description}`);
            console.log(`📋 Response preview:`, JSON.stringify(jsonData, null, 2).substring(0, 500) + '...');
          } else {
            console.log(`❌ Failed: ${description} - Status: ${res.statusCode}`);
            console.log(`📋 Response:`, data);
          }
        } catch (error) {
          console.log(`❌ Failed to parse JSON for ${description}:`, error.message);
          console.log(`📋 Raw response:`, data);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Network error for ${description}:`, error.message);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log(`❌ Timeout for ${description}`);
      req.destroy();
      resolve();
    });
  });
}

async function main() {
  console.log('🚀 Testing API Endpoints...\n');
  
  const baseUrl = `${process.env.REACT_APP_API_URL}`;
  
  const endpoints = [
    { url: `${baseUrl}/health`, desc: 'Health Check' },
    { url: `${baseUrl}/api/payroll/stats`, desc: 'Payroll Stats' },
    { url: `${baseUrl}/api/payroll/periodos`, desc: 'Payroll Periods' },
    { url: `${baseUrl}/api/payroll/filter-options`, desc: 'Filter Options' },
    { url: `${baseUrl}/api/payroll/filters`, desc: 'Filters (Original)' },
    { url: `${baseUrl}/api/payroll/demographic?page=1&pageSize=5`, desc: 'Demographic Data' }
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.url, endpoint.desc);
  }
  
  console.log('\n✅ Test completed!');
}

if (require.main === module) {
  main().catch(console.error);
}
