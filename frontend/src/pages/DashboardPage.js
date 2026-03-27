import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import AIWellnessScore from '../components/AIWellnessScore';
import RelaxationSounds from '../components/RelaxationSounds';
import ShareYourThoughts from '../components/ShareYourThoughts';

const POSITIVE_THOUGHTS = [
  'Your heart matters. Be as kind to yourself as you would be to someone you love.',
  'It\'s okay to not be okay. What matters is that you\'re here, trying.',
  'You are enough, just as you are right now—struggles and all.',
  'Healing isn\'t linear. Every small step forward is a victory worth celebrating.',
  'You deserve rest without guilt, joy without question, and peace without earning it.',
  'Your pain is real, and so is your strength to carry it.',
  'Being vulnerable isn\'t weakness—it\'s the bravest thing you can do.',
  'You are the author of your story. Today is a chance to write a kind chapter.',
  'Some days you\'ll be the ocean. Some days you\'ll be the sand. Both are necessary.',
  'You don\'t have to see the full staircase to take the first step.',
  'Your presence in this world matters more than you know.',
  'Healing happens when you stop fighting yourself and start believing in your worth.',
];

const WELLNESS_ARTICLES = [
  {
    title: '5-Minute Breathing Reset for Stressful Moments',
    readTime: '3 min read',
    topic: 'Breathing',
    summary: 'Use box breathing to quickly reduce stress response before meetings or study sessions.',
    googleSearchUrl: 'https://www.google.com/search?q=box+breathing+stress+relief+technique',
    content: [
      'Start with box breathing: inhale for 4 seconds, hold for 4, exhale for 4, and hold for 4 again. Repeat this cycle for 2 to 5 minutes.',
      'Keep your shoulders relaxed and place both feet on the floor so your body gets a clear signal that you are safe.',
      'If your thoughts are racing, count each phase softly in your head. This gives your brain a simple task and reduces panic momentum.',
      'Use this reset before class, meetings, exams, or whenever your body feels overstimulated.',
    ],
  },
  {
    title: 'How Sleep and Mood Affect Each Other',
    readTime: '4 min read',
    topic: 'Sleep',
    summary: 'Understand the sleep-stress cycle and simple habits to improve emotional stability.',
    googleSearchUrl: 'https://www.google.com/search?q=sleep+quality+mental+health+mood+connection',
    content: [
      'Poor sleep increases emotional sensitivity, stress reactivity, and mental fatigue. That is why even small sleep loss can make the next day feel heavier.',
      'A stable sleep window matters more than trying to sleep perfectly. Aim to sleep and wake around the same time each day.',
      'Reduce bright screens 30 to 60 minutes before bed, avoid heavy meals late at night, and keep your room cool and quiet.',
      'If you sleep badly one night, focus on recovery habits the next day instead of judging yourself for it.',
    ],
  },
  {
    title: 'Micro Journaling for Busy Days',
    readTime: '2 min read',
    topic: 'Journaling',
    summary: 'Even a 2-line journal note helps your brain process emotions and reduce overwhelm.',
    googleSearchUrl: 'https://www.google.com/search?q=journaling+for+mental+health+emotional+processing',
    content: [
      'Micro journaling works because it lowers the effort needed to reflect. You do not need a perfect entry to benefit.',
      'Try this format: 1) What happened today? 2) How do I feel about it? 3) What do I need next?',
      'When days are overloaded, write only two honest lines. Clarity is more valuable than length.',
      'This habit builds emotional awareness over time and makes patterns easier to notice.',
    ],
  },
];

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thought, setThought] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articlesRefreshKey, setArticlesRefreshKey] = useState(0);

  useEffect(() => {
    fetchDashboard();
    setThought(POSITIVE_THOUGHTS[Math.floor(Math.random() * POSITIVE_THOUGHTS.length)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setThought((prev) => {
        const current = POSITIVE_THOUGHTS.indexOf(prev);
        if (current === -1) return POSITIVE_THOUGHTS[0];
        return POSITIVE_THOUGHTS[(current + 1) % POSITIVE_THOUGHTS.length];
      });
    }, 900000); // Refresh every 15 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setArticlesRefreshKey((prev) => prev + 1);
    }, 900000); // Refresh articles every 15 minutes
    return () => clearInterval(interval);
  }, []);

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

  const todayReset = useMemo(() => {
    const avgStress = Number(dashboard?.statistics?.average_stress_score || 0);
    const latestMood = dashboard?.recent_entries?.[0]?.mood || 'Neutral';

    if (avgStress >= 70) {
      return {
        title: 'Today Reset',
        badge: 'High Support Mode',
        tone: 'rose',
        tip: 'Keep your day small: one priority, one hydration break, one calming reset.',
        actions: ['2-minute breathing', 'Text one trusted person', 'Journal 3 honest lines'],
      };
    }

    if (latestMood === 'Happy' || latestMood === 'Excited') {
      return {
        title: 'Momentum Booster',
        badge: 'Positive Energy',
        tone: 'emerald',
        tip: 'You have emotional energy today. Use it intentionally before it fades.',
        actions: ['Capture one win', 'Plan one focused task', 'Protect tonight\'s sleep'],
      };
    }

    return {
      title: 'Gentle Focus',
      badge: 'Balanced Mode',
      tone: 'sky',
      tip: 'Stay steady with one simple action that keeps your day grounded.',
      actions: ['Drink water now', 'Take a 5-minute walk', 'Write one reflection note'],
    };
  }, [dashboard]);

  if (loading) {
    return (
      <div className="module-shell">
        <div className="module-container animate-pulse space-y-6">
          <div className="h-20 rounded-2xl bg-slate-100" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
          </div>
          <div className="h-40 rounded-2xl bg-slate-100" />
        </div>
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

  const { user, statistics, recent_entries, latest_entry } = dashboard || {};

  const modules = [
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

        {/* ── Welcome Header ── */}
        <div className="module-header-card mb-4">
          <h1 className="module-title">Welcome, {user?.name || 'Friend'} 👋</h1>
          <p className="module-subtitle">Your personal wellness overview — all modules in one place.</p>
        </div>



        {/* ── Motivational Thought + Companion Card ── */}
        <div className="grid lg:grid-cols-[1.45fr_0.95fr] gap-4 mb-6">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
            <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-cyan-100/70 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm ring-1 ring-emerald-100">
                💬
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Daily Motivation</p>
                    <h2 className="text-lg font-bold text-slate-900">Your Thought For Today</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setThought(POSITIVE_THOUGHTS[Math.floor(Math.random() * POSITIVE_THOUGHTS.length)])}
                    className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <div className="max-w-2xl rounded-2xl bg-white/75 px-4 py-4 ring-1 ring-emerald-100 shadow-sm">
                  <p className="text-xl sm:text-2xl font-bold text-slate-800 leading-9 tracking-tight">
                    {thought}
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-emerald-100">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                  Refreshes automatically every 15 minutes
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-3xl border px-5 py-5 shadow-sm hover:shadow-lg transition-all duration-300 ${
            todayReset.tone === 'rose'
              ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50'
              : todayReset.tone === 'emerald'
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50'
              : 'border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50'
          }`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Companion Card</p>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{todayReset.title}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                todayReset.tone === 'rose'
                  ? 'bg-rose-100 text-rose-700'
                  : todayReset.tone === 'emerald'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
              }`}>
                {todayReset.badge}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-700 mb-4">{todayReset.tip}</p>

            <div className="space-y-2">
              {todayReset.actions.map((action, index) => (
                <div key={action} className="flex items-center gap-3 rounded-2xl bg-white/75 px-3 py-2 ring-1 ring-white/80">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Module Quick Access Row ── */}
        <div className="mb-6">
          <h2 className="section-heading mb-3">Your Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <Link
                key={mod.title}
                to={mod.to}
                className={`group rounded-3xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-sky-300 flex flex-col items-center justify-center text-center min-h-[140px] ${mod.color}`}
              >
                <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{mod.icon}</div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-sky-800 transition-colors">{mod.title}</h3>
                <p className="text-xs text-slate-500 mt-1 opacity-80">{mod.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── KPI Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Entries',        value: statistics?.total_entries || 0 },
            { label: 'Days Tracked',          value: statistics?.days_tracked || 0 },
            { label: 'Avg Stress Score',      value: `${statistics?.average_stress_score || 0}/100` },
            { label: 'Current Stress Level',  value: statistics?.current_stress_level || 'Low',
              badge: true, level: statistics?.current_stress_level || 'low' },
          ].map((stat) => (
            <div key={stat.label} className="module-panel text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">{stat.label}</p>
              {stat.badge ? (
                <span className={`inline-block px-3 py-1 rounded-lg font-semibold text-sm stress-${String(stat.level).toLowerCase()}`}>
                  {stat.value}
                </span>
              ) : (
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">

          {/* Left / Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wellness Articles */}
            <div>
              <h3 className="section-heading mb-1">Recommended Reads</h3>
              <p className="section-subheading mb-3">Short articles to support your day. Click any card to read the full article.</p>
              <div className="grid md:grid-cols-3 gap-4">
                {WELLNESS_ARTICLES.map((article) => (
                  <div key={article.title} className="feature-glass rounded-2xl p-4 flex flex-col text-left border border-cyan-100 hover:shadow-xl hover:border-cyan-300 hover:bg-white transition-all duration-200 group">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-semibold">{article.topic}</span>
                      <span className="text-slate-500">{article.readTime}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-cyan-800 transition-colors">{article.title}</h4>
                    <p className="text-xs text-slate-600 mt-2 flex-1">{article.summary}</p>
                    <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedArticle(article)}
                        className="flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900 transition-colors"
                      >
                        Read here
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </button>
                      <a
                        href={article.googleSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <span>🔍</span>
                        Google
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relaxation Sound Player */}
            <RelaxationSounds stressLevel={latest_entry?.stress_level || statistics?.current_stress_level} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* AI Wellness Score */}
            <AIWellnessScore
              moodData={latest_entry?.mood || recent_entries?.[0]?.mood}
              stressLevel={latest_entry?.stress_level || statistics?.current_stress_level}
              sleepHours={Number(latest_entry?.sleep_hours ?? recent_entries?.[0]?.sleep_hours ?? 7)}
              journalActivity={Boolean(latest_entry?.has_journal || recent_entries?.some((e) => e?.has_journal))}
            />

            {/* Quick Panic Link */}
            <Link
              to="/panic-mode"
              className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 hover:bg-rose-100 transition-colors"
            >
              <span className="text-xl">🆘</span>
              <div>
                <p className="text-sm font-bold text-rose-800">Need Help Right Now?</p>
                <p className="text-xs text-rose-600">Open Panic Mode — breathing & AI support</p>
              </div>
              <span className="ml-auto text-rose-400 text-lg">→</span>
            </Link>

          </div>
        </div>

        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[85vh] overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50">
                <div>
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-semibold">{selectedArticle.topic}</span>
                    <span className="text-slate-500">{selectedArticle.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">{selectedArticle.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-104px)] space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">{selectedArticle.summary}</p>
                {selectedArticle.content.map((paragraph) => (
                  <p key={paragraph} className="text-sm text-slate-700 leading-7">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;
