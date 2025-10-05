const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testExistingRoute() {
  console.log('🧪 Testing /api/clips/existing endpoint...\n');

  try {
    const response = await axios.get('http://localhost:3001/api/clips/existing', {
      timeout: 30000
    });

    console.log('✅ Success! Response:');
    console.log('Session ID:', response.data.sessionId);
    console.log('Number of clips:', response.data.clips?.length || 0);

    if (response.data.clips?.length > 0) {
      console.log('\n📋 Clips found:');
      response.data.clips.forEach((clip, i) => {
        console.log(`${i + 1}. ${clip.filename} (${clip.id})`);
        console.log(`   Duration: ${clip.metadata?.duration}s`);
        console.log(`   Has analysis: ${!!clip.tlAnalysis}`);
        if (clip.error) console.log(`   Error: ${clip.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm start');
    }
  }
}

testExistingRoute();