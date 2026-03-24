"""
Mental Health Recommendations Engine Module
Provides personalized recommendations and coping strategies
"""

# Recommendation database organized by stress level and mood
RECOMMENDATIONS_DB = {
    'High': {
        'general': [
            'Consider taking a 10-minute break to practice deep breathing exercises',
            'Try progressive muscle relaxation to reduce physical tension',
            'Reach out to a friend or family member for support',
            'Take a short walk in nature or a quiet environment',
            'Consider speaking with a mental health professional',
            'Avoid caffeine and sugar, which can increase anxiety',
            'Listen to calming music or nature sounds'
        ],
        'Stressed': [
            'Break down your tasks into smaller, manageable steps',
            'Practice the 4-7-8 breathing technique: inhale for 4, hold for 7, exhale for 8',
            'Set boundaries and learn to say no to additional commitments',
            'Schedule specific worry time to contain anxious thoughts',
            'Try a guided meditation for stress relief (10-15 minutes)'
        ],
        'Anxious': [
            'Use grounding techniques: Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste',
            'Challenge anxious thoughts by asking: Is this thought helpful? Is it true?',
            'Write down your worries to externalize them',
            'Practice box breathing: Breathe in for 4, hold for 4, out for 4, hold for 4',
            'Limit news and social media consumption'
        ],
        'Sad': [
            "Engage in gentle physical activity, even a short 5-minute walk",
            "Connect with someone you trust and share how you're feeling",
            "Write in a journal about your emotions without judgment",
            "Practice self-compassion: Treat yourself as you would a good friend",
            "Ensure you're getting adequate sleep and nutrition"
        ]
    },
    'Medium': {
        'general': [
            'Take regular breaks throughout your day',
            'Practice mindfulness for 5-10 minutes',
            'Engage in physical activity or stretching',
            'Connect with friends or loved ones',
            'Maintain a consistent sleep schedule',
            'Limit screen time before bed',
            'Try a new hobby or creative activity'
        ],
        'Stressed': [
            'Create a to-do list and prioritize your tasks',
            'Take 5-minute mindfulness breaks every hour',
            'Practice gratitude by listing 3 things you appreciate',
            'Engage in light exercise like yoga or walking',
            'Set realistic expectations for yourself'
        ],
        'Neutral': [
            'Maintain your current healthy habits',
            'Set personal goals for the week',
            'Try a new activity or hobby',
            'Practice preventive self-care',
            'Connect with your support network'
        ],
        'Sad': [
            'Engage in activities you usually enjoy',
            'Reach out to a friend for a casual conversation',
            'Spend time outdoors in natural light',
            'Practice gentle exercise or movement',
            'Maintain your daily routines and structure'
        ]
    },
    'Low': {
        'general': [
            'Maintain your positive habits and routines',
            'Continue practicing self-care activities',
            'Share your positive energy with others',
            'Set new personal growth goals',
            'Try learning something new',
            'Engage in social activities',
            'Practice gratitude journaling'
        ],
        'Happy': [
            'Celebrate your positive mood!',
            'Share your happiness with others',
            'Engage in activities that bring you joy',
            'Reflect on what contributed to your good mood',
            'Consider helping others who might be struggling'
        ],
        'Excited': [
            'Channel your energy into creative or productive activities',
            'Share your enthusiasm with supportive friends',
            'Start a new project or hobby',
            'Practice mindful excitement to stay grounded',
            'Document your positive experiences'
        ],
        'Neutral': [
            'Continue maintaining balance in your life',
            'Explore new activities to enhance wellbeing',
            'Practice preventive mental health care',
            'Set goals for personal growth',
            'Connect with your community'
        ]
    }
}

# Crisis resources
CRISIS_RESOURCES = {
    'emergency': {
        'name': 'Emergency Services',
        'number': '911',
        'description': 'For immediate emergency assistance'
    },
    'crisis_hotline': {
        'name': 'National Suicide Prevention Lifeline',
        'number': '988',
        'description': '24/7 free and confidential support'
    },
    'crisis_text': {
        'name': 'Crisis Text Line',
        'number': 'Text HOME to 741741',
        'description': 'Free 24/7 crisis support via text'
    }
}

