# Video Sequencer Demo

AI-powered video clip sequencing and scoring application.

## Features
- Upload 20 short video clips
- Analyze with Twelve Labs Video Understanding API
- Auto-sequence with Claude Sonnet
- Score clips with Claude Haiku
- Generate soundtrack with ElevenLabs
- Export results as JSON

## Setup

### Prerequisites
- Node.js 16+
- FFmpeg installed and in PATH
- API keys for Twelve Labs, Anthropic, and ElevenLabs

### Installation

1. Backend setup:
```bash
cd server
npm install
cp .env.example .env
# Add your API keys to .env
npm start
```

2. Frontend setup:
```bash
cd client
npm install
npm start
```

### API Keys Required
- `TWELVE_LABS_API_KEY`: Your Twelve Labs API key
- `TWELVE_LABS_INDEX_ID`: Your Twelve Labs index ID
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key

## Usage
1. Access http://localhost:3000
2. Upload video clips (max 20)
3. Auto-analyze clips with Twelve Labs
4. Generate sequence with Claude
5. Score clips and generate soundtrack
6. Export final JSON result