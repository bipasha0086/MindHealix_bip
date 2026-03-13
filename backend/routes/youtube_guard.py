"""
YouTube wellness guard routes.
Analyzes YouTube content metadata for mental health risk signals and returns safer suggestions.
"""

from datetime import datetime
import base64
import json
import re
from threading import Lock
from urllib import parse
from urllib import error, request as urllib_request

from bson.objectid import ObjectId
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ai_model.recommendations import get_activity_suggestions, get_recommendations
from ai_model.sentiment_analyzer import analyze_sentiment
from extensions import mongo


youtube_guard_bp = Blueprint("youtube_guard", __name__)


_SIGNAL_PATTERNS = [
    ("self_harm", r"\b(suicid(?:e|al)|self[-\s]?harm|end\s+my\s+life|kill\s+myself)\b", 35),
    ("severe_depression", r"\b(hopeless|worthless|empty\s+inside|severe\s+depression)\b", 15),
    ("depression", r"\b(depression|depressed|major\s+depressive)\b", 10),
    ("anxiety", r"\b(anxiety|panic\s+attack|constant\s+fear|overthinking)\b", 8),
    ("doom_content", r"\b(doom|nobody\s+cares|life\s+is\s+over|dark\s+thoughts)\b", 8),
]

_DEFAULT_PROFILE = {
    "strict_mode": False,
    "allow_list_channels": [],
    "blocked_topics": [],
    "custom_block_keywords": [],
}

_ACTIVITY_FALLBACK = []
_WARNING_EVENTS_FALLBACK = []
_FALLBACK_LOCK = Lock()


def _safe_object_id(value):
    raw = _safe_str(value)
    if not raw:
        return None
    try:
        return ObjectId(raw)
    except Exception:
        return None


def _safe_str(value):
    if value is None:
        return ""
    return str(value).strip()


def _to_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _normalize_phone(raw_phone, default_country_code):
    digits = re.sub(r"\D+", "", _safe_str(raw_phone))
    if not digits:
        return ""
    if str(raw_phone).strip().startswith("+"):
        return f"+{digits}"
    cc = _safe_str(default_country_code) or "+91"
    if not cc.startswith("+"):
        cc = f"+{cc}"
    return f"{cc}{digits}"


def _get_user_emergency_contact(user_id):
    object_id = _safe_object_id(user_id)
    if not object_id:
        return None

    try:
        user = mongo.db.users.find_one({"_id": object_id}, {"emergency_contact": 1})
    except Exception:
        user = None

    contact = (user or {}).get("emergency_contact") or {}
    if not isinstance(contact, dict):
        return None

    phone = _safe_str(contact.get("phone"))
    if not phone:
        return None

    return {
        "name": _safe_str(contact.get("name")),
        "relation": _safe_str(contact.get("relation")),
        "phone": phone,
    }


