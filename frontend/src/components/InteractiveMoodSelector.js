import React, { useState, useEffect } from 'react';

const MOOD_OPTIONS = [
  { name: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400',Animation: 'bounce' },
  { name: 'Excited', emoji: '🤩', color: 'from-pink-400 to-purple-400', animation: 'spin' },
  { name: 'Neutral', emoji: '😐', color: 'from-gray-400 to-slate-400', animation: 'pulse' },
  { name: 'Sad', emoji: '😢', color: 'from-blue-400 to-indigo-400', animation: 'sway' },
  { name: 'Stressed', emoji: '😰', color: 'from-red-400 to-orange-400', animation: 'shake' },
  { name: 'Anxious', emoji: '😟', color: 'from-purple-400 to-indigo-400', animation: 'tremble' },
];

const InteractiveMoodSelector = ({ onMoodSelect, selectedMood }) => {
  const [hoveredMood, setHoveredMood] = useState(null);
  const [particles, setParticles] = useState([]);

  const handleMoodClick = (mood) => {
    onMoodSelect(mood.name);
    generateParticles(mood);
  };

  const generateParticles = (mood) => {
    const newParticles = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: Date.now() + i,
        emoji: mood.emoji,
        x: 50 + Math.cos((i * Math.PI * 2) / 12) * 30,
        y: 50 + Math.sin((i * Math.PI * 2) / 12) * 30,
        delay: i * 0.05,
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  };

  return (
    <div className="relative">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">How are you feeling?</h2>
        <p className="text-gray-600">Select your current emotional state</p>
      </div>

      {/* Particles Effect */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-4xl pointer-events-none animate-particle-burst"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {particle.emoji}
        </div>
      ))}

      {/* Interactive Mood Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {MOOD_OPTIONS.map((mood, index) => {
          const isSelected = selectedMood === mood.name;
          const isHovered = hoveredMood === mood.name;

          return (
            <button
              key={mood.name}
              onClick={() => handleMoodClick(mood)}
              onMouseEnter={() => setHoveredMood(mood.name)}
              onMouseLeave={() => setHoveredMood(null)}
              className={`
                relative group p-6 rounded-2xl transition-all duration-300 transform
                ${
                  isSelected
                    ? `bg-gradient-to-br ${mood.color} scale-110 shadow-2xl ring-4 ring-white`
                    : 'bg-white hover:scale-105 shadow-lg hover:shadow-2xl'
                }
                ${isHovered && !isSelected ? 'scale-105' : ''}
              `}
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              {/* Emoji with Animation */}
              <div
                className={`
                  text-6xl mb-3 transition-transform duration-300
                  ${isSelected || isHovered ? 'scale-125' : 'scale-100'}
                  ${isSelected ? `animate-${mood.animation}` : ''}
                `}
              >
                {mood.emoji}
              </div>

              {/* Mood Name */}
              <div
                className={`
                  font-bold text-lg
                  ${isSelected ? 'text-white' : 'text-gray-900'}
                `}
              >
                {mood.name}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                </div>
              )}

              {/* Hover Glow Effect */}
              {isHovered && !isSelected && (
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mood.color} opacity-20 animate-pulse`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Mood Display */}
      {selectedMood && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-xl p-6 text-center animate-slideIn">
          <div className="flex items-center justify-center space-x-3">
            <span className="text-3xl">
              {MOOD_OPTIONS.find((m) => m.name === selectedMood)?.emoji}
            </span>
            <div>
              <div className="text-sm text-gray-600 mb-1">You selected:</div>
              <div className="text-2xl font-bold text-gray-900">{selectedMood}</div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        @keyframes sway {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-3px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(3px);
          }
        }
        @keyframes tremble {
          0%,
          100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(-2px, -2px);
          }
          50% {
            transform: translate(2px, 2px);
          }
          75% {
            transform: translate(-2px, 2px);
          }
        }
        @keyframes particleBurst {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        .animate-sway {
          animation: sway 2s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
        .animate-tremble {
          animation: tremble 0.3s ease-in-out infinite;
        }
        .animate-particle-burst {
          animation: particleBurst 1s ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default InteractiveMoodSelector;
