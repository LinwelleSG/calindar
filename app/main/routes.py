from flask import render_template, jsonify, request, redirect, url_for, current_app
from . import main_bp
from app.models import db
from datetime import datetime, timedelta
import json

def init_db_if_needed():
    """Initialize database tables if they don't exist"""
    try:
        # Try to create tables if they don't exist
        db.create_all()
        return True
    except Exception as e:
        current_app.logger.error(f"Database initialization failed: {e}")
        return False

@main_bp.route('/')
def index():
    """Main calendar page"""
    # Try to initialize database on first request
    init_db_if_needed()
    return render_template('index.html')

@main_bp.route('/calendar')
def calendar():
    """Calendar view page"""
    # Try to initialize database on first request
    init_db_if_needed()
    return render_template('calendar.html')

@main_bp.route('/manifest.json')
def manifest():
    """PWA manifest file"""
    return jsonify({
        "name": "Calindar",
        "short_name": "Calindar",
        "description": "A modern calendar application",
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#4f46e5",
        "background_color": "#ffffff",
        "icons": [
            {
                "src": "/static/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/static/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    })

@main_bp.route('/health')
def health_check():
    """Health check endpoint"""
    db_status = "unknown"
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)[:100]}"
    
    return jsonify({
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "message": "Application is running, database may be initializing"
    })

@main_bp.route('/ping')
def ping():
    """Simple ping endpoint that doesn't require database"""
    return jsonify({
        "status": "ok",
        "message": "Application is running",
        "timestamp": datetime.utcnow().isoformat()
    })

@main_bp.route('/init-db')
def init_database():
    """Initialize database tables - for production deployment"""
    try:
        db.create_all()
        return jsonify({
            "status": "success",
            "message": "Database tables created successfully",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500
