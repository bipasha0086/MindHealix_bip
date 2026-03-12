"""
Chatbot route supporting Groq (Llama 3) and Gemini providers.
Uses backend environment variables so API keys are not exposed to the frontend.
"""

from collections import defaultdict, deque
import hashlib
import json
import time
from urllib import error, request

from flask import Blueprint, current_app, jsonify, request as flask_request
from flask_jwt_extended import jwt_required

chatbot_bp = Blueprint("chatbot", __name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

# Lightweight in-memory controls for demo and hackathon reliability.
_REQUEST_LOG = defaultdict(deque)
_CHAT_CACHE = {}

SYSTEM_PROMPT = (
    "You are a calm, supportive mental wellness assistant. "
    "Give concise, practical, non-judgmental guidance. "
    "Do not claim to diagnose conditions. "
    "If user expresses self-harm intent, advise contacting local emergency/crisis resources immediately."
)


def _build_payload(user_message, context_lines):
    context_text = "\n".join([line for line in context_lines if line])
    composed = (
        f"System guidance:\n{SYSTEM_PROMPT}\n\n"
        f"Conversation context:\n{context_text}\n\n"
        f"User message:\n{user_message}\n\n"
        "Respond in under 120 words."
    )

    return {
        "contents": [
            {
                "parts": [
                    {"text": composed}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 220,
        },
    }


def _build_groq_payload(user_message, context_lines, model):
    context_text = "\n".join([line for line in context_lines if line])
    prompt = (
        f"Conversation context:\n{context_text}\n\n"
        f"User message:\n{user_message}"
    )

    return {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.6,
        "max_tokens": 220,
    }


def _extract_text(gemini_response):
    try:
        candidates = gemini_response.get("candidates", [])
        if not candidates:
            return "I am here with you. Try sharing a bit more so I can help better."

        parts = candidates[0].get("content", {}).get("parts", [])
        merged = "\n".join(part.get("text", "") for part in parts if part.get("text"))
        return merged.strip() or "I am here with you. Try sharing a bit more so I can help better."
    except Exception:
        return "I am here with you. Try sharing a bit more so I can help better."


def _extract_groq_text(groq_response):
    try:
        choices = groq_response.get("choices", [])
        if not choices:
            return "I am here with you. Try sharing a bit more so I can help better."

        message = choices[0].get("message", {})
        content = str(message.get("content", "")).strip()
        return content or "I am here with you. Try sharing a bit more so I can help better."
    except Exception:
        return "I am here with you. Try sharing a bit more so I can help better."


def _get_client_ip():
    forwarded = flask_request.headers.get("X-Forwarded-For", "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    return flask_request.remote_addr or "unknown"


def _rate_limit_status(ip, now_ts, max_requests, window_seconds):
    history = _REQUEST_LOG[ip]
    while history and now_ts - history[0] > window_seconds:
        history.popleft()

    if len(history) >= max_requests:
        retry_after = max(1, int(window_seconds - (now_ts - history[0])))
        return False, retry_after

    history.append(now_ts)
    return True, 0


def _build_cache_key(model, message, context_lines):
    joined_context = "\n".join(context_lines)
    source = f"{model}|{message}|{joined_context}"
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def _post_json(url, body, headers, timeout=15):
    merged_headers = {
        "Accept": "application/json",
        "User-Agent": "MindHealix-Backend/1.0 (+chat-assistant)",
    }
    merged_headers.update(headers or {})

    req = request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=merged_headers,
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _prune_cache(now_ts, max_items):
    expired = [key for key, value in _CHAT_CACHE.items() if value.get("expires_at", 0) <= now_ts]
    for key in expired:
        _CHAT_CACHE.pop(key, None)

    if len(_CHAT_CACHE) <= max_items:
        return

    oldest = sorted(_CHAT_CACHE.items(), key=lambda item: item[1].get("created_at", now_ts))
    overflow = len(_CHAT_CACHE) - max_items
    for key, _value in oldest[:overflow]:
        _CHAT_CACHE.pop(key, None)


def _normalize_model_list(raw_models, default_model):
    if isinstance(raw_models, list):
        models = [str(item).strip() for item in raw_models if str(item).strip()]
    else:
        models = [default_model]
    return models or [default_model]


def _provider_attempts(provider, groq_models, gemini_models):
    if provider == "groq":
        return [("groq", model) for model in groq_models]
    if provider == "gemini":
        return [("gemini", model) for model in gemini_models]
    # "auto": try Groq models first, then Gemini models.
    return [("groq", model) for model in groq_models] + [("gemini", model) for model in gemini_models]


@chatbot_bp.route("/chat-assistant", methods=["POST"])
@jwt_required(optional=True)
def chat_assistant():
    """Generate supportive response from configured chatbot provider."""
    data = flask_request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    context_lines = data.get("context", [])

    if not message:
        return jsonify({"message": "Message is required"}), 400

    provider = str(current_app.config.get("CHAT_PROVIDER", "groq")).lower()
    gemini_api_key = current_app.config.get("GEMINI_API_KEY", "")
    gemini_model = current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash")
    gemini_models = _normalize_model_list(current_app.config.get("GEMINI_MODELS"), gemini_model)
    groq_api_key = current_app.config.get("GROQ_API_KEY", "")
    groq_model = current_app.config.get("GROQ_MODEL", "llama-3.1-8b-instant")
    groq_models = _normalize_model_list(current_app.config.get("GROQ_MODELS"), groq_model)
    rate_window = max(1, int(current_app.config.get("CHAT_RATE_LIMIT_WINDOW_SECONDS", 60)))
    rate_max = max(1, int(current_app.config.get("CHAT_RATE_LIMIT_MAX_REQUESTS", 12)))
    cache_ttl = max(1, int(current_app.config.get("CHAT_CACHE_TTL_SECONDS", 45)))
    cache_max_items = max(20, int(current_app.config.get("CHAT_CACHE_MAX_ITEMS", 300)))

    if provider not in {"groq", "gemini", "auto"}:
        provider = "groq"

    if provider in {"groq", "auto"} and not groq_api_key:
        if provider == "groq":
            return jsonify({"message": "Groq API key is not configured on server"}), 503
        # In auto mode we can still continue with Gemini-only attempts.
        groq_models = []

    if provider in {"gemini", "auto"} and not gemini_api_key:
        if provider == "gemini":
            return jsonify({"message": "Gemini API key is not configured on server"}), 503
        # In auto mode we can still continue with Groq-only attempts.
        gemini_models = []

    attempts = _provider_attempts(provider, groq_models, gemini_models)
    if not attempts:
        return jsonify({"message": "No configured AI models available"}), 503

    client_ip = _get_client_ip()
    now_ts = time.time()
    allowed, retry_after = _rate_limit_status(client_ip, now_ts, rate_max, rate_window)
    if not allowed:
        return jsonify(
            {
                "message": "Too many chat requests. Please slow down.",
                "retry_after_seconds": retry_after,
            }
        ), 429

    normalized_context = context_lines if isinstance(context_lines, list) else []
    _prune_cache(now_ts, cache_max_items)

    # Cache hit on any configured model/provider pair should be reused.
    for attempt_provider, attempt_model in attempts:
        cache_key = _build_cache_key(f"{attempt_provider}:{attempt_model}", message, normalized_context)
        cached = _CHAT_CACHE.get(cache_key)
        if cached and cached.get("expires_at", 0) > now_ts:
            return jsonify({"reply": cached["reply"], "cached": True, "model": attempt_model}), 200

    last_http_detail = ""
    last_exception = ""

    for attempt_provider, attempt_model in attempts:
        cache_key = _build_cache_key(f"{attempt_provider}:{attempt_model}", message, normalized_context)
        try:
            if attempt_provider == "groq":
                parsed = _post_json(
                    GROQ_CHAT_COMPLETIONS_URL,
                    _build_groq_payload(message, normalized_context, attempt_model),
                    {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {groq_api_key}",
                    },
                )
                reply = _extract_groq_text(parsed)
            else:
                parsed = _post_json(
                    f"{GEMINI_API_BASE}/{attempt_model}:generateContent?key={gemini_api_key}",
                    _build_payload(message, normalized_context),
                    {"Content-Type": "application/json"},
                )
                reply = _extract_text(parsed)

            _CHAT_CACHE[cache_key] = {
                "reply": reply,
                "created_at": now_ts,
                "expires_at": now_ts + cache_ttl,
            }
            return jsonify({"reply": reply, "cached": False, "model": attempt_model}), 200
        except error.HTTPError as exc:
            last_http_detail = exc.read().decode("utf-8", errors="ignore")[:500]
            continue
        except Exception as exc:
            last_exception = str(exc)
            continue

    if last_http_detail:
        return jsonify({"message": "All configured model requests failed", "detail": last_http_detail}), 502

    return jsonify({"message": "Chat service unavailable", "detail": last_exception or "No model succeeded"}), 500
