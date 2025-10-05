const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getSession, updateSession } = require('../utils/sessionManager');
const TwelveLabsService = require('../services/twelveLabs');
const ClaudeService = require('../services/claude');
const VideoClipperService = require('../services/videoClipper');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `asset_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for full-length videos
  }
});

// Select existing video for demo mode
router.post('/select', async (req, res) => {
  try {
    const { videoId, filename, platform = 'tiktok' } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID required' });
    }

    console.log(`📹 Processing selected video: ${filename || videoId}`);

    const assetId = uuidv4();

    // Initialize services
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );
    const claude = new ClaudeService(process.env.ANTHROPIC_API_KEY);

    // Get comprehensive analysis
    console.log('🔍 Getting video analysis...');
    const tlVideoData = await twelveLabs.getVideoData(videoId);

    // Run comprehensive analysis using both TwelveLabs and Claude
    console.log('🎯 Running comprehensive multi-platform analysis...');
    let tiktokAnalysis = null;
    let instagramAnalysis = null;
    let twelveLabsAnalysis = null;

    try {
      console.log('🔬 Running TwelveLabs comprehensive analysis...');
      twelveLabsAnalysis = await twelveLabs.getComprehensiveAnalysis(videoId);
    } catch (analysisError) {
      console.warn('Warning: Could not run TwelveLabs analysis:', analysisError.message);
    }

    try {
      console.log('📱 Running Claude TikTok analysis...');
      tiktokAnalysis = await claude.analyzeLongFormVideo(tlVideoData, 'tiktok');
    } catch (analysisError) {
      console.warn('Warning: Could not run Claude TikTok analysis:', analysisError.message);
    }

    try {
      console.log('📸 Running Claude Instagram analysis...');
      instagramAnalysis = await claude.analyzeLongFormVideo(tlVideoData, 'instagram');
    } catch (analysisError) {
      console.warn('Warning: Could not run Claude Instagram analysis:', analysisError.message);
    }

    // Create asset record
    const asset = {
      id: assetId,
      filename: filename || tlVideoData.metadata?.filename || 'Selected Video',
      videoId: videoId,
      duration: tlVideoData.metadata?.duration || 0,
      resolution: tlVideoData.metadata?.resolution,
      analysis: {
        sentiment: tlVideoData.metadata?.sentiment || 'neutral',
        topics: tlVideoData.metadata?.topics || [],
        emotions: tlVideoData.metadata?.emotions || [],
        brandMoments: tlVideoData.metadata?.scenes?.length || 'To be determined after extraction',
        visualQuality: tlVideoData.metadata?.quality || 'good',
        summary: tlVideoData.metadata?.summary || 'Video analysis'
      },
      tiktokAnalysis: tiktokAnalysis, // Claude TikTok-specific analysis
      instagramAnalysis: instagramAnalysis, // Claude Instagram-specific analysis
      twelveLabsAnalysis: twelveLabsAnalysis, // TwelveLabs comprehensive analysis
      createdAt: new Date().toISOString(),
      extractedClips: null
    };

    console.log('✅ Asset processed successfully:', assetId);

    res.json(asset);
  } catch (error) {
    console.error('❌ Asset selection error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Upload and analyze full video asset
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const assetId = uuidv4();
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = req.file.path;

    console.log(`📹 Processing asset upload: ${originalName}`);

    // Initialize TwelveLabs service
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );

    // Upload and analyze with TwelveLabs
    console.log('🔄 Uploading and analyzing with TwelveLabs...');
    const videoId = await twelveLabs.analyzeVideo(filePath, filename);

    // Get comprehensive analysis
    console.log('🔍 Getting video analysis...');
    const analysis = await twelveLabs.getVideoData(videoId);

    // Create asset record
    const asset = {
      id: assetId,
      filename: originalName,
      videoId: videoId,
      duration: analysis.metadata?.duration || 0,
      resolution: analysis.metadata?.resolution,
      analysis: {
        sentiment: analysis.semantics?.sentiment || 'neutral',
        topics: analysis.semantics?.topics || [],
        emotions: analysis.semantics?.emotions || [],
        brandMoments: analysis.visual?.scenes?.length || 0,
        visualQuality: analysis.visual?.overall_quality || 'good',
        summary: analysis.summary
      },
      createdAt: new Date().toISOString(),
      extractedClips: null // Will be populated when clips are extracted
    };

    console.log('✅ Asset processed successfully:', assetId);

    res.json(asset);
  } catch (error) {
    console.error('❌ Asset upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Extract clips from full video using scene detection
router.post('/extract-clips', async (req, res) => {
  try {
    const { assetId, videoId } = req.body;

    if (!assetId || !videoId) {
      return res.status(400).json({ error: 'assetId and videoId required' });
    }

    console.log(`✂️ Extracting clips from asset: ${assetId}`);

    // Initialize services
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );
    const claude = new ClaudeService(process.env.ANTHROPIC_API_KEY);

    // Get detailed video analysis with scene boundaries
    console.log('🔍 Getting scene analysis...');
    const videoAnalysis = await twelveLabs.getVideoData(videoId);

    // Try to get proper scene detection from TwelveLabs Classification API
    console.log('🎬 Attempting TwelveLabs scene detection...');
    let scenes = await twelveLabs.getVideoSegments(videoId);

    // If no scenes from classification, try search-based clips
    if (scenes.length === 0) {
      console.log('🔍 No classification results, trying search-based clips...');
      scenes = await twelveLabs.searchVideoClips(videoId);
    }

    // If still no scenes, fall back to time-based clips
    if (scenes.length === 0) {
      console.log('📊 No TwelveLabs scenes found, creating time-based clips...');

      // Create time-based clips as fallback
      const duration = videoAnalysis.system_metadata?.duration || 140;
      const clipDuration = Math.min(15, duration / 8); // 15 second max clips

      for (let i = 0; i < 8 && (i * clipDuration) < duration; i++) {
        const startTime = i * clipDuration;
        const endTime = Math.min(startTime + clipDuration, duration);
        scenes.push({
          start_time: startTime,
          end_time: endTime,
          description: `Key Moment ${i + 1}`,
          confidence: 0.5,
          class_name: 'time_based'
        });
      }
    }

    const highlights = videoAnalysis.semantics?.highlights || [];

    // Create clips based on scene boundaries and highlights
    console.log(`📝 Creating ${scenes.length} clips from scenes...`);

    const clips = [];
    let clipIndex = 1;

    // Process scenes into clips (aim for 3-10 second clips)
    for (const scene of scenes.slice(0, 12)) { // Limit to 12 clips max
      const startTime = scene.start_time || ((clipIndex - 1) * 10);
      const endTime = Math.min(scene.end_time || (startTime + 8), startTime + 12); // Max 12 second clips
      const duration = endTime - startTime;

      if (duration >= 2) { // Minimum 2 seconds
        const clipId = uuidv4();

        // Generate clip title based on content and classification
        const clipTitle = scene.description ||
                         (scene.class_name ? `${scene.class_name} ${clipIndex}` : null) ||
                         highlights[clipIndex - 1] ||
                         `Key Moment ${clipIndex}`;

        // Create clip analysis object for scoring
        const clipAnalysis = {
          duration: duration,
          summary: scene.description || `Scene ${clipIndex}`,
          visual: {
            scenes: [scene],
            overall_quality: videoAnalysis.visual?.overall_quality || 'good',
            people: scene.people || [],
            objects: scene.objects || []
          },
          audio: {
            transcription: scene.transcription || '',
            audio_quality: videoAnalysis.audio?.audio_quality || 'good',
            music: videoAnalysis.audio?.music || false
          },
          semantics: {
            topics: videoAnalysis.semantics?.topics?.slice(0, 3) || [],
            emotions: scene.emotions || videoAnalysis.semantics?.emotions?.slice(0, 2) || [],
            sentiment: scene.sentiment || videoAnalysis.semantics?.sentiment || 'neutral'
          }
        };

        // Score the clip using Claude
        console.log(`🎯 Scoring clip ${clipIndex}...`);
        let clipScore = null;
        try {
          clipScore = await claude.scoreClip(clipAnalysis);
        } catch (scoreError) {
          console.warn(`Warning: Could not score clip ${clipIndex}:`, scoreError.message);
        }

        const clip = {
          id: clipId,
          title: clipTitle,
          filename: `${clipTitle.replace(/[^a-zA-Z0-9]/g, '_')}_clip.mov`,
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          sourceVideoId: videoId,
          sourceAssetId: assetId,
          tlAnalysis: clipAnalysis,
          score: clipScore,
          metadata: {
            duration: duration,
            resolution: videoAnalysis.metadata?.resolution,
            // Add TwelveLabs scene detection metadata
            sceneClassification: scene.class_name || 'unknown',
            sceneConfidence: scene.confidence || 0,
            detectionMethod: scene.class_name === 'time_based' ? 'time_based' : 'ml_detected'
          },
          // Generate thumbnail URL based on TwelveLabs video
          thumbnail: `https://api.twelvelabs.io/v1.2/indexes/${process.env.TWELVE_LABS_INDEX_ID}/videos/${videoId}/thumbnail?time=${Math.floor(startTime)}`,
          // For demo - would need actual clip extraction in production
          streamingUrl: `https://api.twelvelabs.io/v1.2/indexes/${process.env.TWELVE_LABS_INDEX_ID}/videos/${videoId}/stream?start=${startTime}&end=${endTime}`,
          mp4Url: null // Will be set when clips are actually extracted
        };

        clips.push(clip);
        clipIndex++;
      }
    }

    console.log(`✅ Extracted ${clips.length} clips successfully`);

    res.json({
      success: true,
      clips: clips,
      totalClips: clips.length,
      sourceVideoId: videoId,
      assetId: assetId
    });

  } catch (error) {
    console.error('❌ Clip extraction error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List available videos for demo mode
router.get('/available', async (req, res) => {
  try {
    console.log('📋 Listing available videos...');

    // Initialize TwelveLabs service
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );

    const videos = await twelveLabs.listIndexedVideos();

    // Filter for ready videos and add demo metadata
    const availableVideos = videos
      .filter(video => video.status === 'ready')
      .map(video => ({
        id: video.id,
        filename: video.filename,
        duration: video.duration,
        description: getDemoDescription(video.filename),
        brand: getDemoBrand(video.filename),
        thumbnail: video.thumbnail, // Include thumbnail from TwelveLabs response
        created_at: video.created_at
      }));

    res.json({ videos: availableVideos });
  } catch (error) {
    console.error('❌ List videos error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for demo metadata
function getDemoDescription(filename) {
  if (filename.toLowerCase().includes('chipotle')) return 'Chipotle sustainable farming commercial';
  if (filename.toLowerCase().includes('clip')) return 'TwelveLabs office workspace footage';
  return 'Brand video content';
}

function getDemoBrand(filename) {
  if (filename.toLowerCase().includes('chipotle')) return 'Chipotle';
  if (filename.toLowerCase().includes('clip')) return 'TwelveLabs';
  return 'Demo Brand';
}

// Get asset details
router.get('/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;

    // In a real app, you'd fetch from database
    // For now, return placeholder data

    res.json({
      id: assetId,
      status: 'processed',
      clips: []
    });
  } catch (error) {
    console.error('Get asset error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate physical 9:16 MP4 clips from extracted clip data
router.post('/generate-clips', async (req, res) => {
  try {
    const { clips, videoId } = req.body;

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'clips array required' });
    }

    if (!videoId) {
      return res.status(400).json({ error: 'videoId required' });
    }

    console.log(`🎬 Generating ${clips.length} physical clips for video: ${videoId}`);

    // Initialize services
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );
    const videoClipper = new VideoClipperService();

    // Get video data to access HLS URL
    const videoData = await twelveLabs.getVideoData(videoId);

    if (!videoData.hls?.video_url) {
      return res.status(400).json({ error: 'Video HLS URL not available' });
    }

    const videoUrl = videoData.hls.video_url;

    // Process clips to generate physical MP4 files
    console.log(`📡 Using video URL: ${videoUrl}`);
    const processedClips = await videoClipper.processClips(videoUrl, clips);

    console.log(`✅ Successfully generated ${processedClips.length} physical clips`);

    res.json({
      success: true,
      clips: processedClips,
      totalClips: processedClips.length,
      videoId: videoId
    });

  } catch (error) {
    console.error('❌ Generate clips error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get clips from clips index for timeline demo
router.get('/demo-clips', async (req, res) => {
  try {
    console.log('🎬 Loading demo clips for timeline...');

    // For demo purposes, just use the same logic as /available endpoint
    const twelveLabs = new TwelveLabsService(
      process.env.TWELVE_LABS_API_KEY,
      process.env.TWELVE_LABS_INDEX_ID
    );

    const videos = await twelveLabs.listIndexedVideos();
    console.log(`📁 Found ${videos.length} videos in main index`);

    // Convert videos to clip format for timeline editor
    const clips = videos
      .filter(video => video.status === 'ready')
      .map((video, index) => ({
        id: video.id,
        title: video.filename || `Clip ${index + 1}`,
        filename: video.filename,
        duration: video.duration || 10,
        sourceVideoId: video.id,
        sourceAssetId: 'demo-asset',
        thumbnail: video.thumbnail,
        mp4Url: null, // Will be set by timeline editor
        streamingUrl: `https://api.twelvelabs.io/v1.2/indexes/${process.env.TWELVE_LABS_INDEX_ID}/videos/${video.id}/stream`,
        metadata: {
          duration: video.duration || 10,
          resolution: '1920x1080',
          detectionMethod: 'pre_existing'
        },
        score: {
          ability: Math.floor(Math.random() * 30) + 70 // Random score between 70-100 for demo
        }
      }));

    console.log(`✅ Loaded ${clips.length} demo clips for timeline`);

    res.json({
      success: true,
      clips: clips,
      totalClips: clips.length,
      sourceVideoId: 'demo-source',
      assetId: 'demo-asset'
    });

  } catch (error) {
    console.error('❌ Demo clips loading error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;