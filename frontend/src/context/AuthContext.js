import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();
const USERS_KEY = 'wellnesshub_users';
const SESSION_USER_KEY = 'user';

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
    // Seed a demo account for local-mode onboarding.
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
  }, []);

  const login = async (email, password) => {
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

  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
  };

  const updateProfile = async ({ name, email }) => {
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
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
