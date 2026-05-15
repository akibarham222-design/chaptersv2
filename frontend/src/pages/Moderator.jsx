import React, { useEffect, useState } from 'react';
import { moderatorAPI } from '../utils/api';
import { Shield, Flag, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

function Stat({ icon: Icon, label, value }) { return <div className="glass p-4"><Icon size={18} className="text-amber-500 mb-3"/><div className="font-mono-custom text-2xl text-smoke-100">{value ?? 0}</div><div className="font-mono-custom text-[10px] uppercase tracking-widest text-smoke-500">{label}</div></div>; }

export default function Moderator() {
  const [stats, setStats] = useState({});
  const [reports, setReports] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [st, rp, cf] = await Promise.all([moderatorAPI.getStats(), moderatorAPI.getReports({ limit: 30 }), moderatorAPI.getPendingConfessions()]);
      setStats(st.data || {}); setReports(rp.data.reports || []); setConfessions(cf.data.confessions || []);
    } catch { toast.error('Staff panel failed to load.'); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); }, []);

  const reviewConfession = async (id, action) => { try { await moderatorAPI.reviewConfession(id, { action }); toast.success(`Confession ${action}d.`); await load(); } catch { toast.error('Review failed.'); } };
  const reviewReport = async (id, status) => { try { await moderatorAPI.reviewReport(id, { status }); toast.success('Report updated.'); await load(); } catch { toast.error('Report update failed.'); } };

  return (
    <main className="min-h-screen px-4 pt-32 pb-20 page-enter">
      <section className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8"><div><div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-3">◆ Station Staff ◆</div><h1 className="font-display text-4xl sm:text-5xl text-smoke-100 font-bold">Moderator Panel</h1><p className="font-body text-smoke-400 text-sm mt-3">Review reports and approve station confessions.</p></div><button onClick={load} className="btn-ghost text-xs flex items-center gap-2"><RefreshCw size={13}/>Refresh</button></div>
        <div className="grid grid-cols-3 gap-3 mb-8"><Stat icon={FileText} label="Pending confessions" value={stats.pendingConf}/><Stat icon={Flag} label="Pending reports" value={stats.pendingReports}/><Stat icon={Shield} label="Total reports" value={stats.totalReports}/></div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-amber p-5 rounded-sm"><div className="font-display text-xl text-smoke-100 mb-3">Pending Confessions</div><div className="space-y-3 max-h-[520px] overflow-auto">{confessions.length===0?<div className="font-body text-sm text-smoke-500">No pending confessions.</div>:confessions.map(c=><article key={c._id} className="border border-white/5 p-3"><div className="font-body text-sm text-smoke-200">{c.from} → {c.to}</div><p className="font-body text-sm text-smoke-500 mt-2">{c.message}</p>{c.song?.title&&<div className="font-mono-custom text-xs text-amber-500 mt-2">{c.song.title} · {c.song.artist}</div>}<div className="flex gap-2 mt-3"><button onClick={()=>reviewConfession(c._id,'approve')} className="btn-ghost text-xs">Approve</button><button onClick={()=>reviewConfession(c._id,'reject')} className="btn-ghost text-xs">Reject</button></div></article>)}</div></div>
          <div className="glass p-5 rounded-sm"><div className="font-display text-xl text-smoke-100 mb-3">Reports</div><div className="space-y-3 max-h-[520px] overflow-auto">{reports.length===0?<div className="font-body text-sm text-smoke-500">No reports.</div>:reports.map(r=><article key={r._id} className="border border-white/5 p-3"><div className="font-mono-custom text-xs text-signal-red uppercase">{r.status}</div><p className="font-body text-sm text-smoke-300 mt-2">{r.reason}</p><div className="font-mono-custom text-[10px] text-smoke-600 mt-2">Session: {r.chatSession || 'none'}</div>{r.status==='pending'&&<div className="flex gap-2 mt-3"><button onClick={()=>reviewReport(r._id,'reviewed')} className="btn-ghost text-xs">Reviewed</button><button onClick={()=>reviewReport(r._id,'actioned')} className="btn-ghost text-xs">Actioned</button><button onClick={()=>reviewReport(r._id,'dismissed')} className="btn-ghost text-xs">Dismiss</button></div>}</article>)}</div></div>
        </div>
        {loading && <div className="fixed bottom-6 left-6 glass-amber px-4 py-2 font-mono-custom text-xs text-smoke-400">Loading staff panel...</div>}
      </section>
    </main>
  );
}
