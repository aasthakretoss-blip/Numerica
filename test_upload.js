const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUploadEndpoints() {
  console.log('🧪 Testing upload endpoints...\n');
  
  // Test 1: Health check
  try {
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('   ✅ Health check:', healthData.status);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    return;
  }
  
  // Test 2: API info
  try {
    console.log('2️⃣  Testing API info endpoint...');
    const infoResponse = await fetch('http://localhost:3001/api/info');
    const infoData = await infoResponse.json();
    console.log('   ✅ API info:', infoData.name);
  } catch (error) {
    console.log('   ❌ API info failed:', error.message);
    return;
  }
  
  // Test 3: Create a sample Excel file test (without actual file)
  try {
    console.log('3️⃣  Testing validate-file endpoint (without file)...');
    const validateResponse = await fetch('http://localhost:3001/api/validate-file', {
      method: 'POST',
      body: new FormData()
    });
    const validateData = await validateResponse.json();
    console.log('   ✅ Validation without file:', validateData.message);
  } catch (error) {
    console.log('   ❌ Validate endpoint failed:', error.message);
  }
  
  // Test 4: Upload data endpoint (without file)
  try {
    console.log('4️⃣  Testing upload-data endpoint (without file)...');
    const uploadResponse = await fetch('http://localhost:3001/api/upload-data', {
      method: 'POST',
      body: new FormData()
    });
    const uploadData = await uploadResponse.json();
    console.log('   ✅ Upload without file:', uploadData.message);
  } catch (error) {
    console.log('   ❌ Upload endpoint failed:', error.message);
  }
  
  console.log('\n🎉 All endpoint tests completed!');
  console.log('📝 Ready for frontend testing with actual Excel files.');
}

testUploadEndpoints().catch(console.error);
