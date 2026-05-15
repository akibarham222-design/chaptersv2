import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { confessionsAPI, searchSong } from '../utils/api';
import { timeAgo } from '../utils/timeUtils';
import toast from 'react-hot-toast';
import { Search, Send, Music, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

function ConfessionCard({ c }) {
  const spotifyUrl = c.song?.spotifyUrl ||
    (c.song?.title ? `https://open.spotify.com/search/${encodeURIComponent((c.song.title || '') + ' ' + (c.song.artist || ''))}` : null);

  return (
    <div className="glass-amber p-5 rounded-sm border-l-2 border-amber-500/20 hover:border-amber-500/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-mono-custom text-xs text-smoke-600 uppercase tracking-widest mb-1">From</div>
          <div className="font-display text-sm font-semibold text-amber-400 italic">{c.from}</div>
        </div>
        <div className="text-smoke-600 text-lg">→</div>
        <div className="text-right">
          <div className="font-mono-custom text-xs text-smoke-600 uppercase tracking-widest mb-1">To</div>
          <div className="font-display text-sm font-semibold text-smoke-200 italic">{c.to}</div>
        </div>
      </div>
      <div className="compartment-divider mb-3" />
      <p className="font-body text-smoke-300 text-sm leading-relaxed mb-4">{c.message}</p>
      {c.song?.title && (
        <div className="flex items-center gap-3 mt-2 pt-3 border-t border-white/5">
          {c.song.artwork && <img src={c.song.artwork} alt="" className="w-8 h-8 rounded-sm object-cover opacity-80" />}
          <div className="flex-1 min-w-0">
            <div className="font-mono-custom text-[10px] text-smoke-600 uppercase tracking-widest">Song</div>
            {spotifyUrl ? (
              <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
                className="font-body text-xs text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                {c.song.title}
                {c.song.artist && <span className="text-smoke-600">· {c.song.artist}</span>}
                <ExternalLink size={10} />
              </a>
            ) : (
              <div className="font-body text-xs text-smoke-400">{c.song.title} {c.song.artist && `· ${c.song.artist}`}</div>
            )}
          </div>
        </div>
      )}
      <div className="mt-3 font-mono-custom text-[10px] text-smoke-700">{timeAgo(c.createdAt)}</div>
    </div>
  );
}

export default function Confessions() {
  const { user } = useAuth();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', message: '', song: null });
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [songSearching, setSongSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const songDebounce = useRef(null);

  const fetchConfessions = async (p = 1, s = search) => {
    setLoading(true);
    try {
      const { data } = await confessionsAPI.getPublic({ page: p, limit: 9, search: s });
      setConfessions(data.confessions || []);
      setTotalPages(data.pages || 1);
    } catch { toast.error('Failed to load confessions.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConfessions(1, ''); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
    fetchConfessions(1, searchInput);
  };

  const handleSongSearch = (q) => {
    setSongQuery(q);
    clearTimeout(songDebounce.current);
    if (!q.trim()) { setSongResults([]); return; }
    songDebounce.current = setTimeout(async () => {
      setSongSearching(true);
      try {
        const data = await searchSong(q);
        setSongResults(data.results?.slice(0, 6) || []);
      } catch {} finally { setSongSearching(false); }
    }, 500);
  };

  const selectSong = (track) => {
    setForm(p => ({
      ...p,
      song: {
        title: track.trackName,
        artist: track.artistName,
        artwork: track.artworkUrl100,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(track.trackName + ' ' + track.artistName)}`,
      }
    }));
    setSongQuery('');
    setSongResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('You need a boarding pass to submit a confession.');
    if (!form.from || !form.to || !form.message) return toast.error('Fill all required fields.');
    if (form.message.length < 10) return toast.error('Message too short.');
    setSubmitting(true);
    try {
      await confessionsAPI.submit(form);
      toast.success('Confession submitted. It will appear after station review.');
      setForm({ from: '', to: '', message: '', song: null });
      setSongQuery('');
      setSongResults([]);
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-night-950 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-4">◆ The Confession Wall ◆</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-smoke-100 mb-3">Confessions</h1>
          <p className="font-body text-smoke-400 text-sm max-w-md mx-auto">
            Words left at the station. From one soul to another. Approved by station staff before posting.
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke-600" />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by name, message, song, artist..."
                className="input-dark pl-9 text-sm" />
            </div>
            <button type="submit" className="btn-board text-xs px-4">Search</button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); fetchConfessions(1, ''); }}
                className="btn-ghost text-xs px-3"><X size={13} /></button>
            )}
          </form>
          <button onClick={() => setShowForm(p => !p)}
            className={showForm ? 'btn-ghost text-xs' : 'btn-board text-xs'}>
            {showForm ? 'Cancel' : '+ Leave a Confession'}
          </button>
        </div>

        {/* Submission form */}
        {showForm && (
          <div className="glass-amber p-6 rounded-sm mb-8 animate-fade-up">
            <div className="font-mono-custom text-xs text-amber-500 tracking-widest uppercase mb-5">◆ New Confession</div>
            {!user && (
              <div className="text-center py-4">
                <p className="font-body text-smoke-400 text-sm mb-3">You need a boarding pass to confess.</p>
                <a href="/login" className="btn-board text-xs">Get Boarding Pass</a>
              </div>
            )}
            {user && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">From</label>
                    <input value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))}
                      placeholder="A name or alias" className="input-dark" maxLength={60} required />
                  </div>
                  <div>
                    <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">To</label>
                    <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
                      placeholder="A name or alias" className="input-dark" maxLength={60} required />
                  </div>
                </div>
                <div>
                  <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">Message</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="What do you want to say..." rows={4}
                    className="input-dark resize-none" maxLength={1000} required />
                  <div className="text-right font-mono-custom text-xs text-smoke-700 mt-1">{form.message.length}/1000</div>
                </div>

                {/* Song search */}
                <div>
                  <label className="font-mono-custom text-xs text-smoke-400 uppercase tracking-widest block mb-2">Song (optional)</label>
                  {form.song ? (
                    <div className="flex items-center gap-3 p-3 glass rounded-sm">
                      {form.song.artwork && <img src={form.song.artwork} alt="" className="w-10 h-10 rounded-sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-sm text-smoke-100 truncate">{form.song.title}</div>
                        <div className="font-mono-custom text-xs text-smoke-500">{form.song.artist}</div>
                      </div>
                      <button type="button" onClick={() => setForm(p => ({ ...p, song: null }))}
                        className="text-smoke-600 hover:text-smoke-300"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Music size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke-600" />
                      <input value={songQuery} onChange={e => handleSongSearch(e.target.value)}
                        placeholder="Search for a song..." className="input-dark pl-9 text-sm" />
                      {(songSearching || songResults.length > 0) && (
                        <div className="absolute top-full left-0 right-0 z-20 glass border border-white/10 mt-1 rounded-sm max-h-48 overflow-y-auto">
                          {songSearching && <div className="p-3 font-mono-custom text-xs text-smoke-500 animate-pulse text-center">Searching...</div>}
                          {songResults.map((track, i) => (
                            <button key={i} type="button" onClick={() => selectSong(track)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0">
                              {track.artworkUrl100 && <img src={track.artworkUrl100} alt="" className="w-8 h-8 rounded-sm" />}
                              <div className="flex-1 min-w-0">
                                <div className="font-body text-xs text-smoke-100 truncate">{track.trackName}</div>
                                <div className="font-mono-custom text-xs text-smoke-500 truncate">{track.artistName}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={submitting} className="btn-board w-full disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send size={14} />
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                <p className="font-mono-custom text-xs text-smoke-600 text-center">
                  Confessions are reviewed by station staff before appearing publicly.
                </p>
              </form>
            )}
          </div>
        )}

        {/* Confessions grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="font-mono-custom text-xs text-smoke-600 animate-pulse">Loading confessions...</div>
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="font-mono-custom text-xs text-smoke-600 mb-2">◆ NO CONFESSIONS FOUND ◆</div>
            <p className="font-body text-smoke-600 text-sm">{search ? 'No matches for your search.' : 'Be the first to leave a confession at the station.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {confessions.map(c => <ConfessionCard key={c._id} c={c} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <button onClick={() => { setPage(p => p - 1); fetchConfessions(page - 1); }}
              disabled={page === 1} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1 disabled:opacity-40">
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="font-mono-custom text-xs text-smoke-400">{page} / {totalPages}</span>
            <button onClick={() => { setPage(p => p + 1); fetchConfessions(page + 1); }}
              disabled={page === totalPages} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1 disabled:opacity-40">
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
