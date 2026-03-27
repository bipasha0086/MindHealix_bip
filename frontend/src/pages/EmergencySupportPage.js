import React, { useEffect, useState } from 'react';
import { emergencyAPI } from '../services/api';

const EmergencySupportPage = () => {
  const [contact, setContact] = useState({ name: '', relation: '', phone: '' });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      const alertsResponse = await emergencyAPI.getEmergencyAlerts(30);

      // Keep form empty by default, don't fetch saved contact
      setContact({
        name: '',
        relation: '',
        phone: '',
      });

      setAlerts(alertsResponse?.data?.alerts || []);
    } catch (error) {
      console.error('Failed to load emergency support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async (e) => {
    e.preventDefault();

    if (!contact.name.trim() || !contact.phone.trim()) {
      setStatusMessage('Please provide contact name and phone number.');
      return;
    }

    try {
      setSaving(true);
      setStatusMessage('');
      await emergencyAPI.saveEmergencyContact(contact);
      setStatusMessage('Emergency contact saved. They will be notified on high stress events.');
      // Clear form after successful save
      setContact({ name: '', relation: '', phone: '' });
    } catch (error) {
      console.error('Failed to save emergency contact:', error);
      setStatusMessage('Could not save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      await emergencyAPI.markEmergencyAlertRead(alertId);
      setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, read: true } : alert)));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="module-shell">
      <div className="module-container">
        <div className="module-header-card mb-6">
          <h1 className="module-title">Emergency Support Module</h1>
          <p className="module-subtitle">
            Add a trusted person. When your stress level is high, the system sends them an emergency alert.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="module-panel border-rose-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Emergency Contact</h2>
            <p className="text-sm text-slate-600 mb-4">Name and phone are required for high stress notifications.</p>

            <form onSubmit={saveContact} className="space-y-3">
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
                placeholder="Relation (Friend, Parent, Partner)"
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
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-rose-600 text-white py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Emergency Contact'}
              </button>
            </form>

            {statusMessage && <p className="text-sm text-emerald-700 mt-3">{statusMessage}</p>}
          </div>

          <div className="module-panel">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Emergency Alert History</h2>
            <p className="text-sm text-slate-600 mb-4">Alerts created when your mood entry reports high stress.</p>

            {alerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                No alerts yet. Alerts will appear here after high stress entries.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`rounded-xl border p-4 ${alert.read ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">{alert.stress_level} Stress Alert</div>
                        <p className="text-sm text-slate-800 mt-1">{alert.message}</p>
                        <p className="text-xs text-slate-600 mt-2">
                          Notified: {alert.contact?.name || 'Contact'} ({alert.contact?.phone || '-'})
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>

                      {!alert.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(alert.id)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencySupportPage;
