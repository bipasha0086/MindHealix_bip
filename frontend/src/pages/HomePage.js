import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';
import PageContainer from '../components/layout/PageContainer';

const HomePage = () => {
  const { user } = useAuth();

  const features = [
    {
      title: 'Mood Tracking',
      description: 'Track emotional changes daily and build healthy awareness habits.',
      icon: '📊',
    },
    {
      title: 'AI Sentiment',
      description: 'Analyze your writing in real time and get emotional insights.',
      icon: '🤖',
    },
    {
      title: 'Journal + Voice',
      description: 'Write or speak your thoughts with a smooth journaling workflow.',
      icon: '🎤',
    },
    {
      title: 'Wellness Analytics',
      description: 'Visual trends and stress distribution to monitor progress.',
      icon: '📈',
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="py-14 lg:py-20">
        <PageContainer>
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="animate-rise">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-cyan-100 text-cyan-800 text-sm font-semibold px-4 py-2 mb-5">
              <BrandMark
                linkTo={null}
                iconClassName="w-8 h-8"
                textClassName="text-cyan-900 font-bold text-sm"
              />
              <span className="text-cyan-700">AI-Powered Emotional Support System</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
              Your Daily Space
              <span className="text-cyan-700"> for Calm and Clarity</span>
            </h1>
            <p className="text-slate-600 mt-5 text-lg leading-relaxed max-w-xl">
              Track your mood, reflect with guided journaling, and get AI wellness insights in one focused flow designed for real daily use.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 animate-rise stagger-1">
              {user ? (
                <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold hover:opacity-95 transition">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold hover:opacity-95 transition">
                    Create Free Account
                  </Link>
                  <Link to="/login" className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-8 animate-rise stagger-2">
              <div className="feature-glass rounded-xl p-3">
                <div className="text-xs text-slate-500">Check-in Time</div>
                <div className="text-xl font-bold text-slate-900">2 min/day</div>
              </div>
              <div className="feature-glass rounded-xl p-3">
                <div className="text-xs text-slate-500">AI Guidance</div>
                <div className="text-xl font-bold text-slate-900">Personalized</div>
              </div>
              <div className="feature-glass rounded-xl p-3">
                <div className="text-xs text-slate-500">Progress</div>
                <div className="text-xl font-bold text-slate-900">Trackable</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-100 bg-white/90 backdrop-blur shadow-xl p-8 animate-rise stagger-2">
            <div className="text-5xl animate-float-soft">🧠</div>
            <h3 className="text-2xl font-bold text-slate-900 mt-3">Your Wellness Journey</h3>
            <p className="text-slate-600 mt-2">Track your mental health with AI-powered insights, mood analysis, and personalized support.</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 p-4 border border-sky-200">
                <div className="text-sm font-medium text-sky-700">🎯 Smart Tracking</div>
                <div className="text-base text-slate-700 mt-1">Mood & Stress Analysis</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
                <div className="text-sm font-medium text-emerald-700">🤖 AI Assistance</div>
                <div className="text-base text-slate-700 mt-1">24/7 Chatbot Support</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 border border-amber-200">
                <div className="text-sm font-medium text-amber-700">📊 Deep Insights</div>
                <div className="text-base text-slate-700 mt-1">Visual Analytics</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 p-4 border border-rose-200">
                <div className="text-sm font-medium text-rose-700">🚨 Emergency</div>
                <div className="text-base text-slate-700 mt-1">Panic Support</div>
              </div>
            </div>
          </div>
        </div>
        </PageContainer>
      </section>

      <section className="pb-16">
        <PageContainer>
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">Everything You Need</h2>
        <p className="text-slate-600 text-center mb-8">Core modules for reflection, analysis, and emotional awareness.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div key={feature.title} className={`rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:shadow-md transition animate-rise stagger-${index + 1}`}>
              <div className="text-3xl">{feature.icon}</div>
              <h3 className="text-lg font-bold text-slate-900 mt-3">{feature.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{feature.description}</p>
            </div>
          ))}
        </div>
        </PageContainer>
      </section>
    </div>
  );
};

export default HomePage;
