import React, { useMemo, useState } from 'react';

const getSupportiveReply = (message) => {
  const text = String(message || '').toLowerCase();

  if (/can't breathe|cannot breathe|panic|heart|chest/.test(text)) {
    return 'I hear you. Put one hand on your chest and one on your belly. Inhale for 4 seconds, exhale for 4 seconds. You are safe in this moment.';
  }

  if (/dizzy|shaking|sweat|scared|fear/.test(text)) {
    return 'These sensations can happen during panic and they pass. Try grounding: name 5 things you can see, 4 you can touch, 3 you can hear.';
  }

  if (/alone|nobody|help me/.test(text)) {
    return 'You do not have to handle this alone. Tap the trusted contact call button and let someone stay with you while you breathe.';
  }

  return 'You are doing the right thing by reaching out. Keep a slow 4-second inhale and 4-second exhale. Focus on one safe object around you.';
};

const PanicSupportChat = () => {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'I am here with you. Tell me what you feel right now, and I will guide you step by step.',
    },
  ]);

  const chatItems = useMemo(() => messages, [messages]);

  const send = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), sender: 'user', text: trimmed };
    const aiMsg = {
      id: Date.now() + 1,
      sender: 'ai',
      text: getSupportiveReply(trimmed),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setDraft('');
  };

  return (
    <div className="module-panel panic-soft-panel">
      <h3 className="text-lg font-bold text-slate-900">AI Chat Support</h3>
      <p className="text-sm text-slate-600 mt-1">Grounding support and calming guidance in real time.</p>

      <div className="mt-4 rounded-xl border border-sky-100 bg-white p-3 h-64 overflow-auto space-y-2">
        {chatItems.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-br-md'
                  : 'bg-emerald-100 text-slate-800 rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="Type what you are feeling..."
        />
        <button
          type="button"
          onClick={send}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default PanicSupportChat;
