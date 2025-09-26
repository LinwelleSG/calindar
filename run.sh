#!/bin/bash

echo "Starting Calindar PWA..."
echo

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "Installing dependencies..."
    python3 -m pip install -r requirements.txt
fi

echo
echo "Starting the application..."
echo "Open your browser and go to: http://127.0.0.1:5000"
echo "Press Ctrl+C to stop the server"
echo

python3 app.py