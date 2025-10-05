const express = require('express');
const { getSession, updateSession } = require('../utils/sessionManager');
const ClaudeService = require('../services/claude');

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { clips, sessionId } = req.body;

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'clips array required and must not be empty' });
    }

    const claude = new ClaudeService(process.env.ANTHROPIC_API_KEY);

    console.log(`Generating sequence for ${clips.length} clips`);
    const sequenceResult = await claude.sequenceClips(clips);

    if (sessionId) {
      updateSession(sessionId, { sequence: sequenceResult });
    }

    res.json(sequenceResult);
  } catch (error) {
    console.error('Sequence generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;