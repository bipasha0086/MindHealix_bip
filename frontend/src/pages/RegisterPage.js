import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen py-10 px-4 sm:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="feature-glass rounded-3xl p-7 sm:p-9 border border-cyan-100 animate-rise">
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
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-7 animate-rise stagger-1">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-lg">
                🌤️
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
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                    errors.name
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400'
                  }`}
                  placeholder="Your name"
                />
                {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                    errors.email
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400'
                  }`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                    errors.password
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400'
                  }`}
                  placeholder="At least 8 characters"
                />
                {errors.password && <p className="text-rose-600 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                    errors.confirmPassword
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400'
                  }`}
                  placeholder="Re-enter password"
                />
                {errors.confirmPassword && (
                  <p className="text-rose-600 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white py-3 font-semibold hover:opacity-95 transition disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-700 font-semibold hover:text-cyan-900">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
