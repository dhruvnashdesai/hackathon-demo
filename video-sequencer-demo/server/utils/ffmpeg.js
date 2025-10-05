const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const generateThumbnail = (videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [1],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '320x240'
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const stats = fs.statSync(videoPath);

      resolve({
        duration: parseFloat(metadata.format.duration || 0),
        resolution: {
          width: videoStream.width,
          height: videoStream.height
        },
        fps: eval(videoStream.r_frame_rate) || 30,
        size: stats.size,
        bitrate: parseInt(metadata.format.bit_rate || 0),
        codec: videoStream.codec_name
      });
    });
  });
};

module.exports = {
  generateThumbnail,
  getVideoMetadata
};