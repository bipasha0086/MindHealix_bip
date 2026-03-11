"""
Stress Level Prediction Module
Uses rule-based and machine learning approaches to predict stress levels
"""
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import pickle
import os


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODEL_PATH_CANDIDATES = [
    os.path.join(PROJECT_ROOT, 'trained_models', 'stress_model.pkl'),
    os.path.join(PROJECT_ROOT, 'backend', 'trained_models', 'stress_model.pkl'),
]

_ML_PREDICTOR = None
_MODEL_STATUS = {
    'loaded': False,
    'source': 'rule_based_fallback',
    'model_path': None,
}

# Mood to stress mapping
MOOD_STRESS_MAP = {
    'Happy': 0.2,
    'Excited': 0.3,
    'Neutral': 0.5,
    'Sad': 0.7,
    'Stressed': 0.9,
    'Anxious': 0.85
}

# Stress level thresholds
STRESS_THRESHOLDS = {
    'Low': (0.0, 0.4),
    'Medium': (0.4, 0.7),
    'High': (0.7, 1.0)
}

def calculate_stress_score(mood, sentiment_score, sleep_hours):
    """
    Calculate stress score based on multiple factors
    
    Args:
        mood (str): Current mood category
        sentiment_score (float): Sentiment score from text analysis (-1 to 1)
        sleep_hours (float): Number of hours slept
        
    Returns:
        float: Stress score (0 to 1)
    """
    # Get base stress from mood
    base_stress = MOOD_STRESS_MAP.get(mood, 0.5)
    
    # Adjust for sentiment (negative sentiment increases stress)
    sentiment_factor = 0.0
    if sentiment_score < 0:
        sentiment_factor = abs(sentiment_score) * 0.3  # Negative sentiment adds stress
    else:
        sentiment_factor = -sentiment_score * 0.2  # Positive sentiment reduces stress
    
    # Adjust for sleep (less sleep increases stress)
    sleep_factor = 0.0
    if sleep_hours < 6:
        sleep_factor = (6 - sleep_hours) * 0.1  # Each hour below 6 adds stress
    elif sleep_hours > 8:
        sleep_factor = -0.1  # Good sleep reduces stress
    
    # Calculate final stress score
    stress_score = base_stress + sentiment_factor + sleep_factor
    
    # Normalize to 0-1 range
    stress_score = max(0.0, min(1.0, stress_score))
    
    return stress_score

def predict_stress(mood, sentiment_score, sleep_hours):
    """
    Predict stress level based on input features
    
    Args:
        mood (str): Current mood category
        sentiment_score (float): Sentiment score from text analysis
        sleep_hours (float): Number of hours slept
        
    Returns:
        str: Predicted stress level (Low, Medium, High)
    """
    # Keep backward-compatible API: return level only.
    level, _source = predict_stress_with_source(mood, sentiment_score, sleep_hours)
    return level


def _rule_based_predict(mood, sentiment_score, sleep_hours):
    """Rule-based fallback prediction used when ML model is unavailable."""
    stress_score = calculate_stress_score(mood, sentiment_score, sleep_hours)

    for level, (low, high) in STRESS_THRESHOLDS.items():
        if low <= stress_score < high:
            return level

    return 'Medium'


def _try_initialize_predictor():
    """Lazy-initialize and load trained model if available on disk."""
    global _ML_PREDICTOR

    if _ML_PREDICTOR is not None:
        return _ML_PREDICTOR

    predictor = StressPredictor()
    for candidate in MODEL_PATH_CANDIDATES:
        if os.path.exists(candidate):
            predictor.load_model(candidate)
            if predictor.is_trained:
                _MODEL_STATUS['loaded'] = True
                _MODEL_STATUS['source'] = 'ml_model'
                _MODEL_STATUS['model_path'] = candidate
                _ML_PREDICTOR = predictor
                return _ML_PREDICTOR

    _MODEL_STATUS['loaded'] = False
    _MODEL_STATUS['source'] = 'rule_based_fallback'
    _MODEL_STATUS['model_path'] = None
    _ML_PREDICTOR = predictor
    return _ML_PREDICTOR


