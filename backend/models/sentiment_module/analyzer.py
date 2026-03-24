"""
Sentiment Analysis Module
Uses NLTK's VADER (Valence Aware Dictionary and sEntiment Reasoner) for sentiment analysis
"""
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
import re

# Download required NLTK data (run once)
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)

# Initialize sentiment analyzer
sia = SentimentIntensityAnalyzer()

def clean_text(text):
    """
    Clean and preprocess text for sentiment analysis
    
    Args:
        text (str): Raw text input
        
    Returns:
        str: Cleaned text
    """
    # Convert to lowercase
    text = text.lower()
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text

def analyze_sentiment(text):
    """
    Analyze sentiment of text using VADER
    
    Args:
        text (str): Text to analyze
        
    Returns:
        dict: Sentiment scores including compound, positive, negative, and neutral
    """
    if not text or not isinstance(text, str):
        return {
            'compound': 0.0,
            'positive': 0.0,
            'negative': 0.0,
            'neutral': 1.0
        }
    
    # Clean text
    cleaned_text = clean_text(text)
    
    # Get sentiment scores
    scores = sia.polarity_scores(cleaned_text)
    
    return {
        'compound': scores['compound'],    # Overall sentiment (-1 to 1)
        'positive': scores['pos'],         # Positive score (0 to 1)
        'negative': scores['neg'],         # Negative score (0 to 1)
        'neutral': scores['neu']           # Neutral score (0 to 1)
    }

def get_sentiment_label(compound_score):
    """
    Convert compound sentiment score to human-readable label
    
    Args:
        compound_score (float): Compound sentiment score (-1 to 1)
        
    Returns:
        str: Sentiment label
    """
    if compound_score >= 0.5:
        return 'Very Positive'
    elif compound_score >= 0.1:
        return 'Positive'
    elif compound_score >= -0.1:
        return 'Neutral'
    elif compound_score >= -0.5:
        return 'Negative'
    else:
        return 'Very Negative'

def analyze_emotional_keywords(text):
    """
    Identify emotional keywords in text
    
    Args:
        text (str): Text to analyze
        
    Returns:
        dict: Identified emotional keywords
    """
    # Define emotional keyword categories
    emotion_keywords = {
        'anxiety': ['anxious', 'worried', 'nervous', 'stressed', 'panic', 'fear', 'worried'],
        'sadness': ['sad', 'depressed', 'lonely', 'hopeless', 'miserable', 'unhappy', 'down'],
        'happiness': ['happy', 'joyful', 'excited', 'great', 'wonderful', 'amazing', 'fantastic'],
        'anger': ['angry', 'frustrated', 'mad', 'furious', 'irritated', 'annoyed'],
        'calm': ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'composed']
    }
    
    text_lower = text.lower()
    found_emotions = {}
    
    for emotion, keywords in emotion_keywords.items():
        found = [word for word in keywords if word in text_lower]
        if found:
            found_emotions[emotion] = found
    
    return found_emotions

# Example usage and testing
if __name__ == "__main__":
    # Test examples
    test_texts = [
        "I'm feeling really happy and excited about today!",
        "I'm so stressed and anxious about everything.",
        "Today was okay, nothing special happened.",
        "I feel terrible and hopeless. Everything is going wrong."
    ]
    
    print("=== Sentiment Analysis Tests ===\n")
    for text in test_texts:
        result = analyze_sentiment(text)
        label = get_sentiment_label(result['compound'])
        emotions = analyze_emotional_keywords(text)
        
        print(f"Text: {text}")
        print(f"Sentiment: {label}")
        print(f"Scores: {result}")
        print(f"Emotional Keywords: {emotions}")
        print("-" * 60)
