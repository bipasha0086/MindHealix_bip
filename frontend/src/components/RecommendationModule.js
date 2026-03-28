import React, { useState } from 'react';
import { moodAPI } from '../services/api';

const RecommendationModule = () => {
  const [mood, setMood] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [ageAction, setAgeAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuestions, setShowQuestions] = useState(false);
  const [userName, setUserName] = useState('');
  const [age, setAge] = useState('');
  const [favoriteActivity, setFavoriteActivity] = useState('');
  const [userMood, setUserMood] = useState('');
  const [userFeeling, setUserFeeling] = useState('');
  const [userLaziness, setUserLaziness] = useState('');
  const [userWant, setUserWant] = useState('');

  const handleRecommend = async () => {
    setLoading(true);
    setError('');
    setRecommendations([]);
    setAgeAction(null);
    try {
      const res = await moodAPI.recommendByMood(mood, age);
      setRecommendations(res.data.recommendations || []);
      if (res.data.age_action) {
        setAgeAction(res.data.age_action);
      }
    } catch (err) {
      setError('Could not fetch recommendations.');
    }
    setLoading(false);
  };

  const handleStart = () => {
    setShowQuestions(true);
  };

  const handleQuestionsSubmit = (e) => {
    e.preventDefault();
    setShowQuestions(false);
    // Combine answers for a more personalized recommendation
    const combinedMood = `${userMood} ${userFeeling} ${userLaziness} ${userWant}`.trim();
    setMood(combinedMood);
    handleRecommend();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto mt-10 animate__animated animate__fadeIn">
      <h2 className="text-2xl font-bold mb-4 text-center animate__animated animate__bounceIn">Mood-Based Recommendations</h2>
      {!showQuestions && (
        <button
          className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full mb-4 shadow-lg hover:scale-105 transition-transform"
          onClick={handleStart}
        >
          Start
        </button>
      )}
      {showQuestions && (
        <form onSubmit={handleQuestionsSubmit} className="mb-4 animate__animated animate__fadeInUp">
          <input
            className="border rounded px-3 py-2 w-full mb-2"
            type="number"
            placeholder="Your age (e.g. 18)"
            value={age}
            onChange={e => setAge(e.target.value)}
            min="1"
            max="120"
            required
          />
          <input
            className="border rounded px-3 py-2 w-full mb-2"
            type="text"
            placeholder="How is your mood today? (e.g. happy, sad)"
            value={userMood}
            onChange={e => setUserMood(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 w-full mb-2"
            type="text"
            placeholder="How are you feeling? (e.g. energetic, anxious)"
            value={userFeeling}
            onChange={e => setUserFeeling(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 w-full mb-2"
            type="text"
            placeholder="Feeling lazy? (yes/no or describe)"
            value={userLaziness}
            onChange={e => setUserLaziness(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 w-full mb-2"
            type="text"
            placeholder="What do you want to do right now?"
            value={userWant}
            onChange={e => setUserWant(e.target.value)}
            required
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2 w-full"
            type="submit"
          >
            Get Recommendation
          </button>
        </form>
      )}
      {!showQuestions && (
        <div className="flex flex-col items-center gap-2 mb-4 animate__animated animate__fadeInUp">
          <input
            className="border rounded px-3 py-2 w-full mb-2"
            type="number"
            placeholder="Your age (e.g. 18)"
            value={age}
            onChange={e => setAge(e.target.value)}
            min="1"
            max="120"
            required
          />
          <input
            className="border rounded px-3 py-2 w-full"
            type="text"
            placeholder="Enter your mood (e.g. happy, sad)"
            value={mood}
            onChange={e => setMood(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2 shadow-lg hover:scale-105 transition-transform"
            onClick={handleRecommend}
            disabled={loading || !mood.trim() || !age.trim()}
          >
            {loading ? (
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-blue-400 rounded-full"></span>
            ) : (
              'Get Recommendation'
            )}
          </button>
        </div>
      )}
      {error && <div className="text-red-500 text-center mb-2 animate__animated animate__shakeX">{error}</div>}
      {recommendations.length > 0 && (
        <div className="animate__animated animate__fadeInUp">
          <h3 className="font-semibold mb-2 text-green-700">Recommended Actions:</h3>
          <ul className="list-disc pl-6">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="mb-1 animate__animated animate__pulse animate__delay-1s">{rec}</li>
            ))}
          </ul>
          {ageAction && (
            <div className="mt-4 p-3 rounded bg-yellow-100 border-l-4 border-yellow-500 animate__animated animate__fadeIn">
              <div className="font-bold text-yellow-700 mb-1">Age-Specific Guidance:</div>
              <div className="text-sm text-yellow-800">{ageAction.description}</div>
              {ageAction.action && (
                <div className="text-xs text-yellow-600 mt-1">Action: <span className="font-semibold">{ageAction.action}</span></div>
              )}
              {ageAction.triggered_keyword && (
                <div className="text-xs text-yellow-600 mt-1">Keyword: <span className="font-semibold">{ageAction.triggered_keyword}</span></div>
              )}
            </div>
          )}
          <div className="mt-4 text-center text-2xl animate__animated animate__tada">😊🌈✨</div>
        </div>
      )}
    </div>
  );
};

export default RecommendationModule;
