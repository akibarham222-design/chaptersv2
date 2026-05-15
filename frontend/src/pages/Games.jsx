import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { journeyAPI } from '../utils/api';
import toast from 'react-hot-toast';

// ─── Tic-Tac-Toe (vs computer) ────────────────────────────────────────────────
function TicTacToeGame() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const [winner, setWinner] = useState(null);
  const { user } = useAuth();

  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const calcWinner = (b) => { for (const [a,c,d] of lines) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; return null; };
  const isDraw = (b) => b.every(c=>c) && !calcWinner(b);

  const cpuMove = (b) => {
    // Try to win
    for (const [a,c,d] of lines) {
      if (b[a]==='O'&&b[c]==='O'&&!b[d]) return d;
      if (b[a]==='O'&&b[d]==='O'&&!b[c]) return c;
      if (b[c]==='O'&&b[d]==='O'&&!b[a]) return a;
    }
    // Block player
    for (const [a,c,d] of lines) {
      if (b[a]==='X'&&b[c]==='X'&&!b[d]) return d;
      if (b[a]==='X'&&b[d]==='X'&&!b[c]) return c;
      if (b[c]==='X'&&b[d]==='X'&&!b[a]) return a;
    }
    if (!b[4]) return 4;
    const corners = [0,2,6,8].filter(i=>!b[i]);
    if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
    return b.findIndex(c=>!c);
  };

  const handleClick = (i) => {
    if (board[i] || winner || !isX) return;
    const nb = [...board]; nb[i] = 'X';
    const w = calcWinner(nb);
    setBoard(nb); setIsX(false);
    if (w) { setWinner(w); if (user) journeyAPI.create({ type: 'game_played', details: 'Won Tic-Tac-Toe solo' }).catch(()=>{}); return; }
    if (isDraw(nb)) { setWinner('draw'); return; }
    setTimeout(() => {
      const idx = cpuMove(nb);
      if (idx === -1 || idx === undefined) return;
      const nb2 = [...nb]; nb2[idx] = 'O';
      const w2 = calcWinner(nb2);
      setBoard(nb2); setIsX(true);
      if (w2) setWinner(w2);
      else if (isDraw(nb2)) setWinner('draw');
    }, 300);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setIsX(true); setWinner(null); };

  const statusText = winner ? (winner==='draw' ? 'A draw — two strangers, equal fate.' : winner==='X' ? 'You claimed the route!' : 'The signal went to the other side.') : isX ? 'Your move, passenger.' : 'The station is thinking...';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="font-mono-custom text-xs text-amber-500/80 tracking-widest text-center min-h-[1.5rem]">{statusText}</div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button key={i} onClick={() => handleClick(i)}
            className={`w-16 h-16 sm:w-20 sm:h-20 border text-2xl sm:text-3xl font-display font-bold transition-all duration-200 ${
              cell === 'X' ? 'border-amber-500 text-amber-500 bg-amber-500/5'
              : cell === 'O' ? 'border-smoke-600 text-smoke-400 bg-smoke-600/5'
              : 'border-smoke-700 hover:border-smoke-500 text-smoke-800 hover:bg-white/3'
            }`}>
            {cell}
          </button>
        ))}
      </div>
      {winner && <button onClick={reset} className="btn-board text-xs mt-2">New Journey</button>}
    </div>
  );
}

