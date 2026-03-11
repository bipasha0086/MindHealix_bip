import React, { useState, useEffect } from 'react';

const AIWellnessScore = ({ moodData, stressLevel, sleepHours, journalActivity }) => {
  const [score, setScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [insights, setInsights] = useState([]);
  const [level, setLevel] = useState('');

  useEffect(() => {
    calculateWellnessScore();
  }, [moodData, stressLevel, sleepHours, journalActivity]);

  useEffect(() => {
    // Animate score counting
    let start = 0;
    const end = score;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  const calculateWellnessScore = () => {
    let totalScore = 0;
    const generatedInsights = [];

    // Mood scoring (0-30 points)
    const moodScores = {
      Happy: 30,
      Excited: 28,
      Neutral: 20,
      Sad: 10,
      Stressed: 8,
      Anxious: 5,
    };
    const moodScore = moodData ? moodScores[moodData] || 15 : 15;
    totalScore += moodScore;

    if (moodScore < 15) {
      generatedInsights.push({
        icon: '😔',
        text: 'Your mood indicates you might need extra support today',
        type: 'warning',
      });
    } else if (moodScore > 25) {
      generatedInsights.push({
        icon: '🌟',
        text: 'Great mood! Keep up the positive mindset',
        type: 'positive',
      });
    }

    // Stress scoring (0-25 points)
    const stressScores = { Low: 25, Medium: 15, High: 5 };
    const stressScore = stressLevel ? stressScores[stressLevel] || 15 : 15;
    totalScore += stressScore;

    if (stressScore < 15) {
      generatedInsights.push({
        icon: '⚡',
        text: 'High stress detected. Try relaxation techniques',
        type: 'alert',
      });
    }

    // Sleep scoring (0-25 points)
    let sleepScore = 0;
    if (sleepHours >= 7 && sleepHours <= 9) {
      sleepScore = 25;
      generatedInsights.push({
        icon: '😴',
        text: 'Optimal sleep duration detected!',
        type: 'positive',
      });
    } else if (sleepHours >= 6 && sleepHours < 7) {
      sleepScore = 18;
    } else if (sleepHours < 6) {
      sleepScore = 8;
      generatedInsights.push({
        icon: '⏰',
        text: 'Insufficient sleep may affect your wellness',
        type: 'warning',
      });
    } else {
      sleepScore = 15;
    }
    totalScore += sleepScore;

    // Journal activity bonus (0-20 points)
    const journalScore = journalActivity ? 20 : 0;
    totalScore += journalScore;

    if (journalActivity) {
      generatedInsights.push({
        icon: '📝',
        text: 'Great job journaling! Self-reflection boosts wellness',
        type: 'positive',
      });
    } else {
      generatedInsights.push({
        icon: '✍️',
        text: 'Consider journaling to track your emotional journey',
        type: 'suggestion',
      });
    }

    // Determine wellness level
    let wellnessLevel = '';
    if (totalScore >= 80) wellnessLevel = 'Excellent';
    else if (totalScore >= 60) wellnessLevel = 'Good';
    else if (totalScore >= 40) wellnessLevel = 'Fair';
    else wellnessLevel = 'Needs Attention';

    setScore(totalScore);
    setInsights(generatedInsights);
    setLevel(wellnessLevel);
  };

  const getScoreColor = () => {
    if (score >= 80) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-blue-400 to-cyan-500';
    if (score >= 40) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-pink-500';
  };

  const getScoreEmoji = () => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '😊';
    if (score >= 40) return '😐';
    return '💪';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          AI Wellness Score
        </h3>
        <p className="text-sm text-gray-600">Real-time predictive wellness analysis</p>
      </div>

      {/* Score Circle */}
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48">
          {/* Background Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress Circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${(animatedScore / 100) * 552.64} 552.64`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="text-purple-500" stopColor="currentColor" />
                <stop offset="100%" className="text-pink-500" stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>

          {/* Score Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {animatedScore}
            </div>
            <div className="text-sm text-gray-600 mt-1">/ 100</div>
            <div className="text-3xl mt-2">{getScoreEmoji()}</div>
          </div>
        </div>
      </div>

      {/* Wellness Level */}
      <div className="text-center mb-6">
        <div className={`inline-block px-6 py-2 bg-gradient-to-r ${getScoreColor()} text-white rounded-full font-bold text-lg shadow-lg`}>
          {level}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Mood</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">{moodData || 'Not set'}</span>
            <span className="text-lg">{moodData ? '😊' : '➖'}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Stress</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">{stressLevel || 'Unknown'}</span>
            <span className="text-lg">{stressLevel === 'Low' ? '✅' : stressLevel === 'High' ? '⚠️' : '➖'}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Sleep</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">{sleepHours || 0}h</span>
            <span className="text-lg">😴</span>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Journal</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">{journalActivity ? 'Active' : 'Inactive'}</span>
            <span className="text-lg">{journalActivity ? '📝' : '❌'}</span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 text-sm mb-3">🧠 AI Insights</h4>
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 p-3 rounded-lg ${
              insight.type === 'positive'
                ? 'bg-green-50 border border-green-200'
                : insight.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200'
                : insight.type === 'alert'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <span className="text-xl">{insight.icon}</span>
            <p className="text-sm text-gray-700">{insight.text}</p>
          </div>
        ))}
      </div>

      {/* Prediction */}
      <div className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-4 text-white">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xl">🔮</span>
          <h4 className="font-bold">Wellness Prediction</h4>
        </div>
        <p className="text-sm opacity-90">
          {score >= 70
            ? 'Your wellness trajectory is positive! Maintain your current habits.'
            : score >= 50
            ? 'You\'re on track. Small improvements can boost your score significantly.'
            : 'Focus on self-care activities. Your wellness needs attention.'}
        </p>
      </div>
    </div>
  );
};

export default AIWellnessScore;
