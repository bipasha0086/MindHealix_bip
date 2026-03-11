import React, { useState, useEffect } from 'react';

const AIDailyPrompts = ({ mood, onPromptSelect }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    generatePersonalizedPrompts();
  }, [mood]);

  const generatePersonalizedPrompts = () => {
    const basePrompts = {
      Happy: [
        '🌟 What brought you joy today? Describe the moment in detail.',
        '✨ What are three things you\'re grateful for right now?',
        '🎯 How can you spread this positive energy to others?',
        '💭 What does happiness mean to you today?',
      ],
      Excited: [
        '🎉 What are you most excited about right now?',
        '⚡ Describe the energy you\'re feeling. Where does it come from?',
        '🚀 What goals or plans are fueling your excitement?',
        '🌈 How can you channel this excitement productively?',
      ],
      Neutral: [
        '⚖️ What would make today more meaningful for you?',
        '🧘 How does stillness feel right now? Is it peaceful or uncomfortable?',
        '📊 What emotions are you observing beneath the surface?',
        '🎨 If your mood were a color, what shade would it be?',
      ],
      Sad: [
        '💙 What triggered these feelings? It\'s okay to explore them.',
        '🫂 Who or what brings you comfort when you feel this way?',
        '📝 Write a letter to your past self. What would you tell them?',
        '🌱 What small step could help you feel 1% better right now?',
      ],
      Stressed: [
        '⚡ What\'s weighing most heavily on your mind right now?',
        '🎯 Which of your stressors can you actually control?',
        '🧘 What relaxation technique have you tried recently?',
        '📋 Break down your biggest stressor into smaller, manageable parts.',
      ],
      Anxious: [
        '🌊 What fears are surfacing for you? Name them one by one.',
        '🛡️ What coping strategies have helped you in the past?',
        '🌬️ Describe your breathing right now. Let\'s practice together.',
        '💪 What evidence do you have that you\'ve overcome anxiety before?',
      ],
    };

    const universalPrompts = [
      '🌅 Describe your ideal tomorrow. How will you feel when you wake up?',
      '🎭 If your emotions were a story, what chapter are you in?',
      '🌟 What does your inner voice need to hear right now?',
      '🔮 One year from now, what do you hope to remember about today?',
    ];

    const moodPrompts = basePrompts[mood] || universalPrompts;
    const allPrompts = [...moodPrompts, ...universalPrompts.slice(0, 2)];

    setPrompts(allPrompts);
  };

  const handlePromptClick = (prompt) => {
    setSelectedPrompt(prompt);
    if (onPromptSelect) {
      onPromptSelect(prompt);
    }
  };

  const handleCustomPrompt = () => {
    if (customPrompt.trim()) {
      setSelectedPrompt(customPrompt);
      if (onPromptSelect) {
        onPromptSelect(customPrompt);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-3xl">💭</span>
          <h3 className="text-2xl font-bold text-gray-900">AI Journal Prompts</h3>
        </div>
        <p className="text-sm text-gray-600">
          Personalized questions based on your current mood
        </p>
      </div>

      {/* Mood Badge */}
      {mood && (
        <div className="flex justify-center mb-6">
          <div className="px-4 py-2 bg-white rounded-full shadow-md border-2 border-indigo-200">
            <span className="text-sm font-medium text-gray-700">
              Prompts for: <span className="font-bold text-indigo-600">{mood}</span>
            </span>
          </div>
        </div>
      )}

      {/* AI Generated Prompts */}
      <div className="space-y-3 mb-6">
        {prompts.map((prompt, index) => {
          const isSelected = selectedPrompt === prompt;

          return (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className={`
                w-full text-left p-4 rounded-xl transition-all duration-300 transform
                ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105 shadow-xl'
                    : 'bg-white hover:bg-indigo-50 text-gray-800 hover:scale-102 shadow-md hover:shadow-lg'
                }
              `}
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {isSelected ? (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 text-sm">✓</span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm leading-relaxed flex-1">{prompt}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Prompt Input */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ✍️ Or create your own prompt:
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomPrompt()}
            placeholder="What would you like to explore?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleCustomPrompt}
            disabled={!customPrompt.trim()}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use
          </button>
        </div>
      </div>

      {/* Selected Prompt Display */}
      {selectedPrompt && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 animate-slideIn">
          <div className="flex items-start space-x-3">
            <span className="text-2xl flex-shrink-0">📌</span>
            <div>
              <div className="text-xs font-medium text-green-700 mb-1">
                Active Prompt:
              </div>
              <p className="text-sm text-gray-800 font-medium">{selectedPrompt}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
        <p className="text-xs text-gray-700">
          💡 <span className="font-medium">Pro tip:</span> Take 5-10 minutes to respond
          thoughtfully. Your honest reflections help AI provide better insights.
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AIDailyPrompts;
