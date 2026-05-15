import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const userStr = params.get('user');
    const error = params.get('error');

    if (error) {
      toast.error('Google login failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        login(token, user);
        toast.success(`Welcome aboard, ${user.name}! 🚂`);
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } catch {
        toast.error('Authentication failed.');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-night-950 flex items-center justify-center">
      <div className="text-center">
        <div className="font-mono-custom text-xs text-amber-500 animate-pulse tracking-widest mb-4">
          ◆ VERIFYING BOARDING PASS ◆
        </div>
        <div className="track-line w-48 mx-auto" />
        <div className="font-display text-smoke-400 text-sm mt-4 italic">
          Entering the station...
        </div>
      </div>
    </div>
  );
}
