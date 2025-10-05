const express = require('express');
const { getSession } = require('../utils/sessionManager');

const router = express.Router();

router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const statistics = {
      totalClips: session.clips.length,
      averageAbility: session.scores?.length ?
        session.scores.reduce((sum, score) => sum + (score.ability || 0), 0) / session.scores.length :
        0,
      estimatedDuration: session.sequence?.estimated_total_duration || 0,
      soundtrackMode: session.soundtrack ? 'generated' : 'none'
    };

    const exportData = {
      sessionId,
      createdAt: session.createdAt,
      exportedAt: new Date(),
      statistics,
      clips: session.clips.map(clip => ({
        id: clip.id,
        filename: clip.filename,
        thumbnail: clip.thumbnail,
        metadata: clip.metadata,
        tlAnalysis: clip.tlAnalysis,
        score: session.scores?.find(s => s.clipId === clip.id)
      })),
      sequence: session.sequence,
      soundtrack: session.soundtrack
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="video-sequence-${sessionId}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;