import React, { useState, useEffect } from 'react';
import { moodAPI } from '../services/api';

const RealTimeSentiment = ({ text, onAnalysisComplete }) => {
  const [sentiment, setSentiment] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotionParticles, setEmotionParticles] = useState([]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (text && text.length > 10) {
        analyzeSentiment(text);
      } else {
        setSentiment(null);
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [text]);

  const analyzeSentiment = async (textToAnalyze) => {
    setIsAnalyzing(true);
    try {
      const response = await moodAPI.analyzeText({ text: textToAnalyze });
      setSentiment(response.data);
      if (onAnalysisComplete) {
        onAnalysisComplete(response.data);
      }

      // Generate emotion particles
      generateParticles(response.data.emotional_state);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateParticles = (emotionalState) => {
    const particles = [];
    const particleCount = 5;
    const emoji = getEmotionEmoji(emotionalState);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: Date.now() + i,
        emoji,
        x: Math.random() * 100,
        delay: i * 0.2,
      });
    }
    setEmotionParticles(particles);

    setTimeout(() => setEmotionParticles([]), 2000);
  };

  const getEmotionEmoji = (state) => {
    const emojiMap = {
      'Very Positive': '🌟',
      Positive: '😊',
      Neutral: '😐',
      Negative: '😔',
      'Very Negative': '💔',
    };
    return emojiMap[state] || '✨';
  };

  const getSentimentColor = (compound) => {
    if (compound >= 0.5) return 'from-green-400 to-emerald-500';
    if (compound >= 0.1) return 'from-blue-400 to-cyan-500';
    if (compound >= -0.1) return 'from-gray-400 to-slate-500';
    if (compound >= -0.5) return 'from-orange-400 to-amber-500';
    return 'from-red-400 to-rose-500';
  };

  const getSentimentWidth = (value) => {
    return `${Math.abs(value) * 100}%`;
  };

  if (!text || text.length < 10) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
        ✍️ Start writing to see real-time AI sentiment analysis...
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: '0.4s' }}
          ></div>
          <span className="text-purple-700 text-sm font-medium ml-2">
            AI is analyzing your emotions...
          </span>
        </div>
      </div>
    );
  }

  if (!sentiment) return null;

  return (
    <div className="relative overflow-hidden">
      {/* Emotion Particles */}
      {emotionParticles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-2xl animate-float"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            top: '-20px',
          }}
        >
          {particle.emoji}
        </div>
      ))}

      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧠</span>
            <h3 className="font-bold text-gray-900">AI Sentiment Analysis</h3>
          </div>
          <div className="px-3 py-1 bg-white rounded-full shadow-sm">
            <span className="text-xs font-medium text-purple-700">Live</span>
          </div>
        </div>

        {/* Emotion State */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Emotional State</span>
            <span className="text-lg font-bold text-gray-900">{sentiment.emotional_state}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getSentimentColor(
                sentiment.sentiment.compound
              )} transition-all duration-1000 ease-out`}
              style={{ width: getSentimentWidth(sentiment.sentiment.compound) }}
            ></div>
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl mb-1">😊</div>
            <div className="text-xs text-gray-600 mb-1">Positive</div>
            <div className="text-sm font-bold text-green-600">
              {(sentiment.sentiment.positive * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl mb-1">😐</div>
            <div className="text-xs text-gray-600 mb-1">Neutral</div>
            <div className="text-sm font-bold text-gray-600">
              {(sentiment.sentiment.neutral * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl mb-1">😔</div>
            <div className="text-xs text-gray-600 mb-1">Negative</div>
            <div className="text-sm font-bold text-red-600">
              {(sentiment.sentiment.negative * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Compound Score */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 mb-1">Overall Sentiment Score</div>
              <div className="text-2xl font-bold text-gray-900">
                {sentiment.sentiment.compound.toFixed(3)}
              </div>
            </div>
            <div className="text-4xl">{getEmotionEmoji(sentiment.emotional_state)}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Range: -1 (very negative) to +1 (very positive)
          </div>
        </div>

        {/* Text Analysis */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-600 bg-white rounded-lg p-3 shadow-sm">
          <span>📝 {sentiment.analysis.word_count} words analyzed</span>
          <span>📊 {sentiment.analysis.text_length} characters</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1.5);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default RealTimeSentiment;
