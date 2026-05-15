import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getServiceStatus } from '../utils/timeUtils';
import { reportsAPI, journeyAPI, searchSong } from '../utils/api';
import toast from 'react-hot-toast';
import { Send, SkipForward, Flag, Gamepad2, Music2, X, ArrowLeft } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

function TicTacToe({ state, symbol, onMove, gameOver }) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const isMyTurn = state.turn === symbol;
  return (
    <div className="mt-3">
      <div className="font-mono-custom text-xs text-smoke-400 mb-2 text-center">
        {gameOver ? (state.winner === 'draw' ? 'Draw!' : state.winner === symbol ? 'You won!' : 'Stranger won!') : (isMyTurn ? 'Your turn' : "Stranger's turn")}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
        {state.board.map((cell, i) => (
          <button key={i} onClick={() => !gameOver && isMyTurn && !cell && onMove(i)}
            className={`w-10 h-10 border text-lg font-bold transition-colors ${
              cell ? (cell === symbol ? 'border-amber-500 text-amber-500' : 'border-smoke-600 text-smoke-400') : 'border-smoke-700 hover:border-smoke-500 text-smoke-600'
            }`}>
            {cell || ''}
          </button>
        ))}
      </div>
    </div>
  );
}

function WordGuess({ state, role, onGuess, gameOver }) {
  const [letter, setLetter] = useState('');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const displayWord = state.word === '?' ? '???' : state.word.split('').map(c => state.guessed.includes(c) ? c : '_').join(' ');

  if (role === 'setter') {
    return (
      <div className="text-center mt-3">
        <div className="font-mono-custom text-xs text-smoke-400 mb-2">Word: <span className="text-amber-500">{state.word}</span></div>
        <div className="font-mono-custom text-sm text-smoke-200">{displayWord}</div>
        <div className="font-mono-custom text-xs text-smoke-600 mt-1">Wrong: {state.wrongGuesses.join(', ') || 'None'}</div>
        {gameOver && <div className="text-xs mt-2 text-amber-500">{state.winner === 'guesser' ? 'Stranger guessed it!' : 'They ran out of tries!'}</div>}
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="font-mono-custom text-base text-smoke-100 text-center tracking-widest mb-2">{displayWord}</div>
      <div className="font-mono-custom text-xs text-signal-red text-center mb-2">
        Wrong: {state.wrongGuesses.join(' ')} ({state.wrongGuesses.length}/{state.maxWrong})
      </div>
      {!gameOver && (
        <div className="flex flex-wrap gap-1 justify-center">
          {alphabet.split('').map(l => (
            <button key={l} onClick={() => !state.guessed.includes(l) && onGuess(l)}
              disabled={state.guessed.includes(l)}
              className={`w-6 h-6 text-xs font-mono-custom transition-colors ${
                state.guessed.includes(l)
                  ? (state.wrongGuesses.includes(l) ? 'bg-signal-red/20 text-signal-red' : 'bg-amber-500/20 text-amber-500')
                  : 'bg-night-700 text-smoke-300 hover:bg-night-600'
              }`}>{l}</button>
          ))}
        </div>
      )}
      {gameOver && <div className="text-xs mt-2 text-center text-amber-500">{state.winner === 'guesser' ? 'You guessed it!' : `The word was: ${state.word}`}</div>}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [phase, setPhase] = useState('waiting'); // waiting | matched | disconnected
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [strangerSocketId, setStrangerSocketId] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [songSearching, setSongSearching] = useState(false);
  const [activeGame, setActiveGame] = useState(null); // { type, sessionId, symbol/role, state }
  const [gameInvite, setGameInvite] = useState(null);
  const [chatStartTime] = useState(Date.now());
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (getServiceStatus().status !== 'open') {
      navigate('/board');
      return;
    }
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_queue', { userId: user._id, userName: user.name });
    });

    s.on('waiting', ({ message }) => {
      setPhase('waiting');
      toast(message, { icon: '🕐' });
    });

    s.on('matched', ({ sessionId: sid, message, partnerSocketId }) => {
      setPhase('matched');
      setSessionId(sid);
      setStrangerSocketId(partnerSocketId || null);
      setMessages([]);
      toast.success(message);
      journeyAPI.create({ type: 'chat_started', details: 'Anonymous chat session started' }).catch(() => {});
    });

    s.on('receive_message', (msg) => {
      setMessages(prev => [...prev, { ...msg, from: 'stranger' }]);
    });
    s.on('message_sent', (msg) => {
      setMessages(prev => [...prev, { ...msg, from: 'me' }]);
    });

    s.on('stranger_typing', (isTyping) => setTyping(isTyping));
    s.on('stranger_left', ({ message }) => {
      setPhase('disconnected');
      toast(message, { icon: '🚉' });
      const dur = Math.floor((Date.now() - chatStartTime) / 1000);
      journeyAPI.create({ type: 'chat_ended', details: 'Session ended', duration: dur }).catch(() => {});
    });

    s.on('service_closed', ({ message }) => {
      toast.error(message);
      navigate('/board');
    });

    s.on('song_dedicated', ({ song, message }) => {
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'song', song, from: 'stranger',
        text: `🎵 ${song.title} by ${song.artist}`, timestamp: new Date().toISOString()
      }]);
      toast(message, { icon: '🎵' });
    });
    s.on('dedication_sent', () => toast.success('Song dedicated!'));

    s.on('game_invited', ({ game }) => {
      setGameInvite(game);
    });
    s.on('game_declined', ({ message }) => {
      toast(message, { icon: '🎮' });
      setActiveGame(null);
    });
    s.on('game_started', (data) => {
      setGameInvite(null);
      setActiveGame(data);
    });
    s.on('ttt_update', (state) => {
      setActiveGame(prev => prev ? { ...prev, state } : null);
    });
    s.on('word_update', (state) => {
      setActiveGame(prev => prev ? { ...prev, state } : null);
    });

    return () => { s.disconnect(); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || phase !== 'matched' || !socket) return;
    socket.emit('send_message', { text: input.trim() });
    setInput('');
    socket.emit('typing', false);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket) return;
    socket.emit('typing', true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socket.emit('typing', false), 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const findNewStranger = () => {
    if (!socket) return;
    setPhase('waiting');
    setMessages([]);
    setActiveGame(null);
    setGameInvite(null);
    socket.emit('join_queue', { userId: user._id, userName: user.name });
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return toast.error('Please provide a reason.');
    try {
      await reportsAPI.submit({ reason: reportReason, chatSession: sessionId, reportedSocketId: strangerSocketId });
      toast.success('Report submitted to station staff.');
      setShowReport(false);
      setReportReason('');
    } catch { toast.error('Report failed.'); }
  };

  const handleSongSearch = async () => {
    if (!songQuery.trim()) return;
    setSongSearching(true);
    try {
      const data = await searchSong(songQuery);
      setSongResults(data.results || []);
    } catch { toast.error('Song search failed.'); }
    finally { setSongSearching(false); }
  };

  const dedicateSong = (track) => {
    if (!socket) return;
    const song = {
      title: track.trackName,
      artist: track.artistName,
      artwork: track.artworkUrl100,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(track.trackName + ' ' + track.artistName)}`,
    };
    socket.emit('dedicate_song', { song });
    setShowSongSearch(false);
    setSongQuery('');
    setSongResults([]);
    journeyAPI.create({ type: 'song_dedicated', details: `${song.title} by ${song.artist}` }).catch(() => {});
  };

  const inviteGame = (game) => {
    if (!socket) return;
    socket.emit('game_invite', { game });
    toast('Game invite sent!', { icon: '🎮' });
  };
  const acceptGame = () => { if (socket && gameInvite) socket.emit('game_accept', { game: gameInvite }); };
  const declineGame = () => { if (socket && gameInvite) { socket.emit('game_decline'); setGameInvite(null); } };
  const tttMove = (idx) => { if (socket && activeGame) socket.emit('ttt_move', { index: idx, sessionId: activeGame.sessionId }); };
  const wordGuess = (letter) => { if (socket && activeGame) socket.emit('word_guess', { letter, sessionId: activeGame.sessionId }); };

  return (
    <div className="min-h-screen bg-night-950 flex flex-col pt-16">
      {/* Header */}
      <div className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/board')} className="text-smoke-600 hover:text-smoke-300 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="font-mono-custom text-xs text-amber-500 tracking-widest uppercase">Compartment No. 1</div>
            <div className="font-body text-xs text-smoke-600">
              {phase === 'waiting' ? 'Waiting for a fellow passenger...' :
               phase === 'matched' ? 'Journey in progress' : 'Compartment empty'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phase === 'matched' && (
            <>
              <button onClick={() => setShowSongSearch(true)}
                className="w-7 h-7 border border-smoke-700 hover:border-amber-500 flex items-center justify-center transition-colors" title="Dedicate Song">
                <Music2 size={12} className="text-smoke-400 hover:text-amber-500" />
              </button>
              <button onClick={() => setShowReport(true)}
                className="w-7 h-7 border border-smoke-700 hover:border-signal-red flex items-center justify-center transition-colors" title="Report">
                <Flag size={12} className="text-smoke-400" />
              </button>
            </>
          )}
          {(phase === 'matched' || phase === 'disconnected') && (
            <button onClick={findNewStranger}
              className="flex items-center gap-1.5 border border-smoke-700 hover:border-amber-500 px-3 py-1.5 text-xs font-mono-custom text-smoke-400 hover:text-amber-500 transition-colors">
              <SkipForward size={12} />
              {phase === 'matched' ? 'Next' : 'New Stranger'}
            </button>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 max-w-2xl w-full mx-auto">
        {phase === 'waiting' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border border-amber-500/20 flex items-center justify-center">
                <div className="w-8 h-8 border border-amber-500/40 animate-spin" style={{ borderTopColor: '#f59e0b' }} />
              </div>
            </div>
            <div className="text-center">
              <div className="font-mono-custom text-xs text-amber-500 tracking-widest animate-pulse">WAITING ON THE PLATFORM</div>
              <div className="font-body text-smoke-500 text-sm mt-2">A stranger will board soon...</div>
            </div>
          </div>
        )}

        {phase === 'disconnected' && (
          <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
            <div className="font-mono-custom text-xs text-smoke-500 tracking-widest">◆ COMPARTMENT EMPTY ◆</div>
            <div className="font-body text-smoke-400 text-sm">Your fellow passenger has alighted.</div>
            <button onClick={findNewStranger} className="btn-board text-xs">Find New Stranger</button>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'song' ? (
              <div className={`max-w-xs p-3 ${msg.from === 'me' ? 'chat-bubble-me' : 'chat-bubble-stranger'}`}>
                <div className="flex items-center gap-2">
                  {msg.song?.artwork && <img src={msg.song.artwork} alt="" className="w-10 h-10 rounded-sm object-cover" />}
                  <div>
                    <div className="font-body text-xs text-amber-500">🎵 Song Dedication</div>
                    <div className="font-body text-xs text-smoke-200">{msg.song?.title}</div>
                    <div className="font-mono-custom text-xs text-smoke-500">{msg.song?.artist}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`max-w-xs px-4 py-2.5 ${msg.from === 'me' ? 'chat-bubble-me' : 'chat-bubble-stranger'}`}>
                <p className="font-body text-sm text-smoke-100 leading-relaxed">{msg.text}</p>
                <span className="font-mono-custom text-[10px] text-smoke-600 mt-1 block">
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="chat-bubble-stranger px-4 py-2.5">
              <div className="flex items-center gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-smoke-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active game */}
        {activeGame && (
          <div className="glass-amber p-4 rounded-sm mx-auto max-w-xs">
            <div className="font-mono-custom text-xs text-amber-500 tracking-widest mb-2 text-center uppercase">
              {activeGame.game === 'tictactoe' ? 'Tic-Tac-Toe' : 'Word Guess'} · Compartment Game
            </div>
            {activeGame.game === 'tictactoe' && (
              <TicTacToe state={activeGame.state} symbol={activeGame.symbol}
                onMove={tttMove} gameOver={activeGame.state.gameOver} />
            )}
            {activeGame.game === 'wordguess' && (
              <WordGuess state={activeGame.state} role={activeGame.role}
                onGuess={wordGuess} gameOver={activeGame.state.gameOver} />
            )}
          </div>
        )}

        {/* Game invite */}
        {gameInvite && !activeGame && (
          <div className="glass-amber p-4 rounded-sm mx-auto max-w-xs text-center">
            <div className="font-mono-custom text-xs text-amber-500 mb-2">Game Invite</div>
            <p className="font-body text-sm text-smoke-300 mb-3">Stranger wants to play <strong>{gameInvite}</strong></p>
            <div className="flex gap-2 justify-center">
              <button onClick={acceptGame} className="btn-board text-xs px-4 py-2">Accept</button>
              <button onClick={declineGame} className="btn-ghost text-xs px-4 py-2">Decline</button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {phase === 'matched' && (
        <div className="glass border-t border-white/5 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            {/* Game invite buttons */}
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 size={12} className="text-smoke-600" />
              <span className="font-mono-custom text-xs text-smoke-600">Invite to:</span>
              <button onClick={() => inviteGame('tictactoe')}
                className="font-mono-custom text-xs text-smoke-500 hover:text-amber-500 transition-colors border border-smoke-700 hover:border-amber-500 px-2 py-1">
                Tic-Tac-Toe
              </button>
              <button onClick={() => inviteGame('wordguess')}
                className="font-mono-custom text-xs text-smoke-500 hover:text-amber-500 transition-colors border border-smoke-700 hover:border-amber-500 px-2 py-1">
                Word Guess
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 bg-night-800 border border-smoke-700 text-smoke-100 px-4 py-3 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors placeholder-smoke-600 rounded-sm"
                maxLength={500}
              />
              <button onClick={sendMessage} disabled={!input.trim()}
                className="w-11 h-11 bg-amber-500 hover:bg-amber-400 text-night-950 flex items-center justify-center transition-colors disabled:opacity-40 rounded-sm">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="glass-amber p-6 rounded-sm w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-smoke-100">Report to Station Staff</h3>
              <button onClick={() => setShowReport(false)}><X size={16} className="text-smoke-400" /></button>
            </div>
            <textarea value={reportReason} onChange={e => setReportReason(e.target.value)}
              placeholder="Describe the issue..."
              className="input-dark h-28 resize-none mb-4" maxLength={500} />
            <div className="flex gap-2">
              <button onClick={submitReport} className="btn-board text-xs flex-1">Submit Report</button>
              <button onClick={() => setShowReport(false)} className="btn-ghost text-xs flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Song search modal */}
      {showSongSearch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="glass-amber p-6 rounded-sm w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-smoke-100">Dedicate a Song</h3>
              <button onClick={() => setShowSongSearch(false)}><X size={16} className="text-smoke-400" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={songQuery} onChange={e => setSongQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSongSearch()}
                placeholder="Search songs..." className="input-dark flex-1 text-sm" />
              <button onClick={handleSongSearch} className="btn-board text-xs px-4">Search</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {songSearching && <div className="text-center font-mono-custom text-xs text-smoke-500 animate-pulse py-4">Searching...</div>}
              {songResults.map((track, i) => (
                <button key={i} onClick={() => dedicateSong(track)}
                  className="w-full flex items-center gap-3 p-3 glass hover:bg-amber-500/5 transition-colors rounded-sm text-left">
                  {track.artworkUrl100 && <img src={track.artworkUrl100} alt="" className="w-10 h-10 rounded-sm object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-xs text-smoke-100 truncate">{track.trackName}</div>
                    <div className="font-mono-custom text-xs text-smoke-500 truncate">{track.artistName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
