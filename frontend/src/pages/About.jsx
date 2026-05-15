import React from 'react';
import { Link } from 'react-router-dom';
import { Train, Clock, MessageCircle, Music, Shield, Gamepad2 } from 'lucide-react';

const blocks = [
  { icon: MessageCircle, title: 'Anonymous Compartments', text: 'A live stranger-chat carriage that opens only at night. No public identity, no forced profile show, just a short crossing between two passengers.' },
  { icon: Music, title: 'Songs on the Rails', text: 'Passengers can dedicate a song inside chat. Confessions also carry a track, so every note feels like a tiny platform memory.' },
  { icon: Gamepad2, title: 'Table Games', text: 'Small games inside the journey keep the compartment alive without turning the site into a childish arcade.' },
  { icon: Shield, title: 'Station Staff', text: 'Reports, confession review, notices, uploads, users, and moderation stay inside staff panels instead of leaking into the public experience.' },
];

export default function About() {
  return (
    <main className="min-h-screen px-4 pt-32 pb-20 page-enter">
      <section className="max-w-5xl mx-auto">
        <div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-5">◆ About the service ◆</div>
        <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6 items-stretch">
          <div className="glass-amber p-7 sm:p-10 rounded-sm relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl" />
            <Train className="text-amber-500 mb-6" size={28} />
            <h1 className="font-display text-4xl sm:text-6xl font-bold text-smoke-100 leading-tight">A night train for strangers.</h1>
            <p className="font-body text-smoke-400 text-base leading-relaxed mt-6 max-w-2xl">
              Aagontuk Express is built like a cinematic Bangladesh night-platform: quiet signals, small confessions, stranger compartments, songs, games, and traces that fade before morning. It should feel like a full story from login to Control Room, not a random chat template.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/board" className="btn-board text-xs">Board</Link>
              <Link to="/confessions" className="btn-ghost text-xs">Station Notes</Link>
            </div>
          </div>
          <div className="glass p-7 rounded-sm flex flex-col justify-between">
            <div>
              <Clock className="text-amber-500 mb-5" size={24} />
              <div className="font-display text-2xl text-smoke-100">Service timing</div>
              <p className="font-body text-smoke-400 text-sm leading-relaxed mt-3">
                05:00–17:00 is daytime off-duty. 17:00–19:00 is pre-boarding. 19:00–05:00 is live night service in Bangladesh time.
              </p>
            </div>
            <div className="track-line mt-8" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {blocks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass p-5 rounded-sm hover:border-amber-500/25 transition-colors">
              <Icon size={18} className="text-amber-500 mb-3" />
              <div className="font-display text-lg text-smoke-100">{title}</div>
              <p className="font-body text-smoke-400 text-sm leading-relaxed mt-2">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
