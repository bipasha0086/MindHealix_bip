# 🌍 Anonymous Stress Support Chat - Feature Documentation

## Overview

The **Anonymous Stress Support Chat** is a peer-to-peer emotional support system that allows users to connect with others anonymously in a safe, judgment-free environment. This feature reduces emotional isolation and enables users to share their thoughts without revealing personal identity.

## Features

### 1️⃣ Anonymous Identity System
- **Random Username Generation**: Each session gets a unique anonymous username (e.g., `CalmSoul_84`, `HopeSeeker_77`)
- **No Personal Data Storage**: Real names, emails, and identifying information are never stored
- **Session-Based Authentication**: Each session is temporary and expires when ended
- **Privacy-First Design**: Users control when their session ends

### 2️⃣ Three Communication Modes

#### 🔹 Duet Mode (1-to-1 Chat)
- Private conversations between two anonymous users
- Perfect for one-on-one emotional support
- Real-time messaging
- Block/report functionality
- Capacity: 2 users maximum

#### 🔹 Support Group Mode
- Small group discussions (3-6 users)
- Share experiences with multiple perspectives
- Collective emotional support
- Moderated for safety

#### 🔹 Global Topic Rooms
- Public anonymous rooms focused on specific topics
- Available topics:
  - General Support
  - Exam Stress
  - Work Burnout
  - Anxiety
  - Loneliness
  - Relationship Issues
- Users can join/leave anytime
- Unlimited capacity

### 3️⃣ AI Safety Moderation

All messages are automatically scanned for harmful content using advanced NLP:

**Pattern Detection:**
- Self-harm and suicidal ideation indicators
- Severe mental health crisis language
- Abuse and harassment
- Substance abuse references

**Safety Scoring:**
- Messages receive a safety score (0-100, higher = safer)
- Flagged messages are marked in the UI
- High-risk messages are blocked
- Medium-risk messages are flagged for review

**User Actions:**
- ✅ Allow: Safe message, sent normally
- ⚠️ Flag: Concerning content, sent but flagged
- 🚫 Block: Harmful content, not sent, user notified

### 4️⃣ Community Moderation
- **User Reporting**: Report messages for abuse, harassment, or self-harm
- **Block Users**: Block specific users from your session
- **Review System**: Reported messages are queued for human review
- **Transparent Outcomes**: Users see when content is flagged

## Technical Architecture

### Backend (Flask + MongoDB)

**Collections:**
```
stress_chat_anonymous_users
  - session_id: Unique session identifier
  - anonymous_username: Random generated name
  - mood: User's reported mood (stressed, anxious, lonely, sad, overwhelmed)
  - stress_level: User's stress level (low, medium, high)
  - created_at: Session start time
  - is_active: Whether session is ongoing

stress_chat_rooms
  - room_type: "duet" | "group" | "public"
  - topic: Room topic/name
  - participants: Array of session IDs
  - creator_id: User who created room
  - created_at: Room creation time
  - is_active: Whether room is active
  - message_count: Number of messages

stress_chat_messages
  - room_id: Parent room
  - sender_id: Sender's session ID
  - message: Message content
  - moderation_score: Safety score (0-100)
  - flagged: Whether message was flagged
  - timestamp: Message time

stress_chat_reports
  - message_id: Reported message
  - room_id: Parent room
  - reported_user_id: User being reported
  - reporter_id: User submitting report
  - reason: Report reason
  - status: pending | reviewed | dismissed | actioned
```

**API Endpoints:**

```
POST /api/stress-chat/start-session
  Body: { mood, stress_level }
  Returns: { session_id, anonymous_username, user_id }

GET /api/stress-chat/rooms
  Params: { session_id, type: "all" | "duet" | "group" | "public" }
  Returns: { rooms: [...] }

POST /api/stress-chat/rooms
  Body: { session_id, room_type, topic }
  Returns: { room_id, room {...} }

POST /api/stress-chat/rooms/{id}/join
  Body: { session_id }
  Returns: { message: "Joined successfully" }

POST /api/stress-chat/rooms/{id}/leave
  Body: { session_id }
  Returns: { message: "Left room" }

GET /api/stress-chat/rooms/{id}/messages
  Params: { limit: 50 }
  Returns: { messages: [...] }

POST /api/stress-chat/rooms/{id}/send-message
  Body: { session_id, message }
  Returns: { message: {...}, flagged: boolean }

POST /api/stress-chat/report-message
  Body: {
    message_id, room_id, reason,
    reporter_id, reporter_id
  }
  Returns: { report_id, message }

POST /api/stress-chat/block-user
  Body: { session_id, blocked_user_id }
  Returns: { message: "User blocked" }

POST /api/stress-chat/end-session
  Body: { session_id }
  Returns: { message: "Session ended" }

GET /api/stress-chat/statistics
  Returns: {
    active_rooms, total_messages,
    active_sessions, rooms_by_type
  }
```

