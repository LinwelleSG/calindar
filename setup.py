#!/usr/bin/env python3
"""
Quick setup script for Calindar PWA
"""

import os
import sys
import subprocess

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            return True
        else:
            print(f"❌ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error running {description}: {str(e)}")
        return False

def main():
    print("🚀 Setting up Calindar PWA...")
    print("=" * 50)
    
    # Check if Python is available
    python_cmd = "python" if sys.platform == "win32" else "python3"
    
    # Install dependencies
    if not run_command(f"{python_cmd} -m pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies. Please install manually:")
        print(f"   {python_cmd} -m pip install -r requirements.txt")
        return False
    
    # Create necessary directories
    os.makedirs("static/icons", exist_ok=True)
    os.makedirs("instance", exist_ok=True)
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Add your PWA icons to static/icons/:")
    print("   - icon-192x192.png")
    print("   - icon-512x512.png")
    print("\n2. Start the application:")
    print(f"   {python_cmd} app.py")
    print("\n3. Open http://127.0.0.1:5000 in your browser")
    print("\n4. Create your first calendar and start sharing!")

if __name__ == "__main__":
    main()