def _twilio_request(method, url, payload, sid, token, timeout=12):
    auth_raw = f"{sid}:{token}".encode("utf-8")
    auth = base64.b64encode(auth_raw).decode("utf-8")
    encoded = parse.urlencode(payload).encode("utf-8")
    req = urllib_request.Request(
        url,
        data=encoded,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "User-Agent": "MindHealix-YouTube-Guard/1.0",
        },
        method=method,
    )
    with urllib_request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _send_twilio_threshold_alert(payload):
    sid = _safe_str(current_app.config.get("TWILIO_ACCOUNT_SID") or current_app.config.get("TWILIO_SID"))
    token = _safe_str(current_app.config.get("TWILIO_AUTH_TOKEN"))
    if not sid or not token:
        return {
            "sent": False,
            "reason": "twilio_credentials_missing",
        }

    default_cc = _safe_str(current_app.config.get("TWILIO_DEFAULT_COUNTRY_CODE", "+91")) or "+91"
    user_contact = _get_user_emergency_contact(payload.get("user_id"))
    to_phone = _normalize_phone(
        payload.get("alert_to")
        or (user_contact or {}).get("phone")
        or current_app.config.get("TWILIO_ALERT_TO")
        or current_app.config.get("TWILIO_TO"),
        default_cc,
    )
    if not to_phone:
        return {
            "sent": False,
            "reason": "receiver_phone_missing",
        }

    title = _safe_str(payload.get("title")) or "Unknown video"
    channel = _safe_str(payload.get("channel")) or "Unknown channel"
    risk_level = _safe_str(payload.get("risk_level")).upper() or "HIGH"
    warning_count = int(payload.get("warning_count") or 0)
    warning_limit = int(payload.get("warning_limit") or 0)
    page_url = _safe_str(payload.get("page_url"))
    event_type = _safe_str(payload.get("event_type") or "blocked").lower()

    if event_type == "warning":
        limit_part = f" of {warning_limit}" if warning_limit else ""
        message_text = (
            f"\u26a0\ufe0f MindHealix Warning {warning_count}{limit_part}\n"
            f"Risk: {risk_level}\n"
            f"Title: {title}\n"
            f"Channel: {channel}\n"
            f"URL: {page_url}"
        )
    else:
        message_text = (
            f"\U0001f6ab MindHealix BLOCKED after {warning_count} warning(s).\n"
            f"Risk: {risk_level}\n"
            f"Title: {title}\n"
            f"Channel: {channel}\n"
            f"URL: {page_url}"
        )

    channels_raw = _safe_str(current_app.config.get("TWILIO_ALERT_CHANNELS", "whatsapp"))
    channels = [item.strip().lower() for item in channels_raw.split(",") if item.strip()]
    channels = channels or ["whatsapp"]

    base_url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}"
    results = []

    if "whatsapp" in channels:
        whatsapp_from = _safe_str(current_app.config.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"))
        if not whatsapp_from.startswith("whatsapp:"):
            whatsapp_from = f"whatsapp:{whatsapp_from}"
        try:
            wa_result = _twilio_request(
                "POST",
                f"{base_url}/Messages.json",
                {
                    "From": whatsapp_from,
                    "To": f"whatsapp:{to_phone}",
                    "Body": message_text,
                },
                sid,
                token,
            )
            results.append({"channel": "whatsapp", "ok": True, "sid": wa_result.get("sid")})
        except Exception as exc:
            results.append({"channel": "whatsapp", "ok": False, "error": str(exc)})

    if "sms" in channels:
        sms_from = _safe_str(current_app.config.get("TWILIO_SMS_FROM"))
        if sms_from:
            sms_from = _normalize_phone(sms_from, default_cc)
            try:
                sms_result = _twilio_request(
                    "POST",
                    f"{base_url}/Messages.json",
                    {
                        "From": sms_from,
                        "To": to_phone,
                        "Body": message_text,
                    },
                    sid,
                    token,
                )
                results.append({"channel": "sms", "ok": True, "sid": sms_result.get("sid")})
            except Exception as exc:
                results.append({"channel": "sms", "ok": False, "error": str(exc)})
        else:
            results.append({"channel": "sms", "ok": False, "error": "TWILIO_SMS_FROM missing"})

    if "call" in channels and _to_bool(current_app.config.get("TWILIO_CALL_ENABLED"), default=False):
        call_from = _safe_str(current_app.config.get("TWILIO_CALL_FROM"))
        if call_from:
            call_from = _normalize_phone(call_from, default_cc)
            twiml = (
                "<Response><Say voice='alice'>Mind Healix alert. Safety threshold exceeded on YouTube. "
                f"Risk level {risk_level}. Warning count {warning_count}."
                "</Say></Response>"
            )
            try:
                call_result = _twilio_request(
                    "POST",
                    f"{base_url}/Calls.json",
                    {
                        "From": call_from,
                        "To": to_phone,
                        "Twiml": twiml,
                    },
                    sid,
                    token,
                )
                results.append({"channel": "call", "ok": True, "sid": call_result.get("sid")})
            except Exception as exc:
                results.append({"channel": "call", "ok": False, "error": str(exc)})
        else:
            results.append({"channel": "call", "ok": False, "error": "TWILIO_CALL_FROM missing"})

    sent = any(item.get("ok") for item in results)
    return {
        "sent": sent,
        "to": to_phone,
        "contact": user_contact,
        "results": results,
    }


def _create_emergency_alert(payload, alert_result):
    object_id = _safe_object_id(payload.get("user_id"))
    if not object_id:
        return

    contact = alert_result.get("contact") or _get_user_emergency_contact(payload.get("user_id"))
    if not contact:
        return

    try:
        mongo.db.emergency_alerts.insert_one(
            {
                "user_id": object_id,
                "message": (
                    "MindHealix detected repeated high-risk YouTube content and notified the emergency contact."
                ),
                "stress_level": "High",
                "status": "sent" if alert_result.get("sent") else "processed",
                "contact": {
                    "name": _safe_str(contact.get("name")),
                    "relation": _safe_str(contact.get("relation")),
                    "phone": _safe_str(contact.get("phone")),
                },
                "video_context": {
                    "video_id": _safe_str(payload.get("video_id")),
                    "title": _safe_str(payload.get("title")),
                    "channel": _safe_str(payload.get("channel")),
                    "page_url": _safe_str(payload.get("page_url")),
                    "warning_count": int(payload.get("warning_count") or 0),
                    "warning_limit": int(payload.get("warning_limit") or 0),
                    "event_type": _safe_str(payload.get("event_type") or "blocked"),
                },
                "created_at": datetime.utcnow(),
                "read": False,
            }
        )
    except Exception:
        return


def _safe_str_list(items):
    if not isinstance(items, list):
        return []
    return [str(item).strip() for item in items if str(item).strip()]


def _build_text_blob(payload):
    fields = [
        _safe_str(payload.get("title")),
        _safe_str(payload.get("description")),
        _safe_str(payload.get("channel")),
        _safe_str(payload.get("transcript")),
        _safe_str(payload.get("comments_summary")),
        _safe_str(payload.get("search_query")),
    ]
    return "\n".join([field for field in fields if field])


def _normalized_profile(payload):
    profile = payload if isinstance(payload, dict) else {}
    return {
        "strict_mode": bool(profile.get("strict_mode", False)),
        "allow_list_channels": _safe_str_list(profile.get("allow_list_channels", [])),
        "blocked_topics": _safe_str_list(profile.get("blocked_topics", [])),
        "custom_block_keywords": _safe_str_list(profile.get("custom_block_keywords", [])),
    }


def _resolve_profile(payload):
    inline_profile = _normalized_profile(payload.get("rule_profile", {}))
    user_id = _safe_str(payload.get("user_id"))

    if not user_id:
        return {**_DEFAULT_PROFILE, **inline_profile}

    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {"youtube_guard_profile": 1})
    except Exception:
        user = None

    stored = _normalized_profile((user or {}).get("youtube_guard_profile", {}))
    merged = {**_DEFAULT_PROFILE, **stored, **inline_profile}
    return merged


