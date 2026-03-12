# MindHealix 🧠💚

## AI-Powered Emotional Support System

**Because Every Mind Deserves to Be Heard.**

A comprehensive full-stack application that helps users monitor stress levels and emotional well-being through AI-powered sentiment analysis and mood tracking.

## 🌟 Features

- **User Authentication**: Secure signup/login with JWT tokens and password hashing
- **Mood Tracking**: Daily mood logging with multiple emotional states
- **Journal Entries**: Text-based emotional expression and analysis
- **AI Stress Detection**: Machine learning-powered sentiment analysis and stress prediction
- **Mental Health Suggestions**: Personalized recommendations based on emotional state
- **Analytics Dashboard**: Visual representation of mood trends and stress levels
- **Progress Tracking**: Weekly and monthly emotional wellness insights

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **Chart.js** - Data visualization
- **Axios** - HTTP client
- **React Router** - Navigation

### Backend
- **Python 3.8+** - Programming language
- **Flask** - Web framework
- **Flask-JWT-Extended** - Authentication
- **Flask-CORS** - Cross-origin support
- **Flask-PyMongo** - MongoDB integration

### AI/ML
- **Scikit-learn** - Machine learning models
- **NLTK** - Natural language processing
- **Transformers (HuggingFace)** - Sentiment analysis
- **Pandas & NumPy** - Data processing

### Database
- **MongoDB** - NoSQL database
- **PyMongo** - Python MongoDB driver

## 📁 Project Structure

```
mental-health-ai-platform/
│
├── frontend/                    # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service functions
│   │   ├── utils/              # Helper functions
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                     # Flask backend API
│   ├── app.py                  # Main Flask application
│   ├── routes/                 # API route handlers
│   │   ├── auth.py            # Authentication routes
│   │   ├── mood.py            # Mood tracking routes
│   │   └── analytics.py       # Analytics routes
│   ├── models/                 # Database models
│   │   └── user.py            # User model
│   ├── ai_model/              # ML components
│   │   ├── sentiment_analyzer.py
│   │   ├── stress_predictor.py
│   │   └── recommendations.py
│   ├── utils/                 # Helper functions
│   │   ├── jwt_utils.py
│   │   └── validators.py
│   ├── config.py              # Configuration
│   └── requirements.txt       # Python dependencies
│
├── dataset/                    # Training data
│   ├── mental_health_data.csv
│   └── train_model.py         # Model training script
│
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB (v4.4+)
- pip and npm

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mental-health-ai-platform
```

### 2. Backend Setup

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
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"
```

### 3. Database Setup

```bash
# Start MongoDB service
# Windows:
net start MongoDB
# Mac/Linux:
sudo systemctl start mongod

# MongoDB will run on mongodb://localhost:27017 by default
```

### 4. Environment Variables

Create a `.env` file in the backend directory:

```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production
MONGO_URI=mongodb://localhost:27017/mental_health_db
PORT=5000
```

### 5. Train the AI Model (Optional)

```bash
cd dataset
python train_model.py
```

This will generate the trained model files in the `backend/ai_model/` directory.

### 6. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will run on `http://localhost:3000`

### 7. Start the Backend Server

```bash
cd backend
python app.py
```

The backend API will run on `http://localhost:5001`

### 8. One-Click Local Run

On Windows, you can start both frontend and backend with the bundled script:

```bat
RUN_PROJECT_LOCAL.bat
```

This script:

- starts the React frontend on `3000` if it is not already running
- starts the Flask backend on `5001` using `backend\venv\Scripts\python.exe`
- checks the backend health endpoint after startup
- works with the current `frontend/.env` and `backend/.env` setup

To stop the local servers, run:

```bat
STOP_PROJECT.bat
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Mood Tracking Endpoints

#### Submit Mood
```http
POST /api/submit-mood
Authorization: Bearer <token>
Content-Type: application/json

