import React, { useEffect, useRef, useState } from 'react';

const TRIGGERS = ['help', 'i am having a panic attack', "i'm having a panic attack"];

const VoicePanicTrigger = ({ onDetected }) => {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = String(result[0]?.transcript || '').toLowerCase().trim();

      if (TRIGGERS.some((phrase) => transcript.includes(phrase))) {
        if (onDetected) onDetected(transcript);
      }
    };

    recognition.onend = () => {
      if (listening) {
        try {
          recognition.start();
        } catch (_error) {
          setListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_error) {
        // no-op
      }
    };
  }, [listening, onDetected]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      setListening(false);
      recognition.stop();
      return;
    }

    try {
      recognition.start();
      setListening(true);
    } catch (_error) {
      setListening(false);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Voice trigger is not supported in this browser.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">Voice Panic Trigger</p>
        <p className="text-xs text-slate-600">Say "Help" or "I am having a panic attack".</p>
      </div>
      <button
        type="button"
        onClick={toggleListening}
        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
          listening ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
        }`}
      >
        {listening ? 'Listening...' : 'Enable Voice'}
      </button>
    </div>
  );
};

export default VoicePanicTrigger;
