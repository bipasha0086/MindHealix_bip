import React, { useState } from 'react';

const VoiceInput = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const [recognition, setRecognition] = useState(null);

  React.useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        if (onTranscript) {
          onTranscript(transcript + finalText);
        }
      }
      setInterimTranscript(interimText);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
  }, []);

  const startListening = () => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
      if (onTranscript && transcript) {
        onTranscript(transcript);
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  if (!supported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-800 text-sm">
          ⚠️ Voice input is not supported in your browser. Please try Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🎤</span>
          <h3 className="font-bold text-gray-900">Voice Journal Entry</h3>
        </div>
        {isListening && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">Recording...</span>
          </div>
        )}
      </div>

      {/* Visual Sound Wave Animation */}
      {isListening && (
        <div className="mb-4 flex items-center justify-center space-x-1 h-20">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full animate-soundwave"
              style={{
                animationDelay: `${i * 0.1}s`,
                height: '20px',
              }}
            ></div>
          ))}
        </div>
      )}

      {/* Transcript Display */}
      {(transcript || interimTranscript) && (
        <div className="mb-4 bg-white rounded-lg p-4 min-h-[100px] max-h-[200px] overflow-y-auto shadow-inner">
          <p className="text-gray-900 text-sm leading-relaxed">
            {transcript}
            <span className="text-gray-400 italic">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-3">
        {!isListening ? (
          <button
            onClick={startListening}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            <span className="text-xl">🎤</span>
            <span>Start Speaking</span>
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span className="text-xl">⏹</span>
            <span>Stop Recording</span>
          </button>
        )}
        
        {transcript && (
          <button
            onClick={clearTranscript}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tips */}
      <div className="mt-4 bg-white rounded-lg p-3 shadow-sm">
        <p className="text-xs text-gray-600">
          💡 <span className="font-medium">Tip:</span> Speak naturally about your feelings. The AI will
          analyze your emotions and provide insights.
        </p>
      </div>

      <style jsx>{`
        @keyframes soundwave {
          0%,
          100% {
            height: 20px;
          }
          50% {
            height: 60px;
          }
        }
        .animate-soundwave {
          animation: soundwave 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default VoiceInput;
