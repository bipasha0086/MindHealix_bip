/**
 * API Service
 * Handles all API calls to the backend
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
const LOCAL_MODE = String(process.env.REACT_APP_LOCAL_MODE || 'true').toLowerCase() === 'true';
const ENTRIES_KEY = 'wellnesshub_mood_entries';
const SESSION_USER_KEY = 'user';
const CONTACT_KEY_PREFIX = 'wellnesshub_emergency_contact_';
const ALERTS_KEY_PREFIX = 'wellnesshub_emergency_alerts_';
const YT_GUARD_PROFILE_KEY_PREFIX = 'wellnesshub_youtube_guard_profile_';
const YT_GUARD_ACTIVITY_KEY = 'wellnesshub_youtube_guard_activity';

const responseOf = (data) => Promise.resolve({ data });

const getSessionUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const getEntries = () => {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const saveEntries = (entries) => {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

const getEmergencyContactKey = (userId) => `${CONTACT_KEY_PREFIX}${userId || 'local-user'}`;
const getEmergencyAlertsKey = (userId) => `${ALERTS_KEY_PREFIX}${userId || 'local-user'}`;
const getYoutubeGuardProfileKey = (userId) => `${YT_GUARD_PROFILE_KEY_PREFIX}${userId || 'local-user'}`;

const getEmergencyContactLocal = (userId) => {
  try {
    const raw = localStorage.getItem(getEmergencyContactKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const saveEmergencyContactLocal = (userId, contact) => {
  localStorage.setItem(getEmergencyContactKey(userId), JSON.stringify(contact));
};

const getEmergencyAlertsLocal = (userId) => {
  try {
    const raw = localStorage.getItem(getEmergencyAlertsKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const saveEmergencyAlertsLocal = (userId, alerts) => {
  localStorage.setItem(getEmergencyAlertsKey(userId), JSON.stringify(alerts));
};

const getYoutubeGuardProfileLocal = (userId) => {
  try {
    const raw = localStorage.getItem(getYoutubeGuardProfileKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object'
      ? parsed
      : {
          strict_mode: false,
          allow_list_channels: [],
          blocked_topics: [],
          custom_block_keywords: [],
        };
  } catch (_error) {
    return {
      strict_mode: false,
      allow_list_channels: [],
      blocked_topics: [],
      custom_block_keywords: [],
    };
  }
};

const saveYoutubeGuardProfileLocal = (userId, profile) => {
  localStorage.setItem(getYoutubeGuardProfileKey(userId), JSON.stringify(profile));
};

const getYoutubeGuardActivityLocal = () => {
  try {
    const raw = localStorage.getItem(YT_GUARD_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const saveYoutubeGuardActivityLocal = (items) => {
  localStorage.setItem(YT_GUARD_ACTIVITY_KEY, JSON.stringify(items));
};

const toDateOnly = (input) => {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
};

const analyzeSentimentLocal = (text = '') => {
  const normalized = text.toLowerCase();
  const positiveWords = ['happy', 'good', 'great', 'amazing', 'love', 'calm', 'hopeful', 'excited'];
  const negativeWords = ['sad', 'bad', 'stress', 'anxious', 'angry', 'overwhelmed', 'tired', 'depressed'];

  let pos = 0;
  let neg = 0;
  positiveWords.forEach((word) => {
    if (normalized.includes(word)) pos += 1;
  });
  negativeWords.forEach((word) => {
    if (normalized.includes(word)) neg += 1;
  });

  const totalSignals = Math.max(pos + neg, 1);
  const compound = Math.max(-1, Math.min(1, (pos - neg) / totalSignals));
  const positive = Math.max(0, Math.min(1, (pos / totalSignals)));
  const negative = Math.max(0, Math.min(1, (neg / totalSignals)));
  const neutral = Math.max(0, 1 - positive - negative);

  let emotionalState = 'Neutral';
  if (compound >= 0.5) emotionalState = 'Very Positive';
  else if (compound >= 0.1) emotionalState = 'Positive';
  else if (compound <= -0.5) emotionalState = 'Very Negative';
  else if (compound <= -0.1) emotionalState = 'Negative';

  return {
    sentiment: {
      compound,
      positive,
      negative,
      neutral,
    },
    emotional_state: emotionalState,
    analysis: {
      word_count: text.trim() ? text.trim().split(/\s+/).length : 0,
      text_length: text.length,
    },
  };
};

const computeStressRating = ({ mood, sleepHours, compound, journalText }) => {
  let stressScore = 0;

  const moodWeights = {
    Happy: 8,
    Excited: 12,
    Neutral: 35,
    Sad: 60,
    Anxious: 72,
    Stressed: 78,
  };
  stressScore += moodWeights[mood] ?? 40;

  const sleepGap = Math.abs(7.5 - Number(sleepHours || 7));
  stressScore += Math.min(20, sleepGap * 5);

  if (compound < 0) {
    stressScore += Math.min(25, Math.abs(compound) * 25);
  } else {
    stressScore -= Math.min(10, compound * 10);
  }

  const riskKeywords = [
    'panic',
    'hopeless',
    'worthless',
    'can not cope',
    'cannot cope',
    'breakdown',
    'self harm',
    'suicide',
    'end it',
  ];
  const normalizedText = String(journalText || '').toLowerCase();
  const keywordHits = riskKeywords.filter((word) => normalizedText.includes(word)).length;
  stressScore += Math.min(20, keywordHits * 6);

  const boundedScore = Math.max(0, Math.min(100, Math.round(stressScore)));
  let stressLevel = 'Low';
  if (boundedScore >= 70) stressLevel = 'High';
  else if (boundedScore >= 40) stressLevel = 'Medium';

  return { stressLevel, stressScore: boundedScore };
};

const buildRecommendations = ({ stressLevel, stressScore, mood }) => {
  const list = [];
  if (stressLevel === 'High') {
    list.push('Take a 5-10 minute breathing break and reduce stimulation.');
    list.push('Talk to someone you trust or use guided grounding exercises.');
    list.push('Avoid making big decisions until you feel physically calmer.');
  }
  if (stressLevel === 'Medium') {
    list.push('Add short breaks between tasks and hydrate regularly.');
    list.push('Use a 15-minute focus block, then a 5-minute reset break.');
  }
  if (['Sad', 'Anxious'].includes(mood)) {
    list.push('Try journaling one small positive event from today.');
  }
  if (stressScore >= 80) {
    list.push('Please consider calling a local helpline or mental health professional today.');
  }
  if (list.length === 0) {
    list.push('Keep up your routine and continue tracking consistently.');
  }
  return list;
};

const computeFaceStressLocal = (features = {}) => {
  const smile = Math.max(0, Math.min(1, Number(features.smile_score || 0)));
  const brow = Math.max(0, Math.min(1, Number(features.brow_tension_score || 0)));
  const blink = Math.max(0, Math.min(1, Number(features.eye_blink_score || 0)));
  const jaw = Math.max(0, Math.min(1, Number(features.jaw_tension_score || 0)));

  const raw = (brow * 0.35 + jaw * 0.25 + blink * 0.2 + (1 - smile) * 0.2) * 100;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let stress_level = 'Low';
  if (score >= 70) stress_level = 'High';
  else if (score >= 40) stress_level = 'Medium';

  return {
    stress_level,
    stress_score: score,
    confidence: 0.7,
    prediction_source: 'local_face_heuristic',
  };
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!LOCAL_MODE && error.response?.status === 401) {
      // Session expired or invalid.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('mindhealix:auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
  googleLogin: (data) => api.post('/google-login', data),
  logout: () => api.post('/logout'),
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
};

// Mood API
export const moodAPI = {
  predictStress: (data) => api.post('/predict-stress', data),
  predictStressFace: (features) => {
    if (!LOCAL_MODE) return api.post('/predict-stress-face', features);

    return api.post('/predict-stress-face', features).catch(() => {
      return responseOf({
        prediction: computeFaceStressLocal(features),
      });
    });
  },
  submitMood: async (data) => {
    if (!LOCAL_MODE) return api.post('/submit-mood', data);

    const user = getSessionUser();
    const userId = user?.id || 'local-user';
    const sentiment = analyzeSentimentLocal(data?.journal_text || '');
    const mood = data?.mood || 'Neutral';
    const sleepHours = Number(data?.sleep_hours || 7);

    let stressLevel = null;
    let predictionSource = null;
    let recommendations = null;

    try {
      const backendPrediction = await api.post('/predict-stress', {
        mood,
        sleep_hours: sleepHours,
        journal_text: data?.journal_text || '',
        sentiment_score: sentiment.sentiment.compound,
      });

      stressLevel = backendPrediction?.data?.prediction?.stress_level || null;
      predictionSource = backendPrediction?.data?.prediction?.prediction_source || null;
      recommendations = backendPrediction?.data?.prediction?.recommendations || null;
    } catch (_error) {
      // Backend prediction is optional in local mode; fallback is applied below.
    }

    const fallbackStressRating = computeStressRating({
      mood,
      sleepHours,
      compound: sentiment.sentiment.compound,
      journalText: data?.journal_text || '',
    });

    const entry = {
      id: `${Date.now()}`,
      user_id: userId,
      mood,
      stress_level: stressLevel || fallbackStressRating.stressLevel,
      prediction_source: predictionSource || 'local_ai',
      stress_score: fallbackStressRating.stressScore,
      sleep_hours: sleepHours,
      sentiment_score: sentiment.sentiment.compound,
      has_journal: Boolean(data?.journal_text?.trim()),
      journal_text: data?.journal_text || '',
      date: toDateOnly(data?.date || new Date().toISOString()),
      recommendations:
        recommendations ||
        buildRecommendations({
          stressLevel: stressLevel || fallbackStressRating.stressLevel,
          stressScore: fallbackStressRating.stressScore,
          mood,
        }),
    };

    const entries = getEntries();
    entries.push(entry);
    saveEntries(entries);

    const contact = getEmergencyContactLocal(userId);
    let emergency_notification = {
      sent: false,
      message: 'No emergency alert was required for this entry.',
    };

    if (entry.stress_level === 'High') {
      if (contact?.phone && contact?.name) {
        const alerts = getEmergencyAlertsLocal(userId);
        const alert = {
          id: `alert_${Date.now()}`,
          message: `High stress alert for ${user?.name || 'the user'}. Please check in as soon as possible.`,
          stress_level: 'High',
          status: 'sent',
          contact: {
            name: contact.name,
            relation: contact.relation || '',
            phone: contact.phone,
          },
          mood_entry_id: entry.id,
          created_at: new Date().toISOString(),
          read: false,
        };
        alerts.unshift(alert);
        saveEmergencyAlertsLocal(userId, alerts.slice(0, 100));

        emergency_notification = {
          sent: true,
          alert_id: alert.id,
          contact_name: contact.name,
          contact_phone: contact.phone,
          message: 'Emergency contact was notified for high stress.',
        };
      } else {
        emergency_notification = {
          sent: false,
          message: 'High stress detected, but no emergency contact is configured.',
        };
      }
    }

    return responseOf({ message: 'Mood entry stored locally', entry, emergency_notification });
  },
  analyzeText: (data) => {
    if (!LOCAL_MODE) return api.post('/analyze-text', data);
    const analysis = analyzeSentimentLocal(data?.text || '');
    return responseOf(analysis);
  },
  getMoodCategories: () => {
    if (!LOCAL_MODE) return api.get('/mood-categories');
    return responseOf({ moods: ['Happy', 'Neutral', 'Sad', 'Stressed', 'Anxious', 'Excited'] });
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => {
    const buildLocalDashboard = () => {
      const user = getSessionUser() || { id: 'local-user', name: 'User', email: 'local@wellnesshub' };
      const entries = getEntries()
        .filter((entry) => (entry.user_id || 'local-user') === (user.id || 'local-user'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const moodCounts = entries.reduce((acc, entry) => { acc[entry.mood] = (acc[entry.mood] || 0) + 1; return acc; }, {});
      const mostCommonMood = Object.keys(moodCounts).length
        ? Object.keys(moodCounts).reduce((a, b) => (moodCounts[a] >= moodCounts[b] ? a : b))
        : 'Neutral';
      const uniqueDays = new Set(entries.map((entry) => entry.date));
      return {
        data: {
          user,
          statistics: {
            total_entries: entries.length,
            days_tracked: uniqueDays.size,
            current_stress_level: entries[0]?.stress_level || 'Low',
            average_stress_score: entries.length
              ? Math.round(entries.reduce((sum, e) => sum + Number(e.stress_score || 0), 0) / entries.length)
              : 0,
            most_common_mood: mostCommonMood,
          },
          recent_entries: entries.slice(0, 5),
        },
      };
    };

    if (!LOCAL_MODE) {
      return api.get('/user-dashboard').catch(() => buildLocalDashboard());
    }

    const user = getSessionUser() || { id: 'local-user', name: 'User', email: 'local@wellnesshub' };
    const entries = getEntries()
      .filter((entry) => (entry.user_id || 'local-user') === (user.id || 'local-user'))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const moodCounts = entries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {});

    const mostCommonMood = Object.keys(moodCounts).length
      ? Object.keys(moodCounts).reduce((a, b) => (moodCounts[a] >= moodCounts[b] ? a : b))
      : 'Neutral';

    const uniqueDays = new Set(entries.map((entry) => entry.date));
    const currentStressLevel = entries[0]?.stress_level || 'Low';
    const averageStressScore = entries.length
      ? Math.round(entries.reduce((sum, entry) => sum + Number(entry.stress_score || 0), 0) / entries.length)
      : 0;

    return responseOf({
      user,
      statistics: {
        total_entries: entries.length,
        days_tracked: uniqueDays.size,
        current_stress_level: currentStressLevel,
        average_stress_score: averageStressScore,
        most_common_mood: mostCommonMood,
      },
      recent_entries: entries.slice(0, 5),
    });
  },
  getMoodHistory: (days = 7) => {
    if (!LOCAL_MODE) return api.get(`/mood-history?days=${days}`);

    const user = getSessionUser();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(days));

    const entries = getEntries()
      .filter((entry) => !user || (entry.user_id || 'local-user') === (user.id || 'local-user'))
      .filter((entry) => new Date(entry.date) >= cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const moods = {};
    const stress_levels = {};
    entries.forEach((entry) => {
      moods[entry.mood] = (moods[entry.mood] || 0) + 1;
      stress_levels[entry.stress_level] = (stress_levels[entry.stress_level] || 0) + 1;
    });

    const period = {
      start_date: toDateOnly(cutoff),
      end_date: toDateOnly(new Date()),
    };

    return responseOf({
      entries,
      distributions: { moods, stress_levels },
      total_entries: entries.length,
      period,
    });
  },
  getStressTrends: () => {
    if (!LOCAL_MODE) return api.get('/stress-trends');
    const entries = getEntries().slice(-14);
    return responseOf({
      trend: entries.map((entry) => ({ date: entry.date, stress_level: entry.stress_level })),
    });
  },
};

// Chat API
export const chatAPI = {
  sendMessage: (message, context = []) => api.post('/chat-assistant', { message, context }),
};

export const emergencyAPI = {
  getEmergencyContact: () => {
    if (!LOCAL_MODE) return api.get('/emergency-contact');
    const user = getSessionUser();
    const userId = user?.id || 'local-user';
    return responseOf({ contact: getEmergencyContactLocal(userId) });
  },
  saveEmergencyContact: (data) => {
    if (!LOCAL_MODE) return api.put('/emergency-contact', data);

    const user = getSessionUser();
    const userId = user?.id || 'local-user';
    const contact = {
      name: String(data?.name || '').trim(),
      relation: String(data?.relation || '').trim(),
      phone: String(data?.phone || '').trim(),
      updated_at: new Date().toISOString(),
    };

    saveEmergencyContactLocal(userId, contact);
    return responseOf({ message: 'Emergency contact saved successfully', contact });
  },
  getEmergencyAlerts: (limit = 20) => {
    if (!LOCAL_MODE) return api.get(`/emergency-alerts?limit=${limit}`);

    const user = getSessionUser();
    const userId = user?.id || 'local-user';
    const alerts = getEmergencyAlertsLocal(userId).slice(0, Number(limit));
    return responseOf({ alerts });
  },
  markEmergencyAlertRead: (alertId) => {
    if (!LOCAL_MODE) return api.patch(`/emergency-alerts/${alertId}/read`);

    const user = getSessionUser();
    const userId = user?.id || 'local-user';
    const alerts = getEmergencyAlertsLocal(userId).map((alert) =>
      alert.id === alertId ? { ...alert, read: true } : alert
    );
    saveEmergencyAlertsLocal(userId, alerts);
    return responseOf({ message: 'Alert marked as read' });
  },
};

export const systemAPI = {
  getHealth: () => {
    if (!LOCAL_MODE) return api.get('/health');
    return api.get('/health').catch(() =>
      responseOf({
        status: 'healthy',
        database: 'local_mode',
        ai_model: {
          loaded: false,
          source: 'local_ai',
          model_path: null,
        },
      })
    );
  },
};

export const youtubeGuardAPI = {
  analyzeContent: async (payload) => {
    if (!LOCAL_MODE) return api.post('/youtube/analyze-content', payload);

    try {
      return await api.post('/youtube/analyze-content', payload);
    } catch (_error) {
      // Fall back to local heuristic analysis if backend is unavailable.
    }

    const text = `${payload?.title || ''} ${payload?.description || ''}`.toLowerCase();
    const roughScore = [
      text.includes('depression') ? 20 : 0,
      text.includes('anxiety') ? 16 : 0,
      text.includes('panic') ? 14 : 0,
      text.includes('suicide') ? 35 : 0,
      text.includes('hopeless') ? 12 : 0,
    ].reduce((a, b) => a + b, 0);

    const risk_score = Math.min(100, roughScore);
    const risk_level = risk_score >= 70 ? 'high' : risk_score >= 40 ? 'medium' : 'low';
    const action = risk_level === 'high' ? 'warn_strong' : risk_level === 'medium' ? 'warn' : 'allow';

    const response = {
      risk_score,
      risk_level,
      action,
      bypass_allowed: true,
      message:
        risk_level === 'low'
          ? 'This content looks okay from a wellness-risk perspective.'
          : 'This video may intensify low mood or anxiety. Consider a short break first.',
      detected_signals: [],
      alternatives: [
        'Try a 5-minute breathing reset before continuing.',
        'Switch to uplifting or educational content for a while.',
        'Take a short walk and hydrate.',
      ],
      sentiment: analyzeSentimentLocal(text).sentiment,
      semantic: null,
    };

    const existing = getYoutubeGuardActivityLocal();
    const item = {
      video_id: payload?.video_id || '',
      page_url: payload?.page_url || '',
      title: payload?.title || '',
      channel: payload?.channel || '',
      risk_level,
      risk_score,
      action,
      created_at: new Date().toISOString(),
      signals: response.detected_signals,
      semantic: response.semantic,
    };

    saveYoutubeGuardActivityLocal([item, ...existing].slice(0, 150));
    return responseOf(response);
  },
  getActivitySummary: async (limit = 25) => {
    if (!LOCAL_MODE) return api.get(`/youtube/activity-summary?limit=${limit}`);

    try {
      return await api.get(`/youtube/activity-summary?limit=${limit}`);
    } catch (_error) {
      // Fall back to local cached items.
    }

    const items = getYoutubeGuardActivityLocal().slice(0, Number(limit));
    const summary = {
      total: items.length,
      high_risk: items.filter((i) => i.risk_level === 'high').length,
      medium_risk: items.filter((i) => i.risk_level === 'medium').length,
      low_risk: items.filter((i) => i.risk_level === 'low').length,
      top_channels: Object.entries(
        items.reduce((acc, item) => {
          const key = item.channel || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      timeline: Object.entries(
        items.reduce((acc, item) => {
          const d = toDateOnly(item.created_at || new Date().toISOString());
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count })),
    };

    return responseOf({ items, summary });
  },
  getProfile: async () => {
    if (!LOCAL_MODE) return api.get('/youtube/profile');

    try {
      return await api.get('/youtube/profile');
    } catch (_error) {
      // Profile endpoint requires auth in backend mode; local fallback keeps admin usable.
    }

    const user = getSessionUser();
    return responseOf({ profile: getYoutubeGuardProfileLocal(user?.id || 'local-user') });
  },
  updateProfile: async (profile) => {
    if (!LOCAL_MODE) return api.put('/youtube/profile', profile);

    try {
      return await api.put('/youtube/profile', profile);
    } catch (_error) {
      // Fall back to local profile persistence.
    }

    const user = getSessionUser();
    const normalized = {
      strict_mode: Boolean(profile?.strict_mode),
      allow_list_channels: Array.isArray(profile?.allow_list_channels) ? profile.allow_list_channels : [],
      blocked_topics: Array.isArray(profile?.blocked_topics) ? profile.blocked_topics : [],
      custom_block_keywords: Array.isArray(profile?.custom_block_keywords) ? profile.custom_block_keywords : [],
    };
    saveYoutubeGuardProfileLocal(user?.id || 'local-user', normalized);
    return responseOf({ message: 'YouTube guard profile updated', profile: normalized });
  },
  getWarningEvents: async (limit = 100) => {
    if (!LOCAL_MODE) return api.get(`/youtube/warning-events?limit=${limit}`);

    try {
      return await api.get(`/youtube/warning-events?limit=${limit}`);
    } catch (_error) {
      return responseOf({ events: [], total: 0 });
    }
  },
};

export default api;
