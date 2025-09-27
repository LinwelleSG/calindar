#!/usr/bin/env python3

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db

def init_database():
    """Initialize the database with all tables"""
    try:
        app = create_app()
        print("App created successfully")
        
        with app.app_context():
            # Remove existing database file to start fresh
            db_path = 'calendar.db'
            if os.path.exists(db_path):
                os.remove(db_path)
                print(f"Removed existing database: {db_path}")
            
            # Create all tables
            db.create_all()
            print("Database tables created successfully!")
            
            # Test the database connection
            from app.models import User
            test_user = User.query.first()
            print("Database connection test passed!")
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False
    
    return True

if __name__ == '__main__':
    print("Initializing fresh SQLite database...")
    if init_database():
        print("✅ Database initialization completed successfully!")
    else:
        print("❌ Database initialization failed!")
        sys.exit(1)