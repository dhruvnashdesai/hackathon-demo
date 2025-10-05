import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

const HTML5VideoPlayer = ({ clips, sequence, onTimeUpdate, currentTime, isPlaying, onPlayPause }) => {
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [loadedClips, setLoadedClips] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRefs = useRef({});
  const timelineRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  // Get sequenced clips with converted URLs
  const sequencedClips = useMemo(() => {
    if (!sequence?.sequence || !clips) return [];

    return sequence.sequence.map(clipId => {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return null;

      // Prefer MP4 URL if available, otherwise use thumbnail for fallback
      const videoUrl = clip.mp4Url || clip.streamingUrl;

      return {
        ...clip,
        videoUrl,
        duration: clip.metadata?.duration || 3
      };
    }).filter(Boolean);
  }, [sequence, clips]);

  // Calculate cumulative durations for timeline
  const clipTimeline = useMemo(() => {
    let cumulative = 0;
    return sequencedClips.map(clip => {
      const start = cumulative;
      const end = cumulative + clip.duration;
      cumulative = end;
      return { ...clip, startTime: start, endTime: end };
    });
  }, [sequencedClips]);

  const totalDuration = clipTimeline.length > 0 ? clipTimeline[clipTimeline.length - 1].endTime : 0;

  // Find current clip based on time
  const getCurrentClipInfo = useCallback((time) => {
    const clipInfo = clipTimeline.find(clip =>
      time >= clip.startTime && time < clip.endTime
    );

    if (!clipInfo) return null;

    const index = clipTimeline.indexOf(clipInfo);
    const localTime = time - clipInfo.startTime;

    return { clipInfo, index, localTime };
  }, [clipTimeline]);

  // Handle seamless clip transitions and continuous playback
  useEffect(() => {
    if (!isPlaying || sequencedClips.length === 0) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    // Start continuous playback timer
    playbackIntervalRef.current = setInterval(() => {
      const currentClipInfo = getCurrentClipInfo(currentTime);

      if (!currentClipInfo) {
        // End of sequence reached
        onPlayPause && onPlayPause(false);
        return;
      }

      const { clipInfo, index, localTime } = currentClipInfo;
      const videoElement = videoRefs.current[index];

      if (videoElement && loadedClips[index]) {
        // Update current clip index if changed
        if (index !== currentClipIndex) {
          setCurrentClipIndex(index);
          setIsTransitioning(true);
          setTimeout(() => setIsTransitioning(false), 100);
        }

        // Sync video time
        if (Math.abs(videoElement.currentTime - localTime) > 0.2) {
          videoElement.currentTime = localTime;
        }

        // Ensure video is playing
        if (videoElement.paused) {
          videoElement.play().catch(console.error);
        }

        // Set volume
        videoElement.volume = isMuted ? 0 : volume;
      }

      // Update global time
      const newTime = currentTime + 0.1;
      if (newTime <= totalDuration) {
        onTimeUpdate && onTimeUpdate(newTime);
      } else {
        // Sequence complete
        onPlayPause && onPlayPause(false);
      }
    }, 100);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentTime, getCurrentClipInfo, currentClipIndex, loadedClips, totalDuration, volume, isMuted, onTimeUpdate, onPlayPause, sequencedClips.length]);

  // Pause all videos when not playing
  useEffect(() => {
    if (!isPlaying) {
      Object.values(videoRefs.current).forEach(video => {
        if (video && !video.paused) {
          video.pause();
        }
      });
    }
  }, [isPlaying]);

  // Handle manual seek
  const handleSeek = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * totalDuration;

    onTimeUpdate && onTimeUpdate(Math.max(0, Math.min(newTime, totalDuration)));
  };

  // Skip to next/previous clip
  const skipToClip = (direction) => {
    const newIndex = currentClipIndex + direction;
    if (newIndex >= 0 && newIndex < clipTimeline.length) {
      const newTime = clipTimeline[newIndex].startTime;
      onTimeUpdate && onTimeUpdate(newTime);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (sequencedClips.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">No clips in sequence. Generate a sequence first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Container */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        {sequencedClips.map((clip, index) => (
          <video
            key={clip.id}
            ref={el => videoRefs.current[index] = el}
            src={clip.videoUrl}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${
              index === currentClipIndex && !isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            muted={isMuted}
            volume={volume}
            preload="metadata"
            onError={(e) => {
              console.error(`Video error for clip ${clip.filename}:`, e);
              setVideoError(`Failed to load: ${clip.filename}`);
            }}
            onLoadedData={() => {
              setLoadedClips(prev => ({ ...prev, [index]: true }));
            }}
          />
        ))}

        {/* Video Error Overlay */}
        {videoError && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-lg mb-2">Video Error</p>
              <p className="text-sm opacity-75">{videoError}</p>
              <button
                onClick={() => setVideoError(null)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {!loadedClips[currentClipIndex] && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading video...</p>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-60 rounded text-xs text-white">
          🎬 HTML5 Video Mode
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 space-y-4">
        <div
          ref={timelineRef}
          className="relative h-6 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          {/* Clip segments */}
          {clipTimeline.map((clip, index) => (
            <div
              key={clip.id}
              className={`absolute h-full rounded-sm ${
                index === currentClipIndex ? 'bg-blue-500' : 'bg-gray-400'
              }`}
              style={{
                left: `${(clip.startTime / totalDuration) * 100}%`,
                width: `${(clip.duration / totalDuration) * 100}%`
              }}
              title={clip.filename}
            />
          ))}

          {/* Progress indicator */}
          <div
            className="absolute h-full w-1 bg-red-500 rounded-full"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => skipToClip(-1)}
              disabled={currentClipIndex === 0}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={() => onPlayPause && onPlayPause(!isPlaying)}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              onClick={() => skipToClip(1)}
              disabled={currentClipIndex === sequencedClips.length - 1}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Current Clip Info */}
        <div className="text-sm text-gray-600 text-center">
          <span>
            Playing: {sequencedClips[currentClipIndex]?.filename || 'Unknown'}
            ({currentClipIndex + 1} of {sequencedClips.length})
          </span>
        </div>
      </div>
    </div>
  );
};

export default HTML5VideoPlayer;