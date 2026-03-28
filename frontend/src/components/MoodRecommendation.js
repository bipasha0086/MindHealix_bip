import React, { useState } from 'react';
import { moodAPI } from '../services/api';

const MoodRecommendation = () => {
  const [mood, setMood] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRecommend = async () => {
    setLoading(true);
    setError('');
    setRecommendations([]);
    try {
      const res = await moodAPI.recommendByMood(mood);
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      setError('Could not fetch recommendations.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Get Recommendations by Mood</h2>
      <div className="flex flex-col items-center gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 w-full"
          type="text"
          placeholder="Enter your mood (e.g. happy, sad)"
          value={mood}
          onChange={e => setMood(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2"
          onClick={handleRecommend}
          disabled={loading || !mood.trim()}
        >
          {loading ? 'Loading...' : 'Get Recommendation'}
        </button>
      </div>
      {error && <div className="text-red-500 text-center mb-2">{error}</div>}
      {recommendations.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Recommended Actions:</h3>
          <ul className="list-disc pl-6">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="mb-1">{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MoodRecommendation;
