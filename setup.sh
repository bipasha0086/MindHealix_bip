#!/bin/bash

echo "============================================"
echo "AI Mental Health Support Platform Setup"
echo "============================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/5] Setting up Backend..."
cd backend

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Download NLTK data
echo "Downloading NLTK data..."
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit backend/.env file with your configuration"
fi

cd ..

echo ""
echo "[2/5] Setting up Frontend..."
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

cd ..

echo ""
echo "[3/5] Setting up Database..."
echo "Please ensure MongoDB is installed and running"
echo "MongoDB download: https://www.mongodb.com/try/download/community"
read -p "Press enter when MongoDB is running..."

# Setup database indexes
cd backend
source venv/bin/activate
echo "Setting up database indexes..."
python setup_database.py
cd ..

echo ""
echo "[4/5] Training AI Model..."
cd dataset
echo "Training stress prediction model..."
python train_model.py
cd ..

echo ""
echo "[5/5] Setup Complete!"
echo ""
echo "============================================"
echo "Next Steps:"
echo "============================================"
echo "1. Make sure MongoDB is running"
echo "2. Edit backend/.env with your configuration"
echo "3. Start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "4. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "============================================"
echo "Your app will be available at:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo "============================================"
echo ""
