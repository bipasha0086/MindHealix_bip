import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AuthSplitLayout from '../components/auth/AuthSplitLayout';
import AuthInputField from '../components/auth/AuthInputField';

const MOTIVATION_QUOTES = [
  'Breathe in calm, breathe out pressure. You are doing better than you think.',
  'One healthy decision now can change your whole day.',
  'Healing is not linear. Your effort still counts.',
  'Rest is productive when your mind needs recovery.',
  'You are not behind. You are building resilience at your own pace.',
  'Your current feeling is a moment, not your identity.',
];

const LoginPage = () => {
  const localMode = String(process.env.REACT_APP_LOCAL_MODE || 'true').toLowerCase() === 'true';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * MOTIVATION_QUOTES.length));
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATION_QUOTES.length);
    }, 18000);

    return () => clearInterval(interval);
  }, []);

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ submit: result.error });
    }
  };

  const handleGoogleLogin = async (credential) => {
    setLoading(true);
    const result = await googleLogin(credential);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ submit: result.error });
    }
  };

  return (
    <AuthSplitLayout
      left={(
        <>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 text-cyan-800 text-xs font-semibold px-3 py-1.5">
              <span>Daily Reset</span>
              <span>•</span>
              <span>Mental Health Focus</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-5 leading-tight">
              Welcome Back to Your Calm Space
            </h2>
            <p className="text-slate-600 mt-3 max-w-md">
              Start with a gentle check-in, then move into mood tracking, journaling, and analytics.
            </p>

            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-emerald-900">Motivational Thought</h3>
                <button
                  type="button"
                  onClick={() => setQuoteIndex((prev) => (prev + 1) % MOTIVATION_QUOTES.length)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                  Refresh
                </button>
              </div>
              <p className="text-emerald-900 mt-3 text-base leading-relaxed min-h-[60px]">
                {MOTIVATION_QUOTES[quoteIndex]}
              </p>
              <p className="text-[11px] text-emerald-700 mt-2">Auto-refreshes every 18 seconds.</p>
            </div>

            <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">Mood</div>
                <div className="text-slate-600">Detect patterns</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">Journal</div>
                <div className="text-slate-600">Write or speak</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">Analytics</div>
                <div className="text-slate-600">Track progress</div>
              </div>
            </div>
        </>
      )}
      right={(
        <>
            <div className="text-center mb-6">
              <div className="flex justify-center">
                <BrandMark
                  linkTo={null}
                  iconClassName="w-14 h-14"
                  textClassName="text-slate-900 font-bold text-2xl"
                />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mt-4">Sign In</h1>
              <p className="text-slate-600 mt-1">Continue your wellness journey</p>
            </div>

            {errors.submit && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <AuthInputField
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="you@example.com"
              />

              <AuthInputField
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="Enter your password"
                rightElement={(
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-800 text-sm"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                )}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white py-3 font-semibold hover:opacity-95 transition disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs font-semibold text-slate-500">OR</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={handleGoogleLogin}
              disabled={loading}
              text="signin_with"
            />

            <div className="mt-6 rounded-lg bg-cyan-50 border border-cyan-100 p-3 text-xs text-slate-700">
              {localMode
                ? 'Local mode is enabled. Login/Register data is stored in your browser localStorage.'
                : 'MongoDB mode is enabled. Login/Register uses backend API and database.'}
            </div>

            <p className="text-center text-sm text-slate-600 mt-5">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-cyan-700 font-semibold hover:text-cyan-900">
                Create account
              </Link>
            </p>
        </>
      )}
    />
  );
};

export default LoginPage;
