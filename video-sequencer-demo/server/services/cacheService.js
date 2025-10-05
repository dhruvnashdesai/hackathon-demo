const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CacheService {
  constructor(cacheDir = 'cache') {
    this.cacheDir = path.join(__dirname, '..', cacheDir);
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn('Cache directory creation failed:', error.message);
    }
  }

  getCacheKey(videoId, analysisType) {
    const key = `${videoId}_${analysisType}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  getCacheFilePath(cacheKey) {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  async get(videoId, analysisType) {
    try {
      const cacheKey = this.getCacheKey(videoId, analysisType);
      const filePath = this.getCacheFilePath(cacheKey);

      const stats = await fs.stat(filePath);
      const cacheAge = Date.now() - stats.mtime.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > maxAge) {
        console.log(`🗑️ Cache expired for ${analysisType} analysis of video ${videoId}`);
        await this.delete(videoId, analysisType);
        return null;
      }

      const data = await fs.readFile(filePath, 'utf8');
      const cached = JSON.parse(data);

      console.log(`✅ Cache hit for ${analysisType} analysis of video ${videoId}`);
      return cached.result;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Cache read error for ${analysisType} analysis:`, error.message);
      }
      return null;
    }
  }

  async set(videoId, analysisType, result) {
    try {
      const cacheKey = this.getCacheKey(videoId, analysisType);
      const filePath = this.getCacheFilePath(cacheKey);

      const cacheData = {
        videoId,
        analysisType,
        result,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached ${analysisType} analysis for video ${videoId}`);
    } catch (error) {
      console.warn(`Cache write error for ${analysisType} analysis:`, error.message);
    }
  }

  async delete(videoId, analysisType) {
    try {
      const cacheKey = this.getCacheKey(videoId, analysisType);
      const filePath = this.getCacheFilePath(cacheKey);
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted cache for ${analysisType} analysis of video ${videoId}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Cache delete error for ${analysisType} analysis:`, error.message);
      }
    }
  }

  async clearAll() {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
      console.log(`🗑️ Cleared all cache files (${files.length} files)`);
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  async getOrSet(videoId, analysisType, asyncFunction) {
    let cached = await this.get(videoId, analysisType);
    if (cached !== null) {
      return cached;
    }

    console.log(`🔄 Running ${analysisType} analysis for video ${videoId} (not cached)`);
    const result = await asyncFunction();
    await this.set(videoId, analysisType, result);
    return result;
  }
}

module.exports = CacheService;