import React, { useEffect, useRef, useState } from 'react';
import { chatAPI } from '../services/api';

const CHECKIN_STEPS = [
  {
    key: 'intensity',
    question:
      'On a scale of 0-10, how intense is your stress right now? (0 = calm, 10 = worst)',
  },
  {
    key: 'duration',
    question:
      'How long have you been feeling this way? (hours, days, weeks, or months)',
  },
  {
    key: 'trigger',
    question:
      'What feels like the biggest trigger right now? (work, relationships, money, health, studies, or other)',
  },
  {
    key: 'support',
    question:
      'Do you have someone you can contact today for support? (yes/no)',
  },
  {
    key: 'country',
    question:
      'Which country are you in right now? (for local emergency/crisis resources)',
  },
  {
    key: 'safety',
    question:
      'Important safety check: are you thinking about harming yourself right now? (yes/no/unsure)',
  },
];

const CRISIS_MESSAGE =
  "I am really glad you shared this. You deserve support right now. If you are in immediate danger or may act on self-harm thoughts, call your local emergency number now. In the US/Canada call or text 988. If outside these regions, contact your local crisis line immediately.";

const CRISIS_CONTACTS = {
  us: 'US: Call or text 988 (Suicide & Crisis Lifeline)',
  usa: 'US: Call or text 988 (Suicide & Crisis Lifeline)',
  canada: 'Canada: Call or text 988 (Talk Suicide Canada)',
  uk: 'UK: Samaritans 116 123 (24/7)',
  india: 'India: Tele-MANAS 14416 or 1-800-891-4416',
  australia: 'Australia: Lifeline 13 11 14',
  ireland: 'Ireland: Samaritans 116 123',
  pakistan: 'Pakistan: Call local emergency services immediately and seek nearest crisis care',
  uae: 'UAE: Contact local emergency services (998 ambulance / 999 police)',
};

const isAffirmative = (text) => /^(yes|y|yeah|sure|ok|okay|start)$/i.test(text.trim());
const isNegative = (text) => /^(no|n|not now|later)$/i.test(text.trim());

