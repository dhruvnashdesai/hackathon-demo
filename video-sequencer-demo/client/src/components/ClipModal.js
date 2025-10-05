import React, { useEffect } from 'react';
import { X, User, Tag, Star } from 'lucide-react';

const ClipModal = ({ clip, score, onClose }) => {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!clip) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [clip, onClose]);

  if (!clip) return null;

  const getScoreColor = (ability) => {
    if (ability >= 80) return 'text-green-400 bg-green-900/30';
    if (ability >= 60) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-red-400 bg-red-900/30';
  };

  const getBadgeColor = (badge) => {
    const colors = {
      'Crystal Clear': 'bg-blue-500/20 text-blue-400',
      'Strong Subject': 'bg-purple-500/20 text-purple-400',
      'Strong Hook': 'bg-red-500/20 text-red-400',
      'Emotionally Resonant': 'bg-pink-500/20 text-pink-400',
      'Perfect Fit': 'bg-green-500/20 text-green-400',
      'Great Rhythm': 'bg-indigo-500/20 text-indigo-400',
    };
    return colors[badge] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">{clip.filename}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Clip Preview */}
          <div className="flex space-x-6">
            <div className="w-64 flex-shrink-0">
              {clip.thumbnail ? (
                <img
                  src={clip.thumbnail}
                  alt={clip.filename}
                  className="w-full aspect-video object-cover rounded-lg"
                />
              ) : (
                <div className="w-full aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No preview</span>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-4">
              {clip.metadata && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <span className="ml-2 text-white">{formatDuration(clip.metadata.duration)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Resolution:</span>
                    <span className="ml-2 text-white">{clip.metadata.resolution?.width}x{clip.metadata.resolution?.height}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Size:</span>
                    <span className="ml-2 text-white">{Math.round((clip.size || 0) / 1024 / 1024 * 100) / 100}MB</span>
                  </div>
                </div>
              )}

              {/* Topics and People */}
              {clip.tlAnalysis && (
                <div className="space-y-3">
                  {clip.tlAnalysis.semantics?.topics?.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Topics:</div>
                      <div className="flex flex-wrap gap-2">
                        {clip.tlAnalysis.semantics.topics.slice(0, 5).map((topic, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {clip.tlAnalysis.visual?.people?.length > 0 && (
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-400">People:</span>
                      <span className="ml-2 text-white">{clip.tlAnalysis.visual.people.length} detected</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {clip.tlAnalysis?.summary && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Video Summary</h3>
              <div className="bg-gray-700 rounded-lg p-4 text-gray-200 leading-relaxed">
                {clip.tlAnalysis.summary}
              </div>
            </div>
          )}

          {/* Exclusion Info */}
          {clip.excluded && clip.exclusionReason && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Exclusion Information</h3>
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <X className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-400 font-medium">Excluded from Sequence</span>
                </div>
                <div className="text-gray-200">
                  <span className="font-medium">Reason: </span>
                  {clip.exclusionReason}
                </div>
              </div>
            </div>
          )}

          {/* Scoring */}
          {score && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Claude Scoring</h3>

              {/* Overall Score */}
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Overall Ability Score</span>
                  <span className={`text-2xl font-bold px-3 py-1 rounded ${getScoreColor(score.ability)}`}>
                    {Math.round(score.ability)}
                  </span>
                </div>

                {/* Badge */}
                {score.badge && (
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(score.badge)}`}>
                      <Star className="h-4 w-4 inline mr-1" />
                      {score.badge}
                    </span>
                  </div>
                )}

                {/* Reasoning */}
                {score.reasoning && (
                  <div className="text-sm text-gray-300">
                    <span className="font-medium text-gray-200">Reasoning: </span>
                    {score.reasoning}
                  </div>
                )}
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Clarity</div>
                        <div className="text-xs text-gray-400">Quality & comprehensibility (20%)</div>
                      </div>
                      <span className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score.clarity || 0)}`}>
                        {Math.round(score.clarity || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Hook</div>
                        <div className="text-xs text-gray-400">Engagement factor (25%)</div>
                      </div>
                      <span className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score.hook || 0)}`}>
                        {Math.round(score.hook || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Salience</div>
                        <div className="text-xs text-gray-400">Subject importance (15%)</div>
                      </div>
                      <span className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score.salience || 0)}`}>
                        {Math.round(score.salience || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Emotion</div>
                        <div className="text-xs text-gray-400">Emotional impact (15%)</div>
                      </div>
                      <span className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score.emotion || 0)}`}>
                        {Math.round(score.emotion || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Suitability</div>
                        <div className="text-xs text-gray-400">Platform fit (15%)</div>
                      </div>
                      <span className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score.suitability || 0)}`}>
                        {Math.round(score.suitability || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Pacing</div>
                        <div className="text-xs text-gray-400">Rhythm & timing (10%)</div>
                      </div>
                      <span className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score.pacing || 0)}`}>
                        {Math.round(score.pacing || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Analysis */}
          {clip.tlAnalysis && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Twelve Labs Analysis</h3>
              <div className="space-y-4">
                {/* Audio Analysis */}
                {clip.tlAnalysis.audio && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Audio Analysis</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="text-gray-400">Quality:</span> <span className="text-white ml-2">{clip.tlAnalysis.audio.audio_quality}</span></div>
                      {clip.tlAnalysis.audio.sounds_detected?.length > 0 && (
                        <div><span className="text-gray-400">Sounds:</span> <span className="text-white ml-2">{clip.tlAnalysis.audio.sounds_detected.join(', ')}</span></div>
                      )}
                      <div><span className="text-gray-400">Music:</span> <span className="text-white ml-2">{clip.tlAnalysis.audio.music ? 'Yes' : 'No'}</span></div>
                    </div>
                  </div>
                )}

                {/* Visual Analysis */}
                {clip.tlAnalysis.visual && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Visual Analysis</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="text-gray-400">Quality:</span> <span className="text-white ml-2">{clip.tlAnalysis.visual.overall_quality}</span></div>
                      <div><span className="text-gray-400">Motion:</span> <span className="text-white ml-2">{clip.tlAnalysis.visual.motion}</span></div>
                      {clip.tlAnalysis.visual.people?.length > 0 && (
                        <div><span className="text-gray-400">People:</span> <span className="text-white ml-2">{clip.tlAnalysis.visual.people.length} detected</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Context */}
                {clip.tlAnalysis.context && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Context</h4>
                    <div className="text-sm space-y-1">
                      {clip.tlAnalysis.context.suitable_for?.length > 0 && (
                        <div><span className="text-gray-400">Suitable for:</span> <span className="text-white ml-2">{clip.tlAnalysis.context.suitable_for.join(', ')}</span></div>
                      )}
                      {clip.tlAnalysis.context.platform_fit?.length > 0 && (
                        <div><span className="text-gray-400">Platforms:</span> <span className="text-white ml-2">{clip.tlAnalysis.context.platform_fit.join(', ')}</span></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClipModal;