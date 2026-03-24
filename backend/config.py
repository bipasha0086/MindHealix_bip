"""
Configuration settings for the Flask application
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def _append_mongo_timeout_params(uri, connect_timeout_ms, select_timeout_ms):
    separator = '&' if '?' in uri else '?'
    result = uri
    if 'connectTimeoutMS=' not in uri:
        result = f"{result}{separator}connectTimeoutMS={connect_timeout_ms}"
        separator = '&'
    if 'serverSelectionTimeoutMS=' not in result:
        result = f"{result}{separator}serverSelectionTimeoutMS={select_timeout_ms}"
    return result


def _parse_cors_origins(raw_origins):
    # Include extension and YouTube origins so the browser guard can call backend APIs.
    required_origins = [
        'http://localhost:3000',
        'https://www.youtube.com',
        'https://youtube.com',
        r'chrome-extension://.*',
    ]

    if not raw_origins:
        return required_origins

    origins = [origin.strip() for origin in str(raw_origins).split(',') if origin.strip()]
    merged = origins[:]
    for origin in required_origins:
        if origin not in merged:
            merged.append(origin)
    return merged

class Config:
    """Base configuration class"""

    # Flask Settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # JWT Settings
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 24)))
    # Use HttpOnly cookies to reduce token exposure to XSS.
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_COOKIE_SECURE = os.getenv('JWT_COOKIE_SECURE', 'false').lower() == 'true'
    JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'Lax')
    JWT_COOKIE_CSRF_PROTECT = os.getenv('JWT_COOKIE_CSRF_PROTECT', 'false').lower() == 'true'
    
    # MongoDB Settings
    _RAW_MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/mental_health_db')
    MONGO_CONNECT_TIMEOUT_MS = int(os.getenv('MONGO_CONNECT_TIMEOUT_MS', 3000))
    MONGO_SERVER_SELECTION_TIMEOUT_MS = int(os.getenv('MONGO_SERVER_SELECTION_TIMEOUT_MS', 3000))
    MONGO_URI = _append_mongo_timeout_params(
        _RAW_MONGO_URI,
        MONGO_CONNECT_TIMEOUT_MS,
        MONGO_SERVER_SELECTION_TIMEOUT_MS,
    )

    # CORS Settings
    CORS_ORIGINS = _parse_cors_origins(
        os.getenv('CORS_ORIGINS', os.getenv('FRONTEND_URL', 'http://localhost:3000'))
    )

    # Server Settings
    PORT = int(os.getenv('PORT', 5000))
    HOST = '0.0.0.0'
    
    # AI Model Settings
    MODEL_PATH = 'ai_model/trained_models/'
    MAX_TEXT_LENGTH = 5000
    CHAT_PROVIDER = os.getenv('CHAT_PROVIDER', 'groq').lower()
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')
    GROQ_MODELS = [
        model.strip()
        for model in os.getenv('GROQ_MODELS', GROQ_MODEL).split(',')
        if model.strip()
    ]
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
    GEMINI_MODELS = [
        model.strip()
        for model in os.getenv('GEMINI_MODELS', GEMINI_MODEL).split(',')
        if model.strip()
    ]
    CHAT_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv('CHAT_RATE_LIMIT_WINDOW_SECONDS', 60))
    CHAT_RATE_LIMIT_MAX_REQUESTS = int(os.getenv('CHAT_RATE_LIMIT_MAX_REQUESTS', 12))
    CHAT_CACHE_TTL_SECONDS = int(os.getenv('CHAT_CACHE_TTL_SECONDS', 45))
    CHAT_CACHE_MAX_ITEMS = int(os.getenv('CHAT_CACHE_MAX_ITEMS', 300))
    YT_SEMANTIC_PROVIDER = os.getenv('YT_SEMANTIC_PROVIDER', 'off').lower()
    YT_GROQ_MODEL = os.getenv('YT_GROQ_MODEL', GROQ_MODEL)
    YT_GEMINI_MODEL = os.getenv('YT_GEMINI_MODEL', GEMINI_MODEL)
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', os.getenv('TWILIO_SID', ''))
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
    TWILIO_ALERT_TO = os.getenv('TWILIO_ALERT_TO', os.getenv('TWILIO_TO', ''))
    TWILIO_WHATSAPP_FROM = os.getenv('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
    TWILIO_ALERT_CHANNELS = os.getenv('TWILIO_ALERT_CHANNELS', 'whatsapp')
    TWILIO_WHATSAPP_CONTENT_SID = os.getenv('TWILIO_WHATSAPP_CONTENT_SID', '')
    TWILIO_CONTENT_SID = os.getenv('TWILIO_CONTENT_SID', '')
    TWILIO_DEFAULT_COUNTRY_CODE = os.getenv('TWILIO_DEFAULT_COUNTRY_CODE', '+91')
    TWILIO_SMS_FROM = os.getenv('TWILIO_SMS_FROM', '')
    TWILIO_CALL_FROM = os.getenv('TWILIO_CALL_FROM', '')
    TWILIO_CALL_ENABLED = os.getenv('TWILIO_CALL_ENABLED', 'false').lower() == 'true'
    
    # Application Settings
    MOOD_CATEGORIES = ['Happy', 'Neutral', 'Sad', 'Stressed', 'Anxious', 'Excited']
    STRESS_LEVELS = ['Low', 'Medium', 'High']
