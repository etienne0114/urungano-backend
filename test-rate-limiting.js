const axios = require('axios');

async function testRateLimiting() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  console.log('Testing Rate Limiting Implementation...\n');
  
  try {
    // Test 1: Make requests within the limit (should succeed)
    console.log('Test 1: Making 5 requests within rate limit...');
    for (let i = 0; i < 5; i++) {
      try {
        const response = await axios.post(`${baseURL}/auth/anonymous`, {
          username: `testuser${i}`
        });
        console.log(`Request ${i + 1}: SUCCESS (${response.status})`);
      } catch (error) {
        if (error.response) {
          console.log(`Request ${i + 1}: FAILED (${error.response.status}) - ${error.response.data.message}`);
        } else {
          console.log(`Request ${i + 1}: NETWORK ERROR - ${error.message}`);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\nTest 2: Making 6th request (should be rate limited)...');
    
    // Test 2: Make the 6th request (should be rate limited)
    try {
      const response = await axios.post(`${baseURL}/auth/anonymous`, {
        username: 'testuser_blocked'
      });
      console.log(`6th Request: UNEXPECTED SUCCESS (${response.status}) - Rate limiting may not be working`);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log(`6th Request: CORRECTLY RATE LIMITED (${error.response.status})`);
        console.log('Rate limit response:', error.response.data);
      } else if (error.response) {
        console.log(`6th Request: FAILED (${error.response.status}) - ${error.response.data.message}`);
      } else {
        console.log(`6th Request: NETWORK ERROR - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:4000/api/v1/docs');
    console.log('Server is running, starting rate limiting tests...\n');
    return true;
  } catch (error) {
    console.log('Server is not running. Please start the server first with: npm run start:dev');
    console.log('Then run this test script again.\n');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testRateLimiting();
  }
}

main().catch(console.error);