### Frontend (React)

**Main Component: `StressSupportChatHub.js`**
- Session initialization
- Room listing and creation
- Real-time chat interface
- Message sending and display
- Moderation feedback UI

**Modes:**
1. **Identity Mode**: Select mood/stress level, start session
2. **Rooms Mode**: Browse available rooms, create new ones
3. **Chat Mode**: Active chat with real-time messages

**Features:**
- Anonymous username display
- Room capacity indicators
- Message timestamps
- Flagged message indicators
- Report/block buttons
- Session statistics

## Safety & Privacy

✅ **What We Do:**
- Generate random usernames
- Never store personal identity
- Auto-delete old sessions
- AI moderate all content
- Allow user reporting
- 256-bit encrypted connections
- Transparent moderation

❌ **What We Don't Do:**
- Store names, emails, phone numbers
- Track users across sessions
- Share user data
- Enable doxxing/harassment
- Allow offensive content

## Usage Guide

### For Users

**Starting a Session:**
1. Click "Peer Support" 🌍 in the navbar
2. Select your mood and stress level
3. Click "Start Anonymous Session"
4. You receive an anonymous username

**Finding a Room:**
- Browse available rooms by type (Duet/Group/Public)
- View participant count and topic
- Click "Join Room" to enter

**Creating a Room:**
- Select room type (Duet/Group/Public)
- Choose a topic for public rooms
- Click "Create Room"
- Others can find and join your room

**Chatting:**
- Type messages in the input box
- Messages are checked for safety before sending
- If flagged, a warning appears but message still sends
- If blocked, you'll see an error message

**Reporting:**
- Hover over a message
- Click "Report"
- Choose a reason (abuse, harassment, self_harm)
- Submit report for human review

**Ending Session:**
- Click "Exit Session"
- Your session and chat history are archived
- You can start a new session anytime

### For Administrators

**Reviewing Reports:**
- Check `stress_chat_reports` collection
- Review reported messages
- Update report status (pending → reviewed → actioned)
- Take action if needed (warn user, archive messages)

**Monitoring Health:**
- Visit `/api/stress-chat/statistics`
- Monitor active sessions and rooms
- Watch for unusual patterns

## Future Enhancements

🚀 **Planned Features:**
- WebSocket for real-time updates
- Message encryption
- Mood trend insights
- Resource recommendations
- Peer support badges/ratings
- Multi-language support
- Voice/video support (with anonymity)
- Integration with crisis hotlines

## Implementation Notes

**Dependencies Added:**
- None! Uses existing Flask, MongoDB, React stack

**Performance Considerations:**
- Message queries limited to 100 max
- Old sessions auto-archived
- Indexes on room_id and sender_id for fast lookups

**Security Measures:**
- No authentication required (session-based)
- Rate limiting recommended
- CORS configured
- Input sanitization on all fields
- SQL injection protection via MongoDB

## Testing

**Manual Test Scenario:**
1. Start anonymous session
2. Create a public room on "Anxiety"
3. Send safe message → Should display normally
4. Send message with "suicide" → Should be blocked
5. Send message with "depression" → Should be flagged
6. Try joining a duet room → Should show capacity error when full
7. Report a message → Should create report record
8. End session → Chat history preserved

## Monitoring & Analytics

Key metrics to track:
- Active sessions per hour
- Messages sent per room type
- Moderation action rate (% of messages flagged/blocked)
- User engagement (average session duration)
- Room completion rate (users who reach support goal)

## References

- [AI Safety Moderation](../backend/ai_model/safety_moderation.py)
- [Stress Chat Routes](../backend/routes/stress_chat.py)
- [Frontend Component](../frontend/src/components/StressSupportChatHub.js)
- [API Service](../frontend/src/services/api.js)
