const fetch = require('node-fetch');

const BASE_URL = `${process.env.REACT_APP_API_URL}`;

async function testEndpoint(url, description, expectAuth = false) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    if (expectAuth && response.status === 401) {
      console.log('✅ Expected 401 (Unauthorized) - Auth is working!');
    } else if (!expectAuth && response.status === 200) {
      console.log('✅ Success - Endpoint is working!');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log('=' * 50);
  
  // Test public endpoints
  await testEndpoint(`${BASE_URL}/health`, 'Health Check');
  await testEndpoint(`${BASE_URL}/api/info`, 'API Info');
  
  // Test protected endpoints (should return 401)
  await testEndpoint(`${BASE_URL}/api/nominas/tables`, 'Nominas Tables (Protected)', true);
  await testEndpoint(`${BASE_URL}/api/fondos/tables`, 'Fondos Tables (Protected)', true);
  await testEndpoint(`${BASE_URL}/api/user/profile`, 'User Profile (Protected)', true);
  
  // Test invalid endpoint
  await testEndpoint(`${BASE_URL}/api/invalid`, 'Invalid Endpoint');
  
  console.log('\n🏁 Tests completed!');
}

// Check if server is running
async function checkServer() {
  try {
    await fetch(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm start');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  } else {
    console.log('\n💡 To start the server, run:');
    console.log('   npm start');
  }
}

main().catch(console.error);
