import React, { useEffect, useState } from 'react';
import { analyticsAPI, emergencyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [dashboardRes, contactRes, alertsRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        emergencyAPI.getEmergencyContact(),
        emergencyAPI.getEmergencyAlerts(5),
      ]);

      setProfile(dashboardRes?.data?.user || null);
      setStats(dashboardRes?.data?.statistics || null);

      const loadedContact = contactRes?.data?.contact || {};
      setContact({
        name: loadedContact.name || '',
        relation: loadedContact.relation || '',
        phone: loadedContact.phone || '',
      });

      setAlerts(alertsRes?.data?.alerts || []);
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
    try {
      await emergencyAPI.saveEmergencyContact(contact);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Failed to save emergency contact:', error);
    } finally {
      setSaving(false);
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
              {saved && <p className="text-xs text-emerald-700 font-semibold">Saved successfully</p>}

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
      </div>
    </div>
  );
};

export default ProfilePage;
