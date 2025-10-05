const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

async function testSetup() {
  console.log('🚀 Testing Video Sequencer Demo Setup...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check passed: ${healthResponse.data.status}\n`);

    // Test 2: Check environment variables
    console.log('2. Checking environment variables...');
    const requiredVars = ['TWELVE_LABS_API_KEY', 'TWELVE_LABS_INDEX_ID', 'ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
      console.log('Please check your .env file in the server directory\n');
    } else {
      console.log('✅ All required environment variables are set\n');
    }

    // Test 3: Check FFmpeg
    console.log('3. Checking FFmpeg installation...');
    const { exec } = require('child_process');
    exec('ffmpeg -version', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ FFmpeg not found. Please install FFmpeg');
        console.log('   macOS: brew install ffmpeg');
        console.log('   Windows: Download from ffmpeg.org');
        console.log('   Linux: sudo apt install ffmpeg\n');
      } else {
        console.log('✅ FFmpeg is installed\n');
      }
    });

    // Test 4: Check directories
    console.log('4. Checking required directories...');
    const uploadsDir = path.join(__dirname, 'uploads');
    const audioDir = path.join(__dirname, 'audio');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    console.log('✅ Upload and audio directories are ready\n');

    console.log('🎉 Setup test completed!');
    console.log('\nNext steps:');
    console.log('1. Make sure you have valid API keys in server/.env');
    console.log('2. Start the backend: cd server && npm start');
    console.log('3. Start the frontend: cd client && npm start');
    console.log('4. Open http://localhost:3000 in your browser');

  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running:');
      console.log('   cd server && npm start');
    }
  }
}

testSetup();