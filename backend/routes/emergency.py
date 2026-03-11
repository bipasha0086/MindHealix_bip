"""
Emergency Support Routes
Handles emergency contact management and stress alert notifications.
"""
from datetime import datetime

from bson.objectid import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import mongo

emergency_bp = Blueprint('emergency', __name__)


def _normalize_contact(contact):
    if not isinstance(contact, dict):
        return None

    return {
        'name': str(contact.get('name', '')).strip(),
        'relation': str(contact.get('relation', '')).strip(),
        'phone': str(contact.get('phone', '')).strip(),
        'updated_at': datetime.utcnow().isoformat()
    }


@emergency_bp.route('/emergency-contact', methods=['GET'])
@jwt_required()
def get_emergency_contact():
    """Fetch current user's emergency contact."""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})

        if not user:
            return jsonify({
                'error': 'Not Found',
                'message': 'User not found'
            }), 404

        contact = _normalize_contact(user.get('emergency_contact'))
        return jsonify({'contact': contact}), 200
    except Exception as e:
        print(f"Get emergency contact error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while fetching emergency contact'
        }), 500


@emergency_bp.route('/emergency-contact', methods=['PUT'])
@jwt_required()
def save_emergency_contact():
    """Create or update emergency contact for current user."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}

        name = str(data.get('name', '')).strip()
        relation = str(data.get('relation', '')).strip()
        phone = str(data.get('phone', '')).strip()

        if not name or not phone:
            return jsonify({
                'error': 'Validation Error',
                'message': 'Contact name and phone are required'
            }), 400

        emergency_contact = {
            'name': name,
            'relation': relation,
            'phone': phone,
            'updated_at': datetime.utcnow()
        }

        result = mongo.db.users.update_one(
            {'_id': ObjectId(current_user_id)},
            {
                '$set': {
                    'emergency_contact': emergency_contact,
                    'updated_at': datetime.utcnow()
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({
                'error': 'Not Found',
                'message': 'User not found'
            }), 404

        return jsonify({
            'message': 'Emergency contact saved successfully',
            'contact': {
                'name': emergency_contact['name'],
                'relation': emergency_contact['relation'],
                'phone': emergency_contact['phone'],
                'updated_at': emergency_contact['updated_at'].isoformat()
            }
        }), 200
    except Exception as e:
        print(f"Save emergency contact error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while saving emergency contact'
        }), 500


@emergency_bp.route('/emergency-alerts', methods=['GET'])
@jwt_required()
def list_emergency_alerts():
    """List emergency alerts generated for current user."""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', default=20, type=int)
        limit = max(1, min(limit, 100))

        alerts_cursor = mongo.db.emergency_alerts.find({
            'user_id': ObjectId(current_user_id)
        }).sort('created_at', -1).limit(limit)

        alerts = []
        for alert in alerts_cursor:
            contact = alert.get('contact', {})
            alerts.append({
                'id': str(alert['_id']),
                'message': alert.get('message', ''),
                'stress_level': alert.get('stress_level', 'High'),
                'status': alert.get('status', 'sent'),
                'contact': {
                    'name': contact.get('name', ''),
                    'relation': contact.get('relation', ''),
                    'phone': contact.get('phone', ''),
                },
                'mood_entry_id': str(alert.get('mood_entry_id', '')) if alert.get('mood_entry_id') else None,
                'created_at': alert['created_at'].isoformat(),
                'read': bool(alert.get('read', False)),
            })

        return jsonify({'alerts': alerts}), 200
    except Exception as e:
        print(f"List emergency alerts error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while fetching emergency alerts'
        }), 500


@emergency_bp.route('/emergency-alerts/<alert_id>/read', methods=['PATCH'])
@jwt_required()
def mark_emergency_alert_as_read(alert_id):
    """Mark a specific emergency alert as read."""
    try:
        current_user_id = get_jwt_identity()
        result = mongo.db.emergency_alerts.update_one(
            {
                '_id': ObjectId(alert_id),
                'user_id': ObjectId(current_user_id)
            },
            {
                '$set': {
                    'read': True,
                    'read_at': datetime.utcnow()
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({
                'error': 'Not Found',
                'message': 'Alert not found'
            }), 404

        return jsonify({'message': 'Alert marked as read'}), 200
    except Exception as e:
        print(f"Mark emergency alert read error: {str(e)}")
        return jsonify({
            'error': 'Server Error',
            'message': 'An error occurred while updating emergency alert'
        }), 500
