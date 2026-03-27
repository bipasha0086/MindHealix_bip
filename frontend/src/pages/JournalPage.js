import React, { useState, useEffect } from 'react';
import { moodAPI } from '../services/api';
import VoiceInput from '../components/VoiceInput';
import RealTimeSentiment from '../components/RealTimeSentiment';
import AIDailyPrompts from '../components/AIDailyPrompts';

const WORD_GOAL = 200;
const TAGS_LIST = ['Gratitude', 'Goals', 'Reflection', 'Venting', 'Anxiety', 'Joy', 'Growth', 'Challenge'];
const ENTRIES_KEY = 'wellnesshub_mood_entries';

const readEntries = () => {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

function getJournalStreak(entries) {
  if (!entries || !entries.length) return 0;
  // Sort entries by date descending
  const sorted = [...entries]
    .filter(e => e.has_journal)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) return 0;
  let streak = 1;
  let check = sorted[0].date;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(check);
    prev.setDate(prev.getDate() - 1);
    const prevStr = prev.toISOString().split('T')[0];
    if (sorted[i].date === prevStr) {
      streak++;
      check = prevStr;
    } else {
      break;
    }
  }
  return streak;
}

const sentimentMeta = (score) => {
  if (score > 0.4)  return { label: 'Very Positive', color: 'text-emerald-600', pill: 'bg-emerald-100 text-emerald-700' };
  if (score > 0.1)  return { label: 'Positive',      color: 'text-green-600',   pill: 'bg-green-100 text-green-700' };
  if (score > -0.1) return { label: 'Neutral',        color: 'text-slate-600',   pill: 'bg-slate-100 text-slate-600' };
  if (score > -0.4) return { label: 'Negative',       color: 'text-orange-600',  pill: 'bg-orange-100 text-orange-700' };
  return                    { label: 'Very Negative',  color: 'text-red-600',     pill: 'bg-red-100 text-red-700' };
};

const extractKeywords = (text) => {
  const map = {
    positive: ['happy','grateful','excited','love','joy','peaceful','calm','proud','hopeful','confident','blessed','amazing','great','wonderful','fantastic'],
    negative: ['sad','anxious','stressed','worried','tired','frustrated','angry','overwhelmed','scared','lonely','hopeless','afraid','depressed','exhausted'],
  };
  const lower = text.toLowerCase();
  return {
    positive: map.positive.filter(k => lower.includes(k)),
    negative: map.negative.filter(k => lower.includes(k)),
  };
};

