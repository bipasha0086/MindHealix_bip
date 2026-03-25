"""
AI Safety Moderation for Stress Support Chat.
Detects harmful language and self-harm indicators in messages.
"""

import re
from ai_model.sentiment_analyzer import analyze_sentiment


# Harmful content patterns
_HARM_PATTERNS = [
    # Self-harm/suicide indicators
    (r"\b(suicid|kill myself|end my life|hurt myself|self.?harm|slit|hang myself)\b", "self_harm", 90),
    (r"\b(don't want to live|want to die|life is over|no reason to live)\b", "suicidal_ideation", 85),
    
    # Severe mental health crisis
    (r"\b(extremely depressed|severe depression|can't take it anymore|breaking point)\b", "crisis", 75),
    
    # Abuse/violence language
    (r"\b(abuse|beat|hit|kill you|fuck|hate you|stupid|worthless|loser)\b", "abuse", 60),
    
    # Drug/substance indicators
    (r"\b(cocaine|heroin|meth|overdose|drugs|pills|addiction)\b", "substance", 70),
]

_SAFE_KEYWORDS = [
    "exercise", "meditation", "breathing", "therapist", "counselor", "support",
    "help", "healing", "recovery", "hope", "strength", "better", "improve"
]


def _extract_harm_signals(text):
    """Extract harmful content signals from text."""
    text_lower = text.lower()
    signals = []
    
    for pattern, label, severity in _HARM_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            signals.append({
                "type": label,
                "severity": severity,
                "pattern_matched": True
            })
    
    return signals


def _calculate_safety_score(text, sentiment):
    """Calculate overall safety score (0-100, higher = safer)."""
    compound = sentiment.get("compound", 0.0)
    
    # Start with base score
    base_score = 50
    
    # Sentiment adjustment
    if compound < -0.5:
        base_score -= 20  # Very negative sentiment
    elif compound < -0.2:
        base_score -= 10  # Negative sentiment
    elif compound > 0.3:
        base_score += 10  # Positive sentiment
    
    # Check for harm patterns
    harm_signals = _extract_harm_signals(text)
    if harm_signals:
        max_severity = max(s["severity"] for s in harm_signals)
        base_score = max(0, 100 - max_severity)
    
    # Check for safe keywords (protective factors)
    safe_count = sum(1 for keyword in _SAFE_KEYWORDS if keyword in text.lower())
    if safe_count > 0:
        base_score = min(100, base_score + (safe_count * 5))
    
    return max(0, min(100, base_score))


def moderate_message(message_text):
    """
    Moderate a message for safety.
    
    Returns:
    {
        "is_safe": bool,
        "safety_score": 0-100,
        "flags": [],
        "requires_review": bool,
        "action": "allow" | "flag" | "block"
    }
    """
    if not message_text or len(message_text.strip()) < 1:
        return {
            "is_safe": True,
            "safety_score": 100,
            "flags": [],
            "requires_review": False,
            "action": "allow"
        }
    
    # Analyze sentiment
    sentiment = analyze_sentiment(message_text)
    
    # Extract harm signals
    harm_signals = _extract_harm_signals(message_text)
    
    # Calculate safety score
    safety_score = _calculate_safety_score(message_text, sentiment)
    
    # Determine action
    flags = []
    action = "allow"
    requires_review = False
    
    if harm_signals:
        for signal in harm_signals:
            severity = signal["severity"]
            signal_type = signal["type"]
            
            flags.append({
                "type": signal_type,
                "severity": severity,
                "message": f"Detected {signal_type} indicators"
            })
            
            if severity >= 85:
                action = "block"
                requires_review = True
            elif severity >= 70:
                action = "flag"
                requires_review = True
    
    # Additional sentiment checks
    if sentiment.get("compound", 0) < -0.7:
        flags.append({
            "type": "extreme_negativity",
            "severity": 65,
            "message": "Extremely negative emotional content"
        })
        if action == "allow":
            action = "flag"
            requires_review = True
    
    is_safe = action == "allow" and safety_score >= 40
    
    return {
        "is_safe": is_safe,
        "safety_score": safety_score,
        "flags": flags,
        "requires_review": requires_review,
        "action": action,
        "sentiment": sentiment
    }


def create_moderation_report(message_id, room_id, user_id, message_text, report_reason, reporter_id=None):
    """Create a moderation report for user-reported content."""
    return {
        "message_id": message_id,
        "room_id": room_id,
        "reported_user_id": user_id,
        "reporter_id": reporter_id,
        "message_content": message_text,
        "report_reason": report_reason,
        "moderation_result": moderate_message(message_text),
        "status": "pending",  # pending, reviewed, dismissed, actioned
        "created_at": None,  # Will be set by database
    }