def predict_stress_with_source(mood, sentiment_score, sleep_hours):
    """
    Predict stress level and return prediction source for transparency.

    Returns:
        tuple: (stress_level, source)
    """
    predictor = _try_initialize_predictor()
    if predictor.is_trained:
        return predictor.predict(mood, sentiment_score, sleep_hours), 'ml_model'

    return _rule_based_predict(mood, sentiment_score, sleep_hours), 'rule_based_fallback'


def get_model_status():
    """Return model loading status for health checks and diagnostics."""
    _try_initialize_predictor()
    return dict(_MODEL_STATUS)

def get_stress_insights(stress_level, mood, sentiment_score, sleep_hours):
    """
    Get insights about stress factors
    
    Args:
        stress_level (str): Predicted stress level
        mood (str): Current mood
        sentiment_score (float): Sentiment score
        sleep_hours (float): Sleep hours
        
    Returns:
        dict: Insights about stress factors
    """
    insights = {
        'stress_level': stress_level,
        'contributing_factors': [],
        'positive_factors': []
    }
    
    # Analyze contributing factors
    if mood in ['Stressed', 'Anxious', 'Sad']:
        insights['contributing_factors'].append(f"Your recorded mood: {mood}")
    
    if sentiment_score < -0.3:
        insights['contributing_factors'].append("Negative sentiment in your journal")
    
    if sleep_hours < 6:
        insights['contributing_factors'].append(f"Insufficient sleep ({sleep_hours} hours)")
    
    # Analyze positive factors
    if mood in ['Happy', 'Excited']:
        insights['positive_factors'].append(f"Positive mood: {mood}")
    
    if sentiment_score > 0.3:
        insights['positive_factors'].append("Positive sentiment in your journal")
    
    if sleep_hours >= 7:
        insights['positive_factors'].append(f"Good sleep ({sleep_hours} hours)")
    
    return insights

class StressPredictor:
    """
    Machine Learning-based stress predictor (for future enhancement)
    Uses Random Forest Classifier
    """
    
    def __init__(self):
        self.model = None
        self.is_trained = False
    
    def prepare_features(self, mood, sentiment_score, sleep_hours):
        """Prepare features for ML model"""
        mood_encoding = MOOD_STRESS_MAP.get(mood, 0.5)
        return np.array([[mood_encoding, sentiment_score, sleep_hours]])
    
    def train(self, X, y):
        """
        Train the stress prediction model
        
        Args:
            X: Feature array (mood_encoding, sentiment_score, sleep_hours)
            y: Target array (stress levels: 0=Low, 1=Medium, 2=High)
        """
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.model.fit(X, y)
        self.is_trained = True
    
    def predict(self, mood, sentiment_score, sleep_hours):
        """
        Predict stress level using ML model
        
        Returns:
            str: Predicted stress level
        """
        if not self.is_trained:
            # Fall back to rule-based prediction
            return predict_stress(mood, sentiment_score, sleep_hours)
        
        features = self.prepare_features(mood, sentiment_score, sleep_hours)
        prediction = self.model.predict(features)[0]
        
        stress_levels = ['Low', 'Medium', 'High']
        return stress_levels[prediction]
    
    def save_model(self, filepath):
        """Save model to file"""
        if self.is_trained:
            with open(filepath, 'wb') as f:
                pickle.dump(self.model, f)
    
    def load_model(self, filepath):
        """Load model from file"""
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                self.model = pickle.load(f)
                self.is_trained = True

# Example usage
if __name__ == "__main__":
    print("=== Stress Prediction Tests ===\n")
    
    test_cases = [
        ('Happy', 0.8, 8),
        ('Stressed', -0.5, 5),
        ('Neutral', 0.0, 7),
        ('Anxious', -0.7, 4)
    ]
    
    for mood, sentiment, sleep in test_cases:
        stress_level = predict_stress(mood, sentiment, sleep)
        insights = get_stress_insights(stress_level, mood, sentiment, sleep)
        
        print(f"Mood: {mood} | Sentiment: {sentiment} | Sleep: {sleep}h")
        print(f"Predicted Stress: {stress_level}")
        print(f"Insights: {insights}")
        print("-" * 60)
