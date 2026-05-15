import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServiceStatus, getCountdownToOpen } from '../utils/timeUtils';
import { Train, ArrowRight } from 'lucide-react';

export default function Boarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState(getServiceStatus());
  const [countdown, setCountdown] = useState(getCountdownToOpen());

  useEffect(() => {
    const t = setInterval(() => {
      const s = getServiceStatus();
      setService(s);
      setCountdown(getCountdownToOpen());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const padNum = n => String(n).padStart(2, '0');

  // If service is open and user is logged in, go directly to chat
  const handleBoard = () => {
    if (!user) {
      navigate('/login?redirect=/board');
    } else if (service.status === 'open') {
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-night-950 flex flex-col items-center justify-center px-4 pt-20">
      {/* Background rails */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute bottom-0 w-full opacity-10" height="120" viewBox="0 0 1200 120">
          <line x1="0" y1="40" x2="1200" y2="40" stroke="#f59e0b" strokeWidth="2"/>
          <line x1="0" y1="60" x2="1200" y2="60" stroke="#f59e0b" strokeWidth="2"/>
          {Array.from({ length: 25 }).map((_, i) => (
            <rect key={i} x={i * 50} y="35" width="30" height="30" fill="#f59e0b" opacity="0.3"/>
          ))}
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)' }} />
      </div>

      <div className="relative text-center max-w-lg w-full">
        {/* Platform sign */}
        <div className="inline-flex items-center gap-2 border border-amber-500/20 px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-mono-custom text-xs text-amber-500 tracking-widest uppercase">Platform 01</span>
        </div>

        <div className="mb-8">
          <Train size={48} className="text-amber-500 mx-auto mb-4 opacity-80" />
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-smoke-100 mb-3">
            The Departure Lounge
          </h1>
          <p className="font-body text-smoke-400 text-sm leading-relaxed">
            You're standing on the platform. The night is deep. 
            When the signal turns green, you board. A stranger will share your compartment.
          </p>
        </div>

        {/* Service status display */}
        {service.status === 'open' ? (
          <div className="glass-amber p-8 rounded-sm">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="w-3 h-3 rounded-full bg-signal-green" style={{ boxShadow: '0 0 15px #16a34a' }} />
              <span className="font-mono-custom text-sm text-signal-green tracking-widest uppercase">Signal: Clear</span>
            </div>
            <p className="font-body text-smoke-300 text-sm mb-6">
              The train is in service. A compartment is waiting. 
              Board now and meet whoever the night sends your way.
            </p>
            {!user ? (
              <div className="space-y-3">
                <p className="font-mono-custom text-xs text-smoke-400">You need a boarding pass first.</p>
                <Link to="/login?redirect=/board" className="btn-board inline-flex items-center gap-2">
                  Get Boarding Pass <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <button onClick={handleBoard} className="btn-board inline-flex items-center gap-2">
                Enter Compartment <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : service.status === 'boarding' ? (
          <div className="glass-amber p-8 rounded-sm">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="w-3 h-3 rounded-full bg-signal-yellow animate-pulse" />
              <span className="font-mono-custom text-sm text-signal-yellow tracking-widest uppercase">Pre-Boarding</span>
            </div>
            {countdown && (
              <>
                <div className="font-mono-custom text-xs text-smoke-400 mb-4 tracking-widest">DEPARTURE IN</div>
                <div className="flex items-center justify-center gap-4 mb-6">
                  {[{ v: countdown.hours, l: 'Hours' }, { v: countdown.minutes, l: 'Min' }, { v: countdown.seconds, l: 'Sec' }].map(({ v, l }) => (
                    <div key={l} className="text-center">
                      <div className="font-mono-custom text-4xl text-amber-500 tabular-nums">{padNum(v)}</div>
                      <div className="font-mono-custom text-[10px] text-smoke-600 uppercase tracking-widest">{l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="font-body text-smoke-400 text-sm">
              The station is preparing for tonight's service. Wait on the platform.
            </p>
          </div>
        ) : (
          <div className="glass p-8 rounded-sm">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="w-3 h-3 rounded-full bg-signal-red" />
              <span className="font-mono-custom text-sm text-signal-red tracking-widest uppercase">Station Closed</span>
            </div>
            <p className="font-body text-smoke-400 text-sm mb-6">
              Aagontuk Express is off duty. The night train only runs between 19:00 and 05:00 Bangladesh time.
              Return to the platform tonight.
            </p>
            {countdown && (
              <>
                <div className="font-mono-custom text-xs text-smoke-600 mb-3 tracking-widest">NIGHT SERVICE IN</div>
                <div className="flex items-center justify-center gap-4">
                  {[{ v: countdown.hours, l: 'H' }, { v: countdown.minutes, l: 'M' }, { v: countdown.seconds, l: 'S' }].map(({ v, l }) => (
                    <div key={l} className="text-center">
                      <div className="font-mono-custom text-3xl text-amber-500/50 tabular-nums">{padNum(v)}</div>
                      <div className="font-mono-custom text-[10px] text-smoke-700 uppercase">{l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-6">
              <Link to="/confessions" className="btn-ghost text-xs">Read Confessions While You Wait</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