def _extract_signal_hits(text_blob):
    hits = []
    score = 0
    lowered = text_blob.lower()

    for label, pattern, weight in _SIGNAL_PATTERNS:
        match_count = len(re.findall(pattern, lowered, flags=re.IGNORECASE))
        if match_count > 0:
            weighted = weight * min(match_count, 3)
            score += weighted
            hits.append(
                {
                    "label": label,
                    "matches": match_count,
                    "weight": weighted,
                }
            )

    return hits, min(score, 100)


def _extra_topic_signal_hits(text_blob, profile):
    lowered = text_blob.lower()
    hits = []
    score = 0

    topics = profile.get("blocked_topics", []) + profile.get("custom_block_keywords", [])
    for topic in topics:
        escaped = re.escape(topic.lower())
        match_count = len(re.findall(rf"\b{escaped}\b", lowered, flags=re.IGNORECASE))
        if match_count > 0:
            weighted = min(20, 7 * match_count)
            score += weighted
            hits.append(
                {
                    "label": f"user_topic:{topic}",
                    "matches": match_count,
                    "weight": weighted,
                }
            )

    return hits, min(score, 40)


def _post_json(url, body, headers, timeout=12):
    req = urllib_request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib_request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _semantic_score_groq(api_key, model, text_blob):
    prompt = (
        "You are scoring mental-health content risk for a wellness browser guard. "
        "Return strict JSON only with keys risk_score (0-100 integer), reasoning (short string), "
        "risk_tags (array of short strings). Consider depression/anxiety/self-harm intensity and sensational style. "
        f"\n\nContent:\n{text_blob[:4000]}"
    )

    parsed = _post_json(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "Return valid JSON only. No markdown. No prose.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.1,
            "max_tokens": 220,
        },
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "MindHealix-YouTube-Guard/1.0",
        },
    )

    content = str(((parsed.get("choices") or [{}])[0].get("message") or {}).get("content", "")).strip()
    data = json.loads(content)
    risk_score = max(0, min(100, int(data.get("risk_score", 0))))
    return {
        "provider": "groq",
        "model": model,
        "risk_score": risk_score,
        "reasoning": _safe_str(data.get("reasoning")),
        "risk_tags": _safe_str_list(data.get("risk_tags", [])),
    }


