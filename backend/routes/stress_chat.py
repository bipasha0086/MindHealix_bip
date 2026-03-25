"""
Stress Support Chat routes.
Anonymous peer-to-peer emotional support system.
"""

import uuid
import random
import string
from datetime import datetime
from bson.objectid import ObjectId

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import mongo
from ai_model.safety_moderation import moderate_message


stress_chat_bp = Blueprint("stress_chat", __name__)


# Anonymous username generation
ADJECTIVES = [
    "Calm", "Serene", "Hope", "Bright", "Gentle", "Silent", "Free", "Peaceful",
    "Wise", "Strong", "Kind", "Brave", "Dawn", "Forest", "Ocean", "Sky"
]

NOUNS = [
    "Soul", "Mind", "Heart", "Spirit", "Seeker", "Wanderer", "Dreamer", "Healer",
    "Star", "Light", "Wind", "Wave", "Garden", "Path", "Voice", "Bloom"
]


def generate_anonymous_username():
    """Generate a random anonymous username."""
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    number = random.randint(10, 99)
    return f"{adjective}{noun}_{number}"


# ============================================================================
# ANONYMOUS SESSION MANAGEMENT
# ============================================================================

@stress_chat_bp.route("/stress-chat/start-session", methods=["POST"])
def start_anonymous_session():
    """Start an anonymous chat session."""
    payload = request.get_json(silent=True) or {}
    
    # Generate anonymous identity
    anonymous_username = generate_anonymous_username()
    session_id = str(uuid.uuid4())
    
    # Optional: user declares their mood/stress level
    mood = payload.get("mood", "stressed")  # stressed, anxious, lonely, sad, overwhelmed
    stress_level = payload.get("stress_level", "medium")  # low, medium, high
    
    anonymous_user = {
        "_id": ObjectId(),
        "session_id": session_id,
        "anonymous_username": anonymous_username,
        "mood": mood,
        "stress_level": stress_level,
        "created_at": datetime.utcnow(),
        "last_activity": datetime.utcnow(),
        "is_active": True,
    }
    
    try:
        result = mongo.db.stress_chat_anonymous_users.insert_one(anonymous_user)
        anonymous_user["_id"] = str(result.inserted_id)
        
        return jsonify({
            "session_id": session_id,
            "anonymous_username": anonymous_username,
            "user_id": str(result.inserted_id),
        }), 201
    except Exception as e:
        print(f"Error creating anonymous session: {e}")
        return jsonify({"error": "Failed to start session"}), 500


@stress_chat_bp.route("/stress-chat/end-session", methods=["POST"])
def end_anonymous_session():
    """End an anonymous chat session."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    
    if not session_id:
        return jsonify({"error": "session_id required"}), 400
    
    try:
        mongo.db.stress_chat_anonymous_users.update_one(
            {"session_id": session_id},
            {"$set": {"is_active": False, "ended_at": datetime.utcnow()}}
        )
        
        # Get all rooms user was in and mark for cleanup
        rooms = mongo.db.stress_chat_rooms.find({"participants": session_id})
        for room in rooms:
            room_participants = [p for p in room.get("participants", []) if p != session_id]
            if room_participants:
                mongo.db.stress_chat_rooms.update_one(
                    {"_id": room["_id"]},
                    {"$set": {"participants": room_participants}}
                )
            else:
                # Archive empty rooms
                mongo.db.stress_chat_rooms.delete_one({"_id": room["_id"]})
        
        return jsonify({"message": "Session ended"}), 200
    except Exception as e:
        print(f"Error ending session: {e}")
        return jsonify({"error": "Failed to end session"}), 500


# ============================================================================
# ROOM MANAGEMENT
# ============================================================================

@stress_chat_bp.route("/stress-chat/rooms", methods=["GET"])
def get_available_rooms():
    """Get list of available chat rooms (duet, group, public)."""
    room_type = request.args.get("type", "all")  # all, duet, group, public
    session_id = request.args.get("session_id")
    
    try:
        query = {}
        if room_type != "all":
            query["room_type"] = room_type
        
        # Get only active rooms
        query["is_active"] = True
        
        rooms = list(mongo.db.stress_chat_rooms.find(query, {"messages": 0}).sort("created_at", -1))
        
        for room in rooms:
            room["_id"] = str(room["_id"])
            room["participant_count"] = len(room.get("participants", []))
            room["user_is_member"] = session_id in room.get("participants", [])
        
        return jsonify({"rooms": rooms}), 200
    except Exception as e:
        print(f"Error getting rooms: {e}")
        return jsonify({"error": "Failed to fetch rooms"}), 500


@stress_chat_bp.route("/stress-chat/rooms", methods=["POST"])
def create_chat_room():
    """Create a new chat room."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    room_type = payload.get("room_type")  # duet, group, public
    topic = payload.get("topic", "General Support")
    
    if not session_id or not room_type:
        return jsonify({"error": "session_id and room_type required"}), 400
    
    if room_type not in ["duet", "group", "public"]:
        return jsonify({"error": "Invalid room_type"}), 400
    
    try:
        new_room = {
            "_id": ObjectId(),
            "room_type": room_type,
            "topic": topic,
            "participants": [session_id],
            "creator_id": session_id,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "message_count": 0,
        }
        
        result = mongo.db.stress_chat_rooms.insert_one(new_room)
        new_room["_id"] = str(result.inserted_id)
        
        return jsonify({"room_id": new_room["_id"], "room": new_room}), 201
    except Exception as e:
        print(f"Error creating room: {e}")
        return jsonify({"error": "Failed to create room"}), 500


