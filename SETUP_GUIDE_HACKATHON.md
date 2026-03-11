# 🚀 WellnessHub - Professional Setup Guide

## ✅ What's Been Done

### 1. **Enhanced UI/UX for Hackathons**
✨ **Professional styling** with:
- **Dark glassmorphism design** with animated gradients
- **Modern form validation** with real-time error messages
- **Smooth animations** on all interactions
- **Responsive design** (mobile, tablet, desktop)
- **Professional color scheme** (purple/pink gradients)

### 2. **Improved Authentication Pages**

#### **🔐 LoginPage - Professional & Interactive**
- Email validation with error display
- Password visibility toggle (👁️ icon)
- Real-time form validation
- Success/error animation effects
- Focused field glowing borders
- MongoDB connection troubleshooting info
- Features highlight section

#### **📝 RegisterPage - Complete Registration**
- Full name, email, password, confirm password fields
- Advanced validation (name length, email format, password strength)
- Password strength indicator (uppercase, lowercase, number required)
- Real-time error feedback for each field
- Field focus animations
- Success confirmation before redirect
- Hackathon-ready metrics display

#### **🧭 Enhanced Navbar**
- Sticky navigation with backdrop blur
- User profile display (name, email, avatar)
- Mobile-responsive hamburger menu
- Active link highlighting
- Logout functionality
- Logo with hover effects
- Dashboard links (Mood Tracker, Journal, Analytics)

### 3. **Better AI Chatbot**
- Fixed response generation (no API dependency needed)
- Pattern-based responses for common issues
- Crisis detection (988 Suicide Hotline)
- Keyword-aware suggestions
- Improved UI with animations
- Better error handling

---

## 🛠️ Quick Start

### **Step 1: Start MongoDB**

**Option A - Batch File (Easiest)**
```bash
Double-click: START_MONGODB.bat
```

**Option B - Manual Command**
```powershell
mongod --dbpath="C:\data\db"
```

**Option C - Windows Service**
```powershell
net start MongoDB
```

### **Step 2: Verify Servers Are Running**

```powershell
# Check Backend
netstat -ano | Select-String ":5000" | Select-String "LISTENING"
# Should show: LISTENING

# Check Frontend  
netstat -ano | Select-String ":3000" | Select-String "LISTENING"
# Should show: LISTENING

# Check MongoDB
netstat -ano | Select-String ":27017" | Select-String "LISTENING"
# Should show: LISTENING

# OR use PowerShell command
Get-Process mongod -ErrorAction SilentlyContinue
```

### **Step 3: Open Browser**

```
http://localhost:3000
```

---

## 📝 Testing Login/Register

### **Test Flow:**

1. **Go to Sign Up page** → Click "Create Account" or "🚀 Sign Up"
2. **Fill in the form:**
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "Password123"
   - Confirm: "Password123"
3. **Click "Create Account"**
4. **Success!** You'll be redirected to dashboard

### **Then Login:**

1. **Go to Login page** → Click "🔑 Sign In"
2. **Enter credentials:**
   - Email: "test@example.com"
   - Password: "Password123"
3. **Click "Sign In"**
4. **Redirected to dashboard!**

---

## 🐛 Troubleshooting

### **Login/Register Not Working?**

**Problem: "ECONNREFUSED" or connection error**
```
✓ MongoDB is not running
✓ Backend on port 5000 stopped

Solution:
1. Start MongoDB (see Step 1 above)
2. Rerun backend: cd backend && python app.py
3. Refresh browser (Ctrl+F5)
```

**Problem: "Email already registered"**
```
Solution:
- Use a different email address
- Or delete the test user from MongoDB:
  1. Open MongoDB Compass
  2. Connect to: mongodb://localhost:27017
  3. Find "mental_health_db" database
  4. Go to "users" collection
  5. Delete the test user document
```

**Problem: "Invalid email or password"**
```
Solution:
- Double-check email and password spelling
- Passwords are case-sensitive
- Make sure MongoDB is running
```

### **MongoDB Won't Start?**

**If you see "MongoDB not found":**

