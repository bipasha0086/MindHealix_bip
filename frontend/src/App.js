import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MoodTrackerPage from './pages/MoodTrackerPage';
import JournalPage from './pages/JournalPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EmergencySupportPage from './pages/EmergencySupportPage';
import PanicModePage from './pages/PanicModePage';
import AssessmentPage from './pages/AssessmentPage';
import MLModelPage from './pages/MLModelPage';
import ProfilePage from './pages/ProfilePage';
import YouTubeGuardAdminPage from './pages/YouTubeGuardAdminPage';
import ShareThoughtsPage from './pages/ShareThoughtsPage';

// Components
import Navbar from './components/Navbar';
import AIChatbot from './components/AIChatbot';
import GlobalPanicOverlay from './components/GlobalPanicOverlay';

// Notification utility
import { requestNotificationPermission, startHourlyNotifications } from './NotificationManager';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  React.useEffect(() => {
    requestNotificationPermission();
    // Start notifications after permission is granted
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        startHourlyNotifications();
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            startHourlyNotifications();
          }
        });
      }
    }
  }, []);
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/share-thoughts"
              element={
                <ProtectedRoute>
                  <ShareThoughtsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mood-tracker"
              element={
                <ProtectedRoute>
                  <MoodTrackerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journal"
              element={
                <ProtectedRoute>
                  <JournalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emergency-support"
              element={
                <ProtectedRoute>
                  <EmergencySupportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/panic-mode"
              element={
                <ProtectedRoute>
                  <PanicModePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment"
              element={
                <ProtectedRoute>
                  <AssessmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stress-lab"
              element={
                <ProtectedRoute>
                  <MLModelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/youtube-guard-admin"
              element={
                <ProtectedRoute>
                  <YouTubeGuardAdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/ml-model" element={<Navigate to="/stress-lab" />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          
          {/* Global AI Chatbot - Available on all pages */}
          <AIChatbot />
          <GlobalPanicOverlay />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
