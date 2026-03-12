import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AuthSplitLayout from '../components/auth/AuthSplitLayout';
import AuthInputField from '../components/auth/AuthInputField';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      nextErrors.password = 'Use uppercase, lowercase, and a number';
    }

    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await register(formData.name, formData.email, formData.password);
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
      className="animate-rise"
      left={(
        <>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5">
              <span>Join MindHealix</span>
              <span>•</span>
              <span>Safe + Guided</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-5 leading-tight">
              Create Your Mental Wellness Account
            </h2>
            <p className="text-slate-600 mt-3 max-w-md">
              Set up your profile once, then use mood tracking, journaling, and analytics every day with clear guidance.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mt-7">
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="font-semibold text-slate-900">Track Mood</div>
                <p className="text-sm text-slate-600 mt-1">Understand patterns over time.</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="font-semibold text-slate-900">Journal</div>
                <p className="text-sm text-slate-600 mt-1">Write or speak thoughts safely.</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="font-semibold text-slate-900">AI Insights</div>
                <p className="text-sm text-slate-600 mt-1">Get personal recommendations.</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="font-semibold text-slate-900">Progress View</div>
                <p className="text-sm text-slate-600 mt-1">See trends with clear analytics.</p>
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
              <h1 className="text-3xl font-bold text-slate-900 mt-4">Create Account</h1>
              <p className="text-slate-600 mt-1">Start tracking your wellness today</p>
            </div>

            {errors.submit && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInputField
                id="name"
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Your name"
              />

              <AuthInputField
                id="email"
                name="email"
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="you@example.com"
              />

              <AuthInputField
                id="password"
                name="password"
                type="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="At least 8 characters"
              />

              <AuthInputField
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="Re-enter password"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white py-3 font-semibold hover:opacity-95 transition disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
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
              text="signup_with"
            />

            <p className="text-center text-sm text-slate-600 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-700 font-semibold hover:text-cyan-900">
                Sign in
              </Link>
            </p>
        </>
      )}
    />
  );
};

export default RegisterPage;
