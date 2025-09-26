from datetime import datetime
import uuid
import secrets
import string
from flask_sqlalchemy import SQLAlchemy

# This will be initialized by the app factory
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user_calendars = db.relationship('UserCalendar', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, username, session_id):
        self.username = username
        self.session_id = session_id
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat(),
            'last_active': self.last_active.isoformat()
        }

class UserCalendar(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    calendar_id = db.Column(db.Integer, db.ForeignKey('calendar.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_owner = db.Column(db.Boolean, default=False)
    
    # Unique constraint to prevent duplicate user-calendar pairs
    __table_args__ = (db.UniqueConstraint('user_id', 'calendar_id', name='unique_user_calendar'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'calendar_id': self.calendar_id,
            'joined_at': self.joined_at.isoformat(),
            'is_owner': self.is_owner
        }

class Calendar(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    share_code = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    events = db.relationship('Event', backref='calendar', lazy=True, cascade='all, delete-orphan')
    user_calendars = db.relationship('UserCalendar', backref='calendar', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, name):
        self.name = name
        self.share_code = self.generate_share_code()
    
    @staticmethod
    def generate_share_code(length=8):
        """Generate a unique share code"""
        characters = string.ascii_uppercase + string.digits
        while True:
            code = ''.join(secrets.choice(characters) for _ in range(length))
            if not Calendar.query.filter_by(share_code=code).first():
                return code
    
    def to_dict(self):
        # Get actual count from database to ensure accuracy
        from sqlalchemy import func
        events_count = db.session.query(func.count(Event.id)).filter_by(calendar_id=self.id).scalar() or 0
        
        # Get member names
        members_query = db.session.query(User.username).join(
            UserCalendar, User.id == UserCalendar.user_id
        ).filter(UserCalendar.calendar_id == self.id).all()
        member_names = [member[0] for member in members_query]
        
        # Get recent event titles (for tooltip)
        recent_events = Event.query.filter_by(calendar_id=self.id).order_by(Event.start_time.desc()).limit(3).all()
        event_titles = [event.title for event in recent_events]
        
        return {
            'id': self.id,
            'name': self.name,
            'share_code': self.share_code,
            'created_at': self.created_at.isoformat(),
            'events_count': events_count,
            'members_count': len(self.user_calendars),
            'member_names': member_names,
            'recent_event_titles': event_titles
        }

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    all_day = db.Column(db.Boolean, default=False)
    reminder_minutes = db.Column(db.Integer, default=15)  # Reminder X minutes before
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Key
    calendar_id = db.Column(db.Integer, db.ForeignKey('calendar.id'), nullable=False)
    
    # Relationships
    reminders = db.relationship('Reminder', backref='event', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'all_day': self.all_day,
            'reminder_minutes': self.reminder_minutes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'calendar_id': self.calendar_id
        }

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    reminder_time = db.Column(db.DateTime, nullable=False)
    sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'reminder_time': self.reminder_time.isoformat(),
            'sent': self.sent,
            'created_at': self.created_at.isoformat()
        }