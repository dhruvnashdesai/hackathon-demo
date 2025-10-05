const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

class VideoClipperService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../clips');
    this.tempDir = path.join(__dirname, '../../temp');

    // Ensure directories exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Calculate crop dimensions for 9:16 aspect ratio
   * @param {number} inputWidth - Original video width
   * @param {number} inputHeight - Original video height
   * @returns {object} Crop parameters {width, height, x, y}
   */
  calculateCrop916(inputWidth, inputHeight) {
    const targetAspectRatio = 9 / 16; // 0.5625
    const currentAspectRatio = inputWidth / inputHeight;

    let cropWidth, cropHeight, offsetX, offsetY;

    if (currentAspectRatio > targetAspectRatio) {
      // Video is too wide, crop horizontally
      cropHeight = inputHeight;
      cropWidth = Math.round(inputHeight * targetAspectRatio);
      offsetX = Math.round((inputWidth - cropWidth) / 2);
      offsetY = 0;
    } else {
      // Video is too tall, crop vertically
      cropWidth = inputWidth;
      cropHeight = Math.round(inputWidth / targetAspectRatio);
      offsetX = 0;
      offsetY = Math.round((inputHeight - cropHeight) / 2);
    }

    return {
      width: cropWidth,
      height: cropHeight,
      x: offsetX,
      y: offsetY
    };
  }

  /**
   * Get video metadata using ffprobe
   * @param {string} inputPath - Path to video file
   * @returns {Promise<object>} Video metadata
   */
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
          resolve({
            width: videoStream.width,
            height: videoStream.height,
            duration: parseFloat(metadata.format.duration),
            fps: eval(videoStream.r_frame_rate) // Convert "24/1" to 24
          });
        }
      });
    });
  }

  /**
   * Download video from URL to temporary file
   * @param {string} videoUrl - HLS or MP4 URL
   * @param {string} outputPath - Local file path to save
   * @returns {Promise<string>} Path to downloaded file
   */
  async downloadVideo(videoUrl, outputPath) {
    console.log(`📥 Downloading video from: ${videoUrl}`);

    return new Promise((resolve, reject) => {
      // For HLS streams, use ffmpeg to download and convert
      if (videoUrl.includes('.m3u8')) {
        ffmpeg(videoUrl)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('start', (commandLine) => {
            console.log('🎬 FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`📊 Download progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            console.log('✅ Video download completed');
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('❌ Download error:', err);
            reject(err);
          })
          .run();
      } else {
        // For direct MP4 URLs, use axios
        const writer = fs.createWriteStream(outputPath);

        axios({
          method: 'get',
          url: videoUrl,
          responseType: 'stream'
        })
        .then(response => {
          response.data.pipe(writer);

          writer.on('finish', () => {
            console.log('✅ Video download completed');
            resolve(outputPath);
          });

          writer.on('error', (err) => {
            console.error('❌ Download error:', err);
            reject(err);
          });
        })
        .catch(reject);
      }
    });
  }

  /**
   * Create a clipped and cropped video segment
   * @param {string} inputPath - Path to source video
   * @param {object} clipData - Clip information {startTime, endTime, id, title}
   * @param {object} metadata - Video metadata {width, height}
   * @returns {Promise<string>} Path to generated clip
   */
  async createClip(inputPath, clipData, metadata) {
    const { startTime, endTime, id, title } = clipData;
    const duration = endTime - startTime;

    console.log(`✂️ Creating clip: ${title} (${startTime}s - ${endTime}s)`);

    // Calculate 9:16 crop dimensions
    const crop = this.calculateCrop916(metadata.width, metadata.height);

    // Generate output filename
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    const outputFilename = `${safeTitle}_${id.substring(0, 8)}.mp4`;
    const outputPath = path.join(this.outputDir, outputFilename);

    console.log(`🎯 Crop settings: ${crop.width}x${crop.height} at offset (${crop.x}, ${crop.y})`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .videoFilters([
          `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
          'scale=608:1080' // Scale to standard 9:16 resolution
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .videoBitrate('1000k')
        .fps(30)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg clip command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📊 Clip progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`✅ Clip created: ${outputFilename}`);
          resolve({
            path: outputPath,
            filename: outputFilename,
            url: `/clips/${outputFilename}`,
            duration: duration,
            resolution: '608x1080'
          });
        })
        .on('error', (err) => {
          console.error(`❌ Clip creation error for ${title}:`, err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Process multiple clips from a video
   * @param {string} videoUrl - TwelveLabs HLS URL
   * @param {array} clips - Array of clip objects with timestamps
   * @returns {Promise<array>} Array of generated clip information
   */
  async processClips(videoUrl, clips) {
    try {
      console.log(`🎥 Processing ${clips.length} clips from video`);

      // Download source video
      const tempVideoPath = path.join(this.tempDir, `source_${Date.now()}.mp4`);
      await this.downloadVideo(videoUrl, tempVideoPath);

      // Get video metadata
      const metadata = await this.getVideoMetadata(tempVideoPath);
      console.log(`📊 Video metadata: ${metadata.width}x${metadata.height}, ${metadata.duration}s`);

      // Process each clip
      const processedClips = [];
      for (const clip of clips) {
        try {
          const clipResult = await this.createClip(tempVideoPath, clip, metadata);
          processedClips.push({
            ...clip,
            mp4Url: clipResult.url,
            mp4Path: clipResult.path,
            filename: clipResult.filename,
            resolution: clipResult.resolution
          });
        } catch (clipError) {
          console.error(`⚠️ Failed to create clip ${clip.title}:`, clipError.message);
          // Continue with other clips
        }
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(tempVideoPath);
        console.log('🧹 Cleaned up temporary video file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file:', cleanupError.message);
      }

      console.log(`✅ Successfully processed ${processedClips.length}/${clips.length} clips`);
      return processedClips;

    } catch (error) {
      console.error('❌ Video processing error:', error);
      throw error;
    }
  }

  /**
   * Clean up old clip files (optional maintenance)
   * @param {number} maxAgeHours - Maximum age of clips to keep
   */
  async cleanupOldClips(maxAgeHours = 24) {
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();

    try {
      const files = fs.readdirSync(this.outputDir);

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted old clip: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

module.exports = VideoClipperService;