{
  "mood": "Happy",
  "sleep_hours": 7,
  "journal_text": "Had a great day today!",
  "date": "2026-03-09"
}
```

#### Analyze Text
```http
POST /api/analyze-text
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "I'm feeling overwhelmed with work"
}
```

### Analytics Endpoints

#### Get User Dashboard
```http
GET /api/user-dashboard
Authorization: Bearer <token>
```

#### Get Mood History
```http
GET /api/mood-history?days=7
Authorization: Bearer <token>
```

## 🛡️ YouTube Wellness Guard Extension

This project includes a browser extension in `youtube_wellness_extension/` that analyzes YouTube content while your backend is running.

### New backend endpoints

- `POST /api/youtube/analyze-content`: Analyzes YouTube metadata and returns risk level + safer alternatives.
- `GET /api/youtube/activity-summary`: Returns recent analyzed user activity for monitoring.
- `GET /api/youtube/profile`: Returns current user's saved YouTube guard profile.
- `PUT /api/youtube/profile`: Updates strict mode, allow-list channels, and custom blocked topics.
- `POST /api/youtube/notify-threshold`: Sends Twilio alert when warning threshold is exceeded.

### Quick setup

1. Start backend (`python app.py` in `backend/`).
2. In backend `.env`, set:
  - `CORS_ORIGINS=http://localhost:3000,https://www.youtube.com`
  - `YT_SEMANTIC_PROVIDER=auto` (optional, uses Gemini/Groq for deeper semantic risk scoring)
3. In Chrome, load `youtube_wellness_extension/` as an unpacked extension.

When potentially harmful depression/anxiety-heavy content is detected, the extension displays a warning panel with alternatives and a `Continue Anyway` bypass option.

### Frontend admin and rules management

- Visit `/youtube-guard-admin` after login to:
  - visualize risk distribution and timeline charts
  - view top watched channels
  - configure user-level guard rules
- You can also manage the same rules from the Profile page section **YouTube Guard Rules**.

## 🤖 AI Model Details

### Sentiment Analysis
- Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) for sentiment scoring
- Alternative: HuggingFace transformers for advanced analysis
- Outputs: compound score (-1 to 1), positive, negative, neutral scores

### Stress Prediction
- **Features**: sentiment score, mood category, sleep hours
- **Model**: Random Forest Classifier
- **Output**: Low, Medium, High stress levels
- **Accuracy**: ~85% on test data

### Mental Health Recommendations
Rule-based system that provides suggestions based on:
- Current stress level
- Recent mood patterns
- Journal sentiment analysis

## 🎨 Frontend Pages

1. **Home Page** - Landing page with platform overview
2. **Login/Signup** - User authentication
3. **User Dashboard** - Overview of emotional wellness
4. **Mood Tracker** - Daily mood input form
5. **Journal Entry** - Text-based emotional expression
6. **Analytics Dashboard** - Charts and insights

## 🔐 Security Features

- Password hashing using bcrypt
- JWT token-based authentication
- Protected API routes
- Input validation and sanitization
- CORS configuration
- Environment variable management

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  created_at: Date
}
```

### Moods Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  mood: String,
  sentiment_score: Number,
  stress_level: String,
  sleep_hours: Number,
  journal_text: String,
  recommendations: [String],
  date: Date,
  created_at: Date
}
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
```

## 🖼️ Image-Based Stress Model Training (Optional)

You can train an image classifier for stress levels (`low`, `medium`, `high`) using face images.

1. Create dataset folders:

```text
dataset/stress_images/
  low/
  medium/
  high/
```

2. Add labeled images to each class folder (recommended: at least 20+ per class).

3. Install dependencies (if not already installed):

```bash
cd backend
pip install tensorflow pillow
```

4. Run training:

```bash
cd ..
python dataset/train_image_stress_model.py --data-dir dataset/stress_images
```

Outputs will be saved in `trained_models/`:
- `image_stress_classifier.keras`
- `image_stress_classifier_metadata.json`

## 🚀 Deployment

### Backend (Heroku/Railway)
1. Set environment variables
2. Configure MongoDB Atlas
3. Deploy Flask application

### Frontend (Vercel/Netlify)
1. Build production bundle: `npm run build`
2. Deploy build folder
3. Configure environment variables

## 🔮 Future Enhancements

- [ ] AI Chatbot for mental health guidance
- [ ] Push notifications for mood tracking reminders
- [ ] Admin dashboard for analytics
- [ ] Integration with wearable devices
- [ ] Multi-language support
- [ ] Professional therapist connection feature
- [ ] Crisis hotline integration
- [ ] Social support groups

## 📝 License

MIT License - Feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This platform is designed for wellness tracking and should not replace professional mental health care. If you're experiencing a mental health crisis, please contact a qualified mental health professional or crisis hotline immediately.

## 📧 Contact

For questions or support, please open an issue in the repository.

---

**Made with ❤️ for mental wellness**
