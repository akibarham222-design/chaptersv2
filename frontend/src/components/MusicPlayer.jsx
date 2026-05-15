import React from 'react';
import { useMusic } from '../context/MusicContext';
import { X, Play, Pause, SkipForward, SkipBack, Volume2, Music } from 'lucide-react';

export default function MusicPlayer() {
  const {
    songs, currentSong, currentIndex, isPlaying, isOpen, progress,
    duration, volume, loading, setIsOpen, playSong, togglePlay,
    playNext, playPrev, seek, setVolume
  } = useMusic();

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 glass-amber rounded-sm shadow-2xl shadow-black/60 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/10">
        <div className="flex items-center gap-2">
          <Music size={13} className="text-amber-500" />
          <span className="font-mono-custom text-xs text-amber-500 tracking-widest uppercase">Train Sounds</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-smoke-400 hover:text-smoke-100 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Now playing */}
      <div className="px-4 py-4 border-b border-white/5">
        {currentSong ? (
          <div>
            <div className="font-display text-sm text-smoke-100 truncate leading-snug">{currentSong.title}</div>
            {currentSong.description && (
              <div className="font-mono-custom text-xs text-smoke-400 truncate mt-0.5">{currentSong.description}</div>
            )}
          </div>
        ) : (
          <div>
            <div className="font-display text-sm text-smoke-400 italic">No track selected</div>
            <div className="font-mono-custom text-xs text-smoke-600 mt-0.5">Choose a departure below</div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-3">
          <div
            className="h-1 bg-night-700 rounded-full cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              seek(pct);
            }}
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full shadow-lg" />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono-custom text-[10px] text-smoke-600">
              {formatTime((progress / 100) * duration)}
            </span>
            <span className="font-mono-custom text-[10px] text-smoke-600">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button onClick={playPrev} className="text-smoke-400 hover:text-smoke-100 transition-colors">
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 bg-amber-500 hover:bg-amber-400 text-night-950 flex items-center justify-center rounded-full transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
          >
            {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={playNext} className="text-smoke-400 hover:text-smoke-100 transition-colors">
            <SkipForward size={16} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mt-3">
          <Volume2 size={12} className="text-smoke-600 flex-shrink-0" />
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Song list */}
      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="font-mono-custom text-xs text-smoke-600 animate-pulse">Loading playlist...</div>
          </div>
        ) : songs.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="font-mono-custom text-xs text-smoke-600">No songs on board yet</div>
          </div>
        ) : (
          songs.map((song, i) => (
            <button
              key={song._id}
              onClick={() => playSong(i)}
              className={`w-full text-left px-4 py-2.5 border-b border-white/3 transition-colors hover:bg-white/3 ${
                currentIndex === i ? 'bg-amber-500/8 border-l-2 border-l-amber-500' : ''
              }`}
            >
              <div className="font-body text-xs text-smoke-100 truncate leading-snug">{song.title}</div>
              {song.description && (
                <div className="font-mono-custom text-[10px] text-smoke-600 truncate mt-0.5">{song.description}</div>
              )}
              {currentIndex === i && isPlaying && (
                <div className="flex items-end gap-0.5 mt-1">
                  {[1,2,3].map(n => (
                    <div key={n} className="w-0.5 bg-amber-500 rounded-full animate-pulse"
                      style={{ height: `${8 + n * 3}px`, animationDelay: `${n * 0.1}s` }} />
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
