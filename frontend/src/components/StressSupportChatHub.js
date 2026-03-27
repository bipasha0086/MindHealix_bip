import React, { useState, useEffect } from 'react';
import { stressChatAPI } from '../services/api';

// Component for anonymous chat modes
const StressSupportChatHub = () => {
  const [currentMode, setCurrentMode] = useState(null); // null, 'identity', 'rooms', 'chat'
  const [sessionId, setSessionId] = useState(null);
  const [anonymousUsername, setAnonymousUsername] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState('stressed');
  const [stressLevel, setStressLevel] = useState('medium');
  const [roomType, setRoomType] = useState('public');
  const [statistics, setStatistics] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [topic, setTopic] = useState('General Support');
  const [flaggedMessages, setFlaggedMessages] = useState({});

  // Start anonymous session
  const handleStartSession = async () => {
    setLoading(true);
    try {
      const response = await stressChatAPI.startSession({
        mood,
        stress_level: stressLevel,
      });
      setSessionId(response.session_id);
      setAnonymousUsername(response.anonymous_username);
      setCurrentMode('rooms');
      loadRooms();
      loadStatistics();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start anonymous session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load available rooms
  const loadRooms = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await stressChatAPI.getRooms({
        session_id: sessionId,
        type: roomType === 'all' ? 'all' : roomType,
      });
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await stressChatAPI.getStatistics();
      setStatistics(response);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  // Create new room
  const handleCreateRoom = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await stressChatAPI.createRoom({
        session_id: sessionId,
        room_type: roomType,
        topic: topic,
      });
      setCurrentRoomId(response.room_id);
      setMessages([]);
      setCurrentMode('chat');
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Join room
  const handleJoinRoom = async (roomId) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await stressChatAPI.joinRoom(roomId, { session_id: sessionId });
      setCurrentRoomId(roomId);
      loadMessages(roomId);
      setCurrentMode('chat');
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room. It may be full or inactive.');
    } finally {
      setLoading(false);
    }
  };

  // Load messages from room
  const loadMessages = async (roomId) => {
    try {
      const response = await stressChatAPI.getRoomMessages(roomId, { limit: 50 });
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentRoomId || !sessionId) return;

    setLoading(true);
    try {
      const response = await stressChatAPI.sendMessage(currentRoomId, {
        session_id: sessionId,
        message: messageInput,
      });

      if (response.flagged) {
        setFlaggedMessages((prev) => ({
          ...prev,
          [response.message._id]: 'This message may contain concerning content and has been flagged for moderation.',
        }));
      }

      setMessages((prev) => {
        const next = [...prev, response.message];
        if (response.bot_message) {
          next.push(response.bot_message);
        }
        return next;
      });
      setMessageInput('');
    } catch (error) {
      if (error.response?.status === 403) {
        alert('Your message contains potentially harmful content and cannot be sent. Please revise and try again.');
      } else {
        console.error('Failed to send message:', error);
        alert('Failed to send message. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Leave room
  const handleLeaveRoom = async () => {
    if (!currentRoomId || !sessionId) return;
    try {
      await stressChatAPI.leaveRoom(currentRoomId, { session_id: sessionId });
      setCurrentRoomId(null);
      setMessages([]);
      setCurrentMode('rooms');
      loadRooms();
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  // End session
  const handleEndSession = async () => {
    if (!sessionId) return;
    if (currentRoomId) {
      await handleLeaveRoom();
    }
    try {
      await stressChatAPI.endSession({ session_id: sessionId });
      setSessionId(null);
      setAnonymousUsername(null);
      setCurrentMode(null);
      setMessages([]);
      setRooms([]);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // Report message
  const handleReportMessage = async (messageId) => {
    const reason = prompt('Reason for report (abuse, harassment, self_harm):');
    if (!reason) return;

    try {
      await stressChatAPI.reportMessage({
        message_id: messageId,
        room_id: currentRoomId,
        reason: reason,
        reporter_id: sessionId,
      });
      alert('Thank you for reporting. Our team will review this.');
    } catch (error) {
      console.error('Failed to report message:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  // ===== RENDER: Initial Anonymous Session Start =====
  if (!sessionId) {
    return (
      <div className="module-shell">
        <div className="module-container max-w-2xl">
          <div className="module-header-card mb-6 text-center">
            <h1 className="module-title">🌍 Anonymous Stress Support Network</h1>
            <p className="module-subtitle">
              Connect with others anonymously. Share your feelings in a safe, judgment-free environment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="module-panel">
              <h2 className="text-lg font-bold text-slate-900 mb-4">How It Works</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-lg">🔐</span>
                  <span><strong>Fully Anonymous</strong> - Your real identity stays hidden</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">👥</span>
                  <span><strong>Multiple Modes</strong> - Duet, groups, or public rooms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">🛡️</span>
                  <span><strong>AI Moderation</strong> - Safe environment maintained</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">💬</span>
                  <span><strong>Real-time Chat</strong> - Instant peer support</span>
                </li>
              </ul>
            </div>

            <div className="module-panel border-cyan-200 bg-cyan-50">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Start Your Session</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">How are you feeling?</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="stressed">Stressed</option>
                    <option value="anxious">Anxious</option>
                    <option value="lonely">Lonely</option>
                    <option value="sad">Sad</option>
                    <option value="overwhelmed">Overwhelmed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stress Level</label>
                  <select
                    value={stressLevel}
                    onChange={(e) => setStressLevel(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <button
                  onClick={handleStartSession}
                  disabled={loading}
                  className="w-full rounded-lg bg-cyan-600 text-white py-2.5 text-sm font-bold hover:bg-cyan-700 disabled:opacity-60"
                >
                  {loading ? 'Creating Session...' : 'Start Anonymous Session'}
                </button>

                <p className="text-xs text-slate-600">
                  ⓘ Your session is temporary and fully anonymous. No personal data is stored.
                </p>
              </div>
            </div>
          </div>

          {statistics && (
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <div className="module-panel text-center">
                <div className="text-2xl font-black text-cyan-600">{statistics.active_rooms}</div>
                <div className="text-xs text-slate-600">Active Rooms</div>
              </div>
              <div className="module-panel text-center">
                <div className="text-2xl font-black text-emerald-600">{statistics.active_sessions}</div>
                <div className="text-xs text-slate-600">People Online</div>
              </div>
              <div className="module-panel text-center">
                <div className="text-2xl font-black text-sky-600">{statistics.total_messages}</div>
                <div className="text-xs text-slate-600">Total Messages</div>
              </div>
              <div className="module-panel text-center">
                <div className="text-2xl font-black text-rose-600">{(statistics.rooms_by_type?.public || 0) + (statistics.rooms_by_type?.group || 0) + (statistics.rooms_by_type?.duet || 0)}</div>
                <div className="text-xs text-slate-600">Support Rooms</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDER: Room Selection =====
  if (currentMode === 'rooms') {
    return (
      <div className="module-shell">
        <div className="module-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="module-title">Anonymous Rooms</h1>
              <p className="module-subtitle">Logged in as: <span className="font-bold">{anonymousUsername}</span></p>
            </div>
            <button
              onClick={handleEndSession}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Exit Session
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Create Room Panel */}
            <div className="module-panel md:col-span-1 border-cyan-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Create a Room</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Room Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="duet">1-on-1 Duet</option>
                    <option value="group">3-6 Person Group</option>
                    <option value="public">Public Room</option>
                  </select>
                </div>

                {roomType === 'public' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Topic</label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-100"
                    >
                      <option value="General Support">General Support</option>
                      <option value="Exam Stress">Exam Stress</option>
                      <option value="Work Burnout">Work Burnout</option>
                      <option value="Anxiety">Anxiety</option>
                      <option value="Loneliness">Loneliness</option>
                      <option value="Relationship Issues">Relationship Issues</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full rounded-lg bg-cyan-600 text-white py-2 text-sm font-bold hover:bg-cyan-700 disabled:opacity-60"
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>

            {/* Join Rooms Panel */}
            <div className="module-panel md:col-span-2">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Available Rooms</h2>
              
              <div className="flex gap-2 mb-4">
                {['all', 'duet', 'group', 'public'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setRoomType(type);
                      loadRooms();
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      roomType === type
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'duet' ? '👥 Duet' : type === 'group' ? '👨‍👩‍👧‍👦 Group' : '🌐 Public'}
                  </button>
                ))}
              </div>

              {loading && <div className="text-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div></div>}

              {!loading && rooms.length === 0 && (
                <p className="text-sm text-slate-600 text-center py-6">No rooms available. Create one to get started!</p>
              )}

              {!loading && rooms.length > 0 && (
                <div className="grid gap-3">
                  {rooms.map((room) => (
                    <div
                      key={room._id}
                      className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => handleJoinRoom(room._id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-slate-900">{room.topic || 'Untitled Room'}</div>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-100 text-cyan-700">
                          {room.participant_count}/{room.room_type === 'duet' ? 2 : room.room_type === 'group' ? 6 : '∞'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {room.room_type.toUpperCase()} • {room.message_count || 0} messages
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinRoom(room._id);
                        }}
                        className="mt-2 w-full px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-700 text-xs font-bold hover:bg-cyan-200 transition"
                      >
                        Join Room
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER: Active Chat =====
  if (currentMode === 'chat' && currentRoomId) {
    return (
      <div className="module-shell">
        <div className="module-container flex flex-col h-[calc(100vh-120px)]">
          {/* Header */}
          <div className="module-header-card mb-4 flex items-center justify-between">
            <div>
              <h1 className="module-title text-lg">Anonymous Chat</h1>
              <p className="text-xs text-slate-600">You: <span className="font-bold">{anonymousUsername}</span></p>
            </div>
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Leave Room
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <p className="text-center">
                  <div className="text-3xl mb-2">💬</div>
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg._id} className="rounded-lg bg-white p-3 border border-slate-200">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-700">
                        {msg.sender_id === sessionId
                          ? 'You'
                          : msg.sender_id === 'peer_support_bot'
                            ? 'Support Bot'
                            : 'Other User'}
                      </span>
                      {msg.flagged && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">⚠️ Flagged</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 mb-2">{msg.message}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.sender_id !== sessionId && (
                        <button
                          onClick={() => handleReportMessage(msg._id)}
                          className="text-[11px] text-rose-600 hover:underline"
                        >
                          Report
                        </button>
                      )}
                    </div>
                    {flaggedMessages[msg._id] && (
                      <p className="text-xs text-amber-700 mt-1 italic">{flaggedMessages[msg._id]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Share your thoughts... (Stay supportive and safe)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !messageInput.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-60"
            >
              {loading ? '...' : 'Send'}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-2 text-center">
            🛡️ Messages are moderated for safety. If you're in crisis, please call a mental health hotline.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default StressSupportChatHub;
