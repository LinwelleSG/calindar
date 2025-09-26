from flask import Flask
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
    
    return app