const formatTime = (date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const getCrisisContact = (countryRaw) => {
  const key = String(countryRaw || '').toLowerCase().trim();
  if (!key) return 'If unsure, call your local emergency number now.';
  return CRISIS_CONTACTS[key] || `In ${countryRaw}, please contact your local emergency or crisis helpline immediately.`;
};

const buildTrustedContactMessage = (answers, riskLevel) => {
  const trigger = answers.trigger || 'stress';
  const intensity = answers.intensity ?? 'N/A';
  if (riskLevel === 'high') {
    return `Hi, I am not safe right now and I need immediate support. Can you stay with me on call or in person? My stress is ${intensity}/10 and I am struggling with ${trigger}.`;
  }
  return `Hi, I am having a really hard day and need support. My stress is ${intensity}/10 and I am struggling with ${trigger}. Can we talk today?`;
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      timestamp: new Date(),
      text:
        "Hi, I am your wellness companion. If you feel stressed, type 'check-in' and I will guide you step by step.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [checkin, setCheckin] = useState({
    active: false,
    stepIndex: 0,
    answers: {},
  });
  const [lastSafetyPlan, setLastSafetyPlan] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: 'bot',
        timestamp: new Date(),
        text,
      },
    ]);
  };

  const addUserMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: 'user',
        timestamp: new Date(),
        text,
      },
    ]);
  };

  const startCheckin = () => {
    setCheckin({ active: true, stepIndex: 0, answers: {} });
    setLastSafetyPlan(null);
    addBotMessage(
      'Thank you for trusting me. I will ask 6 short questions to understand your stress and suggest practical next steps.'
    );
    addBotMessage(CHECKIN_STEPS[0].question);
  };

  const getSafetyPlan = (answers) => {
    const intensity = Number(answers.intensity || 0);
    const supportNo = String(answers.support || '').toLowerCase().includes('no');
    const safety = String(answers.safety || '').toLowerCase();
    const crisisContact = getCrisisContact(answers.country);

    const highRisk = safety.includes('yes') || safety.includes('unsure');
    const mediumRisk = !highRisk && (intensity >= 7 || supportNo);

    if (highRisk) {
      return {
        level: 'high',
        contact: crisisContact,
        text:
          `${CRISIS_MESSAGE}\n\n${crisisContact}\n\nRight now, do these 3 things:\n1) Move away from anything you could use to hurt yourself.\n2) Contact one trusted person and stay with them (or ask them to stay with you).\n3) Call/text a crisis line now and tell them exactly how you feel.`,
      };
    }

    if (mediumRisk) {
      return {
        level: 'medium',
        contact: crisisContact,
        text:
          `Your stress level is high enough that you should not handle this alone.\n\n${crisisContact}\n\nAction plan for today:\n1) Do a 2-minute grounding exercise: name 5 things you see, 4 touch, 3 hear, 2 smell, 1 taste.\n2) Send one message to a trusted person: "I am struggling and need support today."\n3) Book a counselor/therapist or helpline check-in in the next 24 hours.`,
      };
    }

    return {
      level: 'low',
      contact: crisisContact,
      text:
        `Thank you for sharing. You seem under manageable stress, and early action helps a lot.\n\nTry this routine:\n1) 10-minute walk without phone.\n2) Write one page: "What is in my control today?"\n3) Sleep target: 7-8 hours tonight.\n4) Check in again tomorrow using "check-in".\n\nIf your stress suddenly spikes, use: ${crisisContact}`,
    };
  };

  const downloadSafetyPlan = (plan) => {
    const text = [
      'Wellness Safety Plan',
      `Generated: ${new Date().toLocaleString()}`,
      `Risk Level: ${plan.level.toUpperCase()}`,
      '',
      'Trusted Contact Message:',
      plan.contactMessage,
      '',
      'Action Plan:',
      plan.text,
      '',
      'Crisis Contact:',
      plan.contact,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wellness-safety-plan.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyTrustedMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message);
      addBotMessage('Trusted-contact message copied. Paste it and send to someone safe now.');
    } catch (_error) {
      addBotMessage('Could not copy automatically. I will show it here so you can copy manually.\n\n' + message);
    }
  };

  const handleCheckinAnswer = (userText) => {
    const step = CHECKIN_STEPS[checkin.stepIndex];
    const nextAnswers = { ...checkin.answers };

    if (step.key === 'intensity') {
      const match = userText.match(/\d+/);
      const value = match ? Number(match[0]) : NaN;
      if (Number.isNaN(value) || value < 0 || value > 10) {
        addBotMessage('Please share a number from 0 to 10 so I can guide you correctly.');
        return;
      }
      nextAnswers.intensity = value;
    } else {
      nextAnswers[step.key] = userText.trim();
    }

    const nextStepIndex = checkin.stepIndex + 1;

    if (nextStepIndex < CHECKIN_STEPS.length) {
      setCheckin({ active: true, stepIndex: nextStepIndex, answers: nextAnswers });
      addBotMessage(CHECKIN_STEPS[nextStepIndex].question);
      return;
    }

    const plan = getSafetyPlan(nextAnswers);
    const contactMessage = buildTrustedContactMessage(nextAnswers, plan.level);
    const fullPlan = { ...plan, contactMessage, answers: nextAnswers };
    setLastSafetyPlan(fullPlan);
    setCheckin({ active: false, stepIndex: 0, answers: {} });

    addBotMessage(
      `Thanks for answering honestly. Risk level: ${plan.level.toUpperCase()}\n\n${plan.text}`
    );

    addBotMessage(`Message you can send right now:\n\n"${contactMessage}"`);

    if (plan.level !== 'low') {
      addBotMessage(
        'I can stay with you now. Send that message to one trusted person and then tell me "done".'
      );
    } else {
      addBotMessage('Would you like a personalized 1-day stress plan based on your trigger?');
    }
  };

  const generateGeneralResponse = (text) => {
    const lower = text.toLowerCase();

    if (/\b(check-?in|stressed|overwhelmed|anxious|panic|can\'t cope)\b/.test(lower)) {
      return 'I hear you. Would you like to do a quick guided check-in now? Type yes to start.';
    }

    if (/\b(suicide|kill myself|self harm|end my life|die)\b/.test(lower)) {
      return `${CRISIS_MESSAGE}\n\n${getCrisisContact('')}`;
    }

    if (/\b(lonely|alone|nobody|isolated)\b/.test(lower)) {
      return 'Feeling alone can be very heavy. A small step right now: send one line to someone safe, "I need a little support today." Want me to help you draft it?';
    }

    if (/\b(sleep|insomnia|tired|exhausted)\b/.test(lower)) {
      return 'Poor sleep can magnify stress. Tonight try this: no screen 30 minutes before bed, warm water, and slow breathing for 2 minutes.';
    }

    if (/\b(work|deadline|job|exam|study|pressure)\b/.test(lower)) {
      return 'That pressure is real. Let us simplify it: what is the next smallest task you can finish in 15 minutes?';
    }

    if (/\b(done)\b/.test(lower) && lastSafetyPlan) {
      return 'Proud of you for taking that step. Stay connected with that person for the next hour. I am here if you want another short grounding exercise.';
    }

    return 'I am here with you. If you want practical support right now, type check-in and I will guide you step by step.';
  };

  const getGeminiResponse = async (userText) => {
    const recentContext = messages
      .slice(-6)
      .map((item) => `${item.sender === 'user' ? 'User' : 'Assistant'}: ${item.text}`);

    try {
      const response = await chatAPI.sendMessage(userText, recentContext);
      return { reply: response?.data?.reply || '', errorType: null };
    } catch (error) {
      const status = error?.response?.status;
      const detail = String(error?.response?.data?.detail || error?.response?.data?.message || '').toLowerCase();

      if (status === 429 || detail.includes('quota exceeded')) {
        return { reply: '', errorType: 'quota' };
      }

      if (detail.includes('api key') || detail.includes('not configured')) {
        return { reply: '', errorType: 'apikey' };
      }

      return { reply: '', errorType: 'unavailable' };
    }
  };

  const getFallbackForError = (errorType, safetyFirst) => {
    if (errorType === 'quota') {
      return `AI chat quota abhi exceed ho gayi hai, isliye main temporary local support mode use kar raha hoon.\n\n${safetyFirst}`;
    }

    if (errorType === 'apikey') {
      return `AI provider API key server par properly configured nahi hai. Tab tak local support mode active hai.\n\n${safetyFirst}`;
    }

    if (errorType === 'unavailable') {
      return `AI service temporary unavailable hai. Main local support mode me help kar raha hoon.\n\n${safetyFirst}`;
    }

    return safetyFirst;
  };

  const handleSend = () => {
    let userText = input.trim();
    if (!userText || isTyping) return;

    // Special handling for 'Share Your Thoughts' quick action
    if (userText === '__share_thoughts') {
      setInput('');
      setIsTyping(true);
      setTimeout(() => {
        addBotMessage(
          'You can share anything on your mind here. I am here to listen, support, and motivate you—especially if you find it hard to open up. Just type your thoughts and I will respond with encouragement.'
        );
        setIsTyping(false);
      }, 400);
      return;
    }

    addUserMessage(userText);
    setInput('');
    setIsTyping(true);

    setTimeout(async () => {
      if (checkin.active) {
        handleCheckinAnswer(userText);
        setIsTyping(false);
        return;
      }

      if (/\bcheck-?in\b/i.test(userText)) {
        startCheckin();
        setIsTyping(false);
        return;
      }

      if (isAffirmative(userText) && messages[messages.length - 1]?.text.includes('guided check-in')) {
        startCheckin();
        setIsTyping(false);
        return;
      }

      if (isNegative(userText) && messages[messages.length - 1]?.text.includes('guided check-in')) {
        addBotMessage('No problem. I am here when you are ready. We can do one small grounding step together anytime.');
        setIsTyping(false);
        return;
      }

      // If the last bot message was the share-thoughts prompt, reply with motivational/empathetic message
      const lastBotMsg = messages.filter((m) => m.sender === 'bot').slice(-1)[0]?.text || '';
      if (lastBotMsg.includes('You can share anything on your mind here')) {
        addBotMessage(
          'Thank you for opening up. It takes courage to share your feelings, especially if you are introverted or feeling alone. Remember, your thoughts matter and you are not alone. Every step you take to express yourself is a step toward healing. Keep going—you are stronger than you think!'
        );
        setIsTyping(false);
        return;
      }

      const safetyFirst = generateGeneralResponse(userText);
      const isCrisisKeyword = /\b(suicide|kill myself|self harm|end my life|die)\b/i.test(userText);

      if (isCrisisKeyword) {
        addBotMessage(safetyFirst);
        setIsTyping(false);
        return;
      }

      const { reply, errorType } = await getGeminiResponse(userText);
      addBotMessage(reply || getFallbackForError(errorType, safetyFirst));
      setIsTyping(false);
    }, 500);
  };

  // Add a new quick action for sharing thoughts
  const quickActions = [
    { label: 'Share Your Thoughts', value: '__share_thoughts' },
    { label: 'Start Check-in', value: 'check-in' },
    { label: 'I feel stressed', value: 'I feel very stressed right now' },
    { label: 'I feel unsafe', value: 'I am having thoughts of harming myself' },
    { label: 'I feel lonely', value: 'I feel lonely' },
    { label: 'I sent the message', value: 'done' },
  ];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-sky-600 text-white shadow-xl hover:bg-sky-700 transition z-50"
          aria-label="Open wellness chat"
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[640px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="bg-sky-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Wellness Support Chat</h3>
              <p className="text-xs text-sky-100">Guided stress and safety check-in</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/90 hover:text-white">
              ✕
            </button>
          </div>

          <div className="bg-amber-50 border-b border-amber-100 text-amber-800 text-xs px-4 py-2">
            This chat supports you but is not a replacement for professional care.
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {lastSafetyPlan && (
              <div className="bg-white border border-sky-200 rounded-2xl p-3">
                <div className="text-sm font-semibold text-slate-800">Current Safety Plan</div>
                <div className="text-xs text-slate-600 mt-1">Risk: {lastSafetyPlan.level.toUpperCase()}</div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => copyTrustedMessage(lastSafetyPlan.contactMessage)}
                    className="text-xs px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                  >
                    Copy Contact Message
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSafetyPlan(lastSafetyPlan)}
                    className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Download Plan
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className={`text-[10px] mt-2 ${msg.sender === 'user' ? 'text-sky-100' : 'text-slate-400'}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500">
                  typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-slate-200 bg-white">
            <div className="flex flex-wrap gap-2 mb-3">
              {quickActions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setInput(item.value)}
                  className="text-xs px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
