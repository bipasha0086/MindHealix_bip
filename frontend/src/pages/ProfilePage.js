import React, { useEffect, useState } from 'react';
import { analyticsAPI, emergencyAPI, youtubeGuardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const parseList = (raw) =>
  String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [contact, setContact] = useState({ name: '', relation: '', phone: '' });
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [restoringContact, setRestoringContact] = useState(false);
  const [recentlyDeletedContact, setRecentlyDeletedContact] = useState(null);
  const [contactActionMessage, setContactActionMessage] = useState('');
  const [contactActionError, setContactActionError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [ytProfile, setYtProfile] = useState({
    strict_mode: false,
    allow_list_channels: [],
    blocked_topics: [],
    custom_block_keywords: [],
  });
  const [ytAllowListInput, setYtAllowListInput] = useState('');
  const [ytBlockedTopicsInput, setYtBlockedTopicsInput] = useState('');
  const [ytKeywordsInput, setYtKeywordsInput] = useState('');
  const [ytSaving, setYtSaving] = useState(false);
  const [ytSaved, setYtSaved] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [dashboardRes, contactRes, alertsRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        emergencyAPI.getEmergencyContact(),
        emergencyAPI.getEmergencyAlerts(5),
      ]);

      const ytProfileRes = await youtubeGuardAPI.getProfile();

      setProfile(dashboardRes?.data?.user || null);
      setStats(dashboardRes?.data?.statistics || null);

      const loadedContact = contactRes?.data?.contact || {};
      setContact({
        name: loadedContact.name || '',
        relation: loadedContact.relation || '',
        phone: loadedContact.phone || '',
      });

      setAlerts(alertsRes?.data?.alerts || []);

      const loadedYtProfile = ytProfileRes?.data?.profile || {
        strict_mode: false,
        allow_list_channels: [],
        blocked_topics: [],
        custom_block_keywords: [],
      };

      setYtProfile(loadedYtProfile);
      setYtAllowListInput((loadedYtProfile.allow_list_channels || []).join(', '));
      setYtBlockedTopicsInput((loadedYtProfile.blocked_topics || []).join(', '));
      setYtKeywordsInput((loadedYtProfile.custom_block_keywords || []).join(', '));
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    setProfileForm({
      name: profile?.name || user?.name || '',
      email: profile?.email || user?.email || '',
    });
  }, [profile?.name, profile?.email, user?.name, user?.email]);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError('');

    const result = await updateProfile(profileForm);
    if (!result.success) {
      setProfileError(result.error || 'Could not update profile');
      setProfileSaving(false);
      return;
    }

    setProfile((prev) => ({
      ...(prev || {}),
      name: result.user?.name || profileForm.name,
      email: result.user?.email || profileForm.email,
    }));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1800);
    setProfileSaving(false);
  };

  const saveEmergencyContact = async () => {
    setSaving(true);
    setSaved(false);
    setContactActionError('');
    try {
      await emergencyAPI.saveEmergencyContact(contact);
      setSaved(true);
      setRecentlyDeletedContact(null);
      setContactActionMessage('Emergency contact saved.');
      setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Failed to save emergency contact:', error);
      setContactActionError('Could not save emergency contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmergencyContact = async () => {
    const hasAnyContact = Boolean(contact.name || contact.relation || contact.phone);
    if (!hasAnyContact) return;

    const confirmed = window.confirm('Delete saved emergency contact?');
    if (!confirmed) return;

    setDeletingContact(true);
    setContactActionError('');
    try {
      const response = await emergencyAPI.deleteEmergencyContact();
      setRecentlyDeletedContact(response?.data?.deleted_contact || null);
      setContact({ name: '', relation: '', phone: '' });
      setSaved(false);
      setContactActionMessage('Emergency contact deleted. You can restore it anytime.');
    } catch (error) {
      console.error('Failed to delete emergency contact:', error);
      setContactActionError('Could not delete emergency contact.');
    } finally {
      setDeletingContact(false);
    }
  };

  const restoreEmergencyContact = async () => {
    setRestoringContact(true);
    setContactActionError('');
    try {
      const response = await emergencyAPI.restoreEmergencyContact();
      const restored = response?.data?.contact || {};
      setContact({
        name: restored.name || '',
        relation: restored.relation || '',
        phone: restored.phone || '',
      });
      setRecentlyDeletedContact(null);
      setContactActionMessage('Emergency contact restored successfully.');
    } catch (error) {
      console.error('Failed to restore emergency contact:', error);
      setContactActionError('No deleted contact available to restore.');
    } finally {
      setRestoringContact(false);
    }
  };

  const saveYouTubeGuardProfile = async () => {
    setYtSaving(true);
    setYtSaved(false);

    const payload = {
      strict_mode: Boolean(ytProfile.strict_mode),
      allow_list_channels: parseList(ytAllowListInput),
      blocked_topics: parseList(ytBlockedTopicsInput),
      custom_block_keywords: parseList(ytKeywordsInput),
    };

    try {
      const response = await youtubeGuardAPI.updateProfile(payload);
      const persisted = response?.data?.profile || payload;
      setYtProfile(persisted);
      setYtSaved(true);
      setTimeout(() => setYtSaved(false), 1800);
    } catch (error) {
      console.error('Failed to save YouTube guard profile:', error);
    } finally {
      setYtSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="module-shell">
        <div className="module-container flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-shell">
      <div className="module-container">
        <div className="module-header-card mb-6">
          <h1 className="module-title">Profile Dashboard</h1>
          <p className="module-subtitle">Your personal details and emergency setup in one place.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="module-panel lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Account Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Name</div>
                <div className="text-base font-bold text-slate-900 mt-1">{profile?.name || 'User'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Email</div>
                <div className="text-base font-bold text-slate-900 mt-1 break-all">{profile?.email || '-'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Total Entries</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats?.total_entries || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Days Tracked</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats?.days_tracked || 0}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Edit Profile</h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-bold hover:bg-cyan-700"
                >
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
                {profileSaved && <p className="text-xs text-emerald-700 font-semibold">Profile updated</p>}
                {profileError && <p className="text-xs text-rose-700 font-semibold">{profileError}</p>}
              </div>
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Wellness Snapshot</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">Current Stress</div>
                <div className={`inline-block mt-1 px-2 py-1 rounded-md text-xs font-bold stress-${String(stats?.current_stress_level || 'low').toLowerCase()}`}>
                  {stats?.current_stress_level || 'Low'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">Average Stress Score</div>
                <div className="text-lg font-black text-slate-900">{stats?.average_stress_score || 0}/100</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500 text-xs">Most Common Mood</div>
                <div className="text-base font-bold text-slate-900">{stats?.most_common_mood || 'Neutral'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="module-panel border-rose-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Emergency Contact</h2>
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
                placeholder="Relation"
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
                className="w-full rounded-lg bg-rose-600 text-white py-2.5 text-sm font-bold hover:bg-rose-700"
              >
                {saving ? 'Saving...' : 'Save Emergency Contact'}
              </button>
              <button
                type="button"
                onClick={deleteEmergencyContact}
                disabled={deletingContact || (!contact.name && !contact.relation && !contact.phone)}
                className="w-full rounded-lg border border-rose-300 bg-white text-rose-700 py-2.5 text-sm font-bold hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingContact ? 'Deleting...' : 'Delete Saved Contact'}
              </button>
              <button
                type="button"
                onClick={restoreEmergencyContact}
                disabled={restoringContact || !recentlyDeletedContact}
                className="w-full rounded-lg border border-emerald-300 bg-white text-emerald-700 py-2.5 text-sm font-bold hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {restoringContact ? 'Restoring...' : 'Restore Last Deleted Contact'}
              </button>
              {saved && <p className="text-xs text-emerald-700 font-semibold">Saved successfully</p>}
              {contactActionMessage && <p className="text-xs text-emerald-700 font-semibold">{contactActionMessage}</p>}
              {contactActionError && <p className="text-xs text-rose-700 font-semibold">{contactActionError}</p>}

              <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm">
                <div className="text-xs text-slate-500 mb-1">Saved Contact Preview</div>
                <div className="font-semibold text-slate-900">{contact.name || '-'}</div>
                <div className="text-slate-700">{contact.relation || '-'}</div>
                <div className="text-slate-900 font-bold">{contact.phone || '-'}</div>
              </div>
            </div>
          </div>

          <div className="module-panel">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Emergency Alerts</h2>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id || alert._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">{alert.message || 'Emergency alert'}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'recent'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No recent alerts.</p>
            )}
          </div>
        </div>

        <div className="module-panel mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">YouTube Guard Rules</h2>
          <p className="text-sm text-slate-600 mb-4">
            Configure user-level filtering rules used by the YouTube wellness guard analyzer.
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-800">Strict Mode</span>
                <input
                  type="checkbox"
                  checked={Boolean(ytProfile.strict_mode)}
                  onChange={(e) => setYtProfile((prev) => ({ ...prev, strict_mode: e.target.checked }))}
                  className="h-4 w-4"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Allow-list Channels</label>
                <textarea
                  value={ytAllowListInput}
                  onChange={(e) => setYtAllowListInput(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  placeholder="Channel One, Channel Two"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Blocked Topics</label>
                <textarea
                  value={ytBlockedTopicsInput}
                  onChange={(e) => setYtBlockedTopicsInput(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  placeholder="doom content, self-harm trends"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Keywords</label>
                <textarea
                  value={ytKeywordsInput}
                  onChange={(e) => setYtKeywordsInput(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  placeholder="hopeless, no reason to live"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={saveYouTubeGuardProfile}
              className="rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-bold hover:bg-cyan-700"
            >
              {ytSaving ? 'Saving Rules...' : 'Save YouTube Rules'}
            </button>
            {ytSaved && <p className="text-xs text-emerald-700 font-semibold">Rules saved successfully</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