const JournalPage = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [useVoice, setUseVoice] = useState(false);
  const [selectedMood, setSelectedMood] = useState('Neutral');
  const [selectedTags, setSelectedTags] = useState([]);
  const [pastEntries, setPastEntries] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const entries = readEntries();
    setPastEntries(entries.filter(e => e.has_journal).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10));
    setStreak(getJournalStreak(entries));
  }, [savedMessage]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wordGoalPct = Math.min((wordCount / WORD_GOAL) * 100, 100);
  const readingTime = Math.max(1, Math.round(wordCount / 200));
  const keywords = text.length > 20 ? extractKeywords(text) : { positive: [], negative: [] };

  const toggleTag = (tag) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleAnalyze = async () => {
    if (!text.trim()) { alert('Please write something first'); return; }
    setLoading(true);
    try {
      const response = await moodAPI.analyzeText({ text });
      setAnalysis(response.data);
    } catch (error) {
      alert('Failed to analyze text. Please try again.');
      console.error(error);
    } finally { setLoading(false); }
  };

  const handleSaveJournal = async () => {
    if (!text.trim()) { alert('Please write your journal before saving.'); return; }
    setSaving(true);
    setSavedMessage('');
    try {
      await moodAPI.submitMood({
        mood: selectedMood,
        sleep_hours: 7,
        journal_text: text,
        tags: selectedTags,
        date: new Date().toISOString().split('T')[0],
      });
      setSavedMessage('Journal entry saved! Streak and dashboard updated.');
    } catch (error) {
      alert('Failed to save journal entry. Please try again.');
      console.error(error);
    } finally { setSaving(false); }
  };

  const handleExport = () => {
    const date = new Date().toLocaleDateString();
    const tagLine = selectedTags.length ? `Tags: ${selectedTags.join(', ')}\n` : '';
    const content = `MindHealix Journal\n${date} — Mood: ${selectedMood}\n${tagLine}${'─'.repeat(40)}\n\n${text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadEntry = (entry) => {
    setText(entry.journal_text || '');
    setSelectedMood(entry.mood || 'Neutral');
    setShowPast(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="module-shell animate-fadeInJournal">
        <div className="module-container">
          {/* Header */}
          <div className="module-header-card mb-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="module-title">Journal Module</h1>
                <p className="module-subtitle">Reflect with writing or voice and receive AI emotion insights.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                    <span className="text-lg">🔥</span>
                    <span className="text-sm font-bold text-amber-700">{streak}-day streak</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5">
                  <span className="text-lg">📒</span>
                  <span className="text-sm font-semibold text-sky-700">{pastEntries.length} entries saved</span>
                </div>
              </div>
            </div>
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

              {/* Tags */}
              <div className="module-panel">
                <h3 className="module-section-title">Entry Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {TAGS_LIST.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-sky-400 hover:text-sky-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="module-panel">
                <h3 className="module-section-title">AI Prompt Ideas</h3>
                <AIDailyPrompts
                  mood={selectedMood}
                  onPromptSelect={(prompt) => setText((prev) => `${prev}\n\n${prompt}\n\n`)}
                />
              </div>

              {analysis && (
                <div className="module-panel border border-slate-200">
                  <h3 className="module-section-title-tight mb-3">AI Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Sentiment</span>
                      <span className={`font-semibold ${sentimentMeta(analysis.sentiment?.compound || 0).color}`}>
                        {sentimentMeta(analysis.sentiment?.compound || 0).label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Score</span>
                      <span className="font-mono text-slate-700">{Number(analysis.sentiment?.compound || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Emotional state</span>
                      <span className="font-semibold text-slate-700">{analysis.emotional_state || 'Neutral'}</span>
                    </div>
                    {/* Sentiment bar */}
                    <div className="mt-2">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (analysis.sentiment?.compound || 0) >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${Math.abs((analysis.sentiment?.compound || 0)) * 100}%` }}
                        />
                      </div>
                    </div>
                    {keywords.positive.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-400 mb-1.5">Positive keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {keywords.positive.slice(0, 6).map(k => (
                            <span key={k} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {keywords.negative.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1.5">Detected stressors</p>
                        <div className="flex flex-wrap gap-1">
                          {keywords.negative.slice(0, 6).map(k => (
                            <span key={k} className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Writing Area */}
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

                {/* Word Goal Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{wordCount} / {WORD_GOAL} word goal</span>
                    <span>{readingTime} min read · {text.length} chars</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        wordGoalPct >= 100 ? 'bg-emerald-500' : wordGoalPct >= 50 ? 'bg-sky-400' : 'bg-slate-400'
                      }`}
                      style={{ width: `${wordGoalPct}%` }}
                    />
                  </div>
                  {wordGoalPct >= 100 && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">🎉 Goal reached! Great reflection session.</p>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setText('')} className="module-btn-secondary">
                      Clear
                    </button>
                    {text.trim() && (
                      <button onClick={handleExport} className="module-btn-secondary" title="Download as .txt">
                        ↓ Export
                      </button>
                    )}
                  </div>
                  <div className="module-actions-row sm:justify-end">
                    <button onClick={handleAnalyze} disabled={loading} className="module-btn-primary">
                      {loading ? 'Analyzing...' : '🔍 Analyze'}
                    </button>
                    <button onClick={handleSaveJournal} disabled={saving || !text.trim()} className="module-btn-success">
                      {saving ? 'Saving...' : '💾 Save Entry'}
                    </button>
                  </div>
                </div>

                {savedMessage && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    ✅ {savedMessage}
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
                  <h3 className="font-bold text-slate-900 mb-2">💛 Support Suggestion</h3>
                  <p className="text-sm text-slate-700">
                    Your writing shows emotional load. Consider contacting a trusted person, taking a short grounding break, and using the guided check-in in chat.
                  </p>
                </div>
              )}

              {/* Past Entries */}
              {pastEntries.length > 0 && (
                <div className="module-panel">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="module-section-title" style={{ marginBottom: 0 }}>Past Entries</h2>
                    <button
                      type="button"
                      onClick={() => setShowPast(p => !p)}
                      className="text-sm text-sky-600 hover:text-sky-800 font-medium"
                    >
                      {showPast ? 'Collapse ▲' : `Show ${pastEntries.length} entries ▼`}
                    </button>
                  </div>
                  {showPast && (
                    <div className="space-y-3 mt-2">
                      {pastEntries.map((entry, idx) => {
                        const sm = sentimentMeta(entry.sentiment_score || 0);
                        const wc = entry.journal_text ? entry.journal_text.trim().split(/\s+/).length : 0;
                        return (
                          <div
                            key={entry.id}
                            className={
                              `rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer transition-all duration-300 ease-out 
                              hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-sky-100 
                              hover:scale-[1.025] shadow-sm hover:shadow-lg animate-fadeInUp`
                            }
                            onClick={() => loadEntry(entry)}
                            title="Click to load this entry into editor"
                            style={{ animationDelay: `${idx * 60}ms` }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-500">{entry.date}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">{entry.mood}</span>
                                <span className={`text-xs font-semibold ${sm.color}`}>{sm.label}</span>
                              </div>
                              <span className="text-xs text-slate-400">{wc} words</span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {entry.journal_text?.slice(0, 160)}{entry.journal_text?.length > 160 ? '…' : ''}
                            </p>
                          </div>
                        );
                      })}
                      <style jsx>{`
                        @keyframes fadeInUp {
                          from { opacity: 0; transform: translateY(30px); }
                          to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fadeInUp {
                          animation: fadeInUp 0.7s cubic-bezier(0.23, 1, 0.32, 1) both;
                        }
                      `}</style>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeInJournal {
          from { opacity: 0; transform: translateY(40px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeInJournal {
          animation: fadeInJournal 1.1s cubic-bezier(0.23, 1, 0.32, 1) both;
        }
      `}</style>
    </>
  );
};

export default JournalPage;
