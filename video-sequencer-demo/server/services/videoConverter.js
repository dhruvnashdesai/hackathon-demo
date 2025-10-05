const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class VideoConverter {
  constructor() {
    this.convertedDir = path.join(__dirname, '../public/converted');
    this.ensureDirectoryExists();
  }

  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.convertedDir, { recursive: true });
    } catch (error) {
      console.error('Error creating converted directory:', error);
    }
  }

  async convertClipToMp4(clip, sessionId) {
    try {
      console.log(`🔄 Converting clip ${clip.filename} to MP4...`);

      // Generate unique filename for converted video
      const clipId = clip.id;
      const outputFilename = `${sessionId}_${clipId}_converted.mp4`;
      const outputPath = path.join(this.convertedDir, outputFilename);

      // Check if already converted
      try {
        await fs.access(outputPath);
        console.log(`✅ Clip ${clip.filename} already converted, using cached version`);
        return `http://localhost:3001/converted/${outputFilename}`;
      } catch (error) {
        // File doesn't exist, proceed with conversion
      }

      // Check if this is an HLS stream - if so, download and convert directly
      if (clip.streamingUrl.includes('.m3u8')) {
        console.log(`🎥 Processing HLS stream directly to MP4`);
        await this.downloadVideo(clip.streamingUrl, outputPath);
      } else {
        // For non-HLS URLs, download first then convert
        const tempInputPath = path.join(this.convertedDir, `temp_${clipId}.mov`);
        await this.downloadVideo(clip.streamingUrl, tempInputPath);

        // Convert using FFmpeg
        await this.performConversion(tempInputPath, outputPath);

        // Clean up temp file
        try {
          await fs.unlink(tempInputPath);
        } catch (error) {
          console.warn('Could not delete temp file:', error.message);
        }
      }

      console.log(`✅ Successfully converted ${clip.filename} to MP4`);
      return `http://localhost:3001/converted/${outputFilename}`;

    } catch (error) {
      console.error(`❌ Error converting clip ${clip.filename}:`, error);
      throw error;
    }
  }

  async downloadVideo(url, outputPath) {
    console.log(`📥 Processing video from: ${url}`);

    // Check if this is an HLS stream (.m3u8)
    if (url.includes('.m3u8')) {
      console.log(`🎥 Detected HLS stream, using FFmpeg to download and convert directly`);

      // Use FFmpeg to download and convert HLS stream directly to MP4 with web-compatible encoding
      return new Promise((resolve, reject) => {
        ffmpeg(url)
          .videoCodec('libx264')  // Explicitly use H.264 for compatibility
          .audioCodec('aac')      // Use AAC for audio
          .format('mp4')          // MP4 container
          .outputOptions([
            '-movflags +faststart', // Optimize for web streaming
            '-preset fast',         // Balance speed vs quality
            '-crf 23',             // Good quality compression
            '-pix_fmt yuv420p',    // Ensure compatibility
            '-profile:v baseline', // Use baseline profile for maximum compatibility
            '-level 3.0'           // H.264 level for web compatibility
          ])
          .on('start', (commandLine) => {
            console.log('📥 FFmpeg HLS download command:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`⏳ Download progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            console.log(`✅ Successfully downloaded HLS stream to: ${outputPath}`);
            resolve();
          })
          .on('error', (error) => {
            console.error('❌ FFmpeg HLS download error:', error);
            reject(error);
          })
          .save(outputPath);
      });
    } else {
      // Regular file download for non-HLS URLs
      console.log(`📥 Downloading regular video file`);

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 120000 // 2 minute timeout for larger files
      });

      const writer = require('fs').createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Downloaded video to: ${outputPath}`);
          resolve();
        });
        writer.on('error', reject);
      });
    }
  }

  async performConversion(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Converting ${inputPath} -> ${outputPath}`);

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions([
          '-movflags +faststart', // Optimize for web streaming
          '-preset fast',         // Balance speed vs quality
          '-crf 23',             // Good quality compression
          '-pix_fmt yuv420p'     // Ensure compatibility
        ])
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ Conversion progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('✅ FFmpeg conversion completed');
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg conversion error:', error);
          reject(error);
        })
        .save(outputPath);
    });
  }

  async convertSequencedClips(clips, sequence, sessionId) {
    const conversions = [];
    const sequencedClipIds = sequence.sequence || [];

    console.log(`🎬 Converting ${sequencedClipIds.length} sequenced clips for session ${sessionId}`);

    for (const clipId of sequencedClipIds) {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) {
        console.warn(`⚠️ Clip ${clipId} not found, skipping`);
        continue;
      }

      try {
        const mp4Url = await this.convertClipToMp4(clip, sessionId);
        conversions.push({
          clipId: clip.id,
          originalUrl: clip.streamingUrl,
          mp4Url: mp4Url,
          status: 'converted'
        });
      } catch (error) {
        console.error(`❌ Failed to convert clip ${clip.filename}:`, error);
        conversions.push({
          clipId: clip.id,
          originalUrl: clip.streamingUrl,
          mp4Url: null,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successfulConversions = conversions.filter(c => c.status === 'converted');
    const failedConversions = conversions.filter(c => c.status === 'failed');

    console.log(`✅ Conversion complete: ${successfulConversions.length} success, ${failedConversions.length} failed`);

    return {
      conversions,
      successCount: successfulConversions.length,
      failureCount: failedConversions.length,
      allSuccessful: failedConversions.length === 0
    };
  }

  async getConversionStatus(clipId, sessionId) {
    const outputFilename = `${sessionId}_${clipId}_converted.mp4`;
    const outputPath = path.join(this.convertedDir, outputFilename);

    try {
      await fs.access(outputPath);
      return {
        clipId,
        status: 'converted',
        mp4Url: `http://localhost:3001/converted/${outputFilename}`
      };
    } catch (error) {
      return {
        clipId,
        status: 'not_converted',
        mp4Url: null
      };
    }
  }
}

module.exports = VideoConverter;