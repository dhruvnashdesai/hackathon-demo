# Video Sequencer Demo - Technical Architecture

## 🏗️ System Architecture Overview

The Video Sequencer Demo is a full-stack web application that leverages AI to automatically analyze, sequence, and score video clips while generating accompanying soundtracks. The system follows a microservices-inspired architecture with clear separation of concerns.

## 🎯 Core Components

### Frontend (React SPA)
- **Framework**: React 18.3.1 with Create React App
- **Styling**: TailwindCSS 3.4.13 with PostCSS
- **Video Processing**: @diffusionstudio/core 3.8.3, Remotion 4.0.355
- **UI Components**: Lucide React icons, custom components
- **State Management**: React hooks and context
- **HTTP Client**: Axios for API communication

### Backend (Node.js/Express)
- **Runtime**: Node.js with Express 4.18.2
- **File Upload**: Multer 2.0.2 for multipart form handling
- **Video Processing**: FFmpeg via fluent-ffmpeg 2.1.3
- **Cross-Origin**: CORS 2.8.5 enabled
- **Environment**: dotenv 17.2.3 for configuration
- **Development**: Nodemon 3.1.10 for hot reloading

## 🔧 External Service Integrations

### AI & Analysis Services
1. **Twelve Labs Video Understanding API**
   - Video content analysis and indexing
   - Scene detection and metadata extraction
   - Object recognition and activity analysis

2. **Anthropic Claude AI**
   - Sonnet model for video sequencing logic
   - Haiku model for clip scoring across 6 dimensions
   - Content analysis and narrative flow optimization

3. **ElevenLabs Audio Generation**
   - AI-powered soundtrack generation
   - Sound effects creation
   - Music composition based on video content

## 📊 Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Upload   │───▶│  Video Storage  │───▶│ Twelve Labs API │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Final Export   │◀───│  Claude AI      │◀───│ Video Analysis  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ElevenLabs Audio│    │ Clip Sequencing │    │ Content Scoring │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🗄️ Data Storage Strategy

### File System Storage
- **Video Uploads**: `/uploads` directory with unique UUID naming
- **Generated Audio**: `/audio` directory for ElevenLabs output
- **Processed Clips**: `/clips` directory for segmented videos
- **Session Data**: In-memory storage (development mode)

### Data Structures
```javascript
// Session Data Model
{
  sessionId: "uuid",
  videos: [
    {
      id: "uuid",
      filename: "original.mp4",
      path: "/uploads/uuid.mp4",
      analysis: { /* Twelve Labs response */ },
      clips: [
        {
          id: "uuid",
          startTime: 0,
          endTime: 30,
          score: { /* Claude scoring */ }
        }
      ]
    }
  ],
  sequence: [/* Claude-generated order */],
  soundtrack: {
    musicPath: "/audio/music.mp3",
    sfxPath: "/audio/sfx.mp3"
  }
}
```

## 🔄 Processing Pipeline

### 1. Video Upload & Validation
- File type validation (MP4, MOV, AVI)
- Size limits (100MB max per file, 20 files max)
- UUID generation for unique identification
- FFmpeg metadata extraction

### 2. AI Analysis Chain
```
Video Upload → Twelve Labs Analysis → Claude Content Understanding
     ↓                ↓                        ↓
File Storage → Scene Detection → Narrative Analysis
     ↓                ↓                        ↓
Clip Generation → Object Recognition → Sequence Generation
     ↓                ↓                        ↓
Audio Generation ← Scoring System ← Content Optimization
```

### 3. Content Processing
- **Clip Segmentation**: FFmpeg-based video splitting
- **Quality Analysis**: Multi-dimensional scoring (1-10 scale)
  - Visual Quality
  - Audio Quality
  - Content Relevance
  - Engagement Factor
  - Technical Execution
  - Narrative Flow
- **Sequence Optimization**: AI-driven clip ordering

### 4. Audio Generation
- Content-aware music generation
- Sound effects creation based on video analysis
- Audio mixing and mastering

## 🛡️ Security & Error Handling

### Input Validation
- File type restrictions via mimetype checking
- File size limits enforced at multiple layers
- Path traversal protection
- Input sanitization for all user data

### Error Handling Strategy
- Graceful degradation for API failures
- User-friendly error messages
- Comprehensive logging for debugging
- Retry logic for external API calls

### API Rate Limiting
- Twelve Labs: Respect API quotas
- Anthropic: Token usage optimization
- ElevenLabs: Audio generation limits
- Fallback mechanisms for service unavailability

## 🚀 Performance Optimization

### Frontend Optimizations
- Component-level code splitting
- Lazy loading for video players
- Efficient re-rendering with React.memo
- Asset optimization with Create React App

### Backend Optimizations
- Streaming video uploads
- Parallel processing where possible
- Memory-efficient file handling
- Caching for repeated operations

### Video Processing
- Progressive video upload
- Chunked processing for large files
- Format optimization for web delivery
- Thumbnail generation for previews

## 🔗 API Endpoints

### Core Routes
- `POST /api/clips/upload` - Video file upload
- `GET /api/clips/:sessionId` - Retrieve session clips
- `POST /api/clips/analyze` - Trigger AI analysis
- `POST /api/sequence/generate` - Generate optimal sequence
- `POST /api/soundtrack/generate` - Create audio content
- `GET /api/export/:sessionId` - Export final JSON

### WebSocket Considerations
Current implementation uses HTTP polling for status updates. Future enhancement could include WebSocket connections for real-time progress updates during processing.

## 📱 Client-Server Communication

### Request/Response Pattern
- RESTful API design
- JSON payload format
- HTTP status code standards
- Error response standardization

### State Synchronization
- Client-side state management via React hooks
- Server-side session persistence (in-memory)
- Polling for long-running operations
- Progress indicators for user feedback

## 🔮 Scalability Considerations

### Current Limitations
- In-memory session storage (not production-ready)
- Single-server deployment
- Synchronous processing pipeline

### Future Enhancements
- Database integration (PostgreSQL/MongoDB)
- Queue system for background processing (Redis/Bull)
- Microservices decomposition
- Container orchestration (Docker/Kubernetes)
- CDN integration for asset delivery
- Load balancing for high availability

## 🏃‍♂️ Development Workflow

### Local Development
- Hot reloading for both frontend and backend
- Environment variable management
- API key security practices
- Development vs. production configurations

### Testing Strategy
- Frontend: Create React App testing utilities
- Backend: Manual testing and validation
- Integration testing for AI service chains
- Error scenario testing

This architecture supports the hackathon requirements while providing a foundation for future scaling and enhancement.