1. **Download MongoDB Community**
   ```
   Visit: https://www.mongodb.com/try/download/community
   ```

2. **Install MongoDB**
   - Run the MSI installer
   - Check "Install MongoDB as a Service"
   - Complete installation

3. **Verify Installation**
   ```powershell
   where mongod
   # Should show: C:\Program Files\MongoDB\Server\X.X\bin\mongod.exe
   ```

4. **Start MongoDB**
   ```powershell
   net start MongoDB
   ```

---

## 🎨 UI Features for Hackathon

### **Visual Features:**
✅ Glassmorphism design (blurred backdrop)
✅ Gradient animations (purple/pink color scheme)
✅ Smooth transitions and hover effects
✅ Animated error/success messages
✅ Input field focus glowing
✅ Mobile-responsive design
✅ Professional navbar with user info
✅ Loading spinners
✅ Form validation feedback

### **UX Features:**
✅ Real-time form validation
✅ Password visibility toggle
✅ Success confirmations
✅ Error message animations
✅ Focused field highlighting
✅ Mobile hamburger menu
✅ User profile display
✅ Logout functionality
✅ Deep linking to dashboard

---

## 🔗 Important URLs

```
Frontend:    http://localhost:3000
Backend:     http://localhost:5000/api
MongoDB:     mongodb://localhost:27017
```

---

## 📊 File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.js          ✨ Enhanced form
│   │   ├── RegisterPage.js       ✨ Professional signup
│   │   ├── HomePage.js           ✨ Modern landing
│   │   ├── DashboardPage.js
│   │   └── ...
│   ├── components/
│   │   ├── Navbar.js             ✨ Professional nav
│   │   ├── AIChatbot.js          ✨ Improved chatbot
│   │   └── ...
│   └── services/
│       └── api.js                 (handles auth API)
│
backend/
├── app.py                         (Flask server)
├── routes/
│   └── auth.py                    (Registration/Login)
├── extensions.py                  (Database setup)
└── requirements.txt
```

---

## 🚀 Hackathon Readiness Checklist

- ✅ Modern, professional UI/UX
- ✅ Working authentication (login/register)
- ✅ Form validation with error feedback
- ✅ Responsive design
- ✅ Animated components
- ✅ Professional navigation bar
- ✅ AI-powered features (chatbot, sentiment analysis)
- ✅ Real-time analytics
- ✅ Dashboard with mood tracking
- ✅ Voice-to-text capability
- ✅ Mobile optimization
- ✅ Error handling and UX feedback

---

## 💡 Pro Tips for Presentation

1. **Clean up console** - No errors should show in DevTools
2. **Test on mobile** - Use DevTools' responsive design
3. **Show animations** - Hover over buttons, focus on inputs
4. **Explain features** - AI chatbot, sentiment analysis, wellness score
5. **Mention tech stack** - React, Flask, MongoDB, NLTK, scikit-learn
6. **Performance** - Smooth animations, no lag

---

## ⚡ Quick Command Reference

```powershell
# Start MongoDB
mongod --dbpath="C:\data\db"

# Check if running
netstat -ano | Select-String ":27017"

# Start Backend
cd backend
.\venv\Scripts\Activate.ps1
python app.py

# Start Frontend (in new terminal)
cd frontend
npm start

# View logs
# Backend: Check terminal for Flask logs
# Frontend: Check browser console (F12)
```

---

## ✨ What Makes This Special

🎯 **Professional Design** - Hackathon-grade UI with animations
🔐 **Secure Auth** - Password hashing, JWT tokens
🤖 **AI Features** - Real-time sentiment analysis, wellness scoring
📊 **Analytics** - Real-time mood tracking and trends
💬 **24/7 Support** - AI chatbot on every page
📱 **Responsive** - Works on all devices
⚡ **Fast** - Smooth animations and quick load times

---

## 📞 Support

If authentication still doesn't work after MongoDB is running:

1. Check backend logs for errors
2. Verify MongoDB connection: `mongo` or `mongosh`
3. Check if ports 3000, 5000, 27017 are not blocked
4. Restart all services (MongoDB, Backend, Frontend)

---

**Happy Hacking! 🚀**
