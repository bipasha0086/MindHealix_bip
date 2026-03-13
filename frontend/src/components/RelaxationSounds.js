import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Square, Volume2, RotateCw } from 'lucide-react';

const RelaxationSounds = ({ stressLevel }) => {
  const audioRef = useRef(null);
  const [selectedSound, setSelectedSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState('');

  // Sound Categories - Flattened for 2x2 grid
  const ALL_SOUNDS = [
    { id: 'piano', label: 'Soft Piano', icon: '🎹', src: '/sounds/piano.wav', category: 'focus' },
    { id: 'windchimes', label: 'Wind Chimes', icon: '🎐', src: '/sounds/windchimes.wav', category: 'relaxation' },
    { id: 'crickets', label: 'Night Crickets', icon: '🌙', src: '/sounds/crickets.wav', category: 'sleep' },
    { id: 'bowl', label: 'Meditation Bowl', icon: '🧘', src: '/sounds/bowl.wav', category: 'sleep' },
  ];

  const stressLevelValue = String(stressLevel || '').toLowerCase();

  // AI Suggestion based on stress level
  const aiSuggestion = useMemo(() => {
    if (stressLevelValue === 'high') {
      return {
        text: 'High stress detected. Try Forest Birds or Wind Chimes for instant calm.',
        category: 'relaxation'
      };
    }
    if (stressLevelValue === 'medium') {
      return {
        text: 'Moderate stress. Focus Sounds like Rain can help you concentrate.',
        category: 'focus'
      };
    }
    return {
      text: 'Choose any sound to relax and restore your inner peace.',
      category: null
    };
  }, [stressLevelValue]);

  // Setup audio listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setAudioError('');
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      setAudioError('Could not load audio. Please check sound files in /public/sounds/');
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isLooping]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const playSound = (sound) => {
    if (audioRef.current) {
      audioRef.current.src = sound.src;
      audioRef.current.play().catch(err => {
        setAudioError('Unable to play audio. File may not exist.');
        console.error('Audio play error:', err);
      });
      setSelectedSound(sound);
      setIsPlaying(true);
    }
  };

  const handlePlay = () => {
    if (selectedSound) {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="rounded-3xl p-4 shadow-lg bg-gradient-to-br from-emerald-50 via-sky-50 to-purple-50 border border-emerald-200">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800">🎵 Relax & Focus</h2>
        <p className="text-gray-600 text-xs">Choose your sound</p>
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

          {/* Audio Error */}
          {audioError && (
            <div className="my-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-[10px] text-red-700">{audioError}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="my-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mb-2">
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
              onClick={handleStop}
              className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
              title="Stop"
            >
              <Square className="w-4 h-4" />
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
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-blue-500"
              title="Volume"
            />
            <span className="text-[10px] text-gray-600 w-7">{Math.round(volume * 100)}%</span>
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
          <p className="text-xs text-gray-500">Select a sound above</p>
        </div>
      )}
    </div>
  );
};

export default RelaxationSounds;
