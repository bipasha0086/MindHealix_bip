import React, { useState } from 'react';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const getStressLevel = (avg) => {
  if (avg > 14) return { level: 'High', color: 'red-500' };
  if (avg >= 12) return { level: 'Medium', color: 'yellow-500' };
  return { level: 'Low', color: 'green-500' };
};

const ScreentimeModule = () => {
  const [screenTimes, setScreenTimes] = React.useState(Array(7).fill(''));
  const [submitted, setSubmitted] = React.useState(false);
  const [date, setDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  // Week selection state
  const [weekStart, setWeekStart] = React.useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const times = screenTimes.map(Number);
  const avg = times.reduce((a, b) => a + b, 0) / 7;
  const stress = getStressLevel(avg);

  const handleChange = (idx, value) => {
    const updated = [...screenTimes];
    updated[idx] = value.replace(/[^0-9.]/g, '');
    setScreenTimes(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Save entry to localStorage with date
    const entry = {
      screenTimes,
      avg,
      stress: getStressLevel(avg).level,
      date,
      timestamp: new Date().toISOString(),
    };
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('screentimeHistory')) || [];
    } catch {}
    // Overwrite entry for the same date
    const idx = history.findIndex(e => e.date === date);
    if (idx !== -1) history[idx] = entry;
    else history.push(entry);
    localStorage.setItem('screentimeHistory', JSON.stringify(history));
  };

  const handleReset = () => {
    setScreenTimes(Array(7).fill(''));
    setSubmitted(false);
  };

  const data = {
    labels: days,
    datasets: [
      {
        label: 'Screen Time (hours)',
        data: times,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Weekly Screen Time' },
    },
    scales: {
      y: { beginAtZero: true, max: 24 },
    },
  };

  // Show last saved entry from localStorage
  let lastEntry = null;
  try {
    const history = JSON.parse(localStorage.getItem('screentimeHistory')) || [];
    if (history.length > 0) lastEntry = history[history.length - 1];
  } catch {}

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto mt-10 animate__animated animate__fadeIn">
      <h2 className="text-2xl font-bold mb-4 text-center">Weekly Screen Time Tracker</h2>
      {/* Week selection */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-2 md:mb-0">
          <label className="font-semibold mr-2">Select Week Start:</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(e.target.value)}
            className="border rounded px-3 py-2"
            max={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
        <div className="text-sm text-gray-600 mt-2 md:mt-0">
          Showing entries from {weekStart} to {(() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 6);
            return d.toISOString().slice(0, 10);
          })()}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mb-4">
        {days.map((day, idx) => (
          <div key={day} className="mb-2 flex items-center">
            <label className="w-24 font-semibold">{day}:</label>
            <input
              className="border rounded px-3 py-2 w-24"
              type="number"
              min="0"
              step="0.1"
              placeholder="Hours"
              value={screenTimes[idx]}
              onChange={e => handleChange(idx, e.target.value)}
              required
            />
          </div>
        ))}
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2 w-full"
          type="submit"
        >
          Analyze Screen Time
        </button>
        {submitted && (
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 mt-2 w-full"
            type="button"
            onClick={handleReset}
          >
            Reset
          </button>
        )}
      </form>
      {submitted ? (
        <>
          <Bar data={data} options={options} />
          <div className={`mt-4 p-4 rounded bg-${stress.color} text-white text-center font-bold animate__animated animate__fadeIn`}>
            Average Screen Time: {avg.toFixed(1)} hours/day<br />
            Stress Level: {stress.level}
          </div>
        </>
      ) : lastEntry ? (
        <div className={`mt-4 p-4 rounded bg-${getStressLevel(Number(lastEntry.avg)).color} text-white text-center font-bold animate__animated animate__fadeIn`}>
          <div>Last Saved Entry:</div>
          <div>Average Screen Time: {Number(lastEntry.avg).toFixed(1)} hours/day</div>
          <div>Stress Level: {lastEntry.stress}</div>
        </div>
      ) : (
        <div className="mt-4 p-4 rounded bg-gray-300 text-gray-700 text-center font-bold animate__animated animate__fadeIn">
          No screen time entry yet. Please submit your weekly data.
        </div>
      )}

      {/* Calendar/List of entries for selected week */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-2">Screen Time History (Selected Week)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Avg (hrs)</th>
                <th className="border px-2 py-1">Stress</th>
                <th className="border px-2 py-1">Details</th>
              </tr>
            </thead>
            <tbody>
              {(JSON.parse(localStorage.getItem('screentimeHistory')) || [])
                .filter(entry => {
                  if (!entry || !entry.date) return false;
                  // Check if entry.date is within selected week
                  const entryDate = new Date(entry.date);
                  const start = new Date(weekStart);
                  const end = new Date(weekStart);
                  end.setDate(end.getDate() + 6);
                  return entryDate >= start && entryDate <= end;
                })
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((entry, i) => (
                  <tr key={entry.date} className="text-center">
                    <td className="border px-2 py-1">{entry.date}</td>
                    <td className="border px-2 py-1">{Number(entry.avg).toFixed(1)}</td>
                    <td className={`border px-2 py-1 font-bold text-white bg-${getStressLevel(Number(entry.avg)).color}`}>{entry.stress}</td>
                    <td className="border px-2 py-1">
                      {entry.screenTimes.join(', ')}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {/* Stress prediction for the week */}
        <div className="mt-4">
          {(() => {
            // Calculate average for the week
            const weekEntries = (JSON.parse(localStorage.getItem('screentimeHistory')) || [])
              .filter(entry => {
                if (!entry || !entry.date) return false;
                const entryDate = new Date(entry.date);
                const start = new Date(weekStart);
                const end = new Date(weekStart);
                end.setDate(end.getDate() + 6);
                return entryDate >= start && entryDate <= end;
              });
            if (weekEntries.length === 0) return <span className="text-gray-500">No entries for this week.</span>;
            // Compute average of all days in the week
            let total = 0, count = 0;
            weekEntries.forEach(e => {
              e.screenTimes.forEach(val => {
                if (val !== '' && !isNaN(Number(val))) {
                  total += Number(val);
                  count++;
                }
              });
            });
            const weekAvg = count > 0 ? total / count : 0;
            const weekStress = getStressLevel(weekAvg);
            return (
              <div className={`p-4 rounded bg-${weekStress.color} text-white text-center font-bold animate__animated animate__fadeIn`}>
                <div>Week Average Screen Time: {weekAvg.toFixed(1)} hours/day</div>
                <div>Predicted Stress Level: {weekStress.level}</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ScreentimeModule;