@stress_chat_bp.route("/stress-chat/rooms/<room_id>/join", methods=["POST"])
def join_chat_room(room_id):
    """Join an existing chat room."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    
    if not session_id:
        return jsonify({"error": "session_id required"}), 400
    
    try:
        room = mongo.db.stress_chat_rooms.find_one({"_id": ObjectId(room_id), "is_active": True})
        
        if not room:
            return jsonify({"error": "Room not found"}), 404
        
        # Check participant limits
        participants = room.get("participants", [])
        if room["room_type"] == "duet" and len(participants) >= 2:
            return jsonify({"error": "Duet room is full"}), 400
        elif room["room_type"] == "group" and len(participants) >= 6:
            return jsonify({"error": "Group room is full"}), 400
        
        # Add participant if not already there
        if session_id not in participants:
            participants.append(session_id)
            mongo.db.stress_chat_rooms.update_one(
                {"_id": ObjectId(room_id)},
                {"$set": {"participants": participants}}
            )
        
        return jsonify({"message": "Joined room successfully"}), 200
    except Exception as e:
        print(f"Error joining room: {e}")
        return jsonify({"error": "Failed to join room"}), 500


@stress_chat_bp.route("/stress-chat/rooms/<room_id>/leave", methods=["POST"])
def leave_chat_room(room_id):
    """Leave a chat room."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    
    if not session_id:
        return jsonify({"error": "session_id required"}), 400
    
    try:
        room = mongo.db.stress_chat_rooms.find_one({"_id": ObjectId(room_id)})
        
        if not room:
            return jsonify({"error": "Room not found"}), 404
        
        participants = room.get("participants", [])
        if session_id in participants:
            participants.remove(session_id)
            
            if participants:
                mongo.db.stress_chat_rooms.update_one(
                    {"_id": ObjectId(room_id)},
                    {"$set": {"participants": participants}}
                )
            else:
                # Archive if no participants
                mongo.db.stress_chat_rooms.update_one(
                    {"_id": ObjectId(room_id)},
                    {"$set": {"is_active": False}}
                )
        
        return jsonify({"message": "Left room"}), 200
    except Exception as e:
        print(f"Error leaving room: {e}")
        return jsonify({"error": "Failed to leave room"}), 500


# ============================================================================
# MESSAGE HANDLING
# ============================================================================

@stress_chat_bp.route("/stress-chat/rooms/<room_id>/messages", methods=["GET"])
def get_room_messages(room_id):
    """Get messages from a chat room."""
    limit = request.args.get("limit", 50, type=int)
    limit = min(limit, 100)  # Max 100 messages
    
    try:
        messages = list(
            mongo.db.stress_chat_messages.find(
                {"room_id": ObjectId(room_id)}
            ).sort("timestamp", -1).limit(limit)
        )
        
        # Reverse to get chronological order
        messages.reverse()
        
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            msg["room_id"] = str(msg["room_id"])
        
        return jsonify({"messages": messages}), 200
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return jsonify({"error": "Failed to fetch messages"}), 500