def _semantic_score_gemini(api_key, model, text_blob):
    prompt = (
        "Score this content for mental wellness risk from 0-100 and return strict JSON only with keys "
        "risk_score (int), reasoning (string), risk_tags (array of strings)."
        f"\n\nContent:\n{text_blob[:4000]}"
    )

    parsed = _post_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        {
            "contents": [
                {
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 180,
            },
        },
        {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "MindHealix-YouTube-Guard/1.0",
        },
    )

    text = ""
    candidates = parsed.get("candidates") or []
    if candidates:
        parts = ((candidates[0].get("content") or {}).get("parts") or [])
        text = "\n".join(str(part.get("text", "")) for part in parts if part.get("text"))

    data = json.loads(text.strip())
    risk_score = max(0, min(100, int(data.get("risk_score", 0))))
    return {
        "provider": "gemini",
        "model": model,
        "risk_score": risk_score,
        "reasoning": _safe_str(data.get("reasoning")),
        "risk_tags": _safe_str_list(data.get("risk_tags", [])),
    }


def _semantic_assessment(text_blob):
    provider = str(current_app.config.get("YT_SEMANTIC_PROVIDER", "off")).lower()
    if provider not in {"off", "groq", "gemini", "auto"}:
        provider = "off"

    if provider == "off":
        return None

    attempts = []
    if provider in {"groq", "auto"}:
        attempts.append(("groq", current_app.config.get("GROQ_API_KEY", ""), current_app.config.get("YT_GROQ_MODEL", current_app.config.get("GROQ_MODEL", "llama-3.1-8b-instant"))))
    if provider in {"gemini", "auto"}:
        attempts.append(("gemini", current_app.config.get("GEMINI_API_KEY", ""), current_app.config.get("YT_GEMINI_MODEL", current_app.config.get("GEMINI_MODEL", "gemini-2.0-flash"))))

    for attempt_provider, api_key, model in attempts:
        if not _safe_str(api_key):
            continue

        try:
            if attempt_provider == "groq":
                return _semantic_score_groq(api_key, model, text_blob)
            return _semantic_score_gemini(api_key, model, text_blob)
        except (ValueError, KeyError, error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError):
            continue
        except Exception:
            continue

    return None


def _risk_from_signals(signal_score, sentiment_compound):
    negativity = max(0.0, -float(sentiment_compound))
    sentiment_score = min(35, int(round(negativity * 35)))
    total = min(100, signal_score + sentiment_score)

    if total >= 70:
        level = "high"
        action = "warn_strong"
    elif total >= 40:
        level = "medium"
        action = "warn"
    else:
        level = "low"
        action = "allow"

    return total, level, action


def _apply_profile_rules(base_score, base_level, base_action, payload, profile):
    score = int(base_score)
    level = base_level
    action = base_action
    channel = _safe_str(payload.get("channel")).lower()
    allow_channels = [item.lower() for item in profile.get("allow_list_channels", [])]

    if channel and channel in allow_channels:
        score = max(0, score - 25)

    if profile.get("strict_mode"):
        score = min(100, score + 15)

    if score >= 75:
        level = "high"
        action = "warn_strong"
    elif score >= 45:
        level = "medium"
        action = "warn"
    else:
        level = "low"
        action = "allow"

    return score, level, action


def _compose_alternative_suggestions(sentiment_compound, risk_level):
    mood = "Anxious" if sentiment_compound < -0.3 else "Neutral"
    stress_level = "High" if risk_level == "high" else "Medium"

    recommendations = get_recommendations(mood, stress_level, sentiment_compound)
    activities = get_activity_suggestions(mood, 10)

    merged = []
    for item in recommendations + activities:
        if item and item not in merged:
            merged.append(item)

    return merged[:6]


