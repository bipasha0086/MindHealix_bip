"""
Models Package - Database Models + 4 Major AI Modules

Database Models:
- UserModel: User authentication and profile data
- MoodModel: Mood tracking entries

AI & ML Modules (4 Major Models):
1. Face Stress Module - Facial emotion detection using computer vision
2. Sentiment Module - Text sentiment analysis and emotional keyword extraction
3. Stress Prediction Module - ML-based stress level prediction
4. Recommendations Module - Personalized mental health recommendations engine
"""
from datetime import datetime
from bson.objectid import ObjectId

# Import 4 major AI modules
from . import face_stress_module
from . import sentiment_module
from . import stress_prediction_module
from . import recommendations_module

# Direct imports for AI functions
from .face_stress_module import (
    predict_face_stress_from_image,
    get_face_model_status,
)

from .sentiment_module import (
    analyze_sentiment,
    get_sentiment_label,
    analyze_emotional_keywords,
    clean_text,
)

from .stress_prediction_module import (
    predict_stress,
    predict_stress_with_source,
    calculate_stress_score,
    get_stress_insights,
    get_model_status,
    StressPredictor,
)

from .recommendations_module import (
    get_recommendations,
    get_crisis_resources,
    get_coping_strategies,
    get_activity_suggestions,
)

class UserModel:
    """
    User model for MongoDB
    
    Schema:
        _id: ObjectId
        name: str
        email: str (unique)
        password: str (hashed)
        created_at: datetime
        updated_at: datetime
    """
    
    @staticmethod
    def create(name, email, hashed_password):
        """Create a new user document"""
        return {
            'name': name,
            'email': email.lower(),
            'password': hashed_password,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
    
    @staticmethod
    def to_dict(user):
        """Convert user document to dictionary"""
        if not user:
            return None
        
        return {
            'id': str(user['_id']),
            'name': user['name'],
            'email': user['email'],
            'created_at': user['created_at'].isoformat()
        }


class MoodModel:
    """
    Mood entry model for MongoDB
    
    Schema:
        _id: ObjectId
        user_id: ObjectId
        mood: str
        sleep_hours: float
        journal_text: str
        sentiment_score: float
        sentiment_breakdown: dict
        stress_level: str
        recommendations: list
        date: datetime
        created_at: datetime
    """
    
    @staticmethod
    def create(user_id, mood, sleep_hours, journal_text, sentiment_score, 
               sentiment_breakdown, stress_level, recommendations, date):
        """Create a new mood entry document"""
        return {
            'user_id': ObjectId(user_id),
            'mood': mood,
            'sleep_hours': sleep_hours,
            'journal_text': journal_text,
            'sentiment_score': sentiment_score,
            'sentiment_breakdown': sentiment_breakdown,
            'stress_level': stress_level,
            'recommendations': recommendations,
            'date': date,
            'created_at': datetime.utcnow()
        }
    
    @staticmethod
    def to_dict(mood_entry):
        """Convert mood entry document to dictionary"""
        if not mood_entry:
            return None
        
        return {
            'id': str(mood_entry['_id']),
            'user_id': str(mood_entry['user_id']),
            'mood': mood_entry['mood'],
            'sleep_hours': mood_entry['sleep_hours'],
            'journal_text': mood_entry.get('journal_text', ''),
            'sentiment_score': mood_entry.get('sentiment_score', 0.0),
            'sentiment_breakdown': mood_entry.get('sentiment_breakdown', {}),
            'stress_level': mood_entry['stress_level'],
            'recommendations': mood_entry.get('recommendations', []),
            'date': mood_entry['date'].strftime('%Y-%m-%d'),
            'created_at': mood_entry['created_at'].isoformat()
        }
