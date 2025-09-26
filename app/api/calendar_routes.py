from flask import request, jsonify, session
from app.models import db, Calendar, Event, User, UserCalendar
from . import api_bp
import uuid

@api_bp.route('/users', methods=['POST'])
def create_or_get_user():
    """Create a new user or get existing user by session"""
    data = request.get_json()
    
    if not data or 'username' not in data:
        return jsonify({'error': 'Username is required'}), 400
    
    username = data['username'].strip()
    if not username:
        return jsonify({'error': 'Username cannot be empty'}), 400
    
    # Generate or get session ID
    session_id = session.get('user_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        session['user_session_id'] = session_id
    
    # Check if user already exists with this session
    user = User.query.filter_by(session_id=session_id).first()
    
    if user:
        # Update existing user
        user.username = username
        user.last_active = db.session.func.now()
    else:
        # Create new user
        user = User(username=username, session_id=session_id)
        db.session.add(user)
    
    db.session.commit()
    
    # Store user info in session
    session['user_id'] = user.id
    session['username'] = user.username
    
    return jsonify(user.to_dict()), 201

@api_bp.route('/users/current')
def get_current_user():
    """Get current user from session"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No user session found'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict())

@api_bp.route('/calendars', methods=['POST'])
def create_calendar():
    """Create a new calendar"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Calendar name is required'}), 400
    
    # Check if user is logged in
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session required'}), 401
    
    calendar = Calendar(name=data['name'])
    db.session.add(calendar)
    db.session.flush()  # Get the calendar ID
    
    # Associate user with calendar as owner
    user_calendar = UserCalendar(
        user_id=user_id,
        calendar_id=calendar.id,
        is_owner=True
    )
    db.session.add(user_calendar)
    db.session.commit()
    
    return jsonify(calendar.to_dict()), 201

@api_bp.route('/calendars/join', methods=['POST'])
def join_calendar():
    """Join a calendar using share code"""
    data = request.get_json()
    
    if not data or 'share_code' not in data:
        return jsonify({'error': 'Share code is required'}), 400
    
    # Check if user is logged in
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session required'}), 401
    
    share_code = data['share_code'].strip().upper()
    calendar = Calendar.query.filter_by(share_code=share_code).first()
    
    if not calendar:
        return jsonify({'error': 'Calendar not found'}), 404
    
    # Check if user is already in this calendar
    existing = UserCalendar.query.filter_by(
        user_id=user_id,
        calendar_id=calendar.id
    ).first()
    
    if existing:
        return jsonify({'message': 'Already joined this calendar', 'calendar': calendar.to_dict()}), 200
    
    # Add user to calendar
    user_calendar = UserCalendar(
        user_id=user_id,
        calendar_id=calendar.id,
        is_owner=False
    )
    db.session.add(user_calendar)
    db.session.commit()
    
    return jsonify({'message': 'Successfully joined calendar', 'calendar': calendar.to_dict()}), 201

@api_bp.route('/calendars/<int:calendar_id>/leave', methods=['DELETE'])
def leave_calendar(calendar_id):
    """Leave a calendar (remove from user's dashboard)"""
    # Check if user is logged in
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session required'}), 401
    
    # Find the user-calendar relationship
    user_calendar = UserCalendar.query.filter_by(
        user_id=user_id,
        calendar_id=calendar_id
    ).first()
    
    if not user_calendar:
        return jsonify({'error': 'You are not a member of this calendar'}), 404
    
    # Check if user is the owner
    if user_calendar.is_owner:
        # Find the next member to transfer ownership to (earliest joined after owner)
        next_owner = UserCalendar.query.filter(
            UserCalendar.calendar_id == calendar_id,
            UserCalendar.user_id != user_id,
            UserCalendar.is_owner == False
        ).order_by(UserCalendar.joined_at).first()
        
        if next_owner:
            # Transfer ownership to the next member
            next_owner.is_owner = True
            db.session.commit()
    
    # Remove the relationship (calendar remains for other users)
    db.session.delete(user_calendar)
    db.session.commit()
    
    return jsonify({'message': 'Successfully left calendar'}), 200

@api_bp.route('/calendars/<int:calendar_id>/members')
def get_calendar_members(calendar_id):
    """Get all members of a calendar"""
    calendar = Calendar.query.get_or_404(calendar_id)
    
    # Get all members with their user details
    members_query = db.session.query(User, UserCalendar).join(
        UserCalendar, User.id == UserCalendar.user_id
    ).filter(UserCalendar.calendar_id == calendar_id).order_by(UserCalendar.joined_at)
    
    members_data = []
    for user, user_calendar in members_query:
        member_data = {
            'id': user.id,
            'username': user.username,
            'joined_at': user_calendar.joined_at.isoformat(),
            'is_owner': user_calendar.is_owner
        }
        members_data.append(member_data)
    
    return jsonify(members_data)

@api_bp.route('/calendars/<int:calendar_id>/upcoming-events')
def get_calendar_upcoming_events(calendar_id):
    """Get upcoming events for a calendar (next 5 events)"""
    from datetime import datetime
    
    calendar = Calendar.query.get_or_404(calendar_id)
    
    # Get upcoming events (next 5)
    upcoming_events = Event.query.filter(
        Event.calendar_id == calendar_id,
        Event.start_time >= datetime.utcnow()
    ).order_by(Event.start_time).limit(5).all()
    
    return jsonify([event.to_dict() for event in upcoming_events])

@api_bp.route('/users/calendars')
def get_user_calendars():
    """Get all calendars for the current user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session required'}), 401
    
    # Get all calendars the user is a member of
    user_calendars = db.session.query(Calendar, UserCalendar).join(
        UserCalendar, Calendar.id == UserCalendar.calendar_id
    ).filter(UserCalendar.user_id == user_id).all()
    
    calendars_data = []
    for calendar, user_calendar in user_calendars:
        calendar_dict = calendar.to_dict()
        calendar_dict['is_owner'] = user_calendar.is_owner
        calendar_dict['joined_at'] = user_calendar.joined_at.isoformat()
        calendars_data.append(calendar_dict)
    
    return jsonify(calendars_data)

@api_bp.route('/calendars/<share_code>')
def get_calendar_by_share_code(share_code):
    """Get calendar by share code"""
    calendar = Calendar.query.filter_by(share_code=share_code).first()
    
    if not calendar:
        return jsonify({'error': 'Calendar not found'}), 404
    
    return jsonify(calendar.to_dict())

@api_bp.route('/calendars/<int:calendar_id>')
def get_calendar(calendar_id):
    """Get calendar by ID"""
    calendar = Calendar.query.get_or_404(calendar_id)
    return jsonify(calendar.to_dict())

@api_bp.route('/calendars')
def list_calendars():
    """List all calendars for current user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify([])  # Return empty list if no user session
    
    return get_user_calendars()

@api_bp.route('/calendars/<int:calendar_id>/events')
def get_calendar_events(calendar_id):
    """Get all events for a calendar"""
    calendar = Calendar.query.get_or_404(calendar_id)
    
    # Optional date range filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Event.query.filter_by(calendar_id=calendar_id)
    
    if start_date:
        from datetime import datetime
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        query = query.filter(Event.end_time >= start_dt)
    
    if end_date:
        from datetime import datetime
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query = query.filter(Event.start_time <= end_dt)
    
    events = query.order_by(Event.start_time).all()
    
    return jsonify([event.to_dict() for event in events])

@api_bp.route('/calendars/<share_code>/events')
def get_shared_calendar_events(share_code):
    """Get all events for a calendar by share code"""
    calendar = Calendar.query.filter_by(share_code=share_code).first()
    
    if not calendar:
        return jsonify({'error': 'Calendar not found'}), 404
    
    return get_calendar_events(calendar.id)

@api_bp.route('/calendars/<int:calendar_id>', methods=['DELETE'])
def delete_calendar(calendar_id):
    """Delete a calendar (only owner can delete)"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'User session required'}), 401
        
        # Find the user-calendar relationship to check ownership
        user_calendar = UserCalendar.query.filter_by(
            user_id=user_id,
            calendar_id=calendar_id,
            is_owner=True
        ).first()
        
        if not user_calendar:
            return jsonify({'error': 'Only the calendar owner can delete the calendar'}), 403
        
        # Check if owner is the only member
        member_count = UserCalendar.query.filter_by(calendar_id=calendar_id).count()
        if member_count > 1:
            return jsonify({'error': 'Cannot delete calendar with other members. Remove all members first or transfer ownership.'}), 400
        
        # Get the calendar
        calendar = Calendar.query.get_or_404(calendar_id)
        
        # Delete all reminders for events in this calendar first
        from app.models import Reminder
        reminders_to_delete = db.session.query(Reminder).join(Event).filter(Event.calendar_id == calendar_id).all()
        for reminder in reminders_to_delete:
            db.session.delete(reminder)
        
        # Delete the calendar (cascade will handle events and user_calendars)
        db.session.delete(calendar)
        db.session.commit()
        
        return jsonify({'message': 'Calendar deleted successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting calendar: {str(e)}")
        return jsonify({'error': f'Failed to delete calendar: {str(e)}'}), 500

@api_bp.route('/calendars/<int:calendar_id>/members/<int:member_id>', methods=['DELETE'])
def remove_member(calendar_id, member_id):
    """Remove a member from calendar (only owner can remove)"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session required'}), 401
    
    # Check if current user is owner
    owner_relation = UserCalendar.query.filter_by(
        user_id=user_id,
        calendar_id=calendar_id,
        is_owner=True
    ).first()
    
    if not owner_relation:
        return jsonify({'error': 'Only the calendar owner can remove members'}), 403
    
    # Find the member to remove
    member_relation = UserCalendar.query.filter_by(
        user_id=member_id,
        calendar_id=calendar_id
    ).first()
    
    if not member_relation:
        return jsonify({'error': 'Member not found in this calendar'}), 404
    
    # Don't let owner remove themselves this way
    if member_relation.is_owner:
        return jsonify({'error': 'Cannot remove the owner. Transfer ownership first.'}), 400
    
    # Remove the member
    db.session.delete(member_relation)
    db.session.commit()
    
    return jsonify({'message': 'Member removed successfully'}), 200

@api_bp.route('/calendars/<int:calendar_id>/transfer-ownership', methods=['POST'])
def transfer_ownership(calendar_id):
    """Transfer ownership to another member"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session required'}), 401
    
    data = request.get_json()
    if not data or 'new_owner_id' not in data:
        return jsonify({'error': 'New owner ID is required'}), 400
    
    new_owner_id = data['new_owner_id']
    
    # Check if current user is owner
    current_owner = UserCalendar.query.filter_by(
        user_id=user_id,
        calendar_id=calendar_id,
        is_owner=True
    ).first()
    
    if not current_owner:
        return jsonify({'error': 'Only the calendar owner can transfer ownership'}), 403
    
    # Find the new owner
    new_owner = UserCalendar.query.filter_by(
        user_id=new_owner_id,
        calendar_id=calendar_id
    ).first()
    
    if not new_owner:
        return jsonify({'error': 'New owner must be a member of this calendar'}), 404
    
    # Transfer ownership
    current_owner.is_owner = False
    new_owner.is_owner = True
    
    db.session.commit()
    
    return jsonify({'message': 'Ownership transferred successfully'}), 200