// ─── Number Guess Game ─────────────────────────────────────────────────────────
function NumberGuessGame() {
  const [secret] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);
  const { user } = useAuth();

  const submit = () => {
    const n = parseInt(guess);
    if (isNaN(n) || n < 1 || n > 100) return toast.error('Enter a number 1–100');
    const hint = n < secret ? '↑ Higher (next station ahead)' : n > secret ? '↓ Lower (passed the stop)' : '✓ Exactly right!';
    const correct = n === secret;
    setHistory(p => [{ guess: n, hint, correct }, ...p]);
    setGuess('');
    if (correct) {
      setWon(true);
      if (user) journeyAPI.create({ type: 'game_played', details: `Won Number Guess in ${history.length+1} tries` }).catch(()=>{});
    }
  };

  const [newSecret, setNewSecret] = useState(null);
  const reset = () => window.location.reload();

  return (
    <div className="flex flex-col gap-4">
      <div className="font-mono-custom text-xs text-smoke-400 text-center">
        The station hid a number between 1 and 100. Find it.
      </div>
      {!won ? (
        <div className="flex gap-2">
          <input type="number" value={guess} onChange={e => setGuess(e.target.value)}
            onKeyDown={e => e.key==='Enter' && submit()}
            min="1" max="100" placeholder="Guess 1–100"
            className="input-dark flex-1 text-center text-lg font-mono-custom" />
          <button onClick={submit} className="btn-board text-xs px-6">Signal</button>
        </div>
      ) : (
        <div className="text-center">
          <div className="font-display text-2xl text-amber-500 mb-2">Correct! It was {secret}</div>
          <div className="font-mono-custom text-xs text-smoke-500 mb-4">{history.length} attempts</div>
          <button onClick={reset} className="btn-board text-xs">New Game</button>
        </div>
      )}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {history.map((h, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-sm text-xs font-mono-custom ${h.correct ? 'bg-signal-green/10 text-signal-green' : 'bg-night-800 text-smoke-400'}`}>
            <span>Guess #{history.length - i}: {h.guess}</span>
            <span>{h.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Word Unscramble ───────────────────────────────────────────────────────────
function UnscrambleGame() {
  const words = ['JOURNEY', 'STATION', 'PLATFORM', 'SIGNAL', 'DEPARTURE', 'ARRIVAL', 'TICKET', 'PASSENGER', 'COMPARTMENT', 'EXPRESS', 'MIDNIGHT', 'WHISTLE'];
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * words.length));
  const [scrambled] = useState(() => {
    const w = words[idx];
    return w.split('').sort(() => Math.random() - 0.5).join('');
  });
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const { user } = useAuth();

  const check = () => {
    const correct = answer.toUpperCase().trim() === words[idx];
    setResult(correct);
    if (correct && user) journeyAPI.create({ type: 'game_played', details: `Unscrambled: ${words[idx]}` }).catch(()=>{});
  };

  const next = () => {
    const ni = Math.floor(Math.random() * words.length);
    setIdx(ni);
    setAnswer('');
    setResult(null);
    setRevealed(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="font-mono-custom text-xs text-smoke-400 text-center">Unscramble the station word</div>
      <div className="font-mono-custom text-3xl sm:text-4xl text-amber-500 tracking-[0.3em] text-center">
        {scrambled}
      </div>
      {result === null && !revealed && (
        <>
          <input value={answer} onChange={e => setAnswer(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter' && check()}
            placeholder="Your answer" className="input-dark text-center text-lg font-mono-custom max-w-xs" maxLength={20} />
          <div className="flex gap-3">
            <button onClick={check} className="btn-board text-xs px-6">Check</button>
            <button onClick={() => setRevealed(true)} className="btn-ghost text-xs">Reveal</button>
          </div>
        </>
      )}
      {result === true && <div className="font-display text-xl text-signal-green">Correct! The train stops at {words[idx]}.</div>}
      {result === false && <div className="font-display text-sm text-signal-red">Wrong stop. Try again?<br/><span className="text-xs text-smoke-600">Hint: {words[idx].length} letters</span></div>}
      {revealed && <div className="font-mono-custom text-xl text-amber-500">Answer: {words[idx]}</div>}
      {(result === true || revealed) && <button onClick={next} className="btn-board text-xs">Next Word</button>}
      {result === false && (
        <div className="flex gap-3">
          <button onClick={() => setResult(null)} className="btn-board text-xs">Try Again</button>
          <button onClick={next} className="btn-ghost text-xs">Skip</button>
        </div>
      )}
    </div>
  );
}

// ─── Main Games Page ───────────────────────────────────────────────────────────
const GAMES = [
  { id: 'ttt', name: 'Rail Crosses', subtitle: 'Tic-Tac-Toe vs Station AI', icon: '✕〇', desc: 'Classic Tic-Tac-Toe. You are X. The station plays O. Claim three in a line.', component: TicTacToeGame },
  { id: 'numguess', name: 'Blind Departure', subtitle: 'Number Guessing', icon: '🔢', desc: 'A number between 1 and 100 is hidden. Find it in the fewest guesses.', component: NumberGuessGame },
  { id: 'unscramble', name: 'Station Scramble', subtitle: 'Word Unscramble', icon: '🔤', desc: 'A station word has been scrambled. Decode it before the train departs.', component: UnscrambleGame },
];

export default function Games() {
  const [active, setActive] = useState(null);
  const Game = active ? GAMES.find(g => g.id === active)?.component : null;

  return (
    <div className="min-h-screen bg-night-950 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono-custom text-xs text-amber-500/70 tracking-widest uppercase mb-4">◆ The Game Compartment ◆</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-smoke-100 mb-3">Table Games</h1>
          <p className="font-body text-smoke-400 text-sm max-w-md mx-auto">
            While the train moves through the night, pass the time with a compartment game. 
            Challenge a stranger from chat, or play solo.
          </p>
        </div>

        {!active ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {GAMES.map(g => (
              <button key={g.id} onClick={() => setActive(g.id)}
                className="glass-amber p-6 rounded-sm text-left hover:border-amber-500/30 transition-all duration-300 group">
                <div className="text-3xl mb-4">{g.icon}</div>
                <div className="font-display text-base font-semibold text-smoke-100 mb-1 group-hover:text-amber-400 transition-colors">{g.name}</div>
                <div className="font-mono-custom text-xs text-amber-500/60 tracking-widest uppercase mb-3">{g.subtitle}</div>
                <p className="font-body text-smoke-500 text-xs leading-relaxed">{g.desc}</p>
                <div className="mt-4 font-mono-custom text-xs text-amber-500/50 uppercase tracking-widest">→ Play</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-amber p-8 rounded-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-display text-lg font-semibold text-smoke-100">
                  {GAMES.find(g => g.id === active)?.name}
                </div>
                <div className="font-mono-custom text-xs text-amber-500/60 tracking-widest uppercase">
                  {GAMES.find(g => g.id === active)?.subtitle}
                </div>
              </div>
              <button onClick={() => setActive(null)} className="btn-ghost text-xs">← Back</button>
            </div>
            <div className="compartment-divider mb-6" />
            {Game && <Game />}
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="font-mono-custom text-xs text-smoke-600">
            Challenge a stranger in chat with Tic-Tac-Toe or Word Guess during your journey.
          </p>
        </div>
      </div>
    </div>
  );
}
