import React from 'react';
import ClipCard from './ClipCard';

const ClipGrid = ({ clips, scores, sequence, showPositions = false }) => {
  const getScoreForClip = (clipId) => {
    // Ensure scores is an array before calling find
    if (!Array.isArray(scores)) {
      console.warn('ClipGrid - Scores is not an array:', typeof scores, scores);
      return null;
    }
    return scores.find(score => score.clipId === clipId);
  };

  const getPositionForClip = (clipId) => {
    if (!sequence?.sequence || !showPositions) return null;
    const index = sequence.sequence.indexOf(clipId);
    return index !== -1 ? index + 1 : null;
  };

  const orderedClips = sequence?.sequence
    ? sequence.sequence.map(clipId => clips.find(clip => clip.id === clipId)).filter(Boolean)
    : clips;

  const excludedClips = sequence?.excluded_clips
    ? sequence.excluded_clips.map(excl => ({
        ...clips.find(clip => clip.id === excl.clipId),
        exclusionReason: excl.reason
      })).filter(clip => clip.id)
    : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sequenced Clips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orderedClips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            score={getScoreForClip(clip.id)}
            position={getPositionForClip(clip.id)}
          />
        ))}
      </div>

      {/* Excluded Clips Section */}
      {excludedClips.length > 0 && (
        <div className="mt-12">
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚫 Excluded from Sequence ({excludedClips.length})
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              These clips were excluded by Claude because they didn't fit the main narrative theme.
            </p>

            {/* Theme Analysis Display */}
            {sequence?.theme_analysis && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900">Identified Theme:</div>
                <div className="text-sm text-blue-700">{sequence.theme_analysis}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {excludedClips.map((clip) => (
                <div key={clip.id} className="relative">
                  <ClipCard
                    clip={clip}
                    score={getScoreForClip(clip.id)}
                    position={null}
                  />
                  {/* Exclusion Overlay */}
                  <div className="absolute inset-0 bg-red-900 bg-opacity-75 rounded-lg flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-white font-bold text-lg mb-2">EXCLUDED</div>
                      <div className="text-red-100 text-sm">
                        {clip.exclusionReason}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipGrid;