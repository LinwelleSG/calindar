from flask import render_template, jsonify
from . import main_bp

@main_bp.route('/')
def index():
    """Serve the main PWA interface"""
    return render_template('index.html')

@main_bp.route('/calendar/<share_code>')
def shared_calendar(share_code):
    """Serve the shared calendar view"""
    return render_template('calendar.html', share_code=share_code)

@main_bp.route('/debug')
def debug():
    """Debug page for testing notifications"""
    from flask import send_from_directory
    import os
    # Serve the debug.html file from the root directory
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', '..'), 'debug.html')

@main_bp.route('/manifest.json')
def manifest():
    """PWA manifest file"""
    return jsonify({
        "name": "Calindar - Family Calendar",
        "short_name": "Calindar",
        "description": "A lightweight family calendar and reminder app",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#2196F3",
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

@main_bp.route('/sw.js')
def service_worker():
    """Service worker for PWA functionality"""
    return render_template('sw.js'), 200, {'Content-Type': 'application/javascript'}