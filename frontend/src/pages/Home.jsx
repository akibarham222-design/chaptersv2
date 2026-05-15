import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServiceStatus, getCountdownToOpen, getBangladeshTime } from '../utils/timeUtils';
import { noticesAPI } from '../utils/api';
import { ChevronRight, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState(getServiceStatus());
  const [countdown, setCountdown] = useState(getCountdownToOpen());
  const [notices, setNotices] = useState([]);
  const [bdTime, setBdTime] = useState(getBangladeshTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setService(getServiceStatus());
      setCountdown(getCountdownToOpen());
      setBdTime(getBangladeshTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    noticesAPI.getActive().then(r => setNotices(r.data.notices || [])).catch(() => {});
  }, []);

  const padNum = n => String(n).padStart(2, '0');

  const formatBD = () => {
    return bdTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });
  };

  return (
    <div className="min-h-screen bg-night-950 overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Diagonal rail lines */}
          <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1={-100 + i * 120} y1="0" x2={100 + i * 120} y2="800"
                stroke="#f59e0b" strokeWidth="1" />
            ))}
            <line x1="0" y1="400" x2="1200" y2="400" stroke="#f59e0b" strokeWidth="0.5" />
            <line x1="0" y1="398" x2="1200" y2="398" stroke="#f59e0b" strokeWidth="0.5" />
          </svg>

          {/* Glowing orb */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)' }} />

          {/* Moving train silhouette */}
          <div className="absolute bottom-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <div className="absolute bottom-14 animate-train-slide whitespace-nowrap">
            <span className="font-mono-custom text-amber-500/10 text-6xl">
              ▬▬▬▬▬▬◼▬▬▬▬▬▬◼▬▬▬▬▬▬
            </span>
          </div>
        </div>

        {/* Station clock */}
        <div className="relative mb-12 text-center">
          <div className="font-mono-custom text-smoke-600 text-xs tracking-widest mb-2 uppercase">
            Bangladesh Standard Time
          </div>
          <div className="font-mono-custom text-4xl sm:text-5xl text-amber-500 tracking-wider flicker tabular-nums">
            {formatBD()}
          </div>
          <div className="font-mono-custom text-xs text-smoke-400 tracking-widest mt-2">
            Platform Active: 19:00 — 05:00
          </div>
        </div>

        {/* Main heading */}
        <div className="relative text-center max-w-3xl mx-auto">
          <div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-6">
            ◆ Night Service Departing ◆
          </div>
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-smoke-100 leading-none mb-2">
            Aagontuk
          </h1>
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-amber-glow leading-none italic">
            Express
          </h1>
          <p className="font-body text-smoke-400 text-base sm:text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Board a mysterious night train. Meet a stranger in your compartment. 
            Share a fleeting journey. Leave traces. Disappear before morning.
          </p>
        </div>

        {/* Service Status */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {service.status === 'open' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-signal-green" style={{ boxShadow: '0 0 12px #16a34a' }} />
                <span className="font-mono-custom text-xs text-signal-green tracking-widest uppercase">
                  Train In Service
                </span>
              </div>
              <Link to={user ? '/board' : '/login?redirect=/board'} className="btn-board flex items-center gap-3 text-sm">
                <span>Board the Night Train</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : service.status === 'boarding' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-signal-yellow animate-pulse" />
                <span className="font-mono-custom text-xs text-signal-yellow tracking-widest uppercase">
                  Pre-Boarding
                </span>
              </div>
              {countdown && (
                <div className="text-center">
                  <div className="font-mono-custom text-xs text-smoke-400 mb-2 tracking-widest">DEPARTURE IN</div>
                  <div className="flex items-center gap-3">
                    {[{ v: countdown.hours, l: 'H' }, { v: countdown.minutes, l: 'M' }, { v: countdown.seconds, l: 'S' }].map(({ v, l }) => (
                      <div key={l} className="text-center">
                        <div className="font-mono-custom text-3xl text-amber-500 tabular-nums">{padNum(v)}</div>
                        <div className="font-mono-custom text-xs text-smoke-600">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-signal-red" />
                <span className="font-mono-custom text-xs text-signal-red tracking-widest uppercase">
                  Station Closed — Off Duty
                </span>
              </div>
              {countdown && (
                <div className="text-center">
                  <div className="font-mono-custom text-xs text-smoke-400 mb-3 tracking-widest">NIGHT SERVICE OPENS IN</div>
                  <div className="glass-amber px-8 py-4 rounded-sm">
                    <div className="flex items-center gap-4">
                      {[{ v: countdown.hours, l: 'Hours' }, { v: countdown.minutes, l: 'Min' }, { v: countdown.seconds, l: 'Sec' }].map(({ v, l }) => (
                        <div key={l} className="text-center">
                          <div className="font-mono-custom text-4xl text-amber-500 tabular-nums">{padNum(v)}</div>
                          <div className="font-mono-custom text-[10px] text-smoke-600 uppercase tracking-widest">{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick nav pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {[
            { to: '/confessions', label: 'Confessions' },
            { to: '/games', label: 'Games' },
            { to: '/about', label: 'About' },
            { to: user ? '/journey' : '/login', label: 'My Chapters' }
          ].map(l => (
            <Link key={l.to} to={l.to}
              className="btn-ghost text-xs flex items-center gap-1.5">
              {l.label}
              <ChevronRight size={12} />
            </Link>
          ))}
        </div>
      </section>

      {/* Station Noticeboard */}
      {notices.length > 0 && (
        <section className="px-4 pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="compartment-divider mb-8" />
            <div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-6 text-center">
              ◆ Station Noticeboard ◆
            </div>
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n._id} className="glass-amber p-4 rounded-sm border-l-2 border-amber-500/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-display text-smoke-100 text-sm font-semibold">{n.title}</div>
                      <div className="font-body text-smoke-400 text-sm mt-1">{n.content}</div>
                    </div>
                    <span className="font-mono-custom text-[10px] text-amber-500/60 uppercase tracking-widest whitespace-nowrap">
                      {n.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Feature compartments */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="compartment-divider mb-16" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: '🌙', title: 'Anonymous Chat', desc: 'Enter your compartment. A stranger joins. No names. No traces. Just the journey.',
                link: user ? '/board' : '/login?redirect=/board', cta: 'Board Now'
              },
              {
                icon: '✉️', title: 'Confessions', desc: 'Leave what you cannot say. From someone, to someone. Songs attached. Station approved.',
                link: '/confessions', cta: 'Read & Write'
              },
              {
                icon: '🎮', title: 'Table Games', desc: 'Challenge your compartment companion to a game as the train moves through the dark.',
                link: '/games', cta: 'Play'
              },
              {
                icon: '🎵', title: 'Train Sounds', desc: 'The station curates a soundtrack for the night journey. Press play. Let it carry you.',
                link: null, cta: 'Open Player', action: true
              },
              {
                icon: '📖', title: 'My Chapters', desc: 'Traces of past journeys. Strangers met. Songs heard. A log of your nights.',
                link: user ? '/journey' : '/login', cta: 'View Logs'
              },
              {
                icon: '🚂', title: 'About the Train', desc: 'The history and mystery of Aagontuk Express. Why it runs only at night.',
                link: '/about', cta: 'Read More'
              },
            ].map((f, i) => (
              <div key={i} className="glass p-6 rounded-sm group hover:border-amber-500/20 transition-colors duration-300">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display text-base font-semibold text-smoke-100 mb-2">{f.title}</h3>
                <p className="font-body text-smoke-400 text-sm leading-relaxed mb-4">{f.desc}</p>
                {f.link ? (
                  <Link to={f.link} className="font-mono-custom text-xs text-amber-500/70 hover:text-amber-500 tracking-widest uppercase flex items-center gap-1 transition-colors">
                    {f.cta} <ChevronRight size={12} />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer track */}
      <div className="track-line" />
      <footer className="py-6 text-center">
        <div className="font-mono-custom text-xs text-smoke-600 tracking-widest">
          AAGONTUK EXPRESS · NIGHT SERVICE · 19:00–05:00 BST
        </div>
      </footer>
    </div>
  );
}
