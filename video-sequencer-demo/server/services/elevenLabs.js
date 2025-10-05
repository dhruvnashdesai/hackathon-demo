const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Default voice ID (can be made configurable)
    this.defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Bella voice
  }

  // Generate voiceover from script
  async generateVoiceover(voiceoverScript, sessionId) {
    console.log('🎙️ Generating voiceover with ElevenLabs...');
    console.log('📝 Script:', voiceoverScript.full_script);

    try {
      const response = await this.client.post(`/text-to-speech/${this.defaultVoiceId}`, {
        text: voiceoverScript.full_script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.5,
          use_speaker_boost: true
        }
      }, {
        responseType: 'arraybuffer'
      });

      const filename = `voiceover_${sessionId}_${Date.now()}.mp3`;
      const outputPath = path.join(process.cwd(), '..', 'audio', filename);

      // Ensure audio directory exists
      const audioDir = path.dirname(outputPath);
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, response.data);

      console.log('✅ Voiceover generated successfully');
      return {
        type: 'voiceover',
        path: `/audio/${filename}`,
        duration: voiceoverScript.estimated_speech_duration,
        segments: voiceoverScript.segments
      };

    } catch (error) {
      console.error('❌ Error generating voiceover:', error.response?.data || error.message);

      // Create fallback silent audio
      const fallbackPath = await this.createSilentAudio(30, `voiceover_${sessionId}`);
      return {
        type: 'voiceover',
        path: fallbackPath,
        duration: 30,
        error: 'Fallback silent audio generated'
      };
    }
  }

  async generateMusic(moodPrompt, duration = 30) {
    const prompt = `Create ${duration} seconds of background music. Mood: ${moodPrompt}. Style: cinematic, suitable for video content.`;

    try {
      const response = await this.client.post('/text-to-sound-effects', {
        text: prompt,
        duration_seconds: duration,
        prompt_influence: 0.8
      });

      const audioUrl = response.data.audio_url;
      if (!audioUrl) {
        throw new Error('No audio URL returned from ElevenLabs');
      }

      const audioResponse = await axios.get(audioUrl, {
        responseType: 'stream'
      });

      const filename = `music_${Date.now()}.mp3`;
      const outputPath = path.join(process.cwd(), '..', 'audio', filename);

      const writer = fs.createWriteStream(outputPath);
      audioResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/audio/${filename}`));
        writer.on('error', reject);
      });

    } catch (error) {
      console.error('Error generating music with ElevenLabs:', error.response?.data || error.message);

      const fallbackPath = this.createSilentAudio(duration, 'music');
      return fallbackPath;
    }
  }

  async generateSFX(transitionType) {
    const sfxPrompts = {
      cut: 'Quick whoosh sound effect, sharp transition, 1 second duration',
      dissolve: 'Smooth ambient transition, gentle riser, 2 seconds',
      fade: 'Soft ambient fade, ethereal transition, 2 seconds',
      wipe: 'Sweeping transition sound, dynamic whoosh, 1.5 seconds',
      zoom: 'Dramatic zoom sound effect, building tension, 1 second'
    };

    const prompt = sfxPrompts[transitionType] || sfxPrompts.cut;

    try {
      const response = await this.client.post('/text-to-sound-effects', {
        text: prompt,
        duration_seconds: 2,
        prompt_influence: 0.9
      });

      const audioUrl = response.data.audio_url;
      if (!audioUrl) {
        throw new Error('No audio URL returned from ElevenLabs');
      }

      const audioResponse = await axios.get(audioUrl, {
        responseType: 'stream'
      });

      const filename = `sfx_${transitionType}_${Date.now()}.mp3`;
      const outputPath = path.join(process.cwd(), '..', 'audio', filename);

      const writer = fs.createWriteStream(outputPath);
      audioResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/audio/${filename}`));
        writer.on('error', reject);
      });

    } catch (error) {
      console.error(`Error generating SFX for ${transitionType}:`, error.response?.data || error.message);

      const fallbackPath = this.createSilentAudio(2, `sfx_${transitionType}`);
      return fallbackPath;
    }
  }

  createSilentAudio(duration, prefix) {
    const filename = `${prefix}_silent_${Date.now()}.mp3`;
    const outputPath = path.join(process.cwd(), '..', 'audio', filename);

    const ffmpeg = require('fluent-ffmpeg');
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=channel_layout=stereo:sample_rate=48000')
        .inputFormat('lavfi')
        .duration(duration)
        .audioCodec('mp3')
        .save(outputPath)
        .on('end', () => {
          resolve(`/audio/${filename}`);
        })
        .on('error', (err) => {
          console.error('Error creating silent audio:', err.message);
          resolve(null);
        });
    });
  }

  async getVoices() {
    try {
      const response = await this.client.get('/voices');
      return response.data.voices;
    } catch (error) {
      console.error('Error getting voices:', error.response?.data || error.message);
      return [];
    }
  }
}

module.exports = ElevenLabsService;