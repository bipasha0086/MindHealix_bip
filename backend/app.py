"""
Flask Backend API for AI Mental Health Support Platform.
Main application entry point.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import ASCENDING

from config import Config
from extensions import mongo, jwt
from ai_model.stress_predictor import get_model_status
from ai_model.face_stress_classifier import get_face_model_status


# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS for frontend access
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": Config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
    supports_credentials=True,
)

# Initialize extensions with app
jwt.init_app(app)
mongo.init_app(app)

with app.app_context():
    # Speed up auth lookups and enforce unique emails at DB level.
    # Do not block app boot if MongoDB is temporarily unavailable.
    try:
        mongo.db.users.create_index([('email', ASCENDING)], unique=True)
    except Exception as exc:  # pragma: no cover
        print(f"Warning: could not create users.email index yet: {exc}")

# Import routes after extension initialization to avoid circular imports
from routes.auth import auth_bp  # noqa: E402
from routes.mood import mood_bp  # noqa: E402
from routes.analytics import analytics_bp  # noqa: E402
from routes.chatbot import chatbot_bp  # noqa: E402
from routes.emergency import emergency_bp  # noqa: E402
from routes.youtube_guard import youtube_guard_bp  # noqa: E402
from routes.stress_chat import stress_chat_bp  # noqa: E402

# Register API blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(mood_bp, url_prefix="/api")
app.register_blueprint(analytics_bp, url_prefix="/api")
app.register_blueprint(chatbot_bp, url_prefix="/api")
app.register_blueprint(emergency_bp, url_prefix="/api")
app.register_blueprint(youtube_guard_bp, url_prefix="/api")
app.register_blueprint(stress_chat_bp, url_prefix="/api")


@app.route("/")
def index():
    """Root endpoint with API metadata."""
    return jsonify(
        {
            "message": "AI Mental Health Support Platform API",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "health": "/api/health",
                "auth": "/api/register, /api/login, /api/profile",
                "mood": "/api/submit-mood, /api/analyze-text, /api/mood-categories",
                "analytics": "/api/user-dashboard, /api/mood-history, /api/stress-trends",
                "chat": "/api/chat-assistant",
                "emergency": "/api/emergency-contact, /api/emergency-alerts",
                "youtube_guard": "/api/youtube/analyze-content, /api/youtube/activity-summary, /api/youtube/profile, /api/youtube/notify-threshold, /api/youtube/warning-events",
                "stress_support_chat": "/api/stress-chat/start-session, /api/stress-chat/rooms, /api/stress-chat/send-message, /api/stress-chat/report-message",
            },
        }
    ), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring."""
    db_status = "connected"
    try:
        mongo.cx.admin.command("ping")
    except Exception as exc:  # pragma: no cover
        db_status = f"disconnected: {exc}"

    return jsonify(
        {
            "status": "healthy",
            "database": db_status,
            "ai_model": get_model_status(),
            "face_ai_model": get_face_model_status(),
        }
    ), 200


@app.after_request
def add_security_headers(response):
    """Set baseline security headers for API responses."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


@app.errorhandler(404)
def not_found(_error):
    """Handle 404 errors."""
    return jsonify({"error": "Not Found", "message": "The requested resource was not found"}), 404


@app.errorhandler(500)
def internal_error(_error):
    """Handle 500 errors."""
    return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred"}), 500


@jwt.expired_token_loader
def expired_token_callback(_jwt_header, _jwt_payload):
    """Handle expired JWT tokens."""
    return jsonify({"error": "Token Expired", "message": "The authentication token has expired"}), 401


@jwt.invalid_token_loader
def invalid_token_callback(_error):
    """Handle invalid JWT tokens."""
    return jsonify({"error": "Invalid Token", "message": "Authentication token is invalid"}), 401


@jwt.unauthorized_loader
def missing_token_callback(_error):
    """Handle missing JWT tokens."""
    return jsonify({"error": "Authorization Required", "message": "Authentication token is missing"}), 401


if __name__ == "__main__":
    print("Starting AI Mental Health Support Platform backend...")
    print(f"Server: http://localhost:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG, use_reloader=False)
