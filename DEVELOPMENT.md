# Development Guide

## Project Architecture

### Backend Architecture
```
Flask REST API
├── Routes (Blueprint-based)
│   ├── Auth Routes (/register, /login)
│   ├── Mood Routes (/submit-mood, /analyze-text)
│   └── Analytics Routes (/user-dashboard, /mood-history)
├── AI Models
│   ├── Sentiment Analyzer (NLTK VADER)
│   ├── Stress Predictor (Rule-based + ML)
│   └── Recommendation Engine
└── Database (MongoDB)
    ├── Users Collection
    └── Moods Collection
```

### Frontend Architecture
```
React Application
├── Context (State Management)
│   └── AuthContext
├── Services
│   └── API Service (Axios)
├── Pages
│   ├── Home, Login, Register
│   ├── Dashboard
│   ├── Mood Tracker
│   ├── Journal
│   └── Analytics (Chart.js)
└── Components
    └── Navbar
```

## Development Workflow

### Adding a New Feature

#### Backend

1. **Create route file** in `backend/routes/`:
```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

new_feature_bp = Blueprint('new_feature', __name__)

@new_feature_bp.route('/endpoint', methods=['POST'])
@jwt_required()
def new_endpoint():
    # Implementation
    return jsonify({'message': 'Success'}), 200
```

2. **Register blueprint** in `backend/app.py`:
```python
from routes.new_feature import new_feature_bp
app.register_blueprint(new_feature_bp, url_prefix='/api')
```

3. **Test the endpoint** using API_TESTS.http

#### Frontend

1. **Add API function** in `frontend/src/services/api.js`:
```javascript
export const newFeatureAPI = {
  doSomething: (data) => api.post('/endpoint', data),
};
```

2. **Create page component** in `frontend/src/pages/`:
```javascript
import React from 'react';
import { newFeatureAPI } from '../services/api';

const NewFeaturePage = () => {
  // Implementation
  return <div>New Feature</div>;
};

export default NewFeaturePage;
```

3. **Add route** in `frontend/src/App.js`:
```javascript
<Route path="/new-feature" element={<ProtectedRoute><NewFeaturePage /></ProtectedRoute>} />
```

## Code Style Guidelines

### Python (Backend)
- Use PEP 8 style guide
- Docstrings for all functions
- Type hints where appropriate
- Error handling with try-catch
- Use f-strings for formatting

Example:
```python
def calculate_score(mood: str, sentiment: float) -> float:
    """
    Calculate stress score based on mood and sentiment
    
    Args:
        mood: User's current mood
        sentiment: Sentiment analysis score
        
    Returns:
        Calculated stress score
    """
    try:
        # Implementation
        return score
    except Exception as e:
        print(f"Error calculating score: {e}")
        return 0.0
```

### JavaScript (Frontend)
- Use ES6+ features
- Functional components with hooks
- PropTypes or TypeScript for type checking
- async/await for async operations
- Use descriptive variable names

Example:
```javascript
const MoodCard = ({ mood, date, stressLevel }) => {
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    try {
      setLoading(true);
      const response = await moodAPI.submitMood({ mood, date });
      // Handle response
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mood-card">
      {/* JSX */}
    </div>
  );
};
```

## Testing

### Backend Testing
```python
# tests/test_auth.py
import pytest
from app import app

def test_register():
    client = app.test_client()
    response = client.post('/api/register', json={
        'name': 'Test User',
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 201
```

### Frontend Testing
```javascript
// MoodTracker.test.js
import { render, screen } from '@testing-library/react';
import MoodTrackerPage from './MoodTrackerPage';

test('renders mood tracker', () => {
  render(<MoodTrackerPage />);
  const heading = screen.getByText(/Track Your Mood/i);
  expect(heading).toBeInTheDocument();
});
```

## AI Model Development

### Adding a New ML Model

1. Create model file in `backend/ai_model/`:
```python
# new_model.py
from sklearn.ensemble import RandomForestClassifier
import pickle

class NewModel:
    def __init__(self):
        self.model = RandomForestClassifier()
    
    def train(self, X, y):
        self.model.fit(X, y)
    
    def predict(self, X):
        return self.model.predict(X)
    
    def save(self, filepath):
        with open(filepath, 'wb') as f:
            pickle.dump(self.model, f)
```

2. Create training script in `dataset/`:
```python
# train_new_model.py
from ai_model.new_model import NewModel
import pandas as pd

# Load data
df = pd.read_csv('training_data.csv')

# Train model
model = NewModel()
model.train(X, y)
model.save('trained_models/new_model.pkl')
```

3. Use model in routes:
```python
from ai_model.new_model import NewModel

model = NewModel()
model.load('ai_model/trained_models/new_model.pkl')
prediction = model.predict(features)
```

## Database Schema Management

### Adding New Fields

1. Update model in `backend/models/__init__.py`
2. No migrations needed (MongoDB is schema-less)
3. Update API responses to include new fields
4. Update frontend to display new data

### Creating Indexes
```python
# In setup_database.py
db.collection.create_index([('field_name', ASCENDING)])
```

## Environment Variables

### Backend (.env)
```
SECRET_KEY=random-secret-key
JWT_SECRET_KEY=random-jwt-key
MONGO_URI=mongodb://localhost:27017/db_name
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Deployment Checklist

### Backend (Heroku/Railway)
- [ ] Set production environment variables
- [ ] Use MongoDB Atlas for database
- [ ] Set DEBUG=False
- [ ] Configure CORS for production frontend URL
- [ ] Use gunicorn for production server

### Frontend (Vercel/Netlify)
- [ ] Build production bundle: `npm run build`
- [ ] Set REACT_APP_API_URL to production backend
- [ ] Configure environment variables
- [ ] Test all routes and API calls

## Common Issues and Solutions

### CORS Errors
```python
# backend/app.py
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "https://yourdomain.com"]
    }
})
```

### JWT Token Expiration
```python
# backend/config.py
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
```

### MongoDB Connection Issues
```python
# Check connection
from pymongo import MongoClient
client = MongoClient(MONGO_URI)
db = client.get_database()
db.command('ping')
```

## Performance Optimization

### Backend
- Use database indexes for frequent queries
- Cache frequently accessed data
- Use pagination for large datasets
- Optimize ML model inference time

### Frontend
- Code splitting with React.lazy()
- Memoize expensive calculations
- Use React.memo for components
- Optimize images and assets
- Implement virtual scrolling for large lists

## Security Best Practices

1. **Never commit .env files**
2. **Use strong JWT secrets**
3. **Validate all user inputs**
4. **Hash passwords with bcrypt**
5. **Implement rate limiting**
6. **Use HTTPS in production**
7. **Sanitize database queries**
8. **Keep dependencies updated**

## Resources

- Flask Documentation: https://flask.palletsprojects.com/
- React Documentation: https://react.dev/
- MongoDB Documentation: https://docs.mongodb.com/
- Scikit-learn: https://scikit-learn.org/
- NLTK: https://www.nltk.org/
- Chart.js: https://www.chartjs.org/
