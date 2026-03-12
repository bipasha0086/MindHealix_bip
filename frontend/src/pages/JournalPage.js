import React, { useState } from 'react';
import { moodAPI } from '../services/api';
import VoiceInput from '../components/VoiceInput';
import RealTimeSentiment from '../components/RealTimeSentiment';
import AIDailyPrompts from '../components/AIDailyPrompts';

const JournalPage = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [useVoice, setUseVoice] = useState(false);
  const [selectedMood, setSelectedMood] = useState('Neutral');

  const handleAnalyze = async () => {
    if (!text.trim()) {
      alert('Please write something first');
      return;
    }

    setLoading(true);
    try {
      const response = await moodAPI.analyzeText({ text });
      setAnalysis(response.data);
    } catch (error) {
      alert('Failed to analyze text. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!text.trim()) {
      alert('Please write your journal before saving.');
      return;
    }

    setSaving(true);
    setSavedMessage('');
    try {
      await moodAPI.submitMood({
        mood: selectedMood,
        sleep_hours: 7,
        journal_text: text,
        date: new Date().toISOString().split('T')[0],
      });
      setSavedMessage('Journal entry saved to your mood records. Dashboard sync updated.');
    } catch (error) {
      alert('Failed to save journal entry. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-shell">
      <div className="module-container">
        <div className="module-header-card mb-6">
          <h1 className="module-title">Journal Module</h1>
          <p className="module-subtitle">Reflect with writing or voice and receive AI emotion insights.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="module-panel">
              <h3 className="module-section-title">Mood Context</h3>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option>Happy</option>
                <option>Neutral</option>
                <option>Sad</option>
                <option>Stressed</option>
                <option>Anxious</option>
                <option>Excited</option>
              </select>
            </div>

            <div className="module-panel">
              <h3 className="module-section-title">AI Prompt Ideas</h3>
              <AIDailyPrompts
                mood={selectedMood}
                onPromptSelect={(prompt) => setText((prev) => `${prev}\n\n${prompt}\n\n`)}
              />
            </div>

            {analysis && (
              <div className="module-panel">
                <h3 className="module-section-title-tight">Latest Analysis</h3>
                <p className="text-sm text-slate-700">Sentiment Score: {Number(analysis.sentiment?.compound || 0).toFixed(2)}</p>
                <p className="text-sm text-slate-700 mt-1">State: {analysis.emotional_state || 'Neutral'}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="module-panel">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-heading">Your Journal Entry</h2>
                <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setUseVoice(false)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      !useVoice ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseVoice(true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      useVoice ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Voice
                  </button>
                </div>
              </div>

              {useVoice ? (
                <VoiceInput onTranscript={(transcript) => setText((prev) => prev + ' ' + transcript)} />
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="12"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                  placeholder="Write what you are feeling and what happened today..."
                />
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                <div className="text-sm text-slate-500">
                  {text.length} chars • {text.trim() ? text.trim().split(/\s+/).length : 0} words
                </div>
                <div className="module-actions-row sm:justify-end">
                  <button
                    onClick={() => setText('')}
                    className="module-btn-secondary"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="module-btn-primary"
                  >
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </button>
                  <button
                    onClick={handleSaveJournal}
                    disabled={saving || !text.trim()}
                    className="module-btn-success"
                  >
                    {saving ? 'Saving...' : 'Save Journal Entry'}
                  </button>
                </div>
              </div>

              {savedMessage && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {savedMessage}
                </div>
              )}
            </div>

            {text && text.length > 10 && (
              <div className="module-panel">
                <h2 className="module-section-title">Real-time Sentiment</h2>
                <RealTimeSentiment text={text} onAnalysisComplete={(data) => setAnalysis(data)} />
              </div>
            )}

            {analysis && analysis.sentiment?.compound < -0.3 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
                <h3 className="font-bold text-slate-900 mb-2">Support Suggestion</h3>
                <p className="text-sm text-slate-700">
                  Your writing shows emotional load. Consider contacting a trusted person, taking a short grounding break, and using the guided check-in in chat.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
