import React, { useEffect, useState } from 'react';
import { journeyAPI } from '../utils/api';
import { formatBDDateTime } from '../utils/timeUtils';
import { MessageCircle, Music, Gamepad2, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const iconMap = {
  chat_started: MessageCircle,
  chat_ended: MessageCircle,
  confession_submitted: FileText,
  song_dedicated: Music,
  game_played: Gamepad2,
  stranger_met: MessageCircle,
};

export default function JourneyLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await journeyAPI.getMine({ limit: 50 });
      setLogs(data.logs || []);
    } catch {
      toast.error('Could not load your chapters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen px-4 pt-32 pb-20 page-enter">
      <section className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-3">◆ My Chapters ◆</div>
            <h1 className="font-display text-4xl sm:text-5xl text-smoke-100 font-bold">Journey Logs</h1>
            <p className="font-body text-smoke-400 text-sm mt-3">Private traces from your rides, dedications, games, and station activity.</p>
          </div>
          <button onClick={load} className="btn-ghost text-xs flex items-center gap-2"><RefreshCw size={13}/>Refresh</button>
        </div>

        {loading ? (
          <div className="glass p-8 text-center font-mono-custom text-xs text-smoke-500 animate-pulse">Loading chapters...</div>
        ) : logs.length === 0 ? (
          <div className="glass-amber p-10 text-center rounded-sm">
            <div className="font-display text-2xl text-smoke-100">No chapters yet</div>
            <p className="font-body text-smoke-400 text-sm mt-2">Board the night train or leave a confession to start your log.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const Icon = iconMap[log.type] || FileText;
              return (
                <article key={log._id} className="glass p-4 rounded-sm border-l border-amber-500/30">
                  <div className="flex gap-4">
                    <div className="w-9 h-9 border border-amber-500/25 flex items-center justify-center shrink-0"><Icon size={15} className="text-amber-500" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono-custom text-xs text-amber-500/80 uppercase tracking-widest">{log.type?.replaceAll('_', ' ')}</div>
                      <div className="font-body text-smoke-200 text-sm mt-1">{log.details || 'Recorded station activity'}</div>
                      <div className="font-mono-custom text-[11px] text-smoke-600 mt-2">{formatBDDateTime(log.createdAt)}</div>
                    </div>
                    {log.duration ? <div className="font-mono-custom text-xs text-smoke-500 shrink-0">{Math.round(log.duration / 60)}m</div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
