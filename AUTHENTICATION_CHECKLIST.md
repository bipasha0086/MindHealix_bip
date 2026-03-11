# 🔐 Authentication Troubleshooting Checklist

## ✅ Pre-Flight Checks

- [ ] **MongoDB Running?**
  ```powershell
  netstat -ano | Select-String ":27017" | Select-String "LISTENING"
  ```
  If NO → Run: `mongod --dbpath="C:\data\db"`

- [ ] **Backend Running?**
  ```powershell
  netstat -ano | Select-String ":5000" | Select-String "LISTENING"
  ```
  If NO → Run in backend folder: `python app.py`

- [ ] **Frontend Running?**
  ```powershell
  netstat -ano | Select-String ":3000" | Select-String "LISTENING"
  ```
  If NO → Run in frontend folder: `npm start`

---

## 🔍 If Login/Register Shows Errors

### **Error: "Cannot POST /api/auth/register"**
- ❌ Backend server not running
- ✅ Solution: Start backend server first

### **Error: "connect ECONNREFUSED 127.0.0.1:5000"**
- ❌ Backend not running
- ✅ Solution: Open terminal, go to `backend` folder, run `python app.py`

### **Error: "connect ECONNREFUSED 127.0.0.1:27017"**
- ❌ MongoDB not running
- ✅ Solution: Run `mongod --dbpath="C:\data\db"` in new terminal

### **Error: "Email already registered"**
- ℹ️ You already created this email
- ✅ Solution: Use different email OR delete user from MongoDB

### **Error: "Invalid email or password" (on login)**
- ❌ Wrong credentials or user doesn't exist
- ✅ Solution: Check spelling, try registering new account

### **Error: "validation error"**
- ❌ Form doesn't meet requirements
- ✅ Check that:
  - Name: At least 2 characters
  - Email: Valid email format (name@domain.com)
  - Password: At least 6 characters with uppercase, lowercase, number
  - Confirm Password: Matches password field

---

## 🛠️ Step-by-Step Fix

### **1. Check All Services Running**
```powershell
# Terminal 1 - MongoDB
mongod --dbpath="C:\data\db"

# Terminal 2 - Backend
cd backend
python app.py

# Terminal 3 - Frontend  
cd frontend
npm start

# Terminal 4 - Verification
netstat -ano | Select-String "3000|5000|27017"
```

### **2. Test Registration**
1. Go to `http://localhost:3000`
2. Click **"Sign Up"** / **Create Account**
3. Fill form:
   - Name: `Test User`
   - Email: `test123@gmail.com`
   - Password: `TestPass123`
   - Confirm: `TestPass123`
4. Click **Create Account**
5. Should redirect to dashboard

### **3. Test Login**
1. Go to `http://localhost:3000`
2. Click **"Sign In"** / **Login**
3. Enter:
   - Email: `test123@gmail.com`
   - Password: `TestPass123`
4. Click **Sign In**
5. Should redirect to dashboard with your name

### **4. Verify Authentication**
- [ ] Token saved in localStorage
  ```javascript
  // Open DevTools (F12) → Console → Type:
  localStorage.getItem('token')
  // Should show: "eyJ0eXAiOiJKV1QiLCJhbGc..."
  ```

- [ ] User info displayed in navbar
  - Your name should appear in top right
  - Logout button should be visible

---

## 🧪 Testing Validation

### **Test Form Validation**

**Empty Form:**
- Click submit without filling anything
- Should show: "Name is required"

**Invalid Email:**
- Enter: `notanemail`
- Should show: "Please enter a valid email"

**Short Password:**
- Enter: `Pass1`
- Should show: "Password must be at least 6 characters"

**Missing Uppercase:**
- Enter: `password123`
- Should show: "Password must contain uppercase letter"

**Missing Lowercase:**
- Enter: `PASSWORD123`
- Should show: "Password must contain lowercase letter"

**Missing Number:**
- Enter: `Password`
- Should show: "Password must contain number"

**Mismatched Passwords:**
- Password: `TestPass123`
- Confirm: `TestPass124`
- Should show: "Passwords must match"

---

## 🔄 If Everything Fails - Nuclear Option

```powershell
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Kill all Python processes
taskkill /F /IM python.exe

# 3. Kill mongod
taskkill /F /IM mongod.exe

# 4. Clear npm cache
cd frontend
npm cache clean --force

# 5. Delete node_modules and reinstall
Remove-Item node_modules -Recurse -Force
npm install

# 6. Restart everything
# Terminal 1
mongod --dbpath="C:\data\db"

# Terminal 2
cd backend
python app.py

# Terminal 3
cd frontend
npm start
```

---

## 📊 MongoDB Data Verification

To check if user was actually saved:

```powershell
# Open MongoDB Shell
mongosh

# Select database
use mental_health_db

# View all users
db.users.find()

# Find specific user
db.users.findOne({ email: "test123@gmail.com" })

# Delete user (if needed)
db.users.deleteOne({ email: "test123@gmail.com" })
```

---

## 🎯 Expected Behavior

### **Successful Registration:**
1. Form validates on blur
2. Submit button is enabled
3. Loading spinner appears
4. Success message: "Account created successfully!"
5. Automatic redirect to dashboard after 2 seconds

### **Successful Login:**
1. Enter credentials
2. Submit button shows loading
3. API call to backend
4. Token stored in localStorage
5. Redirected to dashboard
6. User name appears in navbar

### **Failed Login:**
1. Error message appears below credentials
2. Red border on failed fields
3. Button stops loading
4. Stays on login page

---

## 🚀 Soft Launch Checklist

Before demo/hackathon:

- [ ] All three services running (MongoDB, Backend, Frontend)
- [ ] Can create new account successfully
- [ ] Can login with created account
- [ ] Dashboard loads after login
- [ ] Navbar shows user name
- [ ] Logout button works
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Test on fresh browser tab (Ctrl+N)
- [ ] No console errors (F12 → Console)
- [ ] Mobile responsive works (F12 → click device toggle)

---

## 💡 Pro Tips

**Faster Testing:**
- Use `test+1@gmail.com`, `test+2@gmail.com` etc. for multiple accounts
- Gmail will treat them as same email for login testing

**Check Logs:**
- Backend logs show requests/responses
- Frontend logs (F12 Console) show API errors
- Both should show successful authentication flow

**Debug Network:**
- F12 → Network tab
- Try login, watch API calls
- Should see `/api/auth/login` POST request
- Response should include token

---

**If still stuck, check:**
1. ✅ MongoDB running on 27017
2. ✅ Backend running on 5000
3. ✅ Frontend running on 3000
4. ✅ No firewall blocking ports
5. ✅ All terminals showing "listening" messages

