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
        "description": "A beautiful family calendar app with reminders",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#F4EDE5",
        "theme_color": "#D4A574",
        "orientation": "portrait-primary",
        "icons": [
            {
                "src": "/static/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "/static/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ],
        "categories": ["productivity", "lifestyle"],
        "lang": "en",
        "scope": "/"
    })

@main_bp.route('/sw.js')
def service_worker():
    """Service worker for PWA functionality"""
    from flask import send_from_directory
    import os
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), '..', '..', 'static'),
        'sw.js',
        mimetype='application/javascript'
    )