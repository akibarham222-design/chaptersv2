import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Train, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('All compartments must be filled.');
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      login(data.token, data.user);
      toast.success(`Welcome aboard, ${data.user.name}!`);
      if (data.user.role === 'admin') navigate('/admin');
      else navigate(redirect);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid boarding credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    authAPI.googleLogin();
  };

  return (
    <div className="min-h-screen bg-night-950 flex items-center justify-center px-4 pt-20">
      {/* Background rail */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/5 to-transparent" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Station header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 relative">
            <Train size={24} className="text-amber-500" />
            <div className="absolute -top-px -left-px w-3 h-3 border-t border-l border-amber-500" />
            <div className="absolute -top-px -right-px w-3 h-3 border-t border-r border-amber-500" />
            <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-amber-500" />
            <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-amber-500" />
          </div>
          <h1 className="font-display text-3xl font-bold text-smoke-100">Boarding Gate</h1>
          <p className="font-mono-custom text-xs text-smoke-400 mt-2 tracking-widest uppercase">
            Present your pass to enter
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-amber p-8 rounded-sm space-y-4">
          <div>
            <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
              className="input-dark"
              required
            />
          </div>
          <div>
            <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">
              Passphrase
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="input-dark pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke-600 hover:text-smoke-400"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-board w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Checking boarding pass...</span>
            ) : (
              'Board the Train'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-smoke-600/30" />
            <span className="font-mono-custom text-xs text-smoke-600">OR</span>
            <div className="flex-1 h-px bg-smoke-600/30" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full border border-smoke-600 hover:border-smoke-400 text-smoke-200 py-3 rounded-sm font-body text-sm transition-all flex items-center justify-center gap-3 hover:bg-white/3 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center mt-6 font-body text-sm text-smoke-400">
          No boarding pass?{' '}
          <Link to="/register" className="text-amber-500 hover:text-amber-400 transition-colors">
            Issue one here
          </Link>
        </p>

        <div className="mt-8">
          <div className="track-line" />
        </div>
      </div>
    </div>
  );
}
