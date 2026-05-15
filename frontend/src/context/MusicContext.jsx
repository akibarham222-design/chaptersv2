import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { songsAPI } from '../utils/api';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    audioRef.current.addEventListener('timeupdate', () => {
      if (audioRef.current.duration) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    });
    audioRef.current.addEventListener('loadedmetadata', () => {
      setDuration(audioRef.current.duration);
    });
    audioRef.current.addEventListener('ended', () => {
      playNext();
    });
    audioRef.current.addEventListener('play', () => setIsPlaying(true));
    audioRef.current.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const { data } = await songsAPI.getAll();
      setSongs(data.songs || []);
    } catch (err) {
      console.error('Failed to fetch songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSongs(); }, []);

  const playSong = (index) => {
    if (!songs[index]) return;
    const song = songs[index];
    const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
    const src = song.filepath.startsWith('http') ? song.filepath : `${apiOrigin || window.location.origin}${song.filepath}`;
    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().catch(console.error);
      setCurrentIndex(index);
      songsAPI.incrementPlay(song._id).catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (currentIndex === null && songs.length > 0) {
        playSong(0);
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const playNext = () => {
    if (songs.length === 0) return;
    const next = currentIndex === null ? 0 : (currentIndex + 1) % songs.length;
    playSong(next);
  };

  const playPrev = () => {
    if (songs.length === 0) return;
    const prev = currentIndex === null ? 0 : (currentIndex - 1 + songs.length) % songs.length;
    playSong(prev);
  };

  const seek = (pct) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration;
    }
  };

  const currentSong = currentIndex !== null ? songs[currentIndex] : null;

  return (
    <MusicContext.Provider value={{
      songs, currentSong, currentIndex, isPlaying, isOpen, progress, duration, volume,
      loading, setIsOpen, playSong, togglePlay, playNext, playPrev, seek, setVolume, fetchSongs
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be inside MusicProvider');
  return ctx;
};
