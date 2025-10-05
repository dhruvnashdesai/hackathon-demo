const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function verifyAPIs() {
  console.log('🔍 Verifying API connections...\n');

  const results = {
    twelvelabs: false,
    anthropic: false,
    elevenlabs: false
  };

  // Test Twelve Labs
  console.log('1. Testing Twelve Labs API...');
  try {
    // First try to get the specific index
    const indexResponse = await axios.get(`https://api.twelvelabs.io/v1.3/indexes/${process.env.TWELVE_LABS_INDEX_ID}`, {
      headers: {
        'x-api-key': process.env.TWELVE_LABS_API_KEY
      },
      timeout: 10000
    });

    console.log(`✅ Twelve Labs: Connected! Found index "${indexResponse.data.index_name}"`);
    console.log(`   Models: ${indexResponse.data.models.map(e => e.model_name).join(', ')}`);
    results.twelvelabs = true;

  } catch (indexError) {
    // If that fails, try listing all indexes
    try {
      const response = await axios.get('https://api.twelvelabs.io/v1.3/indexes', {
        headers: {
          'x-api-key': process.env.TWELVE_LABS_API_KEY
        },
        timeout: 10000
      });

      const indexes = response.data.data || [];
      const targetIndex = indexes.find(idx => idx._id === process.env.TWELVE_LABS_INDEX_ID);

      if (targetIndex) {
        console.log(`✅ Twelve Labs: Connected! Found index "${targetIndex.index_name}"`);
        console.log(`   Models: ${targetIndex.models.map(e => e.model_name).join(', ')}`);
        results.twelvelabs = true;
      } else {
        console.log(`❌ Twelve Labs: Index ID not found`);
        if (indexes.length > 0) {
          console.log(`   Available indexes:`);
          indexes.forEach(idx => {
            console.log(`   - ${idx.index_name} (${idx._id})`);
          });
        } else {
          console.log(`   No indexes found. Create one at https://playground.twelvelabs.io`);
        }
      }
    } catch (error) {
      console.log(`❌ Twelve Labs: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 401) {
        console.log('   Check your API key at https://playground.twelvelabs.io');
      }
    }
  }

  console.log();

  // Test Anthropic (Claude)
  console.log('2. Testing Anthropic (Claude) API...');
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Test'
      }]
    });

    if (response.content && response.content.length > 0) {
      console.log('✅ Anthropic: Connected! Claude API is working');
      results.anthropic = true;
    }
  } catch (error) {
    console.log(`❌ Anthropic: ${error.message}`);
    if (error.message.includes('credit')) {
      console.log('   Note: You may need to add credits to your Anthropic account');
    }
  }

  console.log();

  // Test ElevenLabs
  console.log('3. Testing ElevenLabs API...');
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });

    if (response.data.voices && response.data.voices.length > 0) {
      console.log(`✅ ElevenLabs: Connected! Found ${response.data.voices.length} voices`);
      results.elevenlabs = true;
    }
  } catch (error) {
    console.log(`❌ ElevenLabs: ${error.response?.data?.detail?.message || error.message}`);
    if (error.response?.status === 401) {
      console.log('   Check your API key and account status');
    }
  }

  console.log();

  // Summary
  const working = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log('📊 API Verification Summary:');
  console.log(`   ${working}/${total} APIs working correctly\n`);

  if (working === total) {
    console.log('🎉 All APIs are working! You\'re ready to start the demo:');
    console.log('   1. cd server && npm start');
    console.log('   2. cd client && npm start');
    console.log('   3. Open http://localhost:3000');
  } else {
    console.log('⚠️  Some APIs need attention. Check the errors above.');
    console.log('   Common issues:');
    console.log('   - Invalid API keys');
    console.log('   - Insufficient credits/quota');
    console.log('   - Network connectivity');
  }
}

verifyAPIs().catch(console.error);