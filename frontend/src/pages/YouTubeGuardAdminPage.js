import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { youtubeGuardAPI } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

const parseCsvList = (raw) =>
  String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const YouTubeGuardAdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState({ items: [], summary: {} });
  const [warningEvents, setWarningEvents] = useState([]);
  const [profile, setProfile] = useState({
    strict_mode: false,
    allow_list_channels: [],
    blocked_topics: [],
    custom_block_keywords: [],
  });
  const [allowListInput, setAllowListInput] = useState('');
  const [blockedTopicsInput, setBlockedTopicsInput] = useState('');
  const [customKeywordsInput, setCustomKeywordsInput] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [summaryRes, profileRes, eventsRes] = await Promise.all([
        youtubeGuardAPI.getActivitySummary(40),
        youtubeGuardAPI.getProfile(),
        youtubeGuardAPI.getWarningEvents(100),
      ]);

      const incomingSummary = summaryRes?.data || { items: [], summary: {} };
      const incomingProfile = profileRes?.data?.profile || {
        strict_mode: false,
        allow_list_channels: [],
        blocked_topics: [],
        custom_block_keywords: [],
      };
      const incomingEvents = eventsRes?.data?.events || [];

      setSummaryData(incomingSummary);
      setProfile(incomingProfile);
      setWarningEvents(incomingEvents);
      setAllowListInput((incomingProfile.allow_list_channels || []).join(', '));
      setBlockedTopicsInput((incomingProfile.blocked_topics || []).join(', '));
      setCustomKeywordsInput((incomingProfile.custom_block_keywords || []).join(', '));
    } catch (error) {
      console.error('Failed to load YouTube guard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const riskChartData = useMemo(() => {
    const summary = summaryData.summary || {};
    return {
      labels: ['Low', 'Medium', 'High'],
      datasets: [
        {
          data: [summary.low_risk || 0, summary.medium_risk || 0, summary.high_risk || 0],
          backgroundColor: ['#34d399', '#fbbf24', '#f87171'],
        },
      ],
    };
  }, [summaryData]);

  const timelineChartData = useMemo(() => {
    const timeline = summaryData?.summary?.timeline || [];
    return {
      labels: timeline.map((entry) => entry.date),
      datasets: [
        {
          label: 'Videos analyzed',
          data: timeline.map((entry) => entry.count),
          borderColor: 'rgb(6, 182, 212)',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [summaryData]);

  const channelsChartData = useMemo(() => {
    const channels = summaryData?.summary?.top_channels || [];
    return {
      labels: channels.map((entry) => entry.channel),
      datasets: [
        {
          label: 'Watch frequency',
          data: channels.map((entry) => entry.count),
          backgroundColor: '#38bdf8',
        },
      ],
    };
  }, [summaryData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage('');

    const payload = {
      strict_mode: Boolean(profile.strict_mode),
      allow_list_channels: parseCsvList(allowListInput),
      blocked_topics: parseCsvList(blockedTopicsInput),
      custom_block_keywords: parseCsvList(customKeywordsInput),
    };

    try {
      const res = await youtubeGuardAPI.updateProfile(payload);
      setProfile(res?.data?.profile || payload);
      setSaveMessage('Rules saved successfully.');
      setTimeout(() => setSaveMessage(''), 2200);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaveMessage('Could not save profile.');
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

  const summary = summaryData.summary || {};
  const items = summaryData.items || [];
  const totalWarnings = warningEvents.filter((e) => e.event_type === 'warning').length;
  const totalBlocked = warningEvents.filter((e) => e.event_type === 'blocked').length;

  return (
    <div className="module-shell">
      <div className="module-container">
        <div className="module-header-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="module-title">YouTube Guard Admin</h1>
              <p className="module-subtitle">
                Monitor analyzed YouTube activity and tune user-level guard rules.
              </p>
            </div>
            <button type="button" onClick={() => loadData(true)} className="module-btn-secondary">
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-6 gap-4 mb-6">
          <div className="module-panel">
            <div className="module-kpi">Total Analyzed</div>
            <div className="module-kpi-value">{summary.total || 0}</div>
          </div>
          <div className="module-panel border-emerald-100">
            <div className="module-kpi">Low Risk</div>
            <div className="module-kpi-value text-emerald-600">{summary.low_risk || 0}</div>
          </div>
          <div className="module-panel border-amber-100">
            <div className="module-kpi">Medium Risk</div>
            <div className="module-kpi-value text-amber-600">{summary.medium_risk || 0}</div>
          </div>
          <div className="module-panel border-rose-100">
            <div className="module-kpi">High Risk</div>
            <div className="module-kpi-value text-rose-600">{summary.high_risk || 0}</div>
          </div>
          <div className="module-panel border-orange-100">
            <div className="module-kpi">Warnings Sent</div>
            <div className="module-kpi-value text-orange-600">{totalWarnings}</div>
          </div>
          <div className="module-panel border-red-100">
            <div className="module-kpi">Videos Blocked</div>
            <div className="module-kpi-value text-red-700">{totalBlocked}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="module-panel">
            <h2 className="module-section-title">Risk Distribution</h2>
            <div style={{ height: '300px' }}>
              <Doughnut data={riskChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="module-panel">
            <h2 className="module-section-title">Daily Analyze Volume</h2>
            <div style={{ height: '300px' }}>
              <Line data={timelineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        <div className="module-panel mb-6">
          <h2 className="module-section-title">Top Channels</h2>
          <div style={{ height: '280px' }}>
            <Bar data={channelsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="module-panel">
            <h2 className="module-section-title">User-Level Guard Rules</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
                <span className="text-sm font-semibold text-slate-800">Strict mode</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.strict_mode)}
                  onChange={(e) => setProfile((prev) => ({ ...prev, strict_mode: e.target.checked }))}
                  className="h-4 w-4"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Allow-list Channels (comma separated)</label>
                <textarea
                  value={allowListInput}
                  onChange={(e) => setAllowListInput(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  placeholder="Channel A, Channel B"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Blocked Topics (comma separated)</label>
                <textarea
                  value={blockedTopicsInput}
                  onChange={(e) => setBlockedTopicsInput(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  placeholder="doom scrolling, self harm challenges"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Block Keywords (comma separated)</label>
                <textarea
                  value={customKeywordsInput}
                  onChange={(e) => setCustomKeywordsInput(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  placeholder="hopeless, no reason to live"
                />
              </div>

              <button type="button" onClick={handleSaveProfile} className="module-btn-primary">
                {saving ? 'Saving Rules...' : 'Save Rules'}
              </button>
              {saveMessage && <p className="text-xs font-semibold text-emerald-700">{saveMessage}</p>}
            </div>
          </div>

          <div className="module-panel">
            <h2 className="module-section-title">Recent Activity</h2>
            {items.length === 0 ? (
              <p className="text-sm text-slate-600">No analyzed videos yet.</p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={`${item.video_id || 'unknown'}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title || 'Untitled video'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.channel || 'Unknown channel'}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                          item.risk_level === 'high'
                            ? 'bg-rose-100 text-rose-700'
                            : item.risk_level === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {String(item.risk_level || 'low').toUpperCase()} &bull; {item.risk_score || 0}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'recent'}
                      </span>
                    </div>
                    {!!item?.semantic?.reasoning && (
                      <p className="text-xs text-slate-600 mt-2">AI note: {item.semantic.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warning & Block Event Log */}
        <div className="module-panel mb-6">
          <h2 className="module-section-title">Warning &amp; Block Event Log</h2>
          <p className="text-xs text-slate-500 mb-3">Every warning and block fired by the extension &mdash; video link, time, attempt count.</p>
          {warningEvents.length === 0 ? (
            <p className="text-sm text-slate-600">No warning or block events recorded yet. Trigger a risky video in the extension to see entries here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="px-3 py-2 font-semibold text-slate-700 rounded-tl-lg">Time</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Attempt</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Risk</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Channel</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 rounded-tr-lg">Video</th>
                  </tr>
                </thead>
                <tbody>
                  {warningEvents.map((ev, idx) => (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[11px]">
                        {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                          ev.event_type === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {ev.event_type === 'blocked' ? '🚫 Blocked' : '⚠️ Warning'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-semibold text-center">
                        {ev.warning_count || 1}{ev.warning_limit ? `/${ev.warning_limit}` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                          ev.risk_level === 'high' ? 'bg-rose-100 text-rose-700'
                          : ev.risk_level === 'medium' ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {String(ev.risk_level || 'low').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs max-w-[140px] truncate">{ev.channel || '—'}</td>
                      <td className="px-3 py-2 max-w-[260px]">
                        {ev.page_url ? (
                          <a
                            href={ev.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:underline text-xs line-clamp-1"
                            title={ev.title || ev.page_url}
                          >
                            {ev.title || ev.page_url}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">{ev.title || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubeGuardAdminPage;
