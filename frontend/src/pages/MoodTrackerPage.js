import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { moodAPI } from '../services/api';
import InteractiveMoodSelector from '../components/InteractiveMoodSelector';
import VoiceInput from '../components/VoiceInput';
import RealTimeSentiment from '../components/RealTimeSentiment';
import AIDailyPrompts from '../components/AIDailyPrompts';

const MoodTrackerPage = () => {
  const [selectedMood, setSelectedMood] = useState('');
  const [sleepHours, setSleepHours] = useState(7);
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState(null);
  const [useVoice, setUseVoice] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [emergencyNotification, setEmergencyNotification] = useState(null);
  
  // New questions for better experience
  const [energyLevel, setEnergyLevel] = useState('Medium');
  const [anxietyLevel, setAnxietyLevel] = useState(5);
  const [physicalActivity, setPhysicalActivity] = useState('None');
  const [socialInteraction, setSocialInteraction] = useState('Some');
  const [gratitude, setGratitude] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMood) {
      alert('Please select a mood');
      return;
    }

    setLoading(true);

    try {
      const response = await moodAPI.submitMood({
        mood: selectedMood,
        sleep_hours: sleepHours,
        journal_text: journalText,
        date: new Date().toISOString().split('T')[0],
        energy_level: energyLevel,
        anxiety_level: anxietyLevel,
        physical_activity: physicalActivity,
        social_interaction: socialInteraction,
        gratitude: gratitude,
      });

      setResult(response.data.entry);
      setEmergencyNotification(response.data.emergency_notification || null);
      setSuccess(true);
    } catch (error) {
      alert('Failed to submit mood entry. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (success && result) {
    return (
      <div className="module-shell">
        <div className="max-w-4xl mx-auto px-4">
          <div className="module-panel p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Mood Entry Saved</h2>
              <p className="text-slate-600 mt-1">Your stress rating and recommendations are updated.</p>
            </div>

            <div className="grid md:grid-cols-5 gap-3 mb-5">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Mood</div>
                <div className="text-lg font-bold text-slate-900">{result.mood}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Stress Level</div>
                <div className={`inline-block mt-1 px-2 py-1 rounded-md text-sm font-semibold stress-${result.stress_level.toLowerCase()}`}>
                  {result.stress_level}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Stress Score</div>
                <div className="text-lg font-bold text-slate-900">{result.stress_score ?? '-'} / 100</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Sentiment</div>
                <div className="text-lg font-bold text-slate-900">{Number(result.sentiment_score || 0).toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">AI Engine</div>
                <div
                  className={`inline-block mt-1 px-2 py-1 rounded-md text-xs font-semibold ${
                    result.prediction_source === 'ml_model'
                      ? 'bg-emerald-100 text-emerald-800'
                      : result.prediction_source === 'rule_based_fallback'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {result.prediction_source === 'ml_model'
                    ? 'Trained ML Model'
                    : result.prediction_source === 'rule_based_fallback'
                    ? 'Fallback Rules'
                    : 'Local AI'}
                </div>
              </div>
            </div>

            {result.prediction_source && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 mb-5 text-sm text-slate-700">
                Prediction Source: <span className="font-semibold">{result.prediction_source}</span>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className="rounded-xl bg-sky-50 border border-sky-100 p-4 mb-5">
                <h3 className="font-semibold text-slate-900 mb-2">AI Recommendations</h3>
                <ul className="space-y-1 text-sm text-slate-700">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {emergencyNotification && (
              <div
                className={`rounded-xl border p-4 mb-5 ${
                  emergencyNotification.sent ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <h3 className="font-semibold text-slate-900 mb-1">Emergency Notification</h3>
                <p className="text-sm text-slate-700">{emergencyNotification.message}</p>
                {emergencyNotification.sent && (
                  <p className="text-xs text-slate-600 mt-2">
                    Contact: {emergencyNotification.contact_name} ({emergencyNotification.contact_phone})
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSuccess(false);
                  setSelectedMood('');
                  setJournalText('');
                  setResult(null);
                  setEmergencyNotification(null);
                  setEnergyLevel('Medium');
                  setAnxietyLevel(5);
                  setPhysicalActivity('None');
                  setSocialInteraction('Some');
                  setGratitude('');
                  setSleepHours(7);
                }}
                className="flex-1 rounded-xl border border-slate-300 text-slate-700 py-2.5 font-semibold hover:bg-slate-50"
              >
                Track Another
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 rounded-xl bg-sky-600 text-white py-2.5 font-semibold hover:bg-sky-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-shell">
      <div className="max-w-6xl mx-auto px-4">
        <div className="module-header-card mb-6">
          <h1 className="module-title">Mood Tracker Module</h1>
          <p className="module-subtitle">Log mood, sleep, and thoughts for accurate stress scoring.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Select Current Mood</h2>
            <InteractiveMoodSelector selectedMood={selectedMood} onMoodSelect={setSelectedMood} />
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Sleep Hours</h2>
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">Last night sleep</span>
                <span className="text-2xl font-bold text-sky-700">{sleepHours}h</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Energy Level</h2>
            <p className="text-sm text-slate-600 mb-3">How energetic do you feel today?</p>
            <div className="grid grid-cols-3 gap-3">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={`py-3 rounded-xl font-semibold transition ${
                    energyLevel === level
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {level === 'Low' && '🔋'} {level === 'Medium' && '⚡'} {level === 'High' && '🚀'} {level}
                </button>
              ))}
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Anxiety Level</h2>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">How anxious do you feel?</span>
                <span className="text-2xl font-bold text-purple-700">{anxietyLevel}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={anxietyLevel}
                onChange={(e) => setAnxietyLevel(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Calm</span>
                <span>Very Anxious</span>
              </div>
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Physical Activity</h2>
            <p className="text-sm text-slate-600 mb-3">Any exercise or physical activity today?</p>
            <div className="grid grid-cols-4 gap-2">
              {['None', 'Light', 'Moderate', 'Intense'].map((activity) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => setPhysicalActivity(activity)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                    physicalActivity === activity
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {activity}
                </button>
              ))}
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Social Interaction</h2>
            <p className="text-sm text-slate-600 mb-3">How much did you interact with others?</p>
            <div className="grid grid-cols-3 gap-3">
              {['None', 'Some', 'Plenty'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSocialInteraction(level)}
                  className={`py-3 rounded-xl font-semibold transition ${
                    socialInteraction === level
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {level === 'None' && '😶'} {level === 'Some' && '🙂'} {level === 'Plenty' && '😊'} {level}
                </button>
              ))}
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Gratitude Moment 🌟</h2>
            <p className="text-sm text-slate-600 mb-3">What's one thing you're grateful for today?</p>
            <input
              type="text"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="I'm grateful for..."
            />
          </div>

          {selectedMood && (
            <div className="module-panel">
              <h2 className="text-lg font-bold text-slate-900 mb-3">AI Prompt Suggestions</h2>
              <AIDailyPrompts
                mood={selectedMood}
                onPromptSelect={(prompt) => {
                  setSelectedPrompt(prompt);
                  if (!journalText) {
                    setJournalText(prompt + '\n\n');
                  }
                }}
              />
            </div>
          )}

          <div className="module-panel">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">Journal Input</h2>
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
              <VoiceInput onTranscript={(transcript) => setJournalText((prev) => prev + ' ' + transcript)} />
            ) : (
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                rows="8"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
                placeholder={selectedPrompt || 'Write how you feel. This improves stress accuracy.'}
              />
            )}
          </div>

          {journalText && (
            <div className="module-panel">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Real-time Sentiment</h2>
              <RealTimeSentiment text={journalText} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedMood}
            className="w-full rounded-xl bg-sky-600 text-white py-3 font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Analyzing...' : 'Submit Mood Entry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MoodTrackerPage;
