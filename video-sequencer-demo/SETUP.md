# Video Sequencer Demo - Setup Instructions

## Prerequisites

1. **Node.js 16+** - Install from [nodejs.org](https://nodejs.org/)
2. **FFmpeg** - Install using:
   - macOS: `brew install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Linux: `sudo apt install ffmpeg` or `sudo yum install ffmpeg`

## API Keys Required

You'll need API keys from:
1. **Twelve Labs** - [Sign up at twelvelabs.io](https://twelvelabs.io)
2. **Anthropic** - [Get API key from console.anthropic.com](https://console.anthropic.com)
3. **ElevenLabs** - [Sign up at elevenlabs.io](https://elevenlabs.io)

## Installation Steps

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` file with your API keys:
```
TWELVE_LABS_API_KEY=your_twelve_labs_api_key_here
TWELVE_LABS_INDEX_ID=your_twelve_labs_index_id_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
PORT=3001
```

### 2. Frontend Setup

```bash
cd ../client
npm install
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

The application will be available at http://localhost:3000

## Twelve Labs Index Setup

1. Log in to Twelve Labs dashboard
2. Create a new index with Video Understanding enabled
3. Note the Index ID and add it to your .env file

## Usage Flow

1. **Upload Videos** - Drag and drop up to 20 video files
2. **Auto-Analyze** - Videos are automatically analyzed with Twelve Labs
3. **Generate Sequence** - Claude Sonnet creates optimal sequence
4. **Score Clips** - Claude Haiku scores each clip across 6 dimensions
5. **Generate Soundtrack** - ElevenLabs creates music and/or SFX
6. **Export** - Download JSON with all data

## Troubleshooting

- **FFmpeg errors**: Ensure FFmpeg is installed and in your PATH
- **API errors**: Check your API keys and rate limits
- **Upload failures**: Ensure video files are in supported formats (MP4, MOV, AVI)
- **CORS errors**: Make sure both servers are running on correct ports

## Notes

- Sessions are stored in memory and lost on server restart
- Generated audio files are saved to `/audio` directory
- Uploaded videos are saved to `/uploads` directory
- Maximum file size: 100MB per video
- Maximum files: 20 videos per session