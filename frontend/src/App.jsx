import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import Navbar from './components/Navbar';
import MusicPlayer from './components/MusicPlayer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Boarding from './pages/Boarding';
import Chat from './pages/Chat';
import Confessions from './pages/Confessions';
import Games from './pages/Games';
import JourneyLogs from './pages/JourneyLogs';
import About from './pages/About';
import Admin from './pages/Admin';
import Moderator from './pages/Moderator';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <MusicProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-night-950 text-smoke-100 relative">
            <Navbar />
            <MusicPlayer />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/board" element={<Boarding />} />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/confessions" element={<Confessions />} />
              <Route path="/games" element={<Games />} />
              <Route path="/journey" element={
                <ProtectedRoute>
                  <JourneyLogs />
                </ProtectedRoute>
              } />
              <Route path="/about" element={<About />} />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/moderator" element={
                <ProtectedRoute modOnly>
                  <Moderator />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0f0f1e',
                color: '#e8e8f0',
                border: '1px solid rgba(245,158,11,0.2)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#16a34a', secondary: '#0f0f1e' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#0f0f1e' } },
            }}
          />
        </BrowserRouter>
      </MusicProvider>
    </AuthProvider>
  );
}
