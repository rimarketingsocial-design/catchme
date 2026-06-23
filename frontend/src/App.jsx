import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

import Splash from './pages/Splash';
import Auth from './pages/Auth';
import Intention from './pages/Intention';
import ClubList from './pages/ClubList';
import ClubDetail from './pages/ClubDetail';
import Swipe from './pages/Swipe';
import Inbox from './pages/Inbox';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import ClubRegister from './pages/ClubRegister';
import ClubLogin from './pages/ClubLogin';
import ClubDashboard from './pages/ClubDashboard';

function ProtectedRoute({ children }) {
  const { session, loading } = useApp();
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl font-black">
            <span className="text-white">Catch</span>
            <span className="bg-neon-gradient bg-clip-text text-transparent">Me</span>
          </span>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-neon-pink animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { session, loading } = useApp();
  // Show public pages immediately; redirect once auth resolves
  if (!loading && session) return <Navigate to="/clubs" replace />;
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="max-w-lg mx-auto min-h-screen bg-dark-900">
          <Routes>
            <Route path="/" element={<PublicRoute><Splash /></PublicRoute>} />
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

            <Route path="/intention" element={<ProtectedRoute><Intention /></ProtectedRoute>} />
            <Route path="/clubs" element={<ProtectedRoute><ClubList /></ProtectedRoute>} />
            <Route path="/clubs/:id" element={<ProtectedRoute><ClubDetail /></ProtectedRoute>} />
            <Route path="/clubs/:id/swipe" element={<ProtectedRoute><Swipe /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="/club-register" element={<ClubRegister />} />
            <Route path="/club-login" element={<ClubLogin />} />
            <Route path="/club-dashboard" element={<ClubDashboard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
