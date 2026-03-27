import React, { useRef, useState } from 'react';

const JournalVoiceInput = ({ onText, placeholder = 'Speak your journal entry...' }) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onText) onText(transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  if (!supported) {
    return <div>Your browser does not support speech recognition.</div>;
  }

  return (
    <div style={{ margin: '1em 0' }}>
      <button
        onClick={listening ? stopListening : startListening}
        style={{
          background: listening ? '#fbbf24' : '#10b981',
          color: '#fff',
          border: 'none',
          borderRadius: '1.5em',
          padding: '0.75em 1.5em',
          fontSize: '1em',
          cursor: 'pointer',
        }}
      >
        {listening ? 'Stop Listening' : 'Start Voice Input'}
      </button>
      <div style={{ marginTop: 8, color: '#666' }}>{placeholder}</div>
    </div>
  );
};

export default JournalVoiceInput;