def get_recommendations(mood, stress_level, sentiment_score=0.0):
    """
    Get personalized recommendations based on mood and stress level
    
    Args:
        mood (str): Current mood category
        stress_level (str): Predicted stress level (Low, Medium, High)
        sentiment_score (float): Sentiment score from text analysis
        
    Returns:
        list: List of personalized recommendations
    """
    recommendations = []
    
    # Get stress level specific recommendations
    stress_recs = RECOMMENDATIONS_DB.get(stress_level, {})
    
    # Get mood-specific recommendations
    mood_recs = stress_recs.get(mood, [])
    if mood_recs:
        recommendations.extend(mood_recs[:3])  # Add top 3 mood-specific
    
    # Add general recommendations
    general_recs = stress_recs.get('general', [])
    if general_recs:
        # Add 2-3 general recommendations that aren't already included
        for rec in general_recs:
            if rec not in recommendations and len(recommendations) < 5:
                recommendations.append(rec)
    
    # High urgency recommendations for severe negative sentiment
    if sentiment_score < -0.7 or (stress_level == 'High' and mood in ['Stressed', 'Anxious', 'Sad']):
        recommendations.insert(0, '⚠️ Consider reaching out to a mental health professional if these feelings persist')
    
    return recommendations[:5]  # Return top 5 recommendations

def get_crisis_resources():
    """
    Get crisis support resources
    
    Returns:
        dict: Crisis support resources
    """
    return CRISIS_RESOURCES

def get_coping_strategies(stress_level):
    """
    Get coping strategies for stress level
    
    Args:
        stress_level (str): Stress level (Low, Medium, High)
        
    Returns:
        dict: Categorized coping strategies
    """
    strategies = {
        'High': {
            'immediate': [
                'Deep breathing (4-7-8 technique)',
                'Progressive muscle relaxation',
                'Grounding exercises (5-4-3-2-1)'
            ],
            'short_term': [
                'Take a 15-minute break',
                'Call a supportive friend',
                'Write in a journal',
                'Go for a short walk'
            ],
            'long_term': [
                'Consider therapy or counseling',
                'Develop a regular meditation practice',
                'Create a stress management plan',
                'Build a strong support network'
            ]
        },
        'Medium': {
            'immediate': [
                'Take 5 deep breaths',
                'Stretch for 2 minutes',
                'Drink water and take a short break'
            ],
            'short_term': [
                'Practice mindfulness for 10 minutes',
                'Exercise for 20-30 minutes',
                'Connect with a friend',
                'Engage in a hobby'
            ],
            'long_term': [
                'Maintain regular exercise routine',
                'Prioritize sleep hygiene',
                'Build healthy boundaries',
                'Practice regular self-care'
            ]
        },
        'Low': {
            'maintenance': [
                'Continue healthy habits',
                'Practice gratitude daily',
                'Maintain social connections',
                'Set personal growth goals'
            ],
            'prevention': [
                'Build stress resilience',
                'Learn new coping skills',
                'Monitor mood patterns',
                'Stay physically active'
            ]
        }
    }
    
    return strategies.get(stress_level, strategies['Medium'])

def get_activity_suggestions(mood, time_available):
    """
    Get activity suggestions based on mood and available time
    
    Args:
        mood (str): Current mood
        time_available (int): Minutes available
        
    Returns:
        list: Activity suggestions
    """
    activities = {
        'quick': [  # 5-10 minutes
            'Listen to your favorite uplifting song',
            'Do 5 minutes of stretching',
            'Practice deep breathing',
            'Write 3 things you\'re grateful for',
            'Take a short walk around the block'
        ],
        'medium': [  # 15-30 minutes
            'Go for a walk in nature',
            'Do a guided meditation',
            'Call a friend or family member',
            'Do a short workout or yoga session',
            'Journal about your feelings',
            'Engage in a creative activity'
        ],
        'extended': [  # 30+ minutes
            'Exercise at the gym or at home',
            'Meet up with a friend',
            'Engage in a hobby you enjoy',
            'Take a relaxing bath',
            'Watch an uplifting movie or show',
            'Cook a healthy meal'
        ]
    }
    
    if time_available <= 10:
        return activities['quick']
    elif time_available <= 30:
        return activities['medium']
    else:
        return activities['extended']

# Example usage and testing
if __name__ == "__main__":
    print("=== Recommendation Tests ===\n")
    
    test_cases = [
        ('Stressed', 'High', -0.6),
        ('Happy', 'Low', 0.8),
        ('Anxious', 'High', -0.5),
        ('Neutral', 'Medium', 0.0)
    ]
    
    for mood, stress, sentiment in test_cases:
        recs = get_recommendations(mood, stress, sentiment)
        strategies = get_coping_strategies(stress)
        
        print(f"Mood: {mood} | Stress: {stress} | Sentiment: {sentiment}")
        print("Recommendations:")
        for i, rec in enumerate(recs, 1):
            print(f"  {i}. {rec}")
        print(f"Coping Strategies: {list(strategies.keys())}")
        print("-" * 70)
