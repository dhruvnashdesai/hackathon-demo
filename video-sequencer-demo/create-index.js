const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

const TWELVE_LABS_API_KEY = process.env.TWELVE_LABS_API_KEY;
const TWELVE_LABS_BASE_URL = 'https://api.twelvelabs.io/v1.2';

async function createIndex() {
  if (!TWELVE_LABS_API_KEY) {
    console.error('❌ TWELVE_LABS_API_KEY not found in server/.env file');
    console.log('Please add your Twelve Labs API key to server/.env');
    return;
  }

  console.log('🚀 Creating Twelve Labs index for Video Sequencer Demo...\n');

  try {
    const indexData = {
      index_name: 'video-sequencer-demo',
      engines: [
        {
          engine_name: 'marengo2.6',
          engine_options: ['visual', 'conversation', 'text_in_video', 'logo']
        },
        {
          engine_name: 'pegasus1.1',
          engine_options: ['visual', 'conversation']
        }
      ],
      addons: ['thumbnail']
    };

    console.log('Creating index with configuration:');
    console.log(JSON.stringify(indexData, null, 2));
    console.log('\n⏳ Creating index...');

    const response = await axios.post(`${TWELVE_LABS_BASE_URL}/indexes`, indexData, {
      headers: {
        'x-api-key': TWELVE_LABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const indexId = response.data._id;

    console.log('✅ Index created successfully!');
    console.log(`📝 Index ID: ${indexId}`);
    console.log(`📝 Index Name: ${response.data.index_name}`);
    console.log(`📝 Engines: ${response.data.engines.map(e => e.engine_name).join(', ')}\n`);

    console.log('🔧 Next steps:');
    console.log('1. Copy the Index ID above');
    console.log('2. Add it to your server/.env file:');
    console.log(`   TWELVE_LABS_INDEX_ID=${indexId}`);
    console.log('3. Restart your server');
    console.log('4. You\'re ready to upload videos!\n');

    // Update .env file automatically
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, 'server', '.env');

    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');

      if (envContent.includes('TWELVE_LABS_INDEX_ID=')) {
        envContent = envContent.replace(/TWELVE_LABS_INDEX_ID=.*/, `TWELVE_LABS_INDEX_ID=${indexId}`);
      } else {
        envContent += `\nTWELVE_LABS_INDEX_ID=${indexId}`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated server/.env file with the new Index ID');
    }

  } catch (error) {
    console.error('❌ Failed to create index:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('\n💡 Check your API key:');
      console.log('   - Make sure it\'s valid and active');
      console.log('   - Verify it\'s correctly set in server/.env');
    } else if (error.response?.status === 409) {
      console.log('\n💡 Index might already exist with this name');
      console.log('   - Try listing existing indexes first');
    }
  }
}

async function listIndexes() {
  if (!TWELVE_LABS_API_KEY) {
    console.error('❌ TWELVE_LABS_API_KEY not found');
    return;
  }

  try {
    console.log('📋 Listing existing indexes...\n');

    const response = await axios.get(`${TWELVE_LABS_BASE_URL}/indexes`, {
      headers: {
        'x-api-key': TWELVE_LABS_API_KEY
      }
    });

    const indexes = response.data.data || [];

    if (indexes.length === 0) {
      console.log('No indexes found. You can create one now.');
    } else {
      console.log(`Found ${indexes.length} existing index(es):`);
      indexes.forEach((index, i) => {
        console.log(`${i + 1}. Name: ${index.index_name}`);
        console.log(`   ID: ${index._id}`);
        console.log(`   Engines: ${index.engines.map(e => e.engine_name).join(', ')}`);
        console.log(`   Created: ${new Date(index.created_at).toLocaleDateString()}\n`);
      });

      console.log('🔧 To use an existing index:');
      console.log('1. Copy the Index ID from above');
      console.log('2. Add it to server/.env: TWELVE_LABS_INDEX_ID=your_index_id');
    }

  } catch (error) {
    console.error('❌ Failed to list indexes:', error.response?.data || error.message);
  }
}

// Main function
async function main() {
  const command = process.argv[2];

  if (command === 'list') {
    await listIndexes();
  } else {
    await createIndex();
  }
}

main();