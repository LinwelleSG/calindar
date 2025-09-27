from flask import Flask, request
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO
from config import config
import os

# Initialize extensions
migrate = Migrate()
cors = CORS()
socketio = SocketIO()

def create_app(config_name=None):
    app = Flask(__name__, static_folder='../static', template_folder='../templates')
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'default')
    
    # Set production config if we detect Railway environment
    if os.environ.get('RAILWAY_ENVIRONMENT'):
        config_name = 'production'
    
    app.config.from_object(config[config_name])
    
    # Enable sessions
    app.config['SESSION_TYPE'] = 'filesystem'
    
    # Import models to get db instance
    from app.models import db
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)
    socketio.init_app(app, 
                     cors_allowed_origins="*", 
                     async_mode='gevent',
                     logger=True, 
                     engineio_logger=True)
    
    # Register blueprints
    from app.api import api_bp
    from app.main import main_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(main_bp)
    
    # Add template filter for cache-busting
    import time
    @app.template_filter('cache_bust')
    def cache_bust_filter(filename):
        """Add timestamp to filename for cache busting in development"""
        if app.debug:
            try:
                # Try to get file modification time for more accurate cache busting
                file_path = os.path.join(app.static_folder, filename.replace('/', os.sep))
                if os.path.exists(file_path):
                    mtime = int(os.path.getmtime(file_path))
                    return f"{filename}?v={mtime}&t={int(time.time())}"
            except:
                pass
            # Fallback to timestamp
            return f"{filename}?v={int(time.time())}&bust=1"
        return filename
    
    # Add cache-busting headers for development
    @app.after_request
    def after_request(response):
        # Disable caching for static files and templates in development
        if app.config.get('ENV') == 'development' or app.debug:
            if request.endpoint == 'static' or request.endpoint == 'main.index':
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                response.headers['Last-Modified'] = time.strftime('%a, %d %b %Y %H:%M:%S GMT', time.gmtime())
                response.headers['ETag'] = f'"dev-{int(time.time())}"'
        return response
    
    return app