import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { getServiceStatus } from '../utils/timeUtils';
import { Menu, X, Music, Train, LogOut, Shield, Users } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin, isMod } = useAuth();
  const { setIsOpen: setMusicOpen, isPlaying, currentSong } = useMusic();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(getServiceStatus());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    const timer = setInterval(() => setServiceStatus(getServiceStatus()), 30000);
    return () => { window.removeEventListener('scroll', onScroll); clearInterval(timer); };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Station' },
    { to: '/board', label: 'Board' },
    { to: '/confessions', label: 'Confessions' },
    { to: '/games', label: 'Games' },
    { to: '/about', label: 'About' },
  ];

  const statusColors = { open: '#16a34a', boarding: '#ca8a04', closed: '#dc2626' };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass border-b border-white/5' : ''}`}>
      {/* Service status ticker */}
      <div className="bg-night-800 border-b border-white/5 px-4 py-1 text-xs font-mono-custom text-smoke-400 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: statusColors[serviceStatus.status], boxShadow: `0 0 8px ${statusColors[serviceStatus.status]}` }}
          />
          <span>AAGONTUK EXPRESS · {serviceStatus.label} · BD TIME</span>
        </div>
        <span className="hidden sm:block">Platform 19:00–05:00</span>
      </div>

      <div className="flex items-center justify-between px-4 sm:px-8 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 border border-amber-500/40 flex items-center justify-center group-hover:border-amber-500 transition-colors">
            <Train size={16} className="text-amber-500" />
          </div>
          <div>
            <div className="font-display text-base font-semibold text-smoke-100 leading-none">Aagontuk Express</div>
            <div className="font-mono-custom text-[10px] text-smoke-400 tracking-widest">NIGHT SERVICE</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`font-mono-custom text-xs tracking-widest uppercase transition-colors duration-200 ${
                location.pathname === l.to ? 'text-amber-500' : 'text-smoke-400 hover:text-smoke-100'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/journey"
              className={`font-mono-custom text-xs tracking-widest uppercase transition-colors ${
                location.pathname === '/journey' ? 'text-amber-500' : 'text-smoke-400 hover:text-smoke-100'
              }`}
            >
              My Chapters
            </Link>
          )}
          {isMod && (
            <Link to="/moderator" className="font-mono-custom text-xs tracking-widest uppercase text-smoke-400 hover:text-amber-500 transition-colors">
              Staff
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="font-mono-custom text-xs tracking-widest uppercase text-amber-500 hover:text-amber-400 transition-colors">
              Control Room
            </Link>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Music button */}
          <button
            onClick={() => setMusicOpen(p => !p)}
            className="relative w-8 h-8 border border-smoke-600 hover:border-amber-500 flex items-center justify-center transition-colors group"
            title="Train Sounds"
          >
            <Music size={14} className={`transition-colors ${isPlaying ? 'text-amber-500 animate-pulse' : 'text-smoke-400 group-hover:text-amber-500'}`} />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-signal-green rounded-full animate-pulse" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                {user.avatar ? (
                  <img src={user.avatar.startsWith('http') || user.avatar.startsWith('/') ? (user.avatar.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api','') || ''}${user.avatar}` : user.avatar) : user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-amber-500/30 object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full border border-amber-500/30 bg-night-700 flex items-center justify-center">
                    <span className="text-amber-500 text-xs font-mono-custom">{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <span className="font-mono-custom text-xs text-smoke-200 max-w-[80px] truncate">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 border border-smoke-600 hover:border-signal-red flex items-center justify-center transition-colors group"
                title="Alight"
              >
                <LogOut size={13} className="text-smoke-400 group-hover:text-signal-red" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-board text-xs px-4 py-2">
              Board
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden w-8 h-8 border border-smoke-600 flex items-center justify-center"
            onClick={() => setMenuOpen(p => !p)}
          >
            {menuOpen ? <X size={14} className="text-smoke-200" /> : <Menu size={14} className="text-smoke-200" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/5 px-4 pb-6 pt-4">
          <div className="flex flex-col gap-4">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className="font-mono-custom text-sm tracking-widest uppercase text-smoke-200 hover:text-amber-500 transition-colors">
                {l.label}
              </Link>
            ))}
            {user && <Link to="/journey" className="font-mono-custom text-sm tracking-widest uppercase text-smoke-200 hover:text-amber-500">My Chapters</Link>}
            {isMod && <Link to="/moderator" className="font-mono-custom text-sm tracking-widest uppercase text-smoke-400 hover:text-amber-500">Staff Panel</Link>}
            {isAdmin && <Link to="/admin" className="font-mono-custom text-sm tracking-widest uppercase text-amber-500">Control Room</Link>}
            {!user && <Link to="/login" className="btn-board text-center">Board the Train</Link>}
            {user && (
              <button onClick={handleLogout} className="text-left font-mono-custom text-sm tracking-widest uppercase text-smoke-400 hover:text-signal-red transition-colors">
                Alight
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
