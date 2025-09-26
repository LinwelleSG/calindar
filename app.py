from app import create_app, socketio
from app.models import db
import os

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
    # Run the app with SocketIO
    socketio.run(app, debug=True, host='127.0.0.1', port=5000)