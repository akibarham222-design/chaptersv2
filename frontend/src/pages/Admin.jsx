import React, { useEffect, useState } from 'react';
import { adminAPI, songsAPI, noticesAPI, confessionsAPI, reportsAPI } from '../utils/api';
import { useMusic } from '../context/MusicContext';
import { Shield, Users, Music, FileText, Flag, Upload, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

function Stat({ icon: Icon, label, value }) {
  return <div className="glass p-4 rounded-sm"><Icon size={18} className="text-amber-500 mb-3"/><div className="font-mono-custom text-2xl text-smoke-100">{value ?? 0}</div><div className="font-mono-custom text-[10px] uppercase tracking-widest text-smoke-500 mt-1">{label}</div></div>;
}

export default function Admin() {
  const { fetchSongs } = useMusic();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [notices, setNotices] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [songForm, setSongForm] = useState({ title: '', description: '', audio: null });
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', type: 'announcement' });
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImage, setUploadedImage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [st, u, sg, nt, cf, rp] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers({ limit: 12 }),
        songsAPI.getAll(),
        noticesAPI.getAll(),
        adminAPI.getConfessions({ limit: 12 }),
        reportsAPI.getAll({ limit: 12 }),
      ]);
      setStats(st.data || {});
      setUsers(u.data.users || []);
      setSongs(sg.data.songs || []);
      setNotices(nt.data.notices || []);
      setConfessions(cf.data.confessions || []);
      setReports(rp.data.reports || []);
    } catch {
      toast.error('Control Room data failed to load.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const uploadSong = async (e) => {
    e.preventDefault();
    if (!songForm.title || !songForm.audio) return toast.error('Title and audio file required.');
    const fd = new FormData();
    fd.append('title', songForm.title); fd.append('description', songForm.description); fd.append('audio', songForm.audio);
    try { await songsAPI.upload(fd); toast.success('Song uploaded.'); setSongForm({ title: '', description: '', audio: null }); await fetchSongs(); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Song upload failed.'); }
  };

  const deleteSong = async (id) => {
    try { await songsAPI.delete(id); toast.success('Song deleted.'); await fetchSongs(); await load(); }
    catch { toast.error('Delete failed.'); }
  };

  const createNotice = async (e) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) return toast.error('Notice title and content required.');
    try { await noticesAPI.create(noticeForm); toast.success('Notice posted.'); setNoticeForm({ title: '', content: '', type: 'announcement' }); await load(); }
    catch { toast.error('Notice failed.'); }
  };

  const deleteNotice = async (id) => {
    try { await noticesAPI.delete(id); toast.success('Notice removed.'); await load(); }
    catch { toast.error('Notice delete failed.'); }
  };

  const uploadImage = async (e) => {
    e.preventDefault();
    if (!imageFile) return toast.error('Choose an image.');
    const fd = new FormData(); fd.append('image', imageFile);
    try { const { data } = await adminAPI.uploadImage(fd); setUploadedImage(data.url); toast.success('Image uploaded.'); }
    catch { toast.error('Image upload failed.'); }
  };

  const reviewConfession = async (id, action) => {
    try { await confessionsAPI.review(id, { action }); toast.success(`Confession ${action}d.`); await load(); }
    catch { toast.error('Review failed.'); }
  };

  const setUserRole = async (id, role) => {
    try { await adminAPI.updateRole(id, role); toast.success('Role updated.'); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Role update failed.'); }
  };

  return (
    <main className="min-h-screen px-4 pt-32 pb-20 page-enter">
      <section className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div><div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-3">◆ Admin Control Room ◆</div><h1 className="font-display text-4xl sm:text-5xl text-smoke-100 font-bold">Control Room</h1><p className="font-body text-smoke-400 text-sm mt-3">Users, songs, notices, reports, confessions, and station assets.</p></div>
          <button onClick={load} className="btn-ghost text-xs flex items-center gap-2"><RefreshCw size={13}/>Refresh</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
          <Stat icon={Users} label="Passengers" value={stats.users}/><Stat icon={FileText} label="Confessions" value={stats.confessions}/><Stat icon={FileText} label="Pending" value={stats.pendingConf}/><Stat icon={Flag} label="Reports" value={stats.reports}/><Stat icon={Flag} label="Open Reports" value={stats.pendingReports}/><Stat icon={Music} label="Songs" value={stats.songs}/>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={uploadSong} className="glass-amber p-5 rounded-sm space-y-3">
            <div className="font-display text-xl text-smoke-100 flex items-center gap-2"><Music size={18} className="text-amber-500"/>Radio Upload</div>
            <input className="input-dark" placeholder="Song title" value={songForm.title} onChange={e=>setSongForm({...songForm,title:e.target.value})}/>
            <input className="input-dark" placeholder="Short description" value={songForm.description} onChange={e=>setSongForm({...songForm,description:e.target.value})}/>
            <input type="file" accept="audio/*" className="input-dark" onChange={e=>setSongForm({...songForm,audio:e.target.files?.[0]})}/>
            <button className="btn-board text-xs flex items-center gap-2"><Upload size={13}/>Upload Song</button>
            <div className="space-y-2 pt-2 max-h-52 overflow-auto">{songs.map(s=><div key={s._id} className="flex items-center justify-between gap-3 border border-white/5 p-2"><span className="font-body text-sm text-smoke-300 truncate">{s.title}</span><button type="button" onClick={()=>deleteSong(s._id)} className="text-signal-red"><Trash2 size={14}/></button></div>)}</div>
          </form>

          <form onSubmit={createNotice} className="glass-amber p-5 rounded-sm space-y-3">
            <div className="font-display text-xl text-smoke-100">Station Notice</div>
            <input className="input-dark" placeholder="Notice title" value={noticeForm.title} onChange={e=>setNoticeForm({...noticeForm,title:e.target.value})}/>
            <textarea className="input-dark min-h-[90px]" placeholder="Notice content" value={noticeForm.content} onChange={e=>setNoticeForm({...noticeForm,content:e.target.value})}/>
            <select className="input-dark" value={noticeForm.type} onChange={e=>setNoticeForm({...noticeForm,type:e.target.value})}><option>announcement</option><option>warning</option><option>maintenance</option><option>event</option></select>
            <button className="btn-board text-xs">Post Notice</button>
            <div className="space-y-2 pt-2 max-h-52 overflow-auto">{notices.map(n=><div key={n._id} className="flex items-center justify-between gap-3 border border-white/5 p-2"><span className="font-body text-sm text-smoke-300 truncate">{n.title}</span><button type="button" onClick={()=>deleteNotice(n._id)} className="text-signal-red"><Trash2 size={14}/></button></div>)}</div>
          </form>

          <form onSubmit={uploadImage} className="glass p-5 rounded-sm space-y-3">
            <div className="font-display text-xl text-smoke-100">Image Upload</div>
            <input type="file" accept="image/*" className="input-dark" onChange={e=>setImageFile(e.target.files?.[0])}/>
            <button className="btn-ghost text-xs">Upload Image</button>
            {uploadedImage && <div className="font-mono-custom text-xs text-amber-500 break-all">{uploadedImage}</div>}
          </form>

          <div className="glass p-5 rounded-sm">
            <div className="font-display text-xl text-smoke-100 mb-3">Passengers</div>
            <div className="space-y-2 max-h-64 overflow-auto">{users.map(u=><div key={u._id} className="flex items-center justify-between gap-2 border border-white/5 p-2"><div className="min-w-0"><div className="font-body text-sm text-smoke-200 truncate">{u.name}</div><div className="font-mono-custom text-[10px] text-smoke-600 truncate">{u.email} · {u.role}</div></div>{u.email !== 'n.i.farhan44@gmail.com' && <select className="bg-night-800 border border-smoke-700 text-xs text-smoke-300 p-1" value={u.role} onChange={e=>setUserRole(u._id,e.target.value)}><option value="user">user</option><option value="moderator">moderator</option></select>}</div>)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div className="glass p-5 rounded-sm"><div className="font-display text-xl text-smoke-100 mb-3">Confession Queue</div><div className="space-y-3 max-h-96 overflow-auto">{confessions.map(c=><article key={c._id} className="border border-white/5 p-3"><div className="font-mono-custom text-xs text-amber-500 uppercase">{c.status}</div><div className="font-body text-sm text-smoke-300 mt-1">{c.from} → {c.to}</div><p className="font-body text-sm text-smoke-500 mt-1 line-clamp-3">{c.message}</p>{c.status==='pending'&&<div className="flex gap-2 mt-3"><button onClick={()=>reviewConfession(c._id,'approve')} className="btn-ghost text-xs" type="button">Approve</button><button onClick={()=>reviewConfession(c._id,'reject')} className="btn-ghost text-xs" type="button">Reject</button></div>}</article>)}</div></div>
          <div className="glass p-5 rounded-sm"><div className="font-display text-xl text-smoke-100 mb-3">Reports</div><div className="space-y-3 max-h-96 overflow-auto">{reports.map(r=><article key={r._id} className="border border-white/5 p-3"><div className="font-mono-custom text-xs text-signal-red uppercase">{r.status}</div><p className="font-body text-sm text-smoke-300 mt-1">{r.reason}</p><div className="font-mono-custom text-[10px] text-smoke-600 mt-2">Session: {r.chatSession || 'none'}</div></article>)}</div></div>
        </div>

        {loading && <div className="fixed bottom-6 left-6 glass-amber px-4 py-2 font-mono-custom text-xs text-smoke-400">Loading control room...</div>}
      </section>
    </main>
  );
}