def _store_warning_event(payload):
    """Persist each warning/block event to youtube_guard_warnings collection."""
    doc = {
        "video_id": _safe_str(payload.get("video_id")),
        "page_url": _safe_str(payload.get("page_url")),
        "title": _safe_str(payload.get("title")),
        "channel": _safe_str(payload.get("channel")),
        "risk_level": _safe_str(payload.get("risk_level")),
        "warning_count": int(payload.get("warning_count") or 0),
        "warning_limit": int(payload.get("warning_limit") or 0),
        "event_type": _safe_str(payload.get("event_type") or "blocked"),
        "created_at": datetime.utcnow(),
    }

    try:
        mongo.db.youtube_guard_warnings.insert_one(doc)
    except Exception:
        doc.pop("_id", None)
        with _FALLBACK_LOCK:
            _WARNING_EVENTS_FALLBACK.insert(0, doc)
            del _WARNING_EVENTS_FALLBACK[500:]


def _store_activity(payload, response_payload):
    doc = {
        "video_id": _safe_str(payload.get("video_id")),
        "page_url": _safe_str(payload.get("page_url")),
        "title": _safe_str(payload.get("title")),
        "channel": _safe_str(payload.get("channel")),
        "risk_level": response_payload.get("risk_level"),
        "risk_score": response_payload.get("risk_score"),
        "action": response_payload.get("action"),
        "signals": response_payload.get("detected_signals", []),
        "semantic": response_payload.get("semantic"),
        "profile_applied": response_payload.get("profile_applied", {}),
        "created_at": datetime.utcnow(),
    }

    try:
        mongo.db.youtube_guard_activity.insert_one(doc)
    except Exception:
        # Keep endpoint non-blocking if DB write fails.
        doc.pop("_id", None)
        with _FALLBACK_LOCK:
            _ACTIVITY_FALLBACK.insert(0, doc)
            del _ACTIVITY_FALLBACK[500:]


@youtube_guard_bp.route("/youtube/analyze-content", methods=["POST"])
def analyze_youtube_content():
    """Analyze YouTube metadata and suggest safer alternatives when risk is elevated."""
    payload = request.get_json(silent=True) or {}
    title = _safe_str(payload.get("title"))

    if not title:
        return jsonify({"message": "title is required"}), 400

    text_blob = _build_text_blob(payload)
    profile = _resolve_profile(payload)
    signal_hits, signal_score = _extract_signal_hits(text_blob)
    custom_hits, custom_score = _extra_topic_signal_hits(text_blob, profile)
    sentiment = analyze_sentiment(text_blob)
    risk_score, risk_level, action = _risk_from_signals(signal_score, sentiment.get("compound", 0.0))
    semantic = _semantic_assessment(text_blob)

    signal_hits = signal_hits + custom_hits
    if semantic:
        signal_hits.append(
            {
                "label": "semantic_ai",
                "matches": 1,
                "weight": semantic.get("risk_score", 0),
                "tags": semantic.get("risk_tags", []),
            }
        )

    blended = risk_score + int(round(custom_score * 0.8))
    if semantic:
        blended = int(round((blended * 0.65) + (semantic.get("risk_score", 0) * 0.35)))
    risk_score, risk_level, action = _apply_profile_rules(min(100, blended), risk_level, action, payload, profile)

    alternatives = _compose_alternative_suggestions(sentiment.get("compound", 0.0), risk_level)
    response_payload = {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "action": action,
        "bypass_allowed": True,
        "profile_applied": profile,
        "message": (
            "This video may intensify low mood or anxiety. Consider taking a short break first."
            if risk_level in {"medium", "high"}
            else "This content looks okay from a wellness-risk perspective."
        ),
        "detected_signals": signal_hits,
        "semantic": semantic,
        "sentiment": sentiment,
        "alternatives": alternatives,
    }

    _store_activity(payload, response_payload)
    return jsonify(response_payload), 200


