# Quick Start Guide - AI Mental Health Support Platform

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 14+** - [Download here](https://nodejs.org/)
- **MongoDB 4.4+** - [Download here](https://www.mongodb.com/try/download/community)
- **Git** (optional) - For version control

## Quick Setup (Windows)

1. **Run the automated setup script:**
   ```bash
   setup.bat
   ```

2. **Follow the on-screen instructions**

3. **Start MongoDB:**
   ```bash
   net start MongoDB
   ```

4. **Start the Backend** (in one terminal):
   ```bash
   cd backend
   venv\Scripts\activate
   python app.py
   ```

5. **Start the Frontend** (in another terminal):
   ```bash
   cd frontend
   npm start
   ```

## Quick Setup (Mac/Linux)

1. **Make the setup script executable:**
   ```bash
   chmod +x setup.sh
   ```

2. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

3. **Start MongoDB:**
   ```bash
   sudo systemctl start mongod
   ```

4. **Start the Backend** (in one terminal):
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```

5. **Start the Frontend** (in another terminal):
   ```bash
   cd frontend
   npm start
   ```

## Manual Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('vader_lexicon')"

# Create environment file
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux

# Edit .env file with your settings

# Setup database
python setup_database.py
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux
```

### 3. Train AI Model (Optional)

```bash
cd dataset
python train_model.py
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
# Activate venv first
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/health

## Default Test User

For testing, you can create a new account at http://localhost:3000/register

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `net start MongoDB` (Windows) or `sudo systemctl start mongod` (Linux)
- Check MongoDB URI in `backend/.env`

### Port Already in Use
- Backend (5000): Change `PORT` in `backend/.env`
- Frontend (3000): Port selection prompt will appear

### Python Module Not Found
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### NLTK Data Missing
```python
import nltk
nltk.download('vader_lexicon')
nltk.download('punkt')
nltk.download('stopwords')
```

## Project Structure

```
mental-health-ai-platform/
├── backend/              # Flask backend
│   ├── ai_model/        # ML models
│   ├── routes/          # API endpoints
│   └── app.py           # Main application
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       └── services/    # API services
└── dataset/             # Training data
```

## Features Available

✅ User Registration & Login
✅ Mood Tracking
✅ Journal Entries with AI Sentiment Analysis
✅ Stress Level Prediction
✅ Personalized Recommendations
✅ Analytics Dashboard with Charts
✅ Mood History Tracking

## Next Steps

1. Create your account
2. Start tracking your daily mood
3. Write journal entries
4. View your analytics and insights

## Support

For issues or questions, please check:
- README.md for detailed documentation
- Backend logs in the terminal
- Browser console for frontend errors

## Important Notes

⚠️ This is a wellness tracking tool and should not replace professional mental health care.

📱 For mental health emergencies, contact:
- Emergency: 911
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
