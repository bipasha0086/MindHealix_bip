import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();
const USERS_KEY = 'wellnesshub_users';
const SESSION_USER_KEY = 'user';
const LOCAL_MODE = String(process.env.REACT_APP_LOCAL_MODE || 'true').toLowerCase() === 'true';

const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = JSON.parse(window.atob(padded));
    return decoded;
  } catch (_error) {
    return null;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (LOCAL_MODE) {
        const existingUsers = loadUsers();
        if (existingUsers.length === 0) {
          saveUsers([
            {
              id: 'demo-user',
              name: 'Demo User',
              email: 'demo@wellnesshub.local',
              password: 'Demo123',
              createdAt: new Date().toISOString(),
            },
          ]);
        }

        const savedUser = localStorage.getItem(SESSION_USER_KEY);
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (_error) {
            localStorage.removeItem(SESSION_USER_KEY);
            setUser(null);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getProfile();
        const backendUser = response?.data?.user || null;
        if (backendUser) {
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(backendUser));
          setUser(backendUser);
        } else {
          localStorage.removeItem(SESSION_USER_KEY);
          setUser(null);
        }
      } catch (_error) {
        localStorage.removeItem(SESSION_USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (LOCAL_MODE) return undefined;

    const onUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem(SESSION_USER_KEY);

      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };

    window.addEventListener('mindhealix:auth-unauthorized', onUnauthorized);
    return () => window.removeEventListener('mindhealix:auth-unauthorized', onUnauthorized);
  }, []);

  const login = async (email, password) => {
    if (!LOCAL_MODE) {
      try {
        const response = await authAPI.login({
          email: email.trim(),
          password,
        });
        const backendUser = response?.data?.user;

        if (!backendUser) {
          return { success: false, error: 'Login failed' };
        }

        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(backendUser));
        setUser(backendUser);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error?.response?.data?.message || 'Invalid email or password',
        };
      }
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const users = loadUsers();
      const existingUser = users.find(
        (entry) => entry.email === normalizedEmail && entry.password === password
      );

      if (!existingUser) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      const sessionUser = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      };

      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);

      return { success: true };
    } catch (_error) {
      return {
        success: false,
        error: 'Login failed',
      };
    }
  };

  const register = async (name, email, password) => {
    if (!LOCAL_MODE) {
      try {
        const response = await authAPI.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        const backendUser = response?.data?.user;

        if (!backendUser) {
          return { success: false, error: 'Registration failed' };
        }

        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(backendUser));
        setUser(backendUser);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error?.response?.data?.message || 'Registration failed',
        };
      }
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const users = loadUsers();
      const emailExists = users.some((entry) => entry.email === normalizedEmail);

      if (emailExists) {
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      const newUser = {
        id: `${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        password,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      saveUsers(users);

      const sessionUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      };

      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);

      return { success: true };
    } catch (_error) {
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  };

  const googleLoginLocal = (credential) => {
    const payload = decodeJwtPayload(credential);
    const email = String(payload?.email || '').trim().toLowerCase();
    const name = String(payload?.name || 'Google User').trim();

    if (!email) {
      return { success: false, error: 'Google account email was not provided' };
    }

    const users = loadUsers();
    let existingUser = users.find((entry) => entry.email === email);

    if (!existingUser) {
      existingUser = {
        id: `google_${Date.now()}`,
        name,
        email,
        password: '',
        provider: 'google',
        createdAt: new Date().toISOString(),
      };
      users.push(existingUser);
      saveUsers(users);
    }

    const sessionUser = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    };

    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    return { success: true };
  };

  const googleLogin = async (credential) => {
    if (!credential) {
      return { success: false, error: 'Google credential is missing' };
    }

    if (!LOCAL_MODE) {
      try {
        const response = await authAPI.googleLogin({ credential });
        const backendUser = response?.data?.user;

        if (!backendUser) {
          return { success: false, error: 'Google login failed' };
        }

        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(backendUser));
        setUser(backendUser);
        return { success: true };
      } catch (error) {
        // Allow local Google session fallback when backend auth is temporarily unavailable.
        return googleLoginLocal(credential);
      }
    }

    try {
      return googleLoginLocal(credential);
    } catch (_error) {
      return { success: false, error: 'Google login failed' };
    }
  };

  const logout = async () => {
    if (!LOCAL_MODE) {
      try {
        await authAPI.logout();
      } catch (_error) {
        // Proceed with local cleanup even if backend logout fails.
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
  };

  const updateProfile = async ({ name, email }) => {
    if (!LOCAL_MODE) {
      try {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedName = String(name || '').trim();

        const response = await authAPI.updateProfile({
          name: normalizedName,
          email: normalizedEmail,
        });
        const updatedUser = response?.data?.user;
        if (!updatedUser) {
          return { success: false, error: 'Could not update profile' };
        }

        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      } catch (error) {
        return {
          success: false,
          error: error?.response?.data?.message || 'Could not update profile',
        };
      }
    }

    try {
      if (!user?.id) {
        return { success: false, error: 'No active user session' };
      }

      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedName = String(name || '').trim();

      if (!normalizedName) {
        return { success: false, error: 'Name is required' };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { success: false, error: 'Invalid email format' };
      }

      const users = loadUsers();
      const conflict = users.some(
        (entry) => entry.id !== user.id && entry.email === normalizedEmail
      );

      if (conflict) {
        return { success: false, error: 'Email already registered' };
      }

      const updatedUsers = users.map((entry) =>
        entry.id === user.id
          ? {
              ...entry,
              name: normalizedName,
              email: normalizedEmail,
              updatedAt: new Date().toISOString(),
            }
          : entry
      );

      saveUsers(updatedUsers);

      const updatedSessionUser = {
        ...user,
        name: normalizedName,
        email: normalizedEmail,
      };

      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedSessionUser));
      setUser(updatedSessionUser);

      return { success: true, user: updatedSessionUser };
    } catch (_error) {
      return { success: false, error: 'Profile update failed' };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    googleLogin,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
