const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function debugTwelveLabs() {
  console.log('🔍 Debugging Twelve Labs API...\n');

  const apiKey = process.env.TWELVE_LABS_API_KEY;
  const indexId = process.env.TWELVE_LABS_INDEX_ID;

  console.log(`API Key: ${apiKey?.substring(0, 10)}...`);
  console.log(`Index ID: ${indexId}\n`);

  // Test different API versions and endpoints
  const endpoints = [
    'https://api.twelvelabs.io/v1.3/indexes',
    'https://api.twelvelabs.io/v1.2/indexes',
    'https://api.twelvelabs.io/v1.1/indexes',
    'https://api.twelvelabs.io/v1/indexes',
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);

      // If we found indexes, check if our target index exists
      const indexes = response.data.data || response.data || [];
      if (Array.isArray(indexes) && indexes.length > 0) {
        console.log('📋 Available indexes:');
        indexes.forEach(idx => {
          const isTarget = idx._id === indexId || idx.id === indexId;
          console.log(`${isTarget ? '🎯' : '  '} ${idx.index_name || idx.name} (${idx._id || idx.id})`);
        });
        console.log();
      }

      return endpoint; // Return working endpoint

    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.code} - ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data)}`);
      }
      console.log();
    }
  }

  // Test specific index endpoint
  console.log('\n🎯 Testing specific index endpoints...');
  const indexEndpoints = [
    `https://api.twelvelabs.io/v1.3/indexes/${indexId}`,
    `https://api.twelvelabs.io/v1.2/indexes/${indexId}`,
    `https://api.twelvelabs.io/v1.1/indexes/${indexId}`,
    `https://api.twelvelabs.io/v1/indexes/${indexId}`,
  ];

  for (const endpoint of indexEndpoints) {
    console.log(`Testing: ${endpoint}`);
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ SUCCESS! Found your index!`);
      console.log(`Name: ${response.data.index_name}`);
      console.log(`Engines: ${response.data.engines?.map(e => e.engine_name).join(', ')}`);
      console.log(`Created: ${response.data.created_at}\n`);

      return endpoint;

    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.code} - ${error.response?.data?.message || error.message}\n`);
    }
  }

  console.log('🤔 No working endpoints found. Possible issues:');
  console.log('1. API key is invalid or expired');
  console.log('2. Index ID is incorrect');
  console.log('3. API version has changed');
  console.log('4. Network/firewall issues');
  console.log('\n💡 Try:');
  console.log('- Double-check your API key at https://playground.twelvelabs.io');
  console.log('- Verify your index ID in the dashboard');
  console.log('- Check if your account has any restrictions');

  return null;
}

debugTwelveLabs().catch(console.error);