import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Volume2, RotateCw } from 'lucide-react';

const RelaxationSounds = ({ stressLevel }) => {
  const youtubeRef = useRef(null);
  const playerRef = useRef(null);
  const [selectedSound, setSelectedSound] = useState(null);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(70);

  // Nature-focused soothing sound library powered by YouTube
  const ALL_SOUNDS = [
    {
      id: 'birdschirping',
      label: 'Birds Chirping',
      icon: '🐦',
      youtubeId: 'OdIJ2x3nxzQ',
      category: 'relaxation'
    },
    {
      id: 'foreststream',
      label: 'Forest Stream',
      icon: '🌿',
      youtubeId: '5yx6BWlEVcY',
      category: 'focus'
    },
    {
      id: 'oceanwaves',
      label: 'Ocean Waves',
      icon: '🌊',
      youtubeId: 'V1bFr2SWP1I',
      category: 'sleep'
    },
    {
      id: 'rainthunder',
      label: 'Rain & Thunder',
      icon: '🌧️',
      youtubeId: 'mPZkdNFkNps',
      category: 'sleep'
    },
    {
      id: 'windchimes',
      label: 'Wind Chimes',
      icon: '🎐',
      youtubeId: '0WqL9W-2aNA',
      category: 'relaxation'
    },
    {
      id: 'meditationbowl',
      label: 'Meditation Bowl',
      icon: '🧘',
      youtubeId: 'K-qn0JFfKxA',
      category: 'sleep'
    },
  ];

  const stressLevelValue = String(stressLevel || '').toLowerCase();

  // AI Suggestion based on stress level
  const aiSuggestion = useMemo(() => {
    if (stressLevelValue === 'high') {
      return {
        text: 'High stress detected. Start with Birds Chirping or Wind Chimes for instant calm.',
        category: 'relaxation'
      };
    }
    if (stressLevelValue === 'medium') {
      return {
        text: 'Moderate stress. Forest Stream can help you focus and settle your mind.',
        category: 'focus'
      };
    }
    return {
      text: 'Choose any sound to relax and restore your inner peace.',
      category: null
    };
  }, [stressLevelValue]);

  // Initialize YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
      return;
    }

    const existingReadyHandler = window.onYouTubeIframeAPIReady;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      if (typeof existingReadyHandler === 'function') {
        existingReadyHandler();
      }
      setYtApiReady(true);
    };
  }, []);

  // Initialize player when sound is selected
  useEffect(() => {
    if (!selectedSound || !youtubeRef.current || !ytApiReady || !window.YT?.Player) return;

    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(youtubeRef.current, {
      height: '0',
      width: '0',
      videoId: selectedSound.youtubeId,
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
      },
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [selectedSound, ytApiReady]);

  // Set volume
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const onPlayerReady = (event) => {
    event.target.setVolume(volume);
    event.target.playVideo();
  };

  const onPlayerStateChange = (event) => {
    const YT = window.YT;
    if (event.data === YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (event.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (event.data === YT.PlayerState.ENDED) {
      if (isLooping) {
        event.target.playVideo();
      } else {
        setIsPlaying(false);
      }
    }
  };

  const playSound = (sound) => {
    if (selectedSound?.id === sound.id && playerRef.current) {
      playerRef.current.playVideo();
      return;
    }
    setSelectedSound(sound);
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  };

  return (
    <div className="rounded-3xl p-4 shadow-lg bg-gradient-to-br from-emerald-50 via-sky-50 to-purple-50 border border-emerald-200">
      <div ref={youtubeRef} style={{ display: 'none' }} />

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800">🎵 Relax & Focus</h2>
        <p className="text-gray-600 text-xs">Nature soothing sounds: birds, rain, waves and more</p>
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="mb-3 p-2 bg-white rounded-lg border-l-4 border-emerald-500 shadow-sm">
          <p className="text-xs font-semibold text-gray-800">💡 {aiSuggestion.text}</p>
        </div>
      )}

      {/* Sound Categories */}
      <div className="mb-3">
        <div className="grid grid-cols-2 gap-2">
          {ALL_SOUNDS.map(sound => (
            <button
              key={sound.id}
              onClick={() => playSound(sound)}
              className={`
                p-2 rounded-lg font-semibold text-xs transition-all duration-200
                flex flex-col items-center justify-center gap-1 min-h-16
                ${selectedSound?.id === sound.id
                  ? 'bg-gradient-to-br from-emerald-100 to-cyan-100 border-2 border-emerald-400 shadow-md scale-105'
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <span className="text-xl">{sound.icon}</span>
              <span className="text-[10px] text-gray-700 text-center leading-tight">{sound.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Now Playing */}
      {selectedSound && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
          <p className="text-[10px] font-bold text-emerald-700 mb-1">NOW PLAYING</p>
          <p className="text-sm font-bold text-gray-800">
            {selectedSound.icon} {selectedSound.label}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-2 my-3">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50 transition"
              title="Play"
            >
              <Play className="w-4 h-4" />
            </button>

            <button
              onClick={handlePause}
              disabled={!isPlaying}
              className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition"
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded transition ${
                isLooping
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
              title="Loop"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-blue-500"
              title="Volume"
            />
            <span className="text-[10px] text-gray-600 w-7">{volume}%</span>
          </div>

          {/* Status */}
          <div className="mt-2 text-center">
            <p className="text-[10px] font-semibold text-gray-600">
              {isPlaying ? '▶️ Playing' : '⏸️ Paused'} {isLooping && ' • 🔄 Loop ON'}
            </p>
          </div>
        </div>
      )}

      {!selectedSound && (
        <div className="p-3 text-center bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Select a sound above to start</p>
        </div>
      )}
    </div>
  );
};

export default RelaxationSounds;