@stress_chat_bp.route("/stress-chat/rooms/<room_id>/send-message", methods=["POST"])
def send_message(room_id):
    """Send a message in a chat room (REST, WebSocket preferred for real-time)."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    message_text = payload.get("message")
    
    if not session_id or not message_text:
        return jsonify({"error": "session_id and message required"}), 400
    
    try:
        # Safety moderation
        moderation = moderate_message(message_text)
        
        if moderation["action"] == "block":
            return jsonify({
                "error": "Message contains harmful content and cannot be sent",
                "flags": moderation["flags"]
            }), 403
        
        # Store message
        message_doc = {
            "_id": ObjectId(),
            "room_id": ObjectId(room_id),
            "sender_id": session_id,
            "message": message_text,
            "moderation_score": moderation["safety_score"],
            "flagged": moderation["action"] == "flag",
            "timestamp": datetime.utcnow(),
        }
        
        result = mongo.db.stress_chat_messages.insert_one(message_doc)
        
        # Update room message count
        mongo.db.stress_chat_rooms.update_one(
            {"_id": ObjectId(room_id)},
            {
                "$inc": {"message_count": 1},
                "$set": {"last_message_at": datetime.utcnow()}
            }
        )
        
        message_doc["_id"] = str(result.inserted_id)
        message_doc["room_id"] = str(message_doc["room_id"])
        
        return jsonify({"message": message_doc}), 201
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({"error": "Failed to send message"}), 500


# ============================================================================
# REPORTING & MODERATION
# ============================================================================

@stress_chat_bp.route("/stress-chat/report-message", methods=["POST"])
def report_message():
    """Report a message for moderation."""
    payload = request.get_json(silent=True) or {}
    message_id = payload.get("message_id")
    room_id = payload.get("room_id")
    report_reason = payload.get("reason")  # abuse, harassment, self_harm, etc
    reporter_id = payload.get("reporter_id")
    
    if not all([message_id, room_id, report_reason, reporter_id]):
        return jsonify({"error": "message_id, room_id, reason, and reporter_id required"}), 400
    
    try:
        message = mongo.db.stress_chat_messages.find_one({"_id": ObjectId(message_id)})
        if not message:
            return jsonify({"error": "Message not found"}), 404
        
        report = {
            "_id": ObjectId(),
            "message_id": ObjectId(message_id),
            "room_id": ObjectId(room_id),
            "reported_user_id": message["sender_id"],
            "reporter_id": reporter_id,
            "reason": report_reason,
            "message_content": message.get("message", ""),
            "status": "pending",  # pending, reviewed, dismissed, actioned
            "created_at": datetime.utcnow(),
        }
        
        result = mongo.db.stress_chat_reports.insert_one(report)
        
        return jsonify({
            "report_id": str(result.inserted_id),
            "message": "Report submitted successfully"
        }), 201
    except Exception as e:
        print(f"Error reporting message: {e}")
        return jsonify({"error": "Failed to submit report"}), 500


@stress_chat_bp.route("/stress-chat/block-user", methods=["POST"])
def block_user():
    """Block a user (local to session)."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    blocked_user_id = payload.get("blocked_user_id")
    
    if not session_id or not blocked_user_id:
        return jsonify({"error": "session_id and blocked_user_id required"}), 400
    
    try:
        mongo.db.stress_chat_blocked_users.update_one(
            {"session_id": session_id},
            {
                "$addToSet": {"blocked_users": blocked_user_id},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        return jsonify({"message": "User blocked"}), 200
    except Exception as e:
        print(f"Error blocking user: {e}")
        return jsonify({"error": "Failed to block user"}), 500


@stress_chat_bp.route("/stress-chat/statistics", methods=["GET"])
def get_chat_statistics():
    """Get chat statistics."""
    try:
        total_rooms = mongo.db.stress_chat_rooms.count_documents({"is_active": True})
        total_messages = mongo.db.stress_chat_messages.count_documents({})
        active_sessions = mongo.db.stress_chat_anonymous_users.count_documents({"is_active": True})
        
        # Room type breakdown
        room_types = mongo.db.stress_chat_rooms.aggregate([
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$room_type", "count": {"$sum": 1}}}
        ])
        
        room_breakdown = {doc["_id"]: doc["count"] for doc in room_types}
        
        return jsonify({
            "active_rooms": total_rooms,
            "total_messages": total_messages,
            "active_sessions": active_sessions,
            "rooms_by_type": room_breakdown
        }), 200
    except Exception as e:
        print(f"Error getting statistics: {e}")
        return jsonify({"error": "Failed to fetch statistics"}), 500
