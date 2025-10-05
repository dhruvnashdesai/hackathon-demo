import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';

// Remotion Composition Component
const VideoSequenceComposition = ({ clips, sequence }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Get sequenced clips with their timing (memoized for performance)
  const sequencedClips = useMemo(() => {
    if (!sequence?.sequence || !clips) return [];

    let cumulative = 0;
    return sequence.sequence.map(clipId => {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return null;

      const videoUrl = clip.mp4Url || clip.streamingUrl;
      const duration = clip.metadata?.duration || 3;
      const startTime = cumulative;
      const endTime = cumulative + duration;
      cumulative = endTime;

      return {
        ...clip,
        videoUrl,
        duration,
        startTime,
        endTime,
        startFrame: Math.round(startTime * fps),
        endFrame: Math.round(endTime * fps)
      };
    }).filter(Boolean);
  }, [sequence, clips, fps]);

  // Find current and upcoming clips for premounting
  const currentClip = useMemo(() => {
    return sequencedClips.find(clip =>
      frame >= clip.startFrame && frame < clip.endFrame
    );
  }, [sequencedClips, frame]);

  // Premount next clip for smooth transitions (load 30 frames early)
  const premountBuffer = 30;
  const nextClip = useMemo(() => {
    return sequencedClips.find(clip =>
      frame >= (clip.startFrame - premountBuffer) && frame < clip.startFrame
    );
  }, [sequencedClips, frame, premountBuffer]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Premount next clip (invisible) for smooth loading */}
      {nextClip && (
        <OffthreadVideo
          src={nextClip.videoUrl}
          startFrom={0}
          pauseWhenBuffering={true}
          style={{
            opacity: 0,
            position: 'absolute',
            width: '100%',
            height: '100%'
          }}
        />
      )}

      {/* Current visible clip */}
      {currentClip && (
        <OffthreadVideo
          src={currentClip.videoUrl}
          startFrom={Math.max(0, frame - currentClip.startFrame)}
          pauseWhenBuffering={true}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      )}

      {/* Status overlay */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      >
        🎬 Remotion Player • {currentClip?.filename || 'No clip'}
      </div>
    </AbsoluteFill>
  );
};

// Main Player Component
const RemotionVideoPlayer = ({ clips, sequence, currentTime, isPlaying, onTimeUpdate, onPlayPause }) => {
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [playerRef, setPlayerRef] = useState(null);
  // Calculate total duration and frame count
  const { totalDuration, totalFrames } = useMemo(() => {
    if (!sequence?.sequence || !clips) return { totalDuration: 0, totalFrames: 0 };

    const duration = sequence.sequence.reduce((total, clipId) => {
      const clip = clips.find(c => c.id === clipId);
      return total + (clip?.metadata?.duration || 3);
    }, 0);

    return {
      totalDuration: duration,
      totalFrames: Math.round(duration * 30) // 30 FPS
    };
  }, [sequence, clips]);

  const handlePlayerTimeUpdate = (frame) => {
    const timeInSeconds = frame / 30; // 30 FPS
    onTimeUpdate && onTimeUpdate(timeInSeconds);
  };

  // Monitor buffer state and loading progress
  const checkBufferState = useCallback(async () => {
    if (!playerRef || !sequence?.sequence?.length) return;

    try {
      // Check if all videos are loaded by attempting to play them
      const videoElements = playerRef.querySelectorAll('video');
      const totalVideos = sequence.sequence.length;
      let loadedVideos = 0;

      videoElements.forEach(video => {
        if (video.readyState >= 3) { // HAVE_FUTURE_DATA or better
          loadedVideos++;
        }
      });

      const progress = totalVideos > 0 ? (loadedVideos / totalVideos) * 100 : 0;
      setLoadingProgress(progress);

      if (loadedVideos === totalVideos && totalVideos > 0) {
        setIsFullyLoaded(true);
      }
    } catch (error) {
      console.warn('Buffer state check error:', error);
    }
  }, [playerRef, sequence]);

  // Check buffer state periodically
  useEffect(() => {
    if (!isFullyLoaded) {
      const interval = setInterval(checkBufferState, 500);
      return () => clearInterval(interval);
    }
  }, [checkBufferState, isFullyLoaded]);

  // Reset loading state when sequence changes
  useEffect(() => {
    setIsFullyLoaded(false);
    setLoadingProgress(0);
  }, [sequence]);

  // Custom play/pause handler that respects loading state
  const handlePlayPause = (shouldPlay) => {
    if (shouldPlay && !isFullyLoaded) {
      // Don't allow play until fully loaded
      return;
    }
    onPlayPause && onPlayPause(shouldPlay);
  };

  if (!sequence?.sequence?.length) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">No clips in sequence. Generate a sequence first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="relative">
        <Player
          ref={(ref) => {
            if (ref && ref.getContainerNode) {
              setPlayerRef(ref.getContainerNode());
            }
          }}
          component={VideoSequenceComposition}
          inputProps={{
            clips,
            sequence
          }}
          durationInFrames={totalFrames}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{
            width: '100%',
            aspectRatio: '16/9'
          }}
          controls={isFullyLoaded}
          playing={isPlaying && isFullyLoaded}
          playbackRate={1}
          onPlay={() => handlePlayPause(true)}
          onPause={() => handlePlayPause(false)}
          onTimeUpdate={({ frame }) => handlePlayerTimeUpdate(frame)}
          logLevel="trace"
          bufferStateDelayInMilliseconds={100}
          showPosterWhenBuffering={true}
        />

        {/* Loading Overlay */}
        {!isFullyLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Loading Video Sequence</h3>
              <p className="text-sm opacity-75 mb-4">
                Buffering all clips for smooth playback...
              </p>
              <div className="w-64 bg-gray-700 rounded-full h-2 mx-auto">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs mt-2 opacity-60">
                {Math.round(loadingProgress)}% loaded
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="p-4 bg-gray-50 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>
            Duration: {Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}
          </span>
          <span>
            Clips: {sequence.sequence.length}
          </span>
          <span>
            Current: {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RemotionVideoPlayer;