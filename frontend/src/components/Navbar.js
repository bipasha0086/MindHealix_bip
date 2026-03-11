import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ICON = {
  Home: '🏠',
  Dashboard: '📊',
  'Mood Tracker': '😊',
  Journal: '📝',
  Analytics: '📈',
  'Stress Lab': '🧪',
  Assessment: '🧠',
  'Panic Mode': '🆘',
  Emergency: '🚨',
  Login: '🔐',
  Register: '✨',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    setDrawerOpen(false);
    navigate('/');
  };

  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      window.addEventListener('mousedown', onClickOutside);
    }

    return () => {
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, [profileOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const isActive = (path) => location.pathname === path;

  const authNavLinks = user
    ? [
        { path: '/', label: 'Home' },
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/mood-tracker', label: 'Mood Tracker' },
        { path: '/journal', label: 'Journal' },
        { path: '/analytics', label: 'Analytics' },
        { path: '/stress-lab', label: 'Stress Lab' },
        { path: '/assessment', label: 'Assessment' },
        { path: '/panic-mode', label: 'Panic Mode' },
        { path: '/emergency-support', label: 'Emergency' },
      ]
    : [];

  const publicNavLinks = [
    { path: '/', label: 'Home' },
    { path: '/login', label: 'Login' },
    { path: '/register', label: 'Register' },
  ];

  const navLinks = user ? authNavLinks : publicNavLinks;
  const quickHeaderLinks = user
    ? [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/mood-tracker', label: 'Track' },
        { path: '/stress-lab', label: 'Stress Lab' },
      ]
    : [
        { path: '/login', label: 'Login' },
        { path: '/register', label: 'Register' },
      ];

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="group p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                aria-label="Open side navigation"
              >
                <div className="w-5 h-4 flex flex-col justify-between">
                  <span className="block h-0.5 bg-slate-700 rounded-full group-hover:w-5 w-5 transition-all"></span>
                  <span className="block h-0.5 bg-slate-700 rounded-full group-hover:w-4 w-4 transition-all"></span>
                  <span className="block h-0.5 bg-slate-700 rounded-full group-hover:w-5 w-5 transition-all"></span>
                </div>
              </button>

              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-white flex items-center justify-center text-lg">🧠</div>
                <div>
                  <div className="text-slate-900 font-bold text-lg">MindHealix</div>
                  <div className="text-[11px] text-slate-500 -mt-0.5">Because Every Mind Deserves to Be Heard.</div>
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              {quickHeaderLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    isActive(link.path)
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                    {String(user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:block text-sm font-semibold text-slate-800 max-w-[120px] truncate">{user.name}</span>
                  <span className="text-slate-500 text-xs">▾</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email || 'wellness user'}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Profile Dashboard
                    </Link>
                    <Link
                      to="/stress-lab"
                      onClick={() => setProfileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                    >
                      My Stress Lab
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-700 hover:bg-rose-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 text-sm font-semibold"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <button
          type="button"
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[1px]"
          aria-label="Close side navigation overlay"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-emerald-50">
          <div>
            <div className="font-bold text-slate-900">Navigation</div>
            <div className="text-[11px] text-slate-600">Explore modules</div>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
            aria-label="Close side navigation"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={closeDrawer}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(link.path)
                  ? 'bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{NAV_ICON[link.label] || '•'}</span>
                <span>{link.label}</span>
              </span>
              {isActive(link.path) && <span className="text-cyan-700">●</span>}
            </Link>
          ))}
        </div>

        <div className="mt-auto p-4 border-t border-slate-200">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100"
            >
              Logout
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={closeDrawer}
                className="px-3 py-2 text-center rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={closeDrawer}
                className="px-3 py-2 text-center rounded-lg bg-sky-600 text-white text-sm font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Navbar;
