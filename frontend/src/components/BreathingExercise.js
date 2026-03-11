import React, { useEffect, useMemo, useState } from 'react';

const EXERCISE_DURATION = 30;
const CYCLE_SECONDS = 8;

const BreathingExercise = ({ autoStart = true, onComplete }) => {
  const [remaining, setRemaining] = useState(EXERCISE_DURATION);
  const [running, setRunning] = useState(autoStart);

  useEffect(() => {
    if (!running || remaining <= 0) return undefined;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRunning(false);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, remaining, onComplete]);

  const phase = useMemo(() => {
    const elapsed = EXERCISE_DURATION - remaining;
    const cyclePos = elapsed % CYCLE_SECONDS;
    return cyclePos < 4 ? 'inhale' : 'exhale';
  }, [remaining]);

  const instruction = phase === 'inhale' ? 'Inhale slowly for 4 seconds' : 'Exhale slowly for 4 seconds';

  const resetExercise = () => {
    setRemaining(EXERCISE_DURATION);
    setRunning(true);
  };

  return (
    <div className="module-panel panic-soft-panel">
      <h3 className="text-lg font-bold text-slate-900">Guided Breathing</h3>
      <p className="text-sm text-slate-600 mt-1">You are safe. Try breathing slowly.</p>

      <div className="mt-5 flex flex-col items-center">
        <div className={`breathing-circle ${phase === 'inhale' ? 'breathe-in' : 'breathe-out'}`}>
          <span className="text-white font-semibold capitalize">{phase}</span>
        </div>

        <p className="mt-4 text-base font-semibold text-sky-800">{instruction}</p>
        <p className="text-sm text-slate-600 mt-1">Time left: {remaining}s / {EXERCISE_DURATION}s</p>

        <div className="mt-4 flex gap-2">
          {!running && remaining > 0 && (
            <button
              type="button"
              onClick={() => setRunning(true)}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
            >
              Resume
            </button>
          )}

          {remaining === 0 && (
            <button
              type="button"
              onClick={resetExercise}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              Start Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreathingExercise;
