"""
Analytics Routes
Handles user dashboard and mood history
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson.objectid import ObjectId
from collections import Counter

analytics_bp = Blueprint('analytics', __name__)

# Import database
from extensions import mongo


def _stress_score_from_entry(entry):
    """Return a numeric stress score for analytics aggregation."""
    raw_score = entry.get('stress_score')
    if isinstance(raw_score, (int, float)):
        return float(raw_score)

    level = str(entry.get('stress_level', '')).strip().lower()
    # Fallback midpoints when historical entries do not have stress_score.
    if level == 'low':
        return 25.0
    if level == 'medium':
        return 55.0
    if level == 'high':
        return 85.0
    return 0.0

@analytics_bp.route('/user-dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard():
    """
    Get user dashboard with summary statistics
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Get user info
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user:
            return jsonify({
                'error': 'Not Found',
                'message': 'User not found'
            }), 404
        
        # Get recent mood entries (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        mood_entries = list(mongo.db.moods.find({
            'user_id': ObjectId(current_user_id),
            'date': {'$gte': thirty_days_ago}
        }).sort([('created_at', -1), ('date', -1)]))
        
        # Calculate statistics
        total_entries = len(mood_entries)
        
        if total_entries == 0:
            return jsonify({
                'user': {
                    'name': user['name'],
                    'email': user['email']
                },
                'statistics': {
                    'total_entries': 0,
                    'average_stress_score': 0,
                    'average_sentiment': 0,
                    'current_stress_level': 'Unknown',
                    'most_common_mood': 'No data'
                },
                'recent_entries': [],
                'message': 'No mood entries found. Start tracking your mood!'
            }), 200
        
        # Calculate average sentiment
        avg_sentiment = sum(entry.get('sentiment_score', 0) for entry in mood_entries) / total_entries
        avg_stress_score = sum(_stress_score_from_entry(entry) for entry in mood_entries) / total_entries
        
        # Get most common mood
        moods = [entry['mood'] for entry in mood_entries]
        most_common_mood = Counter(moods).most_common(1)[0][0]
        
        # Get current stress level (from most recent entry)
        current_stress_level = mood_entries[0].get('stress_level', 'Unknown')
        
        # Get recent entries (last 7)
        recent_entries = []
        for entry in mood_entries[:7]:
            recent_entries.append({
                'id': str(entry['_id']),
                'mood': entry['mood'],
                'stress_level': entry['stress_level'],
                'stress_score': entry.get('stress_score'),
                'sentiment_score': round(entry.get('sentiment_score', 0), 3),
                'sleep_hours': entry.get('sleep_hours', 0),
                'date': entry['date'].strftime('%Y-%m-%d'),
                'has_journal': bool(entry.get('journal_text')),
                'prediction_source': entry.get('prediction_source', 'rule_based_fallback'),
            })

        latest_entry = recent_entries[0] if recent_entries else None
        
        return jsonify({
            'user': {
                'name': user['name'],
                'email': user['email']
            },
            'statistics': {
                'total_entries': total_entries,
                'average_stress_score': round(avg_stress_score, 2),
                'average_sentiment': round(avg_sentiment, 3),
                'current_stress_level': current_stress_level,
                'most_common_mood': most_common_mood,
                'days_tracked': len(set(entry['date'].strftime('%Y-%m-%d') for entry in mood_entries))
            },
            'recent_entries': recent_entries,
            'latest_entry': latest_entry
        }), 200
        
    except Exception as e:
        print(f"Dashboard error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while fetching dashboard data'
        }), 500


@analytics_bp.route('/mood-history', methods=['GET'])
@jwt_required()
def get_mood_history():
    """
    Get mood history for specified number of days
    Query parameter: days (default: 7)
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Get number of days from query parameter
        days = request.args.get('days', default=7, type=int)
        
        # Validate days parameter
        if days < 1 or days > 365:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Days must be between 1 and 365'
            }), 400
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get mood entries
        mood_entries = list(mongo.db.moods.find({
            'user_id': ObjectId(current_user_id),
            'date': {'$gte': start_date, '$lte': end_date}
        }).sort('date', 1))
        
        # Format entries for frontend
        history = []
        for entry in mood_entries:
            history.append({
                'id': str(entry['_id']),
                'mood': entry['mood'],
                'stress_level': entry['stress_level'],
                'sentiment_score': round(entry.get('sentiment_score', 0), 3),
                'sleep_hours': entry.get('sleep_hours', 0),
                'journal_text': entry.get('journal_text', ''),
                'recommendations': entry.get('recommendations', []),
                'date': entry['date'].strftime('%Y-%m-%d'),
                'created_at': entry['created_at'].isoformat()
            })
        
        # Calculate mood distribution
        mood_distribution = Counter(entry['mood'] for entry in mood_entries)
        stress_distribution = Counter(entry['stress_level'] for entry in mood_entries)
        
        return jsonify({
            'period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'days': days
            },
            'total_entries': len(history),
            'entries': history,
            'distributions': {
                'moods': dict(mood_distribution),
                'stress_levels': dict(stress_distribution)
            }
        }), 200
        
    except Exception as e:
        print(f"Mood history error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while fetching mood history'
        }), 500


@analytics_bp.route('/stress-trends', methods=['GET'])
@jwt_required()
def get_stress_trends():
    """
    Get stress level trends over time
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Get last 30 days of entries
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        entries = list(mongo.db.moods.find({
            'user_id': ObjectId(current_user_id),
            'date': {'$gte': thirty_days_ago}
        }).sort('date', 1))
        
        if not entries:
            return jsonify({
                'message': 'No data available for stress trends',
                'trends': []
            }), 200
        
        # Group by week
        weekly_trends = {}
        for entry in entries:
            week_start = entry['date'] - timedelta(days=entry['date'].weekday())
            week_key = week_start.strftime('%Y-%m-%d')
            
            if week_key not in weekly_trends:
                weekly_trends[week_key] = {
                    'low': 0,
                    'medium': 0,
                    'high': 0,
                    'total': 0
                }
            
            stress_level = entry['stress_level'].lower()
            weekly_trends[week_key][stress_level] += 1
            weekly_trends[week_key]['total'] += 1
        
        # Format trends
        trends = []
        for week, data in sorted(weekly_trends.items()):
            trends.append({
                'week_start': week,
                'stress_levels': {
                    'low': data['low'],
                    'medium': data['medium'],
                    'high': data['high']
                },
                'total_entries': data['total']
            })
        
        return jsonify({
            'trends': trends,
            'period': '30 days'
        }), 200
        
    except Exception as e:
        print(f"Stress trends error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while fetching stress trends'
        }), 500
