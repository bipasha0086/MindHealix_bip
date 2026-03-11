import React, { useState } from 'react';
import BreathingExercise from './BreathingExercise';
import PanicSupportChat from './PanicSupportChat';
import VoicePanicTrigger from './VoicePanicTrigger';

const GlobalPanicOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  const simulateTrustedCall = () => {
    setCallStatus('Calling trusted contact... Please keep breathing slowly.');
    setTimeout(() => {
      setCallStatus('Trusted contact connected (simulated). You are supported.');
    }, 1500);
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="global-panic-trigger"
          aria-label="Open emergency panic support"
        >
          PANIC HELP
        </button>
      )}

      {isOpen && (
        <div className="global-panic-overlay" role="dialog" aria-modal="true" aria-label="Panic support overlay">
          <div className="global-panic-content">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Immediate Panic Support</h2>
                <p className="text-sm text-slate-600">You are safe. Follow these calming steps now.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <BreathingExercise autoStart />

                <div className="module-panel panic-soft-panel">
                  <h3 className="text-lg font-bold text-slate-900">Calming Instructions</h3>
                  <p className="text-sm text-slate-700 mt-2">You are safe. Try breathing slowly.</p>
                  <ul className="mt-3 text-sm text-slate-700 space-y-1">
                    <li>1. Sit down and rest your feet on the floor.</li>
                    <li>2. Inhale through your nose for 4 seconds.</li>
                    <li>3. Exhale gently for 4 seconds.</li>
                    <li>4. Repeat this for at least 30 seconds.</li>
                  </ul>
                </div>

                <PanicSupportChat />
              </div>

              <div className="space-y-5">
                <div className="module-panel panic-soft-panel">
                  <h3 className="text-lg font-bold text-slate-900">Emergency Call</h3>
                  <p className="text-sm text-slate-600 mt-2">Call a trusted contact to stay with you while this passes.</p>
                  <button
                    type="button"
                    onClick={simulateTrustedCall}
                    className="w-full mt-4 rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700"
                  >
                    Call Trusted Contact
                  </button>
                  {callStatus && <p className="text-sm text-emerald-700 mt-3">{callStatus}</p>}
                </div>

                <VoicePanicTrigger
                  onDetected={() => {
                    setIsOpen(true);
                    setCallStatus('Voice trigger detected. Panic support is active.');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalPanicOverlay;
