"""
Mood Tracking Routes
Handles mood submission and text analysis
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson.objectid import ObjectId

mood_bp = Blueprint('mood', __name__)

# Import database and AI components
from extensions import mongo
from ai_model.face_stress_classifier import get_face_model_status, predict_face_stress_from_image
from ai_model.sentiment_analyzer import analyze_sentiment
from ai_model.stress_predictor import predict_stress_with_source, calculate_stress_score
from ai_model.recommendations import get_recommendations

# Valid mood categories
VALID_MOODS = ['Happy', 'Neutral', 'Sad', 'Stressed', 'Anxious', 'Excited']


def _clamp_float(value, minimum=0.0, maximum=1.0, default=0.0):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _score_face_stress(smile_score, brow_tension_score, eye_blink_score, jaw_tension_score):
    stress_score = (
        (brow_tension_score * 0.35)
        + (jaw_tension_score * 0.25)
        + (eye_blink_score * 0.20)
        + ((1.0 - smile_score) * 0.20)
    ) * 100
    stress_score = round(max(0.0, min(100.0, stress_score)), 2)

    if stress_score >= 70:
        stress_level = 'High'
    elif stress_score >= 40:
        stress_level = 'Medium'
    else:
        stress_level = 'Low'

    return stress_level, stress_score

@mood_bp.route('/submit-mood', methods=['POST'])
@jwt_required()
def submit_mood():
    """
    Submit mood entry with optional journal text
    
    Expected JSON body:
    {
        "mood": "Happy",
        "sleep_hours": 7,
        "journal_text": "Had a great day!",
        "date": "2026-03-09"
    }
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if not data or 'mood' not in data:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Mood is required'
            }), 400
        
        mood = data.get('mood', '').strip()
        sleep_hours = data.get('sleep_hours', 7)
        journal_text = data.get('journal_text', '').strip()
        entry_date = data.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
        
        # Additional wellness tracking fields
        energy_level = data.get('energy_level', 'Medium')
        anxiety_level = data.get('anxiety_level', 5)
        physical_activity = data.get('physical_activity', 'None')
        social_interaction = data.get('social_interaction', 'Some')
        gratitude = data.get('gratitude', '').strip()
        facial_stress_level = data.get('facial_stress_level')
        facial_stress_score = data.get('facial_stress_score')
        facial_stress_confidence = data.get('facial_stress_confidence')
        facial_stress_source = data.get('facial_stress_source')
        
        # Validate mood category
        if mood not in VALID_MOODS:
            return jsonify({
                'error': 'Validation Error',
                'message': f'Mood must be one of: {", ".join(VALID_MOODS)}'
            }), 400
        
        # Validate sleep hours
        if not isinstance(sleep_hours, (int, float)) or sleep_hours < 0 or sleep_hours > 24:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Sleep hours must be between 0 and 24'
            }), 400
        
        # Analyze sentiment if journal text is provided
        sentiment_score = 0.0
        sentiment_breakdown = {}
        
        if journal_text:
            sentiment_result = analyze_sentiment(journal_text)
            sentiment_score = sentiment_result['compound']
            sentiment_breakdown = sentiment_result
        
        # Predict stress level (ML model when available, otherwise rule-based fallback)
        stress_level, prediction_source = predict_stress_with_source(mood, sentiment_score, sleep_hours)
        stress_score = round(calculate_stress_score(mood, sentiment_score, sleep_hours) * 100, 2)
        
        # Get personalized recommendations
        recommendations = get_recommendations(mood, stress_level, sentiment_score)
        
        # Create mood entry document
        mood_entry = {
            'user_id': ObjectId(current_user_id),
            'mood': mood,
            'sleep_hours': sleep_hours,
            'journal_text': journal_text,
            'sentiment_score': sentiment_score,
            'sentiment_breakdown': sentiment_breakdown,
            'stress_level': stress_level,
            'stress_score': stress_score,
            'prediction_source': prediction_source,
            'recommendations': recommendations,
            'date': datetime.strptime(entry_date, '%Y-%m-%d'),
            'created_at': datetime.utcnow(),
            # Additional wellness tracking
            'energy_level': energy_level,
            'anxiety_level': anxiety_level,
            'physical_activity': physical_activity,
            'social_interaction': social_interaction,
            'gratitude': gratitude,
            'facial_stress_level': str(facial_stress_level).strip() if facial_stress_level else None,
            'facial_stress_score': _clamp_float(facial_stress_score, 0.0, 100.0, default=0.0)
            if facial_stress_score is not None
            else None,
            'facial_stress_confidence': _clamp_float(facial_stress_confidence, 0.0, 1.0, default=0.0)
            if facial_stress_confidence is not None
            else None,
            'facial_stress_source': str(facial_stress_source).strip() if facial_stress_source else None
        }
        
        # Insert into database
        result = mongo.db.moods.insert_one(mood_entry)

        emergency_notification = {
            'sent': False,
            'message': 'No emergency alert was required for this entry.'
        }

        # Create emergency alert when stress is high and a contact is configured.
        if stress_level == 'High':
            user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
            contact = (user or {}).get('emergency_contact') if user else None

            if contact and str(contact.get('phone', '')).strip():
                alert_message = (
                    f"High stress alert for {user.get('name', 'user')}. "
                    "Please check in with them as soon as possible."
                )

                alert_doc = {
                    'user_id': ObjectId(current_user_id),
                    'mood_entry_id': result.inserted_id,
                    'stress_level': stress_level,
                    'message': alert_message,
                    'contact': {
                        'name': str(contact.get('name', '')).strip(),
                        'relation': str(contact.get('relation', '')).strip(),
                        'phone': str(contact.get('phone', '')).strip(),
                    },
                    'status': 'sent',
                    'read': False,
                    'channel': 'simulated',
                    'created_at': datetime.utcnow()
                }

                alert_result = mongo.db.emergency_alerts.insert_one(alert_doc)
                emergency_notification = {
                    'sent': True,
                    'alert_id': str(alert_result.inserted_id),
                    'contact_name': alert_doc['contact']['name'],
                    'contact_phone': alert_doc['contact']['phone'],
                    'message': 'Emergency contact was notified for high stress.'
                }
            else:
                emergency_notification = {
                    'sent': False,
                    'message': 'High stress detected, but no emergency contact is configured.'
                }
        
        return jsonify({
            'message': 'Mood entry saved successfully',
            'entry': {
                'id': str(result.inserted_id),
                'mood': mood,
                'stress_level': stress_level,
                'stress_score': stress_score,
                'prediction_source': prediction_source,
                'sentiment_score': round(sentiment_score, 3),
                'facial_stress_level': mood_entry.get('facial_stress_level'),
                'facial_stress_score': mood_entry.get('facial_stress_score'),
                'facial_stress_confidence': mood_entry.get('facial_stress_confidence'),
                'facial_stress_source': mood_entry.get('facial_stress_source'),
                'recommendations': recommendations,
                'date': entry_date
            },
            'emergency_notification': emergency_notification
        }), 201
        
    except Exception as e:
        print(f"Submit mood error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while saving mood entry'
        }), 500


