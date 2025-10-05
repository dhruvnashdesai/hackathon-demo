# API Documentation & Technology Stack

## 🛠️ Complete Technology Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | Core UI framework for building interactive user interfaces |
| **React DOM** | 18.3.1 | DOM rendering for React components |
| **Create React App** | 5.0.1 | Development toolchain and build system |
| **TailwindCSS** | 3.4.13 | Utility-first CSS framework for styling |
| **PostCSS** | 8.4.47 | CSS processing and transformation |
| **Autoprefixer** | 10.4.20 | Automatic vendor prefix addition |
| **@diffusionstudio/core** | 3.8.3 | Video editing and processing capabilities |
| **Remotion** | 4.0.355 | Programmatic video creation and editing |
| **@remotion/player** | 4.0.355 | Video player component for Remotion |
| **Axios** | 1.7.7 | HTTP client for API communication |
| **Lucide React** | 0.447.0 | Icon library with React components |
| **React Markdown** | 10.1.0 | Markdown rendering in React |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 16+ | JavaScript runtime environment |
| **Express** | 4.18.2 | Web application framework |
| **Multer** | 2.0.2 | Middleware for handling multipart/form-data |
| **Fluent FFmpeg** | 2.1.3 | Node.js wrapper for FFmpeg video processing |
| **CORS** | 2.8.5 | Cross-Origin Resource Sharing middleware |
| **dotenv** | 17.2.3 | Environment variable management |
| **UUID** | 13.0.0 | Unique identifier generation |
| **Nodemon** | 3.1.10 | Development server with auto-restart |

### External APIs & Services
| Service | Purpose | Integration Type |
|---------|---------|------------------|
| **Twelve Labs Video Understanding API** | Video content analysis, scene detection, object recognition | REST API |
| **Anthropic Claude API** | AI-powered video sequencing and content scoring | REST API |
| **ElevenLabs API** | AI audio generation and soundtrack creation | REST API |

### Development & Build Tools
| Tool | Purpose |
|------|---------|
| **FFmpeg** | Video processing, format conversion, clip extraction |
| **npm/Node Package Manager** | Dependency management |
| **ES6+ JavaScript** | Modern JavaScript features |
| **CommonJS** | Module system for Node.js |

## 📡 API Endpoints Documentation

### Video Upload & Management

#### Upload Video Files
```http
POST /api/clips/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `files`: Array of video files (max 20 files, 100MB each)
- `sessionId`: Unique session identifier

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-string",
  "videos": [
    {
      "id": "video-uuid",
      "filename": "video.mp4",
      "path": "/uploads/uuid.mp4",
      "size": 12345678,
      "duration": 30.5
    }
  ]
}
```

#### Get Session Videos
```http
GET /api/clips/:sessionId
```

**Response:**
```json
{
  "sessionId": "uuid-string",
  "videos": [...],
  "totalVideos": 5,
  "totalDuration": 150.5
}
```

### AI Analysis & Processing

#### Analyze Videos with Twelve Labs
```http
POST /api/clips/analyze
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "videoIds": ["video-uuid-1", "video-uuid-2"]
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "videoId": "video-uuid",
    "twelveLabsId": "tl-task-id",
    "metadata": {
      "duration": 30.5,
      "scenes": [...],
      "objects": [...],
      "activities": [...]
    }
  }
}
```

#### Generate Video Sequence
```http
POST /api/sequence/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "platform": "tiktok",
  "analysisData": {...}
}
```

**Response:**
```json
{
  "success": true,
  "sequence": [
    {
      "videoId": "uuid",
      "order": 1,
      "startTime": 0,
      "endTime": 15,
      "reason": "Strong opening hook"
    }
  ],
  "reasoning": "AI explanation of sequencing logic"
}
```

#### Score Video Clips
```http
POST /api/clips/score
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "clipData": {...}
}
```

**Response:**
```json
{
  "success": true,
  "scores": {
    "visual_quality": 8.5,
    "audio_quality": 7.2,
    "content_relevance": 9.1,
    "engagement_factor": 8.8,
    "technical_execution": 7.9,
    "narrative_flow": 8.3,
    "overall_score": 8.3
  },
  "feedback": "Detailed AI feedback on the clip"
}
```

### Audio Generation

#### Generate Soundtrack
```http
POST /api/soundtrack/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "type": "music", // or "sfx" or "both"
  "style": "upbeat",
  "duration": 60,
  "videoContext": {...}
}
```

**Response:**
```json
{
  "success": true,
  "audioFiles": [
    {
      "type": "music",
      "path": "/audio/music-uuid.mp3",
      "duration": 60,
      "url": "/api/audio/music-uuid.mp3"
    }
  ]
}
```

### Export & Download

#### Export Session Data
```http
GET /api/export/:sessionId
```

**Response:**
```json
{
  "sessionId": "uuid-string",
  "exportedAt": "2024-10-05T12:00:00Z",
  "videos": [...],
  "sequence": [...],
  "scores": [...],
  "soundtrack": {...},
  "metadata": {
    "totalVideos": 5,
    "totalDuration": 150.5,
    "processingTime": 45.2
  }
}
```

#### Download Audio Files
```http
GET /api/audio/:filename
```

**Response:** Audio file stream (MP3 format)

## 🔧 Configuration & Environment

### Required Environment Variables

#### Backend (.env)
```bash
# Twelve Labs Configuration
TWELVE_LABS_API_KEY=your_api_key_here
TWELVE_LABS_INDEX_ID=your_index_id_here

# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your_api_key_here

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Optional Configuration
MAX_FILE_SIZE=104857600  # 100MB
MAX_FILES=20
SESSION_TIMEOUT=3600000  # 1 hour
```

#### Frontend (.env)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MAX_FILES=20
REACT_APP_MAX_FILE_SIZE=104857600

# Development Configuration
GENERATE_SOURCEMAP=false
```

## 🔒 API Authentication & Security

### API Key Management
- All external API keys stored in environment variables
- No API keys exposed in client-side code
- Secure key rotation practices recommended

### Request Validation
- File type validation (mimetype checking)
- File size limits enforced
- Input sanitization on all endpoints
- Session-based request validation

### Error Handling
- Standardized error response format
- Graceful degradation for API failures
- Rate limiting awareness
- Timeout handling for long-running operations

## 📊 API Rate Limits & Quotas

### Twelve Labs API
- **Video Upload**: Varies by plan
- **Analysis**: Token-based billing
- **Concurrent Requests**: Plan-dependent

### Anthropic Claude API
- **Requests per minute**: Plan-dependent
- **Token limits**: Model-specific
- **Monthly usage**: Billing tier dependent

### ElevenLabs API
- **Character limits**: Plan-dependent
- **Voice generation**: Usage-based billing
- **Concurrent requests**: Plan-dependent

## 🚨 Error Codes & Troubleshooting

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid API keys)
- `413`: Payload Too Large (file size exceeded)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

### Custom Error Codes
```json
{
  "error": {
    "code": "VIDEO_ANALYSIS_FAILED",
    "message": "Twelve Labs analysis failed",
    "details": "API returned error: insufficient credits"
  }
}
```

## 🔄 Integration Patterns

### Asynchronous Processing
- Long-running operations use polling pattern
- Progress updates via separate status endpoints
- Timeout handling for external API calls

### Error Recovery
- Retry logic for transient failures
- Fallback mechanisms for service unavailability
- User notification for permanent failures

### Caching Strategy
- Session data cached in memory
- File metadata cached for quick access
- Analysis results cached to avoid reprocessing

This documentation provides complete visibility into the technical implementation and API integration patterns used in the Video Sequencer Demo.