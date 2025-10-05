const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class TwelveLabsService {
  constructor(apiKey, indexId) {
    this.apiKey = apiKey;
    this.indexId = indexId;
    this.baseURL = 'https://api.twelvelabs.io/v1.3';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': apiKey
      }
    });
  }

  async uploadVideo(videoPath, filename) {
    console.log(`📤 Uploading ${filename} to TwelveLabs...`);
    console.log(`📁 File path: ${videoPath}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'Present' : 'Missing'}`);
    console.log(`📋 Index ID: ${this.indexId}`);

    const formData = new FormData();
    formData.append('video_file', fs.createReadStream(videoPath));
    formData.append('index_id', this.indexId);
    formData.append('filename', filename);
    formData.append('enable_video_stream', 'true');

    try {
      const response = await this.client.post('/tasks', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      console.log(`✅ Upload successful, task ID: ${response.data._id}`);
      return response.data._id;
    } catch (error) {
      console.error('❌ TwelveLabs upload error:', error.response?.data || error.message);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Full error:', error);
      throw error;
    }
  }

  async waitForProcessing(taskId, maxAttempts = 240, interval = 30000) {
    console.log(`⏳ Waiting for video processing... (max ${maxAttempts * interval / 60000} minutes)`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.client.get(`/tasks/${taskId}`);
        const status = response.data.status;

        console.log(`📊 Processing status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);

        if (status === 'ready') {
          console.log(`✅ Video processing completed! Video ID: ${response.data.video_id}`);
          return response.data.video_id;
        } else if (status === 'failed') {
          throw new Error(`Video processing failed: ${response.data.error_message}`);
        }

        if (attempt % 5 === 0 && attempt > 0) {
          console.log(`⏰ Still processing... ${Math.round((attempt * interval) / 60000)} minutes elapsed`);
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Error checking task status (attempt ${attempt + 1}):`, error.message);
        if (attempt === maxAttempts - 1) throw error;
      }
    }
    throw new Error('Video processing timeout after 2 hours');
  }

  async getVideoData(videoId) {
    try {
      const response = await this.client.get(`/indexes/${this.indexId}/videos/${videoId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting video data:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchVideo(videoId, query, options = {}) {
    try {
      const response = await this.client.post('/search', {
        index_id: this.indexId,
        video_ids: [videoId],
        query,
        options: {
          limit: 10,
          threshold: 'medium',
          ...options
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching video:', error.response?.data || error.message);
      throw error;
    }
  }

  async analyzeVideo(videoPath, filename) {
    console.log(`🎥 Starting video analysis for: ${filename}`);

    try {
      const taskId = await this.uploadVideo(videoPath, filename);
      console.log(`📤 Upload completed, task ID: ${taskId}`);

      const videoId = await this.waitForProcessing(taskId);
      console.log(`✅ Processing completed, video ID: ${videoId}`);

      const videoData = await this.getVideoData(videoId);

      const analysis = {
        video_id: videoId,
        duration: videoData.metadata?.duration || 0,
        fps: videoData.metadata?.fps || 30,
        resolution: {
          width: videoData.metadata?.width || 0,
          height: videoData.metadata?.height || 0
        },
        file_size: videoData.metadata?.size || 0,
        visual: {
          scenes: videoData.metadata?.scenes || [],
          shots: videoData.metadata?.shots || [],
          overall_quality: videoData.metadata?.quality || 'unknown',
          people: videoData.metadata?.people || [],
          text_in_video: videoData.metadata?.text || [],
          logos: videoData.metadata?.logos || [],
          motion: videoData.metadata?.motion || 'unknown'
        },
        audio: {
          transcription: videoData.metadata?.transcription || '',
          audio_quality: videoData.metadata?.audio_quality || 'unknown',
          sounds_detected: videoData.metadata?.sounds || [],
          music: videoData.metadata?.music || false,
          voice_analysis: videoData.metadata?.voice || {}
        },
        semantics: {
          topics: videoData.metadata?.topics || [],
          categories: videoData.metadata?.categories || [],
          sentiment: videoData.metadata?.sentiment || 'neutral',
          emotions: videoData.metadata?.emotions || [],
          highlights: videoData.metadata?.highlights || [],
          content_style: videoData.metadata?.style || 'unknown'
        },
        temporal: {
          pacing: videoData.metadata?.pacing || 'medium',
          opening: videoData.metadata?.opening || {},
          closing: videoData.metadata?.closing || {}
        },
        context: {
          suitable_for: videoData.metadata?.suitable_for || [],
          platform_fit: videoData.metadata?.platform_fit || [],
          editing_notes: videoData.metadata?.editing_notes || [],
          flags: videoData.metadata?.flags || []
        }
      };

      return analysis;
    } catch (error) {
      console.error('Error analyzing video:', error.message);
      throw error;
    }
  }

  async generateSummary(videoId) {
    try {
      const response = await this.client.post('/summarize', {
        video_id: videoId,
        type: 'summary'
      });
      return response.data.summary;
    } catch (error) {
      console.error('Error generating summary:', error.response?.data || error.message);
      return 'Summary not available';
    }
  }

  async getVideoSegments(videoId, prompt = "Find the most interesting and engaging moments, key scenes, highlights, and important segments perfect for short-form content") {
    try {
      console.log(`🎬 Getting video highlights for: ${videoId} with prompt: ${prompt}`);

      const response = await this.client.post('/summarize', {
        video_id: videoId,
        type: "highlight",
        prompt: prompt
      });

      console.log('✅ Summarize Highlights API Response received');
      console.log('📥 Raw highlights response:', JSON.stringify(response.data, null, 2));

      // Extract clips from highlights results
      const allClips = [];

      if (response.data.highlights && Array.isArray(response.data.highlights)) {
        response.data.highlights.forEach((highlight, index) => {
          allClips.push({
            start_time: highlight.start_sec || highlight.start,
            end_time: highlight.end_sec || highlight.end,
            confidence: 0.8, // Highlights are generally high confidence
            class_name: "highlight",
            description: highlight.highlight_summary || highlight.highlight || `Highlight ${index + 1}`,
            highlight_text: highlight.highlight || ''
          });
        });
      }

      console.log(`🎯 Found ${allClips.length} clips from highlights`);
      return allClips;

    } catch (error) {
      console.error('❌ Error getting video highlights:', error.response?.data || error.message);
      console.error('❌ Full error:', error);
      console.error('❌ Status code:', error.response?.status);
      console.error('❌ Request config:', error.config?.url, error.config?.method);

      // Fallback to empty array if highlights fails
      console.log('⚠️ Highlights API failed, returning empty segments array');
      return [];
    }
  }

  async searchVideoClips(videoId, queries = ["exciting moment", "key scene", "important segment", "highlight"]) {
    try {
      console.log(`🔍 Searching video clips for: ${videoId} with queries:`, queries);

      const allClips = [];

      for (const query of queries) {
        try {
          const response = await this.client.post('/search', {
            index_id: this.indexId,
            video_ids: [videoId],
            query: query,
            options: {
              limit: 10,
              threshold: 'medium',
              include_clips: true
            }
          });

          if (response.data.clips && response.data.clips.length > 0) {
            response.data.clips.forEach(clip => {
              allClips.push({
                start_time: clip.start,
                end_time: clip.end,
                confidence: clip.confidence,
                query: query,
                description: `Found: "${query}" (confidence: ${Math.round(clip.confidence * 100)}%)`
              });
            });
          }
        } catch (searchError) {
          console.warn(`⚠️ Search failed for query "${query}":`, searchError.message);
        }
      }

      console.log(`🎯 Found ${allClips.length} clips from search`);
      return allClips;

    } catch (error) {
      console.error('❌ Error searching video clips:', error.response?.data || error.message);
      return [];
    }
  }

  async getVideoGist(videoId) {
    try {
      console.log(`📊 Getting video gist for: ${videoId}`);

      const response = await this.client.post('/gist', {
        video_id: videoId,
        types: ["topic", "highlight", "title"]
      });

      console.log('✅ Gist API Response received');
      console.log('📥 Raw gist response:', JSON.stringify(response.data, null, 2));

      return response.data;

    } catch (error) {
      console.error('❌ Error getting video gist:', error.response?.data || error.message);
      return null;
    }
  }

  async analyzeVideo(videoId, prompt) {
    try {
      console.log(`🎯 Running TwelveLabs open-ended analysis for: ${videoId}`);
      console.log(`📝 Prompt: ${prompt}`);

      const response = await this.client.post('/analyze', {
        video_id: videoId,
        prompt: prompt
      });

      console.log('✅ Analyze API Response received');

      // Handle streaming response format
      if (typeof response.data === 'string') {
        // Parse streaming JSON format
        const lines = response.data.split('\n').filter(line => line.trim());
        let fullText = '';

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.event_type === 'text_generation' && parsed.text) {
              fullText += parsed.text;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }

        console.log('📄 Parsed analysis text length:', fullText.length);
        return fullText;
      }

      return response.data;

    } catch (error) {
      console.error('❌ Error analyzing video:', error.response?.data || error.message);
      console.error('❌ Full error:', error);
      console.error('❌ Status code:', error.response?.status);
      return null;
    }
  }

  async getTikTokAnalysis(videoId) {
    const prompt = `Provide a clear, descriptive analysis of this video content focused on what the video actually shows and contains.

## Content Overview
Describe what happens in the video - the setting, people, activities, and overall narrative. What is the video about?

## Brand & Product Identification
- What brands, products, or services are featured?
- How are they presented (logos, packaging, mentions, demonstrations)?
- What is the main message or value proposition being communicated?

## Visual Elements
- Setting and environment (indoor/outdoor, locations, backgrounds)
- Key visual elements, objects, or props that stand out
- Overall visual style and aesthetic

## Audio & Dialogue
- Key spoken content, messaging, or dialogue
- Background music or sound effects
- Tone and mood of the audio

## Narrative Structure
- How the story unfolds chronologically
- Key moments or scenes that stand out
- Main themes or topics covered

Keep the analysis descriptive and factual, focusing on what the video contains rather than performance metrics or optimization recommendations.`;

    return await this.analyzeVideo(videoId, prompt);
  }

  async getInstagramAnalysis(videoId) {
    const prompt = `Provide a detailed description of this video content with focus on visual aesthetics, lifestyle elements, and brand presentation suitable for understanding Instagram content potential.

## Visual Aesthetic & Style
- Overall visual style, color palette, and aesthetic quality
- Lighting, composition, and production values
- Fashion, styling, or design elements that stand out
- Instagram-worthy visual moments or scenes

## Lifestyle & Aspirational Elements
- Lifestyle themes presented (wellness, luxury, creativity, etc.)
- Aspirational or inspirational moments
- Behind-the-scenes or authentic moments
- Social and cultural elements

## Brand Presentation & Integration
- How brands or products are showcased
- Natural vs. promotional brand integration
- Brand messaging and positioning
- Product demonstrations or usage

## Content Flow & Storytelling
- How the narrative unfolds visually
- Key story beats and emotional moments
- Transitions between scenes or topics
- Overall mood and tone progression

## Audio & Music Elements
- Background music style and mood
- Spoken content and messaging tone
- Audio-visual synchronization moments

Focus on describing the actual content, visual elements, and brand presentation rather than optimization strategies or performance predictions.`;

    return await this.analyzeVideo(videoId, prompt);
  }

  async getComprehensiveAnalysis(videoId) {
    try {
      console.log(`🎬 Running comprehensive TwelveLabs analysis for: ${videoId}`);

      const [tiktokAnalysis, instagramAnalysis] = await Promise.all([
        this.getTikTokAnalysis(videoId),
        this.getInstagramAnalysis(videoId)
      ]);

      return {
        tiktok: tiktokAnalysis,
        instagram: instagramAnalysis
      };

    } catch (error) {
      console.error('❌ Error in comprehensive analysis:', error.message);
      return {
        tiktok: null,
        instagram: null
      };
    }
  }

  async listIndexedVideos() {
    try {
      const response = await this.client.get(`/indexes/${this.indexId}/videos?page_limit=50`);
      console.log('✅ API call successful for listing videos');
      console.log('📥 Raw API response:', JSON.stringify(response.data, null, 2));

      const videos = response.data.data || [];
      console.log(`Found ${videos.length} videos in index`);

      return videos.map(video => {
        // Use system_metadata.filename like the clips route does
        const filename = video.system_metadata?.filename || `Video_${video._id.substring(0, 8)}`;
        console.log(`📊 Processing video: ${filename} (ID: ${video._id})`);

        // Get thumbnail URL from HLS data like the clips route does
        const thumbnailUrl = video.hls?.thumbnail_urls?.[0] || null;
        console.log(`🖼️ Thumbnail URL for ${filename}:`, thumbnailUrl);

        return {
          id: video._id,
          filename: filename,
          duration: video.system_metadata?.duration || 0,
          created_at: video.created_at,
          status: video.status || 'ready',
          thumbnail: thumbnailUrl
        };
      });
    } catch (error) {
      console.error('Error listing indexed videos:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = TwelveLabsService;