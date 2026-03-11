import React, { useEffect, useState } from 'react';
import { moodAPI, systemAPI } from '../services/api';

const DEFAULT_SAMPLE = {
  mood: 'Neutral',
  sleep_hours: 7,
  journal_text: 'Today was balanced and manageable.',
};

const SCENARIOS = [
  {
    label: 'Exam Pressure',
    sample: {
      mood: 'Anxious',
      sleep_hours: 4.5,
      journal_text: 'I am worried about exams and cannot focus properly.',
    },
  },
  {
    label: 'Recovery Day',
    sample: {
      mood: 'Happy',
      sleep_hours: 8,
      journal_text: 'I exercised, relaxed, and felt calm most of the day.',
    },
  },
  {
    label: 'Work Overload',
    sample: {
      mood: 'Stressed',
      sleep_hours: 5,
      journal_text: 'Too many deadlines, feeling overwhelmed and mentally drained.',
    },
  },
  {
    label: 'Social Boost',
    sample: {
      mood: 'Excited',
      sleep_hours: 7.5,
      journal_text: 'Spent quality time with friends and felt energized.',
    },
  },
];

const MOODS = ['Happy', 'Neutral', 'Sad', 'Stressed', 'Anxious', 'Excited'];

const MLModelPage = () => {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const [recentRuns, setRecentRuns] = useState([]);
  const [guess, setGuess] = useState('');
  const [guessResult, setGuessResult] = useState('');
  const [error, setError] = useState('');

  const modelLoaded = Boolean(health?.ai_model?.loaded);

  const fetchHealth = async () => {
    setHealthLoading(true);
    setError('');
    try {
      const response = await systemAPI.getHealth();
      setHealth(response.data);
    } catch (_err) {
      setError('Could not load model status.');
    } finally {
      setHealthLoading(false);
    }
  };

  const runSamplePrediction = async () => {
    setPredictionLoading(true);
    setError('');
    setGuessResult('');
    try {
      const response = await moodAPI.predictStress(sample);
      const nextPrediction = response?.data?.prediction || null;
      setPrediction(nextPrediction);

      if (nextPrediction) {
        const run = {
          id: Date.now(),
          mood: sample.mood,
          sleep_hours: sample.sleep_hours,
          stress_level: nextPrediction.stress_level,
          source: nextPrediction.prediction_source,
          sentiment_score: nextPrediction.sentiment_score,
        };
        setRecentRuns((prev) => [run, ...prev].slice(0, 6));
      }
    } catch (_err) {
      setError('Prediction failed. Ensure backend is running.');
    } finally {
      setPredictionLoading(false);
    }
  };

  const applyScenario = (scenario) => {
    setSample(scenario.sample);
    setGuess('');
    setGuessResult('');
  };

  const randomScenario = () => {
    const pick = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    applyScenario(pick);
  };

  const checkGuess = () => {
    if (!prediction || !guess) return;
    setGuessResult(guess === prediction.stress_level ? 'correct' : 'wrong');
  };

  useEffect(() => {
    fetchHealth();
    runSamplePrediction();
  }, []);

  return (
    <div className="module-shell">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6 rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stress Lab</h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${modelLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                <span className={`w-2 h-2 rounded-full ${modelLoaded ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {modelLoaded ? 'ENGINE LIVE' : 'FALLBACK MODE'}
              </span>
              <button
                type="button"
                onClick={fetchHealth}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {healthLoading ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-600 break-all">
            source: {health?.ai_model?.source || 'unknown'} | model: {health?.ai_model?.model_path || 'not_found'}
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="module-panel">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-black text-slate-900">Scenario Deck</h2>
                <button
                  type="button"
                  onClick={randomScenario}
                  className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-100"
                >
                  Random
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => applyScenario(scenario)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mood</label>
                  <select
                    value={sample.mood}
                    onChange={(e) => setSample((prev) => ({ ...prev, mood: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sleep Hours: {sample.sleep_hours}h</label>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={sample.sleep_hours}
                    onChange={(e) => setSample((prev) => ({ ...prev, sleep_hours: Number(e.target.value) }))}
                    className="w-full accent-sky-600"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Journal Signal</label>
                <textarea
                  rows="3"
                  value={sample.journal_text}
                  onChange={(e) => setSample((prev) => ({ ...prev, journal_text: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={runSamplePrediction}
                  className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-bold hover:bg-sky-700"
                >
                  {predictionLoading ? 'Running...' : 'Run Prediction'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSample(DEFAULT_SAMPLE);
                    setPrediction(null);
                    setGuess('');
                    setGuessResult('');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="module-panel">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-black text-slate-900">Prediction Arena</h2>
                <span className="text-xs font-semibold text-slate-500">/api/predict-stress</span>
              </div>

              {prediction ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold stress-${String(prediction.stress_level || 'low').toLowerCase()}`}>
                        {prediction.stress_level}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${prediction.prediction_source === 'ml_model' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {prediction.prediction_source}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">
                      sentiment: <span className="font-bold">{prediction.sentiment_score}</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-600">
                      recommendations: {prediction.recommendations?.length || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Challenge Mode</div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {['Low', 'Medium', 'High'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setGuess(level)}
                          className={`rounded-lg px-2 py-1.5 text-xs font-bold ${guess === level ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={checkGuess}
                      className="w-full rounded-lg bg-emerald-600 text-white py-1.5 text-xs font-bold hover:bg-emerald-700"
                    >
                      Check Guess
                    </button>
                    {guessResult && (
                      <div className={`mt-2 text-xs font-bold ${guessResult === 'correct' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {guessResult === 'correct' ? 'Correct' : 'Try again'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Run prediction to start arena.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="module-panel">
              <h2 className="text-lg font-black text-slate-900 mb-3">Run Timeline</h2>
              {recentRuns.length > 0 ? (
                <div className="space-y-2">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">{run.mood}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${run.source === 'ml_model' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {run.source}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        sleep {run.sleep_hours}h | sentiment {run.sentiment_score}
                      </div>
                      <div className={`mt-1 text-xs font-bold ${run.stress_level === 'High' ? 'text-rose-700' : run.stress_level === 'Medium' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        stress {run.stress_level}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-600">No runs yet</div>
              )}
            </div>

            <div className="module-panel">
              <h2 className="text-lg font-black text-slate-900 mb-3">Scoreboard</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-100 p-3">
                  <div className="text-slate-500">Total Runs</div>
                  <div className="text-xl font-black text-slate-900">{recentRuns.length}</div>
                </div>
                <div className="rounded-lg bg-slate-100 p-3">
                  <div className="text-slate-500">Engine</div>
                  <div className="text-sm font-black text-slate-900">{health?.ai_model?.source || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default MLModelPage;
