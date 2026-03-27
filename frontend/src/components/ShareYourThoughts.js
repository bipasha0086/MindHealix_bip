

import React, { useState } from 'react';
import { chatAPI } from '../services/api';


const ShareYourThoughts = () => {
  const [thought, setThought] = useState('');
  const [response, setResponse] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!thought.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Use chatbot backend for reply
      const res = await chatAPI.sendMessage({ message: thought });
      setResponse(res.data?.reply || 'Thank you for sharing.');
    } catch (err) {
      setResponse('Sorry, I could not generate a response right now.');
      setError('Could not connect to support service.');
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setThought('');
    setResponse('');
    setSubmitted(false);
    setError('');
  };

  return (
    <div className="bg-gradient-to-br from-sky-50 via-emerald-50 to-pink-50 border-2 border-sky-200 rounded-2xl p-6 shadow-lg max-w-lg mx-auto mt-8">
      <h2 className="text-2xl font-bold text-sky-800 mb-2 flex items-center gap-2">
        <span role="img" aria-label="thought">💭</span> Share Your Thoughts
      </h2>
      <p className="text-slate-600 mb-4">Write anything on your mind. This space is private, safe, and here to support you with encouragement and empathy.</p>
      {!submitted ? (
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full border border-sky-200 rounded-xl p-3 text-base focus:ring-2 focus:ring-sky-200 mb-3"
            rows={4}
            placeholder="Type your thoughts here..."
            value={thought}
            onChange={e => setThought(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full py-2 px-4 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
            disabled={loading}
          >
            {loading ? 'Thinking...' : 'Share'}
          </button>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </form>
      ) : (
        <div className="text-center">
          <div className="text-lg text-emerald-700 font-semibold mb-3">{response}</div>
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-2 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
          >
            Share Another Thought
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareYourThoughts;
