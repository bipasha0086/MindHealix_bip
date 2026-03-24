import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BreathingExercise from '../components/BreathingExercise';
import PanicSupportChat from '../components/PanicSupportChat';
import VoicePanicTrigger from '../components/VoicePanicTrigger';
import { emergencyAPI } from '../services/api';

const PanicModePage = () => {
  const navigate = useNavigate();
  const [panicStarted, setPanicStarted] = useState(true);
  const [callStatus, setCallStatus] = useState('');
  const [completedExercise, setCompletedExercise] = useState(false);
  const [trustedContact, setTrustedContact] = useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadContact = async () => {
      try {
        const response = await emergencyAPI.getEmergencyContact();
        if (!isMounted) return;
        setTrustedContact(response?.data?.contact || null);
      } catch (_error) {
        if (isMounted) setTrustedContact(null);
      }
    };

    loadContact();

    return () => {
      isMounted = false;
    };
  }, []);

  const dialablePhone = String(trustedContact?.phone || '').replace(/[^\d+]/g, '');
  const contactLabel = trustedContact?.name || 'trusted contact';

  const callTrustedContact = ({ fromVoice = false } = {}) => {
    if (!dialablePhone) {
      setCallStatus('No emergency contact phone found. Please save one in Profile > Emergency Contact.');
      return;
    }

    setCallStatus(`${fromVoice ? 'Voice trigger detected. ' : ''}Calling ${contactLabel}... Stay connected and breathe slowly.`);

    window.location.href = `tel:${dialablePhone}`;

    setTimeout(() => {
      setCallStatus(`${contactLabel} call intent sent. You are not alone.`);
    }, 1500);
  };

  return (
    <div className="panic-shell min-h-screen py-8">
      <div className="module-container">
        <div className="panic-header-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="module-title">Panic Mode Support</h1>
              <p className="module-subtitle">You are safe. We will guide your breathing and support you step by step.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {panicStarted && (
              <BreathingExercise
                autoStart
                onComplete={() => {
                  setCompletedExercise(true);
                }}
              />
            )}

            <div className="module-panel panic-soft-panel">
              <h3 className="text-lg font-bold text-slate-900">Calm Guidance</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>1. Put both feet on the floor and relax your shoulders.</li>
                <li>2. Inhale through your nose for 4 seconds.</li>
                <li>3. Exhale gently for 4 seconds.</li>
                <li>4. Repeat this cycle until your heartbeat slows down.</li>
              </ul>
              {completedExercise && (
                <p className="mt-4 text-sm font-semibold text-emerald-700">
                  Great work. You completed 30 seconds of guided breathing.
                </p>
              )}
            </div>

            <PanicSupportChat />
          </div>

          <div className="space-y-6">
            <div className="module-panel panic-soft-panel">
              <h3 className="text-lg font-bold text-slate-900">Emergency Actions</h3>
              <p className="text-sm text-slate-600 mt-2">If you need immediate support, contact your trusted person now.</p>

              <button
                type="button"
                onClick={() => callTrustedContact()}
                className="w-full mt-4 rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700"
              >
                Call {contactLabel}
              </button>

              {callStatus && <p className="mt-3 text-sm text-emerald-700">{callStatus}</p>}
            </div>

            <VoicePanicTrigger
              onDetected={() => {
                setPanicStarted(true);
                callTrustedContact({ fromVoice: true });
              }}
            />

            <div className="module-panel panic-soft-panel">
              <h3 className="text-lg font-bold text-slate-900">Supportive Reminder</h3>
              <p className="text-sm text-slate-700 mt-2">
                This intense feeling will pass. You are safe, and help is available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanicModePage;
