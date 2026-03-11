"""
Authentication Routes
Handles user registration and login
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    set_access_cookies,
    unset_jwt_cookies,
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import re
from threading import Lock

auth_bp = Blueprint('auth', __name__)

# Import database from extensions
from extensions import mongo

LOGIN_ATTEMPTS = {}
LOGIN_ATTEMPTS_LOCK = Lock()
MAX_LOGIN_ATTEMPTS = 5
LOGIN_BLOCK_WINDOW = timedelta(minutes=10)
DUMMY_PASSWORD_HASH = generate_password_hash('dummy-password-for-timing')

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_password(password):
    """Validate password strength."""
    if not password or len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    return True


def _get_client_ip():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _is_login_blocked(email):
    key = f"{_get_client_ip()}:{email}"
    now = datetime.utcnow()
    with LOGIN_ATTEMPTS_LOCK:
        attempts = [ts for ts in LOGIN_ATTEMPTS.get(key, []) if now - ts < LOGIN_BLOCK_WINDOW]
        LOGIN_ATTEMPTS[key] = attempts
        return len(attempts) >= MAX_LOGIN_ATTEMPTS


def _record_failed_attempt(email):
    key = f"{_get_client_ip()}:{email}"
    now = datetime.utcnow()
    with LOGIN_ATTEMPTS_LOCK:
        attempts = [ts for ts in LOGIN_ATTEMPTS.get(key, []) if now - ts < LOGIN_BLOCK_WINDOW]
        attempts.append(now)
        LOGIN_ATTEMPTS[key] = attempts


def _clear_failed_attempts(email):
    key = f"{_get_client_ip()}:{email}"
    with LOGIN_ATTEMPTS_LOCK:
        LOGIN_ATTEMPTS.pop(key, None)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    
    Expected JSON body:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepassword"
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(key in data for key in ['name', 'email', 'password']):
            return jsonify({
                'error': 'Validation Error',
                'message': 'Name, email, and password are required'
            }), 400
        
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate data
        if not name or len(name) < 2:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Name must be at least 2 characters long'
            }), 400
        
        if not is_valid_email(email):
            return jsonify({
                'error': 'Validation Error',
                'message': 'Invalid email format'
            }), 400
        
        if not is_valid_password(password):
            return jsonify({
                'error': 'Validation Error',
                'message': 'Password must be at least 8 characters with uppercase, lowercase, and a number'
            }), 400
        
        # Check if user already exists
        existing_user = mongo.db.users.find_one({'email': email})
        if existing_user:
            return jsonify({
                'error': 'Registration Error',
                'message': 'Email already registered'
            }), 409
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        # Create user document
        user = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert user into database
        result = mongo.db.users.insert_one(user)
        
        # Create access token
        access_token = create_access_token(identity=str(result.inserted_id))
        
        response = jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': str(result.inserted_id),
                'name': name,
                'email': email
            }
        })
        set_access_cookies(response, access_token)
        return response, 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred during registration'
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login user
    
    Expected JSON body:
    {
        "email": "john@example.com",
        "password": "securepassword"
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(key in data for key in ['email', 'password']):
            return jsonify({
                'error': 'Validation Error',
                'message': 'Email and password are required'
            }), 400
        
        email = data['email'].strip().lower()
        password = data['password']

        if _is_login_blocked(email):
            return jsonify({
                'error': 'Too Many Requests',
                'message': 'Too many failed login attempts. Try again in 10 minutes.'
            }), 429
        
        # Find user by email
        user = mongo.db.users.find_one({'email': email})
        
        # Verify user exists and password is correct
        is_valid = bool(user) and check_password_hash(user['password'], password)
        if not user:
            # Run a dummy hash check to reduce user-enumeration timing signals.
            check_password_hash(DUMMY_PASSWORD_HASH, password)

        if not is_valid:
            _record_failed_attempt(email)
            return jsonify({
                'error': 'Authentication Error',
                'message': 'Invalid email or password'
            }), 401

        _clear_failed_attempts(email)
        
        # Create access token
        access_token = create_access_token(identity=str(user['_id']))
        
        response = jsonify({
            'message': 'Login successful',
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email']
            }
        })
        set_access_cookies(response, access_token)
        return response, 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred during login'
        }), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get current user profile
    Requires JWT token in Authorization header
    """
    try:
        # Get user ID from JWT token
        current_user_id = get_jwt_identity()
        
        # Find user
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        
        if not user:
            return jsonify({
                'error': 'Not Found',
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat()
            }
        }), 200
        
    except Exception as e:
        print(f"Profile fetch error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while fetching profile'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Clear authentication cookies."""
    response = jsonify({'message': 'Logged out successfully'})
    unset_jwt_cookies(response)
    return response, 200