@mood_bp.route('/analyze-text', methods=['POST'])
@jwt_required()
def analyze_text():
    """
    Analyze text for sentiment without saving
    
    Expected JSON body:
    {
        "text": "I'm feeling overwhelmed with work"
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if not data or 'text' not in data:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Text is required'
            }), 400
        
        text = data['text'].strip()
        
        if not text:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Text cannot be empty'
            }), 400
        
        # Analyze sentiment
        sentiment_result = analyze_sentiment(text)
        
        # Determine emotional state based on sentiment
        compound = sentiment_result['compound']
        if compound >= 0.5:
            emotional_state = 'Very Positive'
        elif compound >= 0.1:
            emotional_state = 'Positive'
        elif compound >= -0.1:
            emotional_state = 'Neutral'
        elif compound >= -0.5:
            emotional_state = 'Negative'
        else:
            emotional_state = 'Very Negative'
        
        return jsonify({
            'sentiment': {
                'compound': round(compound, 3),
                'positive': round(sentiment_result['positive'], 3),
                'neutral': round(sentiment_result['neutral'], 3),
                'negative': round(sentiment_result['negative'], 3)
            },
            'emotional_state': emotional_state,
            'analysis': {
                'text_length': len(text),
                'word_count': len(text.split())
            }
        }), 200
        
    except Exception as e:
        print(f"Analyze text error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred during text analysis'
        }), 500


@mood_bp.route('/mood-categories', methods=['GET'])
def get_mood_categories():
    """
    Get available mood categories
    """
    return jsonify({
        'moods': VALID_MOODS
    }), 200


@mood_bp.route('/predict-stress', methods=['POST'])
def predict_stress_demo():
    """
    Predict stress level without auth/database writes.
    Useful for local demo mode when MongoDB/auth is unavailable.

    Expected JSON body:
    {
        "mood": "Happy",
        "sleep_hours": 7,
        "journal_text": "Had a great day",
        "sentiment_score": 0.4
    }
    """
    try:
        data = request.get_json() or {}

        mood = str(data.get('mood', '')).strip()
        sleep_hours = data.get('sleep_hours', 7)
        journal_text = str(data.get('journal_text', '')).strip()
        sentiment_score = data.get('sentiment_score', None)

        if mood not in VALID_MOODS:
            return jsonify({
                'error': 'Validation Error',
                'message': f'Mood must be one of: {", ".join(VALID_MOODS)}'
            }), 400

        if not isinstance(sleep_hours, (int, float)) or sleep_hours < 0 or sleep_hours > 24:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Sleep hours must be between 0 and 24'
            }), 400

        if sentiment_score is None:
            if journal_text:
                sentiment_result = analyze_sentiment(journal_text)
                sentiment_score = sentiment_result['compound']
            else:
                sentiment_score = 0.0

        try:
            sentiment_score = float(sentiment_score)
        except (TypeError, ValueError):
            return jsonify({
                'error': 'Validation Error',
                'message': 'sentiment_score must be a number'
            }), 400

        stress_level, prediction_source = predict_stress_with_source(mood, sentiment_score, sleep_hours)
        recommendations = get_recommendations(mood, stress_level, sentiment_score)

        return jsonify({
            'prediction': {
                'stress_level': stress_level,
                'prediction_source': prediction_source,
                'sentiment_score': round(sentiment_score, 3),
                'mood': mood,
                'sleep_hours': sleep_hours,
                'recommendations': recommendations,
            }
        }), 200

    except Exception as e:
        print(f"Predict stress demo error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred during stress prediction'
        }), 500


@mood_bp.route('/predict-stress-face', methods=['POST'])
def predict_stress_face():
    """
    Predict stress from a camera frame when an image model is available.

    Falls back to heuristic expression scoring when the image model is missing.

    Expected JSON body:
    {
        "image_data": "data:image/jpeg;base64,...",
        "smile_score": 0.2,
        "brow_tension_score": 0.6,
        "eye_blink_score": 0.5,
        "jaw_tension_score": 0.3,
        "confidence": 0.75
    }
    """
    try:
        data = request.get_json() or {}
        image_data = data.get('image_data')

        smile_score = _clamp_float(data.get('smile_score'), 0.0, 1.0, default=0.0)
        brow_tension_score = _clamp_float(data.get('brow_tension_score'), 0.0, 1.0, default=0.0)
        eye_blink_score = _clamp_float(data.get('eye_blink_score'), 0.0, 1.0, default=0.0)
        jaw_tension_score = _clamp_float(data.get('jaw_tension_score'), 0.0, 1.0, default=0.0)
        confidence = _clamp_float(data.get('confidence'), 0.0, 1.0, default=0.7)

        if image_data:
            ml_prediction = predict_face_stress_from_image(image_data)
            if ml_prediction is not None:
                ml_prediction['features'] = {
                    'smile_score': round(smile_score, 3),
                    'brow_tension_score': round(brow_tension_score, 3),
                    'eye_blink_score': round(eye_blink_score, 3),
                    'jaw_tension_score': round(jaw_tension_score, 3),
                }
                return jsonify({'prediction': ml_prediction}), 200

        stress_level, stress_score = _score_face_stress(
            smile_score,
            brow_tension_score,
            eye_blink_score,
            jaw_tension_score,
        )

        return jsonify({
            'prediction': {
                'stress_level': stress_level,
                'stress_score': stress_score,
                'confidence': round(confidence, 2),
                'prediction_source': 'facial_expression_heuristic',
                'features': {
                    'smile_score': round(smile_score, 3),
                    'brow_tension_score': round(brow_tension_score, 3),
                    'eye_blink_score': round(eye_blink_score, 3),
                    'jaw_tension_score': round(jaw_tension_score, 3),
                },
                'face_model_status': get_face_model_status(),
                'disclaimer': 'Experimental wellness signal. Not a medical diagnosis.'
            }
        }), 200
    except Exception as e:
        print(f"Predict stress face error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while predicting facial stress'
        }), 500
