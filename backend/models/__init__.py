"""
Database Models
User and Mood data structures
"""
from datetime import datetime
from bson.objectid import ObjectId

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
