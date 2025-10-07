const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createSession, getSession, updateSession } = require('../utils/sessionManager');
const { ensureDirectoryExists, getUniqueFilePath } = require('../utils/fileHandler');
const { generateThumbnail, getVideoMetadata } = require('../utils/ffmpeg');
const TwelveLabsService = require('../services/twelveLabs');
const ClaudeService = require('../services/claude');
const VideoConverter = require('../services/videoConverter');
const CacheService = require('../services/cacheService');

const router = express.Router();

// Initialize cache service
const cache = new CacheService();

// NEW ROUTE: List saved sessions
router.get('/sessions', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const SESSIONS_DIR = path.join(__dirname, '..', 'data', 'sessions');

    if (!fs.existsSync(SESSIONS_DIR)) {
      return res.json({ sessions: [] });
    }

    const files = fs.readdirSync(SESSIONS_DIR);
    const sessions = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const sessionId = file.replace('.json', '');
          const filePath = path.join(SESSIONS_DIR, file);
          const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          sessions.push({
            sessionId,
            createdAt: sessionData.createdAt,
            hasSequence: !!sessionData.sequence,
            clipCount: sessionData.clips?.length || 0,
            sequenceTitle: sessionData.sequence?.narrative_structure || 'Untitled Sequence'
          });
        } catch (error) {
          console.error(`Error reading session ${file}:`, error.message);
        }
      }
    }

    // Sort by creation date, newest first
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ sessions });
  } catch (error) {
    console.error('Error listing sessions:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// NEW ROUTE: Load specific session
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check conversion status for all clips when loading session
    const videoConverter = new VideoConverter();
    const updatedClips = [];

    for (const clip of session.clips || []) {
      const conversionStatus = await videoConverter.getConversionStatus(clip.id, sessionId);

      const updatedClip = {
        ...clip,
        conversionStatus: conversionStatus.status === 'converted' ? 'converted' : 'not_converted',
        mp4Url: conversionStatus.mp4Url
      };

      updatedClips.push(updatedClip);
    }

    // Update session with conversion status
    updateSession(sessionId, { clips: updatedClips });

    console.log(`📋 Loaded session ${sessionId} with ${updatedClips.length} clips`);
    console.log(`✅ Converted clips: ${updatedClips.filter(c => c.conversionStatus === 'converted').length}`);

    res.json({
      sessionId,
      clips: updatedClips,
      sequence: session.sequence,
      scores: session.scores || {},
      soundtrack: session.soundtrack
    });
  } catch (error) {
    console.error('Error loading session:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// NEW ROUTE: Import missing clips into existing session
router.post('/sessions/:sessionId/import-missing', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Use clips index instead of main index for consistency
    const clipsIndexId = process.env.TWELVE_LABS_CLIPS_INDEX_ID || process.env.TWELVE_LABS_INDEX_ID;
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      clipsIndexId
    );

    console.log('📋 Importing missing clips for session:', sessionId);
    console.log('🔑 Using API Key:', process.env.TWELVE_LABS_API_KEY?.substring(0, 10) + '...');
    console.log('📁 Using Index ID:', clipsIndexId);

    // Get all videos from the index
    const endpoint = `/indexes/${clipsIndexId}/videos?page_limit=50`;
    console.log('🌐 Calling endpoint:', endpoint);

    const response = await twelveLabs.client.get(endpoint);
    const videos = response.data.data || [];
    console.log(`Found ${videos.length} total videos in index`);

    // Get existing clip video IDs (stored in twelveLabsVideoId field)
    const existingVideoIds = new Set(
      session.clips
        .map(clip => clip.twelveLabsVideoId)
        .filter(id => id) // Remove any undefined/null IDs
    );

    console.log(`Session has ${existingVideoIds.size} existing clips`);
    console.log('Existing video IDs:', Array.from(existingVideoIds));

    // Filter out videos that are already in the session
    const missingVideos = videos.filter(video => !existingVideoIds.has(video._id));
    console.log(`Found ${missingVideos.length} missing videos to import`);

    if (missingVideos.length === 0) {
      return res.json({
        sessionId,
        message: 'No missing clips found. Session already has all clips from index.',
        importedCount: 0,
        totalClips: session.clips.length
      });
    }

    const newClips = [];
    for (const video of missingVideos) {
      const clipId = uuidv4();

      // Generate analysis data for each missing video
      const filename = video.system_metadata?.filename || `Video_${video._id.substring(0, 8)}`;
      console.log(`📊 Processing missing clip: ${filename}`);

      const sysMetadata = video.system_metadata || {};

      // Get summary from Twelve Labs
      let summary = null;
      let videoDetails = null;

      try {
        console.log(`🔍 Getting video summary for ${video._id}...`);
        summary = await twelveLabs.generateSummary(video._id);
        console.log(`📝 Video summary for ${filename}:`, summary);
      } catch (summaryError) {
        console.error(`❌ Error getting summary for ${filename}:`, summaryError.message);
      }

      try {
        videoDetails = await twelveLabs.getVideoData(video._id);
      } catch (detailsError) {
        console.error(`❌ Error getting video details for ${filename}:`, detailsError.message);
      }

      // Create scene descriptions using the summary
      const sceneDescriptions = [{
        start_time: 0,
        end_time: sysMetadata.duration || 0,
        description: summary || 'Video content',
        confidence: 'high',
        score: 90
      }];

      // Build the analysis object
      const tlAnalysis = {
        video_id: video._id,
        duration: sysMetadata.duration || 0,
        fps: sysMetadata.fps || 30,
        resolution: {
          width: sysMetadata.width || 0,
          height: sysMetadata.height || 0
        },
        file_size: sysMetadata.size || 0,
        summary: summary,
        visual: {
          scenes: sceneDescriptions,
          shots: [],
          overall_quality: 'good',
          people: [],
          text_in_video: [],
          logos: [],
          motion: 'medium'
        },
        audio: {
          transcription: '',
          audio_quality: 'good',
          sounds_detected: [],
          music: false,
          voice_analysis: {}
        },
        semantics: {
          topics: [],
          categories: [],
          sentiment: 'neutral',
          emotions: [],
          highlights: sceneDescriptions.map(s => s.description),
          content_style: 'unknown',
          summary: summary
        },
        temporal: {
          pacing: 'medium',
          opening: { hook_strength: 'medium' },
          closing: { satisfaction: 'medium' }
        },
        context: {
          suitable_for: [],
          platform_fit: [],
          editing_notes: [`Contains ${sceneDescriptions.length} scene segments`, `Summary: ${summary?.substring(0, 100)}...`],
          flags: []
        },
        raw_search_results: null,
        raw_video_details: videoDetails
      };

      const thumbnailUrl = video.hls?.thumbnail_urls?.[0] || null;
      const streamingUrl = video.hls?.video_url || null;

      newClips.push({
        id: clipId,
        filename: filename,
        thumbnail: thumbnailUrl,
        streamingUrl: streamingUrl,
        metadata: {
          duration: sysMetadata.duration || 0,
          resolution: {
            width: sysMetadata.width || 1280,
            height: sysMetadata.height || 720
          },
          fps: sysMetadata.fps || 30,
          size: sysMetadata.size || 0
        },
        tlAnalysis,
        twelveLabsVideoId: video._id
      });

      console.log(`✅ Successfully processed missing clip: ${filename}`);
    }

    // Merge new clips with existing clips
    const updatedClips = [...session.clips, ...newClips];
    updateSession(sessionId, { clips: updatedClips });

    res.json({
      sessionId,
      message: `Successfully imported ${newClips.length} missing clips`,
      importedCount: newClips.length,
      totalClips: updatedClips.length,
      newClips: newClips.map(clip => ({
        id: clip.id,
        filename: clip.filename,
        thumbnail: clip.thumbnail,
        streamingUrl: clip.streamingUrl,
        metadata: clip.metadata,
        tlAnalysis: clip.tlAnalysis
      }))
    });

  } catch (error) {
    console.error('Error importing missing clips:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// NEW ROUTE: Fetch existing clips from index
router.get('/existing', async (req, res) => {
  try {
    const sessionId = createSession();

    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );

    console.log('📋 Fetching existing clips from Twelve Labs index...');
    console.log('🔑 Using API Key:', process.env.TWELVE_LABS_API_KEY?.substring(0, 10) + '...');
    console.log('📁 Using Index ID:', process.env.TWELVE_LABS_INDEX_ID);

    // Get all videos from the index (increase limit to get all clips)
    const endpoint = `/indexes/${process.env.TWELVE_LABS_INDEX_ID}/videos?page_limit=50`;
    console.log('🌐 Calling endpoint:', endpoint);

    let response;
    try {
      response = await twelveLabs.client.get(endpoint);
      console.log('✅ API call successful');
      console.log('📥 Raw API response:', JSON.stringify(response.data, null, 2));
    } catch (apiError) {
      console.error('❌ API call failed:', apiError.response?.status, apiError.response?.statusText);
      console.error('❌ API error data:', apiError.response?.data);
      console.error('❌ Full API error:', apiError.message);
      throw apiError;
    }

    const videos = response.data.data || [];
    console.log(`Found ${videos.length} existing videos in index`);

    const clips = [];
    for (const video of videos) {
      const clipId = uuidv4();

      // Generate analysis data for each existing video
      const filename = video.system_metadata?.filename || `Video_${video._id.substring(0, 8)}`;
      console.log(`📊 Getting analysis for: ${filename}`);

        // Use the system_metadata that's already available in the video list response
        const sysMetadata = video.system_metadata || {};

        console.log(`📋 System metadata for ${filename}:`, JSON.stringify(sysMetadata, null, 2));

        // Get actual analysis from Twelve Labs - handle each call separately
        let tlAnalysis;
        let summary = null;
        let videoDetails = null;

        // Try to get summary first (this is working well)
        try {
          console.log(`🔍 Getting video summary for ${video._id}...`);
          summary = await twelveLabs.generateSummary(video._id);
          console.log(`📝 Video summary for ${filename}:`, summary);
        } catch (summaryError) {
          console.error(`❌ Error getting summary for ${filename}:`, summaryError.message);
        }

        // Try to get video details (optional)
        try {
          videoDetails = await twelveLabs.getVideoData(video._id);
          console.log(`📊 Video details for ${filename}:`, JSON.stringify(videoDetails, null, 2));
        } catch (detailsError) {
          console.error(`❌ Error getting video details for ${filename}:`, detailsError.message);
        }

        // Create scene descriptions using the summary
        const sceneDescriptions = [{
          start_time: 0,
          end_time: sysMetadata.duration || 0,
          description: summary || 'Video content',
          confidence: 'high',
          score: 90
        }];

        // Build the analysis object
        tlAnalysis = {
          video_id: video._id,
            duration: sysMetadata.duration || 0,
            fps: sysMetadata.fps || 30,
            resolution: {
              width: sysMetadata.width || 0,
              height: sysMetadata.height || 0
            },
            file_size: sysMetadata.size || 0,
            summary: summary,
            visual: {
              scenes: sceneDescriptions,
              shots: [],
              overall_quality: 'good',
              people: [],
              text_in_video: [],
              logos: [],
              motion: 'medium'
            },
            audio: {
              transcription: '',
              audio_quality: 'good',
              sounds_detected: [],
              music: false,
              voice_analysis: {}
            },
            semantics: {
              topics: [],
              categories: [],
              sentiment: 'neutral',
              emotions: [],
              highlights: sceneDescriptions.map(s => s.description),
              content_style: 'unknown',
              summary: summary
            },
            temporal: {
              pacing: 'medium',
              opening: { hook_strength: 'medium' },
              closing: { satisfaction: 'medium' }
            },
            context: {
              suitable_for: [],
              platform_fit: [],
              editing_notes: [`Contains ${sceneDescriptions.length} scene segments`, `Summary: ${summary?.substring(0, 100)}...`],
              flags: []
            },
            raw_search_results: null,
            raw_video_details: videoDetails
        };

        const thumbnailUrl = video.hls?.thumbnail_urls?.[0] || null;
        const streamingUrl = video.hls?.video_url || null;
        console.log(`🖼️ Thumbnail URL for ${filename}:`, thumbnailUrl);
        console.log(`🎥 Streaming URL for ${filename}:`, streamingUrl);

        clips.push({
          id: clipId,
          filename: filename,
          thumbnail: thumbnailUrl,
          streamingUrl: streamingUrl,
          metadata: {
            duration: sysMetadata.duration || 0,
            resolution: {
              width: sysMetadata.width || 1280,
              height: sysMetadata.height || 720
            },
            fps: sysMetadata.fps || 30,
            size: sysMetadata.size || 0
          },
          tlAnalysis,
          twelveLabsVideoId: video._id
        });

        console.log(`✅ Successfully processed clip: ${filename}`);
    }

    updateSession(sessionId, { clips });

    res.json({
      sessionId,
      clips: clips.map(clip => ({
        id: clip.id,
        filename: clip.filename,
        thumbnail: clip.thumbnail,
        streamingUrl: clip.streamingUrl,
        metadata: clip.metadata,
        tlAnalysis: clip.tlAnalysis,
        error: clip.error
      }))
    });

  } catch (error) {
    console.error('Error fetching existing clips:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.sessionId;
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', sessionId);
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sessionId = req.sessionId;
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', sessionId);
    const { filename } = getUniqueFilePath(uploadDir, file.originalname);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 20
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

router.post('/upload', (req, res, next) => {
  const sessionId = createSession();
  req.sessionId = sessionId;
  next();
}, upload.array('videos', 20), async (req, res) => {
  try {
    const sessionId = req.sessionId;
    const clips = [];

    for (const file of req.files) {
      const clipId = uuidv4();
      const thumbnailPath = path.join(path.dirname(file.path), `thumb_${clipId}.jpg`);

      try {
        await generateThumbnail(file.path, thumbnailPath);
        const metadata = await getVideoMetadata(file.path);

        clips.push({
          id: clipId,
          filename: file.originalname,
          path: file.path,
          thumbnail: `/uploads/${sessionId}/thumb_${clipId}.jpg`,
          metadata,
          size: file.size
        });
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error.message);
        clips.push({
          id: clipId,
          filename: file.originalname,
          path: file.path,
          thumbnail: null,
          metadata: null,
          size: file.size,
          error: error.message
        });
      }
    }

    updateSession(sessionId, { clips });

    res.json({
      sessionId,
      clips: clips.map(clip => ({
        id: clip.id,
        filename: clip.filename,
        thumbnail: clip.thumbnail,
        streamingUrl: clip.streamingUrl,
        metadata: clip.metadata,
        size: clip.size,
        error: clip.error
      }))
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { sessionId, clipIds } = req.body;

    if (!sessionId || !clipIds || !Array.isArray(clipIds)) {
      return res.status(400).json({ error: 'sessionId and clipIds array required' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );

    const analyzedClips = [];

    for (const clipId of clipIds) {
      const clip = session.clips.find(c => c.id === clipId);
      if (!clip) {
        console.error(`Clip ${clipId} not found in session`);
        continue;
      }

      try {
        console.log(`Analyzing clip: ${clip.filename}`);
        const tlAnalysis = await twelveLabs.analyzeVideo(clip.path, clip.filename);

        analyzedClips.push({
          clipId,
          tlAnalysis
        });

        const updatedClips = session.clips.map(c =>
          c.id === clipId ? { ...c, tlAnalysis } : c
        );
        updateSession(sessionId, { clips: updatedClips });

      } catch (error) {
        console.error(`Error analyzing clip ${clip.filename}:`, error.message);
        analyzedClips.push({
          clipId,
          error: error.message,
          tlAnalysis: null
        });
      }
    }

    res.json({ clips: analyzedClips });
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/score', async (req, res) => {
  try {
    const { clips, sessionId } = req.body;

    if (!clips || !Array.isArray(clips)) {
      return res.status(400).json({ error: 'clips array required' });
    }

    const claude = new ClaudeService(process.env.ANTHROPIC_API_KEY);
    const scores = [];

    for (const clip of clips) {
      try {
        console.log(`Scoring clip: ${clip.id}`);

        // Use video ID for caching if available, otherwise use clip ID
        const cacheKey = clip.twelveLabsVideoId || clip.tlAnalysis?.video_id || clip.id;
        console.log(`🔍 Scoring cache key for ${clip.id}: ${cacheKey}`);
        console.log(`📊 Clip data:`, {
          id: clip.id,
          twelveLabsVideoId: clip.twelveLabsVideoId,
          tlAnalysisVideoId: clip.tlAnalysis?.video_id
        });

        // Cache the Claude scoring
        const score = await cache.getOrSet(cacheKey, 'claude_score', async () => {
          return await claude.scoreClip(clip.tlAnalysis);
        });

        scores.push({
          clipId: clip.id,
          ...score
        });
      } catch (error) {
        console.error(`Error scoring clip ${clip.id}:`, error.message);
        scores.push({
          clipId: clip.id,
          error: error.message,
          ability: 0,
          badge: 'Error'
        });
      }
    }

    if (sessionId) {
      updateSession(sessionId, { scores });
    }

    res.json({ scores });
  } catch (error) {
    console.error('Scoring error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// NEW ROUTE: Convert sequenced clips to MP4
router.post('/convert', async (req, res) => {
  try {
    const { sessionId, sequence } = req.body;

    if (!sessionId || !sequence) {
      return res.status(400).json({ error: 'sessionId and sequence required' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const videoConverter = new VideoConverter();

    console.log(`🎬 Starting conversion for session ${sessionId}`);
    console.log(`📋 Sequence contains ${sequence.sequence?.length || 0} clips`);

    // Convert only the sequenced clips
    const conversionResult = await videoConverter.convertSequencedClips(
      session.clips,
      sequence,
      sessionId
    );

    // Update clips with MP4 URLs
    const updatedClips = session.clips.map(clip => {
      const conversion = conversionResult.conversions.find(c => c.clipId === clip.id);
      if (conversion && conversion.status === 'converted') {
        return {
          ...clip,
          mp4Url: conversion.mp4Url,
          conversionStatus: 'converted'
        };
      } else if (conversion && conversion.status === 'failed') {
        return {
          ...clip,
          conversionStatus: 'failed',
          conversionError: conversion.error
        };
      }
      return clip;
    });

    // Save updated clips to session
    updateSession(sessionId, {
      clips: updatedClips,
      conversionResult: {
        timestamp: new Date().toISOString(),
        successCount: conversionResult.successCount,
        failureCount: conversionResult.failureCount,
        allSuccessful: conversionResult.allSuccessful
      }
    });

    res.json({
      sessionId,
      message: `Conversion complete: ${conversionResult.successCount} successful, ${conversionResult.failureCount} failed`,
      conversionResult,
      updatedClips: updatedClips.filter(clip =>
        sequence.sequence?.includes(clip.id)
      ).map(clip => ({
        id: clip.id,
        filename: clip.filename,
        mp4Url: clip.mp4Url,
        conversionStatus: clip.conversionStatus,
        conversionError: clip.conversionError
      }))
    });

  } catch (error) {
    console.error('Conversion error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;