@youtube_guard_bp.route("/youtube/activity-summary", methods=["GET"])
def youtube_activity_summary():
    """Return recent analyzed YouTube activity for quick monitoring."""
    limit_raw = request.args.get("limit", "25")
    try:
        limit = max(1, min(100, int(limit_raw)))
    except ValueError:
        limit = 25

    try:
        docs = list(
            mongo.db.youtube_guard_activity.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        )
    except Exception:
        with _FALLBACK_LOCK:
            docs = list(_ACTIVITY_FALLBACK[:limit])

    if not docs:
        with _FALLBACK_LOCK:
            docs = list(_ACTIVITY_FALLBACK[:limit])

    for doc in docs:
        doc.pop("_id", None)

    high_count = sum(1 for item in docs if item.get("risk_level") == "high")
    medium_count = sum(1 for item in docs if item.get("risk_level") == "medium")
    low_count = sum(1 for item in docs if item.get("risk_level") == "low")

    channel_counts = {}
    timeline = {}
    for item in docs:
        channel = _safe_str(item.get("channel")) or "Unknown"
        channel_counts[channel] = channel_counts.get(channel, 0) + 1

        created = item.get("created_at")
        if isinstance(created, datetime):
            key = created.strftime("%Y-%m-%d")
            timeline[key] = timeline.get(key, 0) + 1

    return jsonify(
        {
            "items": docs,
            "summary": {
                "total": len(docs),
                "high_risk": high_count,
                "medium_risk": medium_count,
                "low_risk": low_count,
                "top_channels": [
                    {"channel": key, "count": value}
                    for key, value in sorted(channel_counts.items(), key=lambda x: x[1], reverse=True)[:8]
                ],
                "timeline": [
                    {"date": key, "count": timeline[key]}
                    for key in sorted(timeline.keys())
                ],
            },
        }
    ), 200


@youtube_guard_bp.route("/youtube/profile", methods=["GET"])
@jwt_required()
def get_youtube_guard_profile():
    """Get current user's saved YouTube wellness guard profile."""
    current_user_id = get_jwt_identity()
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)}, {"youtube_guard_profile": 1})
    except Exception:
        user = None

    profile = _normalized_profile((user or {}).get("youtube_guard_profile", {}))
    merged = {**_DEFAULT_PROFILE, **profile}
    return jsonify({"profile": merged}), 200


@youtube_guard_bp.route("/youtube/profile", methods=["PUT"])
@jwt_required()
def update_youtube_guard_profile():
    """Update current user's YouTube wellness guard profile."""
    current_user_id = get_jwt_identity()
    payload = request.get_json(silent=True) or {}
    profile = _normalized_profile(payload)

    try:
        mongo.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$set": {
                    "youtube_guard_profile": profile,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
    except Exception as exc:
        return jsonify({"message": f"Failed to update profile: {exc}"}), 500

    merged = {**_DEFAULT_PROFILE, **profile}
    return jsonify({"message": "YouTube guard profile updated", "profile": merged}), 200


@youtube_guard_bp.route("/youtube/notify-threshold", methods=["POST"])
def notify_youtube_threshold_exceeded():
    """Send Twilio alert and log event when a warning or block occurs for a YouTube video."""
    payload = request.get_json(silent=True) or {}
    warning_count = int(payload.get("warning_count") or 0)
    if warning_count <= 0:
        return jsonify({"message": "warning_count is required"}), 400

    _store_warning_event(payload)
    alert_result = _send_twilio_threshold_alert(payload)
    if _safe_str(payload.get("event_type")).lower() == "blocked":
        _create_emergency_alert(payload, alert_result)
    status = 200 if alert_result.get("sent") else 202
    return jsonify(
        {
            "message": "Alert processed",
            "alert": alert_result,
        }
    ), status


@youtube_guard_bp.route("/youtube/warning-events", methods=["GET"])
def youtube_warning_events():
    """Return logged warning/block events for the YouTube Guard dashboard."""
    limit_raw = request.args.get("limit", "100")
    try:
        limit = max(1, min(500, int(limit_raw)))
    except ValueError:
        limit = 100

    try:
        docs = list(
            mongo.db.youtube_guard_warnings.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        )
        for doc in docs:
            if isinstance(doc.get("created_at"), datetime):
                doc["created_at"] = doc["created_at"].isoformat()
    except Exception:
        with _FALLBACK_LOCK:
            docs = list(_WARNING_EVENTS_FALLBACK[:limit])

    if not docs:
        with _FALLBACK_LOCK:
            docs = list(_WARNING_EVENTS_FALLBACK[:limit])

    for doc in docs:
        doc.pop("_id", None)
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()

    return jsonify({"events": docs, "total": len(docs)}), 200
