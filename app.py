from app import create_app, socketio
from app.models import db
import os

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
    # Run the app with SocketIO
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    socketio.run(app, debug=debug, host='0.0.0.0', port=port)