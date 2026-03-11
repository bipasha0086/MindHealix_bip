import React, { useEffect, useState } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { analyticsAPI } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState(30);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [timeRange]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getMoodHistory(timeRange);
      setHistory(response.data);
      generateAIInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    } 
  };

  const generateAIInsights = (data) => {
    if (!data || !data.entries || data.entries.length === 0) {
      setAiInsights(null);
      return;
    }

    const entries = data.entries;
    const highStressCount = entries.filter((e) => e.stress_level === 'High').length;
    const avgStressScore = Math.round(
      entries.reduce((sum, e) => sum + Number(e.stress_score || 0), 0) / entries.length
    );

    const recent = entries.slice(-7);
    const older = entries.slice(0, -7);
    const recentAvg = recent.reduce((sum, e) => sum + Number(e.sentiment_score || 0), 0) / recent.length;
    const olderAvg = older.length
      ? older.reduce((sum, e) => sum + Number(e.sentiment_score || 0), 0) / older.length
      : recentAvg;

    const trend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';

    setAiInsights({
      trend,
      avgStressScore,
      highStressPercentage: ((highStressCount / entries.length) * 100).toFixed(1),
      totalEntries: entries.length,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  const { entries = [], distributions = {}, period = {}, total_entries = 0 } = history || {};

  const lineChartData = {
    labels: entries.map((e) => e.date),
    datasets: [
      {
        label: 'Sentiment',
        data: entries.map((e) => e.sentiment_score),
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.12)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const moodChartData = {
    labels: Object.keys(distributions.moods || {}),
    datasets: [
      {
        data: Object.values(distributions.moods || {}),
        backgroundColor: ['#fbbf24', '#94a3b8', '#60a5fa', '#f87171', '#c084fc', '#34d399'],
      },
    ],
  };

  const stressChartData = {
    labels: Object.keys(distributions.stress_levels || {}),
    datasets: [
      {
        label: 'Count',
        data: Object.values(distributions.stress_levels || {}),
        backgroundColor: ['#34d399', '#fbbf24', '#f87171'],
      },
    ],
  };

  return (
    <div className="module-shell">
      <div className="module-container">
        <div className="module-header-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="module-title">Analytics Module</h1>
              <p className="module-subtitle">Trends, stress distribution, and AI interpretation of your entries.</p>
            </div>
            <div className="flex space-x-2 bg-slate-100 rounded-lg p-1">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    timeRange === days ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {aiInsights && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">AI Insight Summary</h2>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-slate-500">Trend</div>
                <div className="font-semibold text-slate-900 capitalize">{aiInsights.trend}</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-slate-500">Avg Stress Score</div>
                <div className="font-semibold text-slate-900">{aiInsights.avgStressScore}/100</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-slate-500">High Stress %</div>
                <div className="font-semibold text-slate-900">{aiInsights.highStressPercentage}%</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-slate-500">Entries</div>
                <div className="font-semibold text-slate-900">{aiInsights.totalEntries}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="module-panel">
            <div className="module-kpi">Total Entries</div>
            <div className="module-kpi-value">{total_entries}</div>
          </div>
          <div className="module-panel">
            <div className="module-kpi">Start Date</div>
            <div className="text-xl font-semibold text-slate-900 mt-1">{period.start_date || '-'}</div>
          </div>
          <div className="module-panel">
            <div className="module-kpi">End Date</div>
            <div className="text-xl font-semibold text-slate-900 mt-1">{period.end_date || '-'}</div>
          </div>
        </div>

        {entries.length > 0 ? (
          <>
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="module-panel">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Sentiment Trend</h3>
                <div style={{ height: '300px' }}>
                  <Line
                    data={lineChartData}
                    options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: -1, max: 1 } } }}
                  />
                </div>
              </div>

              <div className="module-panel">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Mood Distribution</h3>
                <div style={{ height: '300px' }}>
                  <Doughnut data={moodChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>

            <div className="module-panel mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Stress Distribution</h3>
              <div style={{ height: '300px' }}>
                <Bar data={stressChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>

            <div className="module-panel">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Recent Records</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600 border-b">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Mood</th>
                      <th className="py-2 pr-3">Stress</th>
                      <th className="py-2 pr-3">Score</th>
                      <th className="py-2 pr-3">Sentiment</th>
                      <th className="py-2">Sleep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice().reverse().map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 text-slate-800">{entry.date}</td>
                        <td className="py-2 pr-3 text-slate-800">{entry.mood}</td>
                        <td className="py-2 pr-3 text-slate-800">{entry.stress_level}</td>
                        <td className="py-2 pr-3 text-slate-800">{entry.stress_score ?? '-'}</td>
                        <td className="py-2 pr-3 text-slate-800">{Number(entry.sentiment_score || 0).toFixed(2)}</td>
                        <td className="py-2 text-slate-800">{entry.sleep_hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="module-panel text-center p-8">
            <h3 className="text-xl font-bold text-slate-900">No analytics yet</h3>
            <p className="text-slate-600 mt-2">Add mood entries to generate trend charts and AI insights.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
