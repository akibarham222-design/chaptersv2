import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Ticket } from 'lucide-react';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('All fields required to issue a boarding pass.');
    if (form.password !== form.confirm) return toast.error('Passphrases do not match.');
    if (form.password.length < 6) return toast.error('Passphrase must be at least 6 characters.');
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name: form.name, email: form.email, password: form.password });
      login(data.token, data.user);
      toast.success('Boarding pass issued! Welcome to Aagontuk Express.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => authAPI.googleLogin();

  return (
    <div className="min-h-screen bg-night-950 flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 relative">
            <Ticket size={24} className="text-amber-500" />
            <div className="absolute -top-px -left-px w-3 h-3 border-t border-l border-amber-500" />
            <div className="absolute -top-px -right-px w-3 h-3 border-t border-r border-amber-500" />
            <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-amber-500" />
            <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-amber-500" />
          </div>
          <h1 className="font-display text-3xl font-bold text-smoke-100">Issue Boarding Pass</h1>
          <p className="font-mono-custom text-xs text-smoke-400 mt-2 tracking-widest">
            One-time registration at the counter
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-amber p-8 rounded-sm space-y-4">
          <div>
            <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">Passenger Name</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Your name" className="input-dark" required />
          </div>
          <div>
            <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com" className="input-dark" required />
          </div>
          <div>
            <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">Passphrase</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="At least 6 characters" className="input-dark pr-10" required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke-600 hover:text-smoke-400">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">Confirm Passphrase</label>
            <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat passphrase" className="input-dark" required />
          </div>

          <button type="submit" disabled={loading} className="btn-board w-full mt-2 disabled:opacity-50">
            {loading ? 'Issuing pass...' : 'Issue Boarding Pass'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-smoke-600/30" />
            <span className="font-mono-custom text-xs text-smoke-600">OR</span>
            <div className="flex-1 h-px bg-smoke-600/30" />
          </div>

          <button type="button" onClick={handleGoogle}
            className="w-full border border-smoke-600 hover:border-smoke-400 text-smoke-200 py-3 rounded-sm font-body text-sm transition-all flex items-center justify-center gap-3 hover:bg-white/3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="text-center mt-6 font-body text-sm text-smoke-400">
          Already have a pass?{' '}
          <Link to="/login" className="text-amber-500 hover:text-amber-400 transition-colors">Board here</Link>
        </p>
        <div className="mt-8"><div className="track-line" /></div>
      </div>
    </div>
  );
}
