import React, { useState } from 'react';
import { Play, Clock, User, Tag, ChevronDown, ChevronUp } from 'lucide-react';

const ClipCard = ({ clip, score, position }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (ability) => {
    if (ability >= 80) return 'text-green-600 bg-green-50';
    if (ability >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getBadgeColor = (badge) => {
    const colors = {
      'Crystal Clear': 'bg-blue-100 text-blue-800',
      'Strong Subject': 'bg-purple-100 text-purple-800',
      'Strong Hook': 'bg-red-100 text-red-800',
      'Emotionally Resonant': 'bg-pink-100 text-pink-800',
      'Perfect Fit': 'bg-green-100 text-green-800',
      'Great Rhythm': 'bg-indigo-100 text-indigo-800',
    };
    return colors[badge] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {position && (
        <div className="bg-blue-600 text-white text-center py-1 text-sm font-semibold">
          #{position}
        </div>
      )}

      <div className="relative">
        {clip.thumbnail ? (
          <img
            src={clip.thumbnail}
            alt={clip.filename}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <Play className="h-16 w-16 text-gray-400" />
          </div>
        )}

        {/* Overall Score Badge - Bottom Right */}
        {score && (
          <div className="absolute bottom-2 right-2">
            <div className="px-2 py-1 rounded-full text-sm font-bold shadow-lg bg-black bg-opacity-70 text-white border border-white">
              {Math.round(score.ability)}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 truncate" title={clip.filename}>
          {clip.filename}
        </h3>

        {clip.metadata && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatDuration(clip.metadata.duration)}</span>
            <span className="mx-2">•</span>
            <span>{clip.metadata.resolution?.width}x{clip.metadata.resolution?.height}</span>
          </div>
        )}

        {clip.tlAnalysis && (
          <div className="mb-3">
            {clip.tlAnalysis.semantics?.topics?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {clip.tlAnalysis.semantics.topics.slice(0, 3).map((topic, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {clip.tlAnalysis.visual?.people?.length > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                <span>{clip.tlAnalysis.visual.people.length} person(s)</span>
              </div>
            )}
          </div>
        )}

        {score && (
          <div className="border-t pt-3">
            {/* Overall Ability Score */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Overall Ability Score</span>
              <span className={`text-2xl font-bold px-2 py-1 rounded ${getScoreColor(score.ability)}`}>
                {Math.round(score.ability)}
              </span>
            </div>

            {/* Badge */}
            {score.badge && (
              <div className="mb-3">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(score.badge)}`}>
                  {score.badge}
                </span>
              </div>
            )}

            {/* Detailed Parameter Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Scoring Breakdown:
                <span className="font-normal text-gray-500 ml-1">(Weighted average = {Math.round(score.ability)})</span>
              </div>

              {/* Clarity */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">Clarity (20%)</div>
                  <div className="text-xs text-gray-500">Visual/audio quality, comprehensibility</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ml-2 ${getScoreColor(score.clarity || 0)}`}>
                  {Math.round(score.clarity || 0)}
                </div>
              </div>

              {/* Hook */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">Hook (25%)</div>
                  <div className="text-xs text-gray-500">Attention-grabbing opening, engagement factor</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ml-2 ${getScoreColor(score.hook || 0)}`}>
                  {Math.round(score.hook || 0)}
                </div>
              </div>

              {/* Salience */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">Salience (15%)</div>
                  <div className="text-xs text-gray-500">Subject matter importance, relevance</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ml-2 ${getScoreColor(score.salience || 0)}`}>
                  {Math.round(score.salience || 0)}
                </div>
              </div>

              {/* Emotion */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">Emotion (15%)</div>
                  <div className="text-xs text-gray-500">Emotional impact, resonance</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ml-2 ${getScoreColor(score.emotion || 0)}`}>
                  {Math.round(score.emotion || 0)}
                </div>
              </div>

              {/* Suitability */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">Suitability (15%)</div>
                  <div className="text-xs text-gray-500">Platform appropriateness, target audience fit</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ml-2 ${getScoreColor(score.suitability || 0)}`}>
                  {Math.round(score.suitability || 0)}
                </div>
              </div>

              {/* Pacing */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">Pacing (10%)</div>
                  <div className="text-xs text-gray-500">Rhythm, timing, flow</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ml-2 ${getScoreColor(score.pacing || 0)}`}>
                  {Math.round(score.pacing || 0)}
                </div>
              </div>
            </div>

            {/* Reasoning */}
            {score.reasoning && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <div className="font-medium mb-1">Scoring Reasoning:</div>
                {score.reasoning}
              </div>
            )}
          </div>
        )}

        {clip.tlAnalysis && (
          <div className="border-t pt-3">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>Twelve Labs Analysis</span>
              {showAnalysis ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAnalysis && (
              <div className="mt-3 space-y-3 text-sm">
                {/* Summary Section - Most Important */}
                {clip.tlAnalysis.summary && (
                  <div>
                    <div className="font-medium text-gray-800 mb-1">Video Summary</div>
                    <div className="text-gray-600 p-2 bg-blue-50 rounded">
                      {clip.tlAnalysis.summary}
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div>
                  <div className="font-medium text-gray-800 mb-1">Video Info</div>
                  <div className="text-gray-600 space-y-1">
                    <div>Duration: {clip.tlAnalysis.duration}s</div>
                    <div>Resolution: {clip.tlAnalysis.resolution?.width}x{clip.tlAnalysis.resolution?.height}</div>
                    <div>File Size: {Math.round((clip.tlAnalysis.file_size || 0) / 1024 / 1024 * 100) / 100}MB</div>
                  </div>
                </div>

                {/* Semantics */}
                {clip.tlAnalysis.semantics && (
                  <div>
                    <div className="font-medium text-gray-800 mb-1">Content Analysis</div>
                    <div className="text-gray-600 space-y-1">
                      {clip.tlAnalysis.semantics.topics?.length > 0 && (
                        <div>Topics: {clip.tlAnalysis.semantics.topics.join(', ')}</div>
                      )}
                      {clip.tlAnalysis.semantics.emotions?.length > 0 && (
                        <div>Emotions: {clip.tlAnalysis.semantics.emotions.join(', ')}</div>
                      )}
                      {clip.tlAnalysis.semantics.sentiment && (
                        <div>Sentiment: {clip.tlAnalysis.semantics.sentiment}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio */}
                {clip.tlAnalysis.audio && (
                  <div>
                    <div className="font-medium text-gray-800 mb-1">Audio Analysis</div>
                    <div className="text-gray-600 space-y-1">
                      <div>Quality: {clip.tlAnalysis.audio.audio_quality}</div>
                      {clip.tlAnalysis.audio.sounds_detected?.length > 0 && (
                        <div>Sounds: {clip.tlAnalysis.audio.sounds_detected.join(', ')}</div>
                      )}
                      <div>Music: {clip.tlAnalysis.audio.music ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}

                {/* Visual */}
                {clip.tlAnalysis.visual && (
                  <div>
                    <div className="font-medium text-gray-800 mb-1">Visual Analysis</div>
                    <div className="text-gray-600 space-y-1">
                      <div>Quality: {clip.tlAnalysis.visual.overall_quality}</div>
                      <div>Motion: {clip.tlAnalysis.visual.motion}</div>
                      {clip.tlAnalysis.visual.people?.length > 0 && (
                        <div>People: {clip.tlAnalysis.visual.people.length} detected</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Context */}
                {clip.tlAnalysis.context && (
                  <div>
                    <div className="font-medium text-gray-800 mb-1">Context</div>
                    <div className="text-gray-600 space-y-1">
                      {clip.tlAnalysis.context.suitable_for?.length > 0 && (
                        <div>Suitable for: {clip.tlAnalysis.context.suitable_for.join(', ')}</div>
                      )}
                      {clip.tlAnalysis.context.platform_fit?.length > 0 && (
                        <div>Platforms: {clip.tlAnalysis.context.platform_fit.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Raw JSON Toggle */}
                <details className="border-t pt-2">
                  <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
                    Show Raw JSON
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(clip.tlAnalysis, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipCard;