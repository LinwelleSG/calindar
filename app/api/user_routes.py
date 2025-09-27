from flask import request, jsonify, session
from ..models import db, User
from . import api_bp
import secrets
import string

@api_bp.route('/user/check-username', methods=['GET'])
def check_username():
    """Check if username is available"""
    print(f"DEBUG: check_username called with args: {request.args}")
    try:
        username = request.args.get('username', '').strip()
        print(f"DEBUG: Processing username: '{username}'")
        
        if not username:
            print("DEBUG: Username is empty")
            return jsonify({'error': 'Username is required'}), 400
            
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters long'}), 400
            
        if len(username) > 20:
            return jsonify({'error': 'Username must be less than 20 characters long'}), 400
        
        # Check if username already exists (case insensitive)
        try:
            existing_user = User.query.filter(User.username.ilike(username)).first()
            
            if existing_user:
                response_data = {
                    'available': False,
                    'message': 'Username is already taken'
                }
                print(f"DEBUG: Returning response: {response_data}")
                return jsonify(response_data)
            else:
                response_data = {
                    'available': True,
                    'message': 'Username is available'
                }
                print(f"DEBUG: Returning response: {response_data}")
                return jsonify(response_data)
        except Exception as db_error:
            print(f"DEBUG: Database query failed: {db_error}")
            # Try to create tables if they don't exist and try again
            try:
                db.create_all()
                existing_user = User.query.filter(User.username.ilike(username)).first()
                response_data = {
                    'available': not bool(existing_user),
                    'message': 'Username is available' if not existing_user else 'Username is already taken'
                }
                return jsonify(response_data)
            except Exception as create_error:
                print(f"DEBUG: Database creation failed: {create_error}")
                return jsonify({'error': 'Database error'}), 500
            
    except Exception as e:
        print(f"DEBUG: Unexpected error: {e}")
        return jsonify({'error': 'Service temporarily unavailable', 'details': str(e)}), 500

@api_bp.route('/user/register', methods=['POST'])
def register_user():
    """Register a new user with username"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
            
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters long'}), 400
            
        if len(username) > 20:
            return jsonify({'error': 'Username must be less than 20 characters long'}), 400
        
        try:
            # Check if username already exists (case insensitive)
            existing_user = User.query.filter(User.username.ilike(username)).first()
            
            if existing_user:
                return jsonify({'error': 'Username is already taken'}), 400
                
            # Generate a unique session ID
            session_id = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            
            # Create new user
            new_user = User(username=username, session_id=session_id)
            db.session.add(new_user)
            db.session.commit()
            
            # Store user info in session
            session['user_id'] = new_user.id
            session['username'] = new_user.username
            session['session_id'] = session_id
            
            return jsonify({
                'success': True,
                'message': 'User registered successfully',
                'user': new_user.to_dict()
            })
            
        except Exception as db_error:
            print(f"Database error during registration: {db_error}")
            try:
                db.session.rollback()
                # Try to create tables if they don't exist
                db.create_all()
                # Try registration again
                existing_user = User.query.filter(User.username.ilike(username)).first()
                if existing_user:
                    return jsonify({'error': 'Username is already taken'}), 400
                    
                session_id = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
                new_user = User(username=username, session_id=session_id)
                db.session.add(new_user)
                db.session.commit()
                
                session['user_id'] = new_user.id
                session['username'] = new_user.username
                session['session_id'] = session_id
                
                return jsonify({
                    'success': True,
                    'message': 'User registered successfully',
                    'user': new_user.to_dict()
                })
            except Exception as retry_error:
                print(f"Retry registration failed: {retry_error}")
                try:
                    db.session.rollback()
                except:
                    pass
                return jsonify({'error': 'Registration failed. Please try again.'}), 500
        
    except Exception as e:
        print(f"Unexpected error during registration: {e}")
        return jsonify({'error': 'Service temporarily unavailable'}), 500

@api_bp.route('/user/login', methods=['POST'])
def login_user():
    """Login existing user by username"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        try:
            # Find user by username (case insensitive)
            user = User.query.filter(User.username.ilike(username)).first()
            
            if not user:
                return jsonify({'error': 'Username not found'}), 404
                
            # Update last active time
            user.last_active = db.func.now()
            db.session.commit()
            
            # Store user info in session
            session['user_id'] = user.id
            session['username'] = user.username
            session['session_id'] = user.session_id
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'user': user.to_dict()
            })
            
        except Exception as db_error:
            print(f"Database error during login: {db_error}")
            try:
                db.session.rollback()
                # Try to create tables if needed
                db.create_all()
                user = User.query.filter(User.username.ilike(username)).first()
                if not user:
                    return jsonify({'error': 'Username not found'}), 404
                    
                session['user_id'] = user.id
                session['username'] = user.username
                session['session_id'] = user.session_id
                
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': user.to_dict()
                })
            except Exception as retry_error:
                print(f"Retry login failed: {retry_error}")
                return jsonify({'error': 'Login failed. Please try again.'}), 500
        
    except Exception as e:
        print(f"Unexpected error during login: {e}")
        return jsonify({'error': 'Service temporarily unavailable'}), 500

@api_bp.route('/user/current', methods=['GET'])
def get_current_logged_user():
    """Get current logged in user"""
    print(f"DEBUG: get_current_logged_user called, session: {dict(session)}")
    try:
        user_id = session.get('user_id')
        if not user_id:
            print("DEBUG: No user_id in session")
            return jsonify({'error': 'Not authenticated'}), 401
        
        try:
            user = User.query.get(user_id)
            if not user:
                print("DEBUG: User not found in database")
                # Clear invalid session
                session.clear()
                return jsonify({'error': 'User not found'}), 401
                
            print(f"DEBUG: Found user: {user.username}")
            return jsonify(user.to_dict())
            
        except Exception as db_error:
            print(f"Database error getting current user: {db_error}")
            try:
                # Try to create tables if needed
                db.create_all()
                user = User.query.get(user_id)
                if not user:
                    session.clear()
                    return jsonify({'error': 'User not found'}), 401
                return jsonify(user.to_dict())
            except Exception as retry_error:
                print(f"Retry get current user failed: {retry_error}")
                return jsonify({'error': 'Unable to verify user. Please try again.'}), 500
        
    except Exception as e:
        print(f"DEBUG: Error in get_current_logged_user: {e}")
        return jsonify({'error': 'Service temporarily unavailable'}), 500

@api_bp.route('/user/logout', methods=['POST'])
def logout_user():
    """Logout current user"""
    try:
        session.clear()
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500