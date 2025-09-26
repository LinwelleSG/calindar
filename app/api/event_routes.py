from flask import request, jsonify
from flask_socketio import emit
from app import socketio
from app.models import db, Event, Calendar, Reminder
from datetime import datetime, timedelta
from . import api_bp

@api_bp.route('/events', methods=['POST'])
def create_event():
    """Create a new event"""
    data = request.get_json()
    
    required_fields = ['title', 'start_time', 'end_time', 'calendar_id']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Verify calendar exists
    calendar = Calendar.query.get(data['calendar_id'])
    if not calendar:
        return jsonify({'error': 'Calendar not found'}), 404
    
    try:
        # Parse datetime strings as Philippines local time
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        
        event = Event(
            title=data['title'],
            description=data.get('description', ''),
            start_time=start_time,
            end_time=end_time,
            all_day=data.get('all_day', False),
            reminder_minutes=data.get('reminder_minutes', 15),
            calendar_id=data['calendar_id']
        )
        
        db.session.add(event)
        db.session.commit()
        
        # Create reminder if specified
        if event.reminder_minutes > 0:
            reminder_time = start_time - timedelta(minutes=event.reminder_minutes)
            reminder = Reminder(
                event_id=event.id,
                reminder_time=reminder_time
            )
            db.session.add(reminder)
            db.session.commit()
        
        # Emit real-time update to connected clients
        socketio.emit('event_created', event.to_dict(), room=f'calendar_{calendar.share_code}')
        
        return jsonify(event.to_dict()), 201
        
    except ValueError as e:
        return jsonify({'error': 'Invalid datetime format'}), 400

@api_bp.route('/events/<int:event_id>')
def get_event(event_id):
    """Get event by ID"""
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())

@api_bp.route('/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    """Update an event"""
    event = Event.query.get_or_404(event_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Update fields if provided
        if 'title' in data:
            event.title = data['title']
        if 'description' in data:
            event.description = data['description']
        if 'start_time' in data:
            event.start_time = datetime.fromisoformat(data['start_time'])
        if 'end_time' in data:
            event.end_time = datetime.fromisoformat(data['end_time'])
        if 'all_day' in data:
            event.all_day = data['all_day']
        if 'reminder_minutes' in data:
            event.reminder_minutes = data['reminder_minutes']
            
            # Update reminder
            existing_reminder = Reminder.query.filter_by(event_id=event.id).first()
            if existing_reminder:
                if event.reminder_minutes > 0:
                    existing_reminder.reminder_time = event.start_time - timedelta(minutes=event.reminder_minutes)
                else:
                    db.session.delete(existing_reminder)
            elif event.reminder_minutes > 0:
                reminder = Reminder(
                    event_id=event.id,
                    reminder_time=event.start_time - timedelta(minutes=event.reminder_minutes)
                )
                db.session.add(reminder)
        
        event.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Emit real-time update
        calendar = Calendar.query.get(event.calendar_id)
        socketio.emit('event_updated', event.to_dict(), room=f'calendar_{calendar.share_code}')
        
        return jsonify(event.to_dict())
        
    except ValueError as e:
        return jsonify({'error': 'Invalid datetime format'}), 400

@api_bp.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event"""
    event = Event.query.get_or_404(event_id)
    calendar = Calendar.query.get(event.calendar_id)
    
    # Delete associated reminders
    Reminder.query.filter_by(event_id=event_id).delete()
    
    db.session.delete(event)
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('event_deleted', {'event_id': event_id}, room=f'calendar_{calendar.share_code}')
    
    return jsonify({'message': 'Event deleted successfully'})

@api_bp.route('/events/upcoming')
def get_upcoming_events():
    """Get upcoming events across all calendars (for reminders)"""
    now = datetime.utcnow()
    upcoming_events = Event.query.filter(
        Event.start_time > now,
        Event.start_time <= now + timedelta(hours=24)
    ).order_by(Event.start_time).all()
    
    return jsonify([event.to_dict() for event in upcoming_events])

# WebSocket events for real-time updates
@socketio.on('join_calendar')
def handle_join_calendar(data):
    """Join a calendar room for real-time updates"""
    share_code = data.get('share_code')
    if share_code:
        # Verify calendar exists
        calendar = Calendar.query.filter_by(share_code=share_code).first()
        if calendar:
            from flask_socketio import join_room
            join_room(f'calendar_{share_code}')
            emit('joined_calendar', {'calendar': calendar.to_dict()})

@socketio.on('leave_calendar')
def handle_leave_calendar(data):
    """Leave a calendar room"""
    share_code = data.get('share_code')
    if share_code:
        from flask_socketio import leave_room
        leave_room(f'calendar_{share_code}')