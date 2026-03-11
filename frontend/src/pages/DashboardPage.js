import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsAPI, emergencyAPI } from '../services/api';
import AIWellnessScore from '../components/AIWellnessScore';
import PanicButton from '../components/PanicButton';
import VoicePanicTrigger from '../components/VoicePanicTrigger';

const POSITIVE_THOUGHTS = [
  'Small progress is still progress. Keep going.',
  'You are allowed to rest and still be successful.',
  'Your feelings are valid, and they will change with time and care.',
  'One healthy choice today can shift your whole week.',
  'You are stronger than this moment of stress.',
  'Consistency beats intensity. Keep showing up for yourself.',
  'Your mental health is a priority, not an afterthought.',
  'You can restart your day at any moment with one mindful action.',
];

const WELLNESS_ARTICLES = [
  {
    title: '5-Minute Breathing Reset for Stressful Moments',
    readTime: '3 min read',
    topic: 'Breathing',
    summary: 'Use box breathing to quickly reduce stress response before meetings or study sessions.',
  },
  {
    title: 'How Sleep and Mood Affect Each Other',
    readTime: '4 min read',
    topic: 'Sleep',
    summary: 'Understand the sleep-stress cycle and simple habits to improve emotional stability.',
  },
  {
    title: 'Micro Journaling for Busy Days',
    readTime: '2 min read',
    topic: 'Journaling',
    summary: 'Even a 2-line journal note helps your brain process emotions and reduce overwhelm.',
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thought, setThought] = useState('');
  const [contact, setContact] = useState({ name: '', relation: '', phone: '' });
  const [contactSaved, setContactSaved] = useState(false);

  useEffect(() => {
    fetchDashboard();
    setThought(POSITIVE_THOUGHTS[Math.floor(Math.random() * POSITIVE_THOUGHTS.length)]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setThought((prev) => {
        const current = POSITIVE_THOUGHTS.indexOf(prev);
        if (current === -1) return POSITIVE_THOUGHTS[0];
        return POSITIVE_THOUGHTS[(current + 1) % POSITIVE_THOUGHTS.length];
      });
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dashboard?.user?.id) return;
    emergencyAPI
      .getEmergencyContact()
      .then((response) => {
        const loadedContact = response?.data?.contact;
        if (!loadedContact) return;

        setContact({
          name: loadedContact.name || '',
          relation: loadedContact.relation || '',
          phone: loadedContact.phone || '',
        });
      })
      .catch((error) => {
        console.error('Failed to load emergency contact:', error);
      });
  }, [dashboard?.user?.id]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await analyticsAPI.getDashboard();
      setDashboard(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveEmergencyContact = async () => {
    if (!dashboard?.user?.id) return;
    try {
      await emergencyAPI.saveEmergencyContact(contact);
      setContactSaved(true);
      setTimeout(() => setContactSaved(false), 1500);
    } catch (error) {
      console.error('Failed to save emergency contact:', error);
    }
  };

  const aiRecommendation = useMemo(() => {
    const entries = dashboard?.recent_entries || [];
    const avgStress = Number(dashboard?.statistics?.average_stress_score || 0);
    const latest = entries[0];

    if (!latest) {
      return 'Start with one mood entry today. AI recommendations get better as your data grows.';
    }

    if (avgStress >= 70) {
      return 'Your stress trend is high. Prioritize recovery blocks: 10-min walk, hydration, and reaching out to your emergency contact today.';
    }

    if (avgStress >= 40) {
      return 'Your stress is moderate. Keep structure simple: one focused task, one break, one supportive conversation today.';
    }

    if (latest.mood === 'Happy' || latest.mood === 'Excited') {
      return 'Great emotional momentum. Lock it in with a short gratitude journal entry and consistent sleep tonight.';
    }

    return 'You are stable right now. Maintain consistency with mood tracking and short daily reflection.';
  }, [dashboard]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-600 mb-4">{error}</p>
          <button onClick={fetchDashboard} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { user, statistics, recent_entries } = dashboard || {};

  const modules = [
    {
      title: 'Dashboard',
      subtitle: 'Overview & AI insights',
      icon: '🏠',
      to: '/dashboard',
      color: 'bg-sky-50 border-sky-100',
    },
    {
      title: 'Mood Tracker',
      subtitle: 'Log mood and stress',
      icon: '😊',
      to: '/mood-tracker',
      color: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Journal',
      subtitle: 'Write or voice notes',
      icon: '📝',
      to: '/journal',
      color: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Analytics',
      subtitle: 'See trends and progress',
      icon: '📈',
      to: '/analytics',
      color: 'bg-violet-50 border-violet-100',
    },
    {
      title: 'Mental Health Assessment',
      subtitle: 'Check anxiety & depression',
      icon: '🧠',
      to: '/assessment',
      color: 'bg-purple-50 border-purple-100',
    },
    {
      title: 'Emergency Support',
      subtitle: 'Contact and alert history',
      icon: '🚨',
      to: '/emergency-support',
      color: 'bg-rose-50 border-rose-100',
    },
    {
      title: 'Panic Mode',
      subtitle: 'Breathing + instant calm support',
      icon: '🆘',
      to: '/panic-mode',
      color: 'bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div className="module-shell">
      <div className="module-container">
        <div className="mb-6 module-header-card">
          <h1 className="module-title">Welcome, {user?.name || 'Friend'} 👋</h1>
          <p className="module-subtitle">Your main wellness modules and daily guidance are all here.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Main Modules</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module) => (
              <Link key={module.title} to={module.to} className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition ${module.color}`}>
                <div className="module-icon-badge">{module.icon}</div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{module.title}</h3>
                <p className="text-sm text-slate-600">{module.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-3">Emergency Panic Support</h2>
              <p className="text-sm text-slate-600 mb-4">If panic starts, press the button below for immediate breathing guidance and support chat.</p>
              <PanicButton onActivate={() => navigate('/panic-mode')} />

              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <Link
                  to="/panic-mode"
                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-100"
                >
                  Open Breathing Exercises
                </Link>
                <Link
                  to="/panic-mode"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Open AI Chat Support
                </Link>
              </div>

              <div className="mt-4">
                <VoicePanicTrigger onDetected={() => navigate('/panic-mode')} />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">Motivational Thought</h3>
                <button
                  type="button"
                  onClick={() => setThought(POSITIVE_THOUGHTS[Math.floor(Math.random() * POSITIVE_THOUGHTS.length)])}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Refresh Thought
                </button>
              </div>
              <p className="text-slate-800 mt-3 leading-relaxed">{thought}</p>
              <p className="text-xs text-emerald-700 mt-2">Auto-refreshes every 25 seconds.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="module-panel">
                <div className="module-kpi">Total Entries</div>
                <div className="module-kpi-value">{statistics?.total_entries || 0}</div>
              </div>
              <div className="module-panel">
                <div className="module-kpi">Days Tracked</div>
                <div className="module-kpi-value">{statistics?.days_tracked || 0}</div>
              </div>
              <div className="module-panel">
                <div className="module-kpi">Current Stress Level</div>
                <div className={`inline-block px-3 py-1 rounded-lg mt-2 font-semibold stress-${String(statistics?.current_stress_level || 'low').toLowerCase()}`}>
                  {statistics?.current_stress_level || 'Low'}
                </div>
              </div>
              <div className="module-panel">
                <div className="module-kpi">Average Stress Score</div>
                <div className="module-kpi-value">{statistics?.average_stress_score || 0}/100</div>
              </div>
            </div>

            <div className="module-panel">
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Recommendations</h3>
              <p className="text-slate-700">{aiRecommendation}</p>
            </div>

            <div className="module-panel">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Stress Entries</h3>
              {recent_entries && recent_entries.length > 0 ? (
                <div className="space-y-3">
                  {recent_entries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold mood-${entry.mood.toLowerCase()}`}>{entry.mood}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold stress-${entry.stress_level.toLowerCase()}`}>{entry.stress_level}</span>
                        </div>
                        <span className="text-sm text-slate-500">{entry.date}</span>
                      </div>
                      <div className="text-sm text-slate-700 mt-2">
                        Stress Score: <span className="font-semibold">{entry.stress_score ?? '-'}/100</span> | Sleep: {entry.sleep_hours}h | Sentiment: {Number(entry.sentiment_score || 0).toFixed(2)}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        AI Engine:{' '}
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            entry.prediction_source === 'ml_model'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.prediction_source === 'rule_based_fallback'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {entry.prediction_source === 'ml_model'
                            ? 'Trained ML Model'
                            : entry.prediction_source === 'rule_based_fallback'
                            ? 'Fallback Rules'
                            : 'Local AI'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600">No entries yet. Track mood to start personalized scoring.</p>
              )}
            </div>

            <div>
              <h3 className="section-heading">Recommended Articles</h3>
              <p className="section-subheading">Practical and short reads to support your daily wellbeing.</p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                {WELLNESS_ARTICLES.map((article) => (
                  <article key={article.title} className="feature-glass rounded-2xl p-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="px-2 py-1 rounded-md bg-cyan-100 text-cyan-800 font-semibold">{article.topic}</span>
                      <span className="text-slate-500">{article.readTime}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 leading-snug">{article.title}</h4>
                    <p className="text-sm text-slate-600 mt-2">{article.summary}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AIWellnessScore
              moodData={recent_entries?.[0]?.mood}
              stressLevel={statistics?.current_stress_level}
              sleepHours={recent_entries?.[0]?.sleep_hours || 7}
              journalActivity={Boolean(recent_entries && recent_entries.length)}
            />

            <div className="module-panel border-rose-200">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Emergency Contact</h3>
              <p className="text-xs text-slate-600 mb-3">Add one trusted person for quick support in high-stress moments.</p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Contact name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
                />
                <input
                  type="text"
                  value={contact.relation}
                  onChange={(e) => setContact((prev) => ({ ...prev, relation: e.target.value }))}
                  placeholder="Relation (Friend, Parent, Partner)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
                />
                <input
                  type="text"
                  value={contact.phone}
                  onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
                />

                <button
                  type="button"
                  onClick={saveEmergencyContact}
                  className="w-full rounded-lg bg-rose-600 text-white py-2 text-sm font-semibold hover:bg-rose-700"
                >
                  Save Contact
                </button>

                {contactSaved && <p className="text-xs text-emerald-700">Saved successfully.</p>}

                <Link
                  to="/emergency-support"
                  className="block text-center w-full rounded-lg border border-rose-200 bg-rose-50 text-rose-700 py-2 text-sm font-semibold hover:bg-rose-100"
                >
                  Open Emergency Module
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
