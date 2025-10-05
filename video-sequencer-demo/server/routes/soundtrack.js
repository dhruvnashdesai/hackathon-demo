const express = require('express');
const { getSession, updateSession } = require('../utils/sessionManager');
const ElevenLabsService = require('../services/elevenLabs');

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { audioSettings, clips, sequence, sessionId } = req.body;

    if (!audioSettings || !clips || !sequence) {
      return res.status(400).json({ error: 'audioSettings, clips, and sequence required' });
    }

    const elevenLabs = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
    const soundtrack = {};

    // Generate Voiceover
    if (audioSettings.voiceover && sequence.voiceover_script) {
      try {
        console.log('🎙️ Generating voiceover...');
        const voiceoverResult = await elevenLabs.generateVoiceover(sequence.voiceover_script, sessionId);
        soundtrack.voiceover = voiceoverResult;
      } catch (error) {
        console.error('Error generating voiceover:', error.message);
        soundtrack.voiceover = null;
        soundtrack.voiceoverError = error.message;
      }
    }

    // Generate Background Music
    if (audioSettings.music) {
      try {
        console.log('🎵 Generating background music...');

        const moods = clips.map(clip =>
          clip.tlAnalysis?.semantics?.emotions?.join(', ') || 'neutral'
        ).filter(mood => mood !== 'neutral');

        const dominantMood = moods.length > 0 ? moods[0] : 'upbeat, cinematic';
        const estimatedDuration = sequence.estimated_total_duration || 60;

        const musicPath = await elevenLabs.generateMusic(dominantMood, estimatedDuration);
        soundtrack.music = musicPath;
      } catch (error) {
        console.error('Error generating music:', error.message);
        soundtrack.music = null;
        soundtrack.musicError = error.message;
      }
    }

    // Generate Sound Effects
    if (audioSettings.sfx) {
      try {
        console.log('🔊 Generating transition SFX...');
        const sfx = [];

        for (const transition of sequence.transitions || []) {
          try {
            const sfxPath = await elevenLabs.generateSFX(transition.type);
            sfx.push({
              from: transition.from,
              to: transition.to,
              type: transition.type,
              path: sfxPath
            });
          } catch (error) {
            console.error(`Error generating SFX for ${transition.type}:`, error.message);
            sfx.push({
              from: transition.from,
              to: transition.to,
              type: transition.type,
              path: null,
              error: error.message
            });
          }
        }

        soundtrack.sfx = sfx;
      } catch (error) {
        console.error('Error generating SFX:', error.message);
        soundtrack.sfx = [];
        soundtrack.sfxError = error.message;
      }
    }

    if (sessionId) {
      updateSession(sessionId, { soundtrack });
    }

    res.json(soundtrack);
  } catch (error) {
    console.error('Soundtrack generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;