import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Upload, Download, Zap, Star, Music, X, Check, Edit3, Volume2, Pause, ChevronLeft } from 'lucide-react';
import ClipModal from './ClipModal';
import RemotionVideoPlayer from './RemotionVideoPlayer';
import { fetchExistingClips, generateSequence, scoreClips, exportData, listSavedSessions, loadSession, importMissingClips, convertSequencedClips } from '../api/client';

const VideoEditor = ({ preloadedClips = [], sourceAsset = null, onBackToAssets }) => {
  const [clips, setClips] = useState(preloadedClips);
  const [sequence, setSequence] = useState(null);
  const [scores, setScores] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [conversionStatus, setConversionStatus] = useState(null);

  // Calculate total duration from sequence
  const duration = useMemo(() => {
    if (!sequence?.sequence || sequence.sequence.length === 0) return 16;

    return sequence.sequence.reduce((total, clipId) => {
      const clip = clips.find(c => c.id === clipId);
      return total + (clip?.metadata?.duration || 2);
    }, 0);
  }, [sequence, clips]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [savedSessions, setSavedSessions] = useState([]);
  const intervalRef = useRef(null);

  // Handle preloaded clips from Asset Library
  useEffect(() => {
    if (preloadedClips.length > 0) {
      setClips(preloadedClips);

      // Auto-score the preloaded clips since they're coming from TwelveLabs
      const autoScore = async () => {
        try {
          setLoading(true);
          setLoadingMessage('Scoring extracted clips for viral potential...');

          const clipScores = preloadedClips.map(clip => ({
            clipId: clip.id,
            score: clip.score || { ability: 75, badge: 'Strong Hook' } // Use TwelveLabs score or default
          }));

          setScores(clipScores);
        } catch (error) {
          console.error('Auto-scoring error:', error);
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      };

      autoScore();
    }
  }, [preloadedClips]);

  const handleLoadClips = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Loading clips from clips index...');

      const response = await fetch('http://localhost:3001/api/assets/demo-clips');
      if (!response.ok) throw new Error('Failed to load demo clips');

      const data = await response.json();
      setClips(data.clips || []);
    } catch (error) {
      console.error('Load clips error:', error);
      alert('Error loading clips: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleImportMissing = async () => {
    if (!sessionId) {
      alert('No active session found. Please load a session first.');
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage('Importing missing clips from index...');

      const result = await importMissingClips(sessionId);

      if (result.importedCount === 0) {
        alert(result.message || 'No missing clips found.');
      } else {
        // Merge the new clips with existing clips
        setClips(prevClips => [...prevClips, ...result.newClips]);
        alert(`Successfully imported ${result.importedCount} missing clips! Total clips: ${result.totalClips}`);
      }
    } catch (error) {
      console.error('Import missing clips error:', error);
      alert('Error importing missing clips: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleShowSessions = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Loading saved sessions...');

      const result = await listSavedSessions();
      setSavedSessions(result.sessions);
      setShowSessionModal(true);
    } catch (error) {
      console.error('Load sessions error:', error);
      alert('Error loading sessions: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleLoadSession = async (sessionIdToLoad) => {
    try {
      setLoading(true);
      setLoadingMessage('Loading session...');
      setShowSessionModal(false);

      const result = await loadSession(sessionIdToLoad);
      setSessionId(result.sessionId);

      // Mark excluded clips based on sequence data
      const updatedClips = result.clips.map(clip => {
        const excludedClip = result.sequence?.excluded_clips?.find(exc => exc.clipId === clip.id);
        if (excludedClip) {
          return { ...clip, excluded: true, exclusionReason: excludedClip.reason };
        }
        return { ...clip, excluded: false };
      });

      setClips(updatedClips);
      setSequence(result.sequence);
      setScores(result.scores || []);

      console.log('✅ Loaded session:', sessionIdToLoad);
      console.log('📊 Session data:', result);
    } catch (error) {
      console.error('Load session error:', error);
      alert('Error loading session: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleTimelineClick = async (event) => {
    const timelineElement = event.currentTarget;
    const rect = timelineElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickedTime = (clickX / timelineWidth) * duration;

    const newTime = Math.max(0, Math.min(duration, clickedTime));
    setCurrentTime(newTime);
    console.log(`Timeline clicked: seeking to ${newTime.toFixed(1)}s`);

    // Remotion player handles seeking internally through time state
    // Just update the time state and let Remotion handle the rest
  };

  const handleAutoSequence = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Generating sequence with Claude...');

      const clipsWithAnalysis = clips.filter(clip => clip.tlAnalysis).map(clip => ({
        id: clip.id,
        filename: clip.filename,
        tlAnalysis: clip.tlAnalysis
      }));

      const sequenceResult = await generateSequence(clipsWithAnalysis, sessionId);
      setSequence(sequenceResult);
      setEditedScript(sequenceResult?.voiceover_script?.full_script || '');

      // Mark excluded clips
      const updatedClips = clips.map(clip => {
        const excludedClip = sequenceResult.excluded_clips?.find(exc => exc.clipId === clip.id);
        if (excludedClip) {
          return { ...clip, excluded: true, exclusionReason: excludedClip.reason };
        }
        return { ...clip, excluded: false };
      });
      setClips(updatedClips);

      // Automatically trigger conversion after successful sequencing
      if (sequenceResult?.sequence && sequenceResult.sequence.length > 0) {
        setLoadingMessage('Converting sequenced clips to MP4...');
        setConversionStatus('converting');

        try {
          const conversionResult = await convertSequencedClips(sessionId, sequenceResult);
          console.log('✅ Conversion completed:', conversionResult);

          // Update clips with MP4 URLs
          const clipsWithMp4 = updatedClips.map(clip => {
            const convertedClip = conversionResult.updatedClips?.find(c => c.id === clip.id);
            if (convertedClip) {
              return {
                ...clip,
                mp4Url: convertedClip.mp4Url,
                conversionStatus: convertedClip.conversionStatus,
                conversionError: convertedClip.conversionError
              };
            }
            return clip;
          });

          setClips(clipsWithMp4);
          setConversionStatus(conversionResult.conversionResult?.allSuccessful ? 'completed' : 'partial');

          if (!conversionResult.conversionResult?.allSuccessful) {
            alert(`Conversion partially failed: ${conversionResult.conversionResult?.failureCount} clips failed to convert. Preview may have limited functionality.`);
          }
        } catch (conversionError) {
          console.error('❌ Conversion failed:', conversionError);
          setConversionStatus('failed');
          alert('Video conversion failed: ' + conversionError.message + '\nPreview will use thumbnail mode.');
        }
      }
    } catch (error) {
      console.error('Sequence generation error:', error);
      alert('Error generating sequence: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleScoreClips = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Scoring clips with Claude...');

      const clipsWithAnalysis = clips.filter(clip => clip.tlAnalysis).map(clip => ({
        id: clip.id,
        tlAnalysis: clip.tlAnalysis
      }));

      const scoreResult = await scoreClips(clipsWithAnalysis, sessionId);
      setScores(scoreResult.scores);
    } catch (error) {
      console.error('Scoring error:', error);
      alert('Error scoring clips: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleConvertVideos = async () => {
    if (!sequence?.sequence || sequence.sequence.length === 0) {
      alert('No sequence available. Please generate a sequence first.');
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage('Converting sequenced clips to MP4...');
      setConversionStatus('converting');

      const conversionResult = await convertSequencedClips(sessionId, sequence);
      console.log('✅ Manual conversion completed:', conversionResult);

      // Update clips with MP4 URLs
      const clipsWithMp4 = clips.map(clip => {
        const convertedClip = conversionResult.updatedClips?.find(c => c.id === clip.id);
        if (convertedClip) {
          return {
            ...clip,
            mp4Url: convertedClip.mp4Url,
            conversionStatus: convertedClip.conversionStatus,
            conversionError: convertedClip.conversionError
          };
        }
        return clip;
      });

      setClips(clipsWithMp4);
      setConversionStatus(conversionResult.conversionResult?.allSuccessful ? 'completed' : 'partial');

      if (conversionResult.conversionResult?.allSuccessful) {
        alert('✅ All videos converted successfully! You can now preview with real video playback.');
      } else {
        alert(`⚠️ Conversion partially failed: ${conversionResult.conversionResult?.failureCount} clips failed to convert.`);
      }
    } catch (error) {
      console.error('❌ Manual conversion failed:', error);
      setConversionStatus('failed');
      alert('Video conversion failed: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleExport = async () => {
    try {
      if (sessionId) {
        await exportData(sessionId);
      } else {
        alert('No session data to export');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data: ' + error.message);
    }
  };

  const getScoreForClip = (clipId) => {
    // Ensure scores is an array before calling find
    if (!Array.isArray(scores)) {
      console.warn('Scores is not an array:', typeof scores, scores);
      return null;
    }
    return scores.find(score => score.clipId === clipId);
  };

  const handleEditScript = () => {
    setIsEditingScript(true);
  };

  const splitScriptIntoSegments = (script, numClips) => {
    if (!script || numClips === 0) return [];

    // Split script into sentences
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length === 0) return [];

    // Distribute sentences evenly across clips
    const segments = [];
    const sentencesPerClip = Math.max(1, Math.floor(sentences.length / numClips));

    for (let i = 0; i < numClips; i++) {
      const startIdx = i * sentencesPerClip;
      let endIdx = (i === numClips - 1) ? sentences.length : (i + 1) * sentencesPerClip;

      const clipSentences = sentences.slice(startIdx, endIdx);
      const text = clipSentences.join('. ').trim();

      if (text) {
        segments.push({
          clipId: sequence.sequence[i],
          text: text + (text.endsWith('.') || text.endsWith('!') || text.endsWith('?') ? '' : '.'),
          timing: i === 0 ? 'start' : `${i * 2}s in`,
          tone: 'conversational'
        });
      }
    }

    return segments;
  };

  const handleSaveScript = () => {
    if (sequence?.voiceover_script && sequence?.sequence) {
      const newSegments = splitScriptIntoSegments(editedScript, sequence.sequence.length);

      const updatedSequence = {
        ...sequence,
        voiceover_script: {
          ...sequence.voiceover_script,
          full_script: editedScript,
          segments: newSegments,
          total_words: editedScript.split(/\s+/).length
        }
      };
      setSequence(updatedSequence);
    }
    setIsEditingScript(false);
  };

  const handleCancelEdit = () => {
    setEditedScript(sequence?.voiceover_script?.full_script || '');
    setIsEditingScript(false);
  };

  const handleGenerateAudio = async (audioType) => {
    try {
      setLoading(true);
      setShowAudioModal(false);

      switch (audioType) {
        case 'voiceover':
          setLoadingMessage('Generating voiceover with ElevenLabs...');
          break;
        case 'sound':
          setLoadingMessage('Generating background music...');
          break;
        case 'sfx':
          setLoadingMessage('Generating sound effects...');
          break;
        default:
          setLoadingMessage('Generating audio...');
          break;
      }

      // Mock audio generation for now
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newTrack = {
        id: Date.now(),
        type: audioType,
        name: `${audioType.charAt(0).toUpperCase() + audioType.slice(1)} Track`,
        duration: 16, // Mock duration
        url: null // Would contain actual audio URL
      };

      setAudioTracks(prev => [...prev, newTrack]);
    } catch (error) {
      console.error('Audio generation error:', error);
      alert('Error generating audio: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Simplified preview handlers for HTML5 video player
  const handlePreviewVideo = () => {
    handlePlayPause(!isPlaying);
  };

  const handlePlayPause = (shouldPlay) => {
    setIsPlaying(shouldPlay);
  };

  const handleTimeUpdate = (newTime) => {
    setCurrentTime(newTime);
  };


  // HTML5 video player handles all video playback now

  // Cleanup interval on unmount
  useEffect(() => {
    const interval = intervalRef.current;
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {onBackToAssets && (
            <button
              onClick={onBackToAssets}
              className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Assets</span>
            </button>
          )}
          <h1 className="text-lg font-semibold">
            Director Labs
          </h1>
          <span className="text-sm text-gray-400">
            Short-form Content Creation
          </span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/3 bg-gray-900 border-r border-gray-700 flex flex-col">
          {/* Voiceover Script Panel */}
          <div className="h-2/3 p-4 border-b border-gray-700 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Storyboard Script</h3>
              <div className="flex space-x-2">
                {sequence?.voiceover_script && !isEditingScript && (
                  <>
                    <button
                      onClick={handleEditScript}
                      className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setShowAudioModal(true)}
                      className="flex items-center space-x-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>Generate Audio</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            {sequence?.voiceover_script ? (
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-3 text-sm">
                  <div className="text-gray-400 mb-2">
                    {sequence.voiceover_script.total_words} words • ~{sequence.voiceover_script.estimated_speech_duration}s
                  </div>
                  {isEditingScript ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        className="w-full h-32 bg-gray-700 border border-gray-600 rounded p-2 text-gray-200 text-sm resize-none focus:outline-none focus:border-blue-500"
                        placeholder="Edit your voiceover script..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveScript}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-200 leading-relaxed">
                      {sequence.voiceover_script.full_script}
                    </div>
                  )}
                </div>
                {/* Script segments */}
                {!isEditingScript && sequence.voiceover_script.segments?.length > 0 && (
                  <div className="space-y-2">
                    {sequence.voiceover_script.segments.map((segment, index) => (
                      <div key={index} className="bg-gray-800 rounded p-2 text-xs">
                        <div className="text-blue-400 font-medium">Clip {index + 1}</div>
                        <div className="text-gray-300">"{segment.text}"</div>
                        <div className="text-gray-500">{segment.timing} • {segment.tone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No script generated yet</div>
            )}
          </div>

          {/* Identified Theme Panel */}
          <div className="h-1/3 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Identified Theme</h3>
            {sequence?.theme_analysis ? (
              <div className="bg-blue-900/30 rounded-lg p-3 text-sm">
                <div className="text-gray-200">{sequence.theme_analysis}</div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No theme identified yet</div>
            )}
          </div>
        </div>

        {/* Center Preview Area */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center p-4">
          {sequence?.sequence?.length > 0 ? (
            <div className="w-full max-w-4xl">
              <RemotionVideoPlayer
                clips={clips}
                sequence={sequence}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTimeUpdate={handleTimeUpdate}
                onPlayPause={handlePlayPause}
              />
            </div>
          ) : (
            <div className="text-gray-600 text-center">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Preview Area</p>
              <p className="text-sm">Generate a sequence to preview your video</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-850 border-l border-gray-700 flex flex-col h-full">
          {/* Import Section */}
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            {clips.length === 0 ? (
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                <p className="text-sm text-gray-400 mb-4">
                  Add your rough video files collection to compose your project.
                </p>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleLoadClips}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors mx-auto"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import Clips</span>
                  </button>
                  <button
                    onClick={handleShowSessions}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors mx-auto"
                  >
                    <Download className="h-4 w-4" />
                    <span>Load Session</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Clip Library</h3>
                  <span className="text-xs text-gray-500">{clips.length} clips</span>
                </div>
                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={handleLoadClips}
                    disabled={loading}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Reload Clips
                  </button>
                  {sessionId && (
                    <button
                      onClick={handleImportMissing}
                      disabled={loading}
                      className="text-sm text-green-400 hover:text-green-300"
                    >
                      Import More Clips
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clip Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedClip(clip)}
                >
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    {clip.thumbnail ? (
                      <img
                        src={clip.thumbnail}
                        alt={clip.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    {/* Score Badge - Bottom Right */}
                    {(() => {
                      const score = getScoreForClip(clip.id);
                      return score && (
                        <div className="absolute bottom-2 right-2">
                          <div className="px-2 py-1 rounded-full text-sm font-bold shadow-lg bg-black bg-opacity-70 text-white border border-white">
                            {Math.round(score.ability)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Status indicators */}
                    {clip.excluded && (
                      <div className="absolute top-1 right-1 bg-red-600 rounded-full p-1">
                        <X className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {sequence?.sequence?.includes(clip.id) && !clip.excluded && (
                      <div className="absolute top-1 right-1 bg-green-600 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400 truncate">
                    {clip.filename}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-700 space-y-3 flex-shrink-0">
            <button
              onClick={handleAutoSequence}
              disabled={loading || clips.length === 0}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>Auto Sequence</span>
            </button>

            {/* Convert Videos Button - only show if sequence exists but not all clips converted */}
            {sequence?.sequence && sequence.sequence.length > 0 && (
              <button
                onClick={handleConvertVideos}
                disabled={loading || conversionStatus === 'converting' || conversionStatus === 'completed'}
                className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition-colors"
                title={conversionStatus === 'completed' ? 'Videos already converted' : 'Convert sequenced videos to MP4 for preview'}
              >
                <Download className="h-4 w-4" />
                <span>
                  {conversionStatus === 'converting' ? 'Converting...' :
                   conversionStatus === 'completed' ? 'Converted ✓' :
                   'Convert Videos'}
                </span>
              </button>
            )}

            <button
              onClick={handleScoreClips}
              disabled={loading || clips.length === 0}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition-colors"
            >
              <Star className="h-4 w-4" />
              <span>Score Clips</span>
            </button>
          </div>
        </div>
      </div>

      {/* Professional Timeline */}
      <div className="h-48 bg-gray-800 border-t border-gray-700">
        {/* Timeline Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-sm font-semibold text-gray-300">Timeline</h3>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-400">
              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviewVideo}
                disabled={!sequence?.sequence || sequence.sequence.length === 0 || conversionStatus === 'converting'}
                className="p-1 rounded hover:bg-gray-700 disabled:opacity-50"
                title={conversionStatus === 'converting' ? 'Converting videos to MP4...' : 'Play video sequence'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4">
          {/* Time Ruler */}
          <div
            className="relative h-6 bg-gray-800 cursor-pointer hover:bg-gray-700"
            onClick={handleTimelineClick}
          >
            {/* Millisecond lines (every 100ms) */}
            <div className="absolute inset-0">
              {Array.from({ length: Math.ceil(duration * 10) + 1 }, (_, i) => {
                const timeMs = i * 100;
                const isSecond = timeMs % 1000 === 0;
                return (
                  <div
                    key={i}
                    className={`absolute ${
                      isSecond ? 'border-l border-gray-400 h-full' : 'border-l border-gray-600 h-1.5 bottom-0'
                    }`}
                    style={{ left: `${(timeMs / 1000 / duration) * 100}%` }}
                  />
                );
              })}
            </div>

            {/* Second markers above */}
            <div className="absolute -top-1 inset-x-0">
              {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{ left: `${(i / duration) * 100}%` }}
                >
                  <div className="absolute -left-2 text-xs text-gray-300 font-medium">
                    {i}s
                  </div>
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rotate-45"></div>
            </div>
          </div>

          {/* Track Container */}
          <div className="bg-gray-800">
            {/* Video Track - Direct content without sidebar */}
            <div className="border-b border-gray-700">
              <div className="relative h-16 p-2">
                {sequence?.sequence?.length > 0 ? (
                  (() => {
                    let cumulativeTime = 0;
                    return sequence.sequence.map((clipId, index) => {
                      const clip = clips.find(c => c.id === clipId);
                      const clipDuration = clip?.metadata?.duration || 2; // fallback duration
                      const startTime = cumulativeTime;
                      const width = (clipDuration / duration) * 100;

                      cumulativeTime += clipDuration;

                      return (
                        <div
                          key={clipId}
                          className="absolute h-12 bg-blue-600 rounded border border-blue-400 overflow-hidden cursor-pointer hover:bg-blue-500 transition-colors"
                          style={{
                            left: `${(startTime / duration) * 100}%`,
                            width: `${width}%`,
                            minWidth: '40px'
                          }}
                          title={clip?.filename || `Clip ${index + 1}`}
                        >
                          {clip?.thumbnail ? (
                            <img
                              src={clip.thumbnail}
                              alt={clip.filename}
                              className="w-full h-full object-cover opacity-80"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 truncate">
                            {clip?.filename?.split('.')[0] || `Clip ${index + 1}`}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="h-12 flex items-center justify-center text-gray-500 text-xs">
                    No clips sequenced
                  </div>
                )}
              </div>
            </div>

            {/* Audio Tracks */}
            {audioTracks.map((track) => (
              <div key={track.id} className="border-b border-gray-700 last:border-b-0 flex">
                {/* Track Label */}
                <div className="w-20 flex items-center justify-center bg-gray-800 border-r border-gray-700">
                  {track.type === 'voiceover' ? (
                    <Volume2 className="h-4 w-4 text-green-400" />
                  ) : track.type === 'sound' ? (
                    <Music className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Zap className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                {/* Track Content */}
                <div className="flex-1 relative h-12 p-2">
                  <div
                    className={`absolute h-8 rounded border overflow-hidden ${
                      track.type === 'voiceover' ? 'bg-green-600 border-green-400' :
                      track.type === 'sound' ? 'bg-purple-600 border-purple-400' :
                      'bg-yellow-600 border-yellow-400'
                    }`}
                    style={{
                      left: '0%',
                      width: `${(track.duration / duration) * 100}%`,
                      minWidth: '40px'
                    }}
                  >
                    <div className="h-full flex items-center px-2">
                      <div className="text-white text-xs font-medium truncate">
                        {track.name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {audioTracks.length === 0 && sequence?.sequence?.length > 0 && (
              <div className="flex">
                <div className="w-20 bg-gray-800 border-r border-gray-700"></div>
                <div className="flex-1 h-8 flex items-center justify-center text-gray-500 text-xs">
                  No audio tracks generated
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Processing</h3>
              <p className="text-gray-400">{loadingMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Audio Generation Modal */}
      {showAudioModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAudioModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Generate Audio</h2>
              <button
                onClick={() => setShowAudioModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-gray-400 text-sm mb-6">
                Select the type of audio you want to generate for your video sequence.
              </p>

              <div className="space-y-4">
                {/* VO Option */}
                <button
                  onClick={() => {
                    // Handle VO generation
                    handleGenerateAudio('voiceover');
                  }}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                >
                  <div className="bg-blue-600 p-3 rounded-lg">
                    <Volume2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Voiceover (VO)</div>
                    <div className="text-sm text-gray-400">Generate speech from your script</div>
                  </div>
                </button>

                {/* Sound Option */}
                <button
                  onClick={() => {
                    // Handle Sound generation
                    handleGenerateAudio('sound');
                  }}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                >
                  <div className="bg-green-600 p-3 rounded-lg">
                    <Music className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Background Music</div>
                    <div className="text-sm text-gray-400">Add ambient music to your video</div>
                  </div>
                </button>

                {/* SFX Option */}
                <button
                  onClick={() => {
                    // Handle SFX generation
                    handleGenerateAudio('sfx');
                  }}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                >
                  <div className="bg-purple-600 p-3 rounded-lg">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Sound Effects (SFX)</div>
                    <div className="text-sm text-gray-400">Generate contextual sound effects</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Selection Modal */}
      {showSessionModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSessionModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Load Saved Session</h2>
              <button
                onClick={() => setShowSessionModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {savedSessions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No saved sessions found. Create a sequence first to see it here.
                </p>
              ) : (
                <div className="space-y-3">
                  {savedSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className="border border-gray-600 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handleLoadSession(session.sessionId)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">
                            {session.sequenceTitle}
                          </h3>
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>📅 Created: {new Date(session.createdAt).toLocaleString()}</div>
                            <div>🎬 {session.clipCount} clips</div>
                            {session.hasSequence && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                                <span className="text-yellow-400">Has sequence</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-4">
                          {session.sessionId.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clip Modal */}
      <ClipModal
        clip={selectedClip}
        score={selectedClip ? getScoreForClip(selectedClip.id) : null}
        onClose={() => setSelectedClip(null)}
      />
    </div>
  );
};

export default VideoEditor;