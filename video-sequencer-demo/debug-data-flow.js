const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function debugDataFlow() {
  console.log('🔍 Debugging data flow for video summaries...\n');

  try {
    const response = await axios.get('http://localhost:3001/api/clips/existing', {
      timeout: 30000
    });

    console.log('✅ API Response received');
    console.log('Session ID:', response.data.sessionId);
    console.log('Number of clips:', response.data.clips?.length || 0);
    console.log('\n📋 Detailed clip analysis:');

    response.data.clips?.forEach((clip, i) => {
      console.log(`\n${i + 1}. ${clip.filename}`);
      console.log(`   ID: ${clip.id}`);
      console.log(`   Has tlAnalysis: ${!!clip.tlAnalysis}`);

      if (clip.tlAnalysis) {
        console.log(`   Has summary: ${!!clip.tlAnalysis.summary}`);
        console.log(`   Summary length: ${clip.tlAnalysis.summary?.length || 0} chars`);

        if (clip.tlAnalysis.summary) {
          const shortSummary = clip.tlAnalysis.summary.substring(0, 150) + '...';
          console.log(`   Summary preview: "${shortSummary}"`);
        }

        console.log(`   Visual scenes: ${clip.tlAnalysis.visual?.scenes?.length || 0}`);
        console.log(`   Semantics summary: ${!!clip.tlAnalysis.semantics?.summary}`);

        // Check specific data structure
        console.log(`   Top-level keys: ${Object.keys(clip.tlAnalysis).join(', ')}`);
      }

      if (clip.error) {
        console.log(`   ❌ Error: ${clip.error}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugDataFlow();