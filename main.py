from app import create_app, socketio
from app.models import db
import os

# Create the Flask app instance
flask_app = create_app()

# Make both flask app and socketio available at module level for gunicorn
app = flask_app  # For gunicorn app:app
# socketio is already imported and configured in create_app()

# Database initialization will be handled lazily when first needed
print("Application starting - database will be initialized on first request")

if __name__ == '__main__':
    # Run the app with SocketIO
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    socketio.run(flask_app, debug=debug, host='0.0.0.0', port=port)