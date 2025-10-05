import React from 'react';
import { Download, Music, Volume2, Clock, Star, Video, Mic } from 'lucide-react';

const ExportPanel = ({ clips, scores, sequence, soundtrack, onExport, sessionId }) => {
  const statistics = {
    totalClips: clips.length,
    averageAbility: scores?.length
      ? Math.round(scores.reduce((sum, score) => sum + (score.ability || 0), 0) / scores.length)
      : 0,
    estimatedDuration: sequence?.estimated_total_duration || 0,
    soundtrackMode: soundtrack ? 'Generated' : 'None'
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Sequence Complete!
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Video className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.totalClips}</div>
            <div className="text-sm text-gray-600">Total Clips</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.averageAbility}</div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(statistics.estimatedDuration)}
            </div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Music className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.soundtrackMode}</div>
            <div className="text-sm text-gray-600">Soundtrack</div>
          </div>
        </div>

        {soundtrack && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Generated Audio Tracks</h3>

            <div className="space-y-6">
              {/* Voiceover Section */}
              {soundtrack.voiceover && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Mic className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-lg">Voiceover Narration</span>
                    {soundtrack.voiceover.duration && (
                      <span className="ml-auto text-sm text-gray-500">
                        ~{soundtrack.voiceover.duration}s
                      </span>
                    )}
                  </div>
                  {soundtrack.voiceover.path && (
                    <audio controls className="w-full mb-3">
                      <source src={soundtrack.voiceover.path} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  {soundtrack.voiceover.segments && (
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">Script breakdown:</div>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
                        {soundtrack.voiceover.segments.map((segment, index) => (
                          <div key={index} className="mb-1">
                            <span className="font-medium">Clip {index + 1}:</span> "{segment.text}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Background Music Section */}
              {soundtrack.music && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Music className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-lg">Background Music</span>
                  </div>
                  <audio controls className="w-full">
                    <source src={soundtrack.music} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Sound Effects Section */}
              {soundtrack.sfx && soundtrack.sfx.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Volume2 className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-lg">Transition Effects ({soundtrack.sfx.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {soundtrack.sfx.slice(0, 4).map((sfx, index) => (
                      <div key={index} className="border rounded p-3 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {sfx.type.charAt(0).toUpperCase() + sfx.type.slice(1)} Transition
                        </div>
                        {sfx.path && (
                          <audio controls className="w-full">
                            <source src={sfx.path} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        )}
                        {sfx.error && (
                          <div className="text-xs text-red-600 mt-1">Error: {sfx.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {soundtrack.sfx.length > 4 && (
                    <div className="text-sm text-gray-500 mt-2 text-center">
                      ... and {soundtrack.sfx.length - 4} more effects
                    </div>
                  )}
                </div>
              )}

              {/* Error Messages */}
              {(soundtrack.voiceoverError || soundtrack.musicError || soundtrack.sfxError) && (
                <div className="border-l-4 border-red-400 bg-red-50 p-4">
                  <div className="text-sm font-medium text-red-800 mb-1">Audio Generation Errors:</div>
                  <div className="text-sm text-red-700 space-y-1">
                    {soundtrack.voiceoverError && <div>• Voiceover: {soundtrack.voiceoverError}</div>}
                    {soundtrack.musicError && <div>• Music: {soundtrack.musicError}</div>}
                    {soundtrack.sfxError && <div>• SFX: {soundtrack.sfxError}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {sequence && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Sequence Structure</h3>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-gray-700">{sequence.narrative_structure}</p>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => onExport(sessionId)}
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;