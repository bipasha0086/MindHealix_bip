@echo off
echo ============================================
echo AI Mental Health Support Platform Setup
echo ============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Setting up Backend...
cd backend

:: Create virtual environment
echo Creating Python virtual environment...
python -m venv venv

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Install Python dependencies
echo Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt

:: Download NLTK data
echo Downloading NLTK data...
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"

:: Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo Please edit backend\.env file with your configuration
)

cd ..

echo.
echo [2/5] Setting up Frontend...
cd frontend

:: Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install

:: Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)

cd ..

echo.
echo [3/5] Setting up Database...
echo Please ensure MongoDB is installed and running
echo MongoDB download: https://www.mongodb.com/try/download/community
pause

:: Setup database indexes
cd backend
call venv\Scripts\activate.bat
echo Setting up database indexes...
python setup_database.py
cd ..

echo.
echo [4/5] Training AI Model...
cd dataset
echo Training stress prediction model...
python train_model.py
cd ..

echo.
echo [5/5] Setup Complete!
echo.
echo ============================================
echo Next Steps:
echo ============================================
echo 1. Make sure MongoDB is running
echo 2. Edit backend\.env with your configuration
echo 3. Start the backend:
echo    cd backend
echo    venv\Scripts\activate
echo    python app.py
echo.
echo 4. In a new terminal, start the frontend:
echo    cd frontend
echo    npm start
echo.
echo ============================================
echo Your app will be available at:
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo ============================================
echo.
pause
