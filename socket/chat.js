const { v4: uuidv4 } = require('uuid');

// Bangladesh time check (UTC+6): service runs 19:00 - 05:00 next day
function isBangladeshNightService() {
  const now = new Date();
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const hour = bdTime.getUTCHours();
  return hour >= 19 || hour < 5;
}

module.exports = function initChatSocket(io) {
  const waitingQueue = []; // { socketId, userId, userName }
  const activePairs = new Map(); // socketId -> partnerSocketId
  const sessionMap = new Map(); // socketId -> sessionId
  const gameStates = new Map(); // sessionId -> gameState
  const sessionMessages = new Map(); // sessionId -> last messages for moderation

  io.on('connection', (socket) => {
    console.log(`🚂 Passenger boarded: ${socket.id}`);

    // Check service hours
    socket.on('check_service', () => {
      socket.emit('service_status', { open: isBangladeshNightService() });
    });

    // Join waiting queue
    socket.on('join_queue', ({ userId, userName }) => {
      if (!isBangladeshNightService()) {
        return socket.emit('service_closed', { message: 'The night train is not yet in service. Boarding begins at 19:00 Bangladesh time.' });
      }

      // Remove from queue if already in
      const existing = waitingQueue.findIndex(p => p.socketId === socket.id);
      if (existing !== -1) waitingQueue.splice(existing, 1);

      // If already paired, leave pair first
      if (activePairs.has(socket.id)) {
        const partnerId = activePairs.get(socket.id);
        activePairs.delete(socket.id);
        activePairs.delete(partnerId);
        io.to(partnerId).emit('stranger_left', { message: 'Your fellow passenger has left the compartment.' });
      }

      // Try to match
      if (waitingQueue.length > 0) {
        const partner = waitingQueue.shift();
        const sessionId = uuidv4();

        activePairs.set(socket.id, partner.socketId);
        activePairs.set(partner.socketId, socket.id);
        sessionMap.set(socket.id, sessionId);
        sessionMap.set(partner.socketId, sessionId);

        sessionMessages.set(sessionId, []);
        socket.emit('matched', { sessionId, partnerSocketId: partner.socketId, message: 'A fellow passenger has entered your compartment. The journey begins.' });
        io.to(partner.socketId).emit('matched', { sessionId, partnerSocketId: socket.id, message: 'A fellow passenger has entered your compartment. The journey begins.' });
      } else {
        waitingQueue.push({ socketId: socket.id, userId, userName: userName || 'Anonymous Passenger' });
        socket.emit('waiting', { message: 'Waiting on the platform for a fellow passenger...' });
      }
    });

    // Send message
    socket.on('send_message', ({ text, type = 'text' }) => {
      const partnerId = activePairs.get(socket.id);
      if (!partnerId) return socket.emit('error_msg', { message: 'No active compartment found.' });
      if (!text || text.trim().length === 0) return;
      const sessionId = sessionMap.get(socket.id);
      const msg = {
        id: uuidv4(),
        text: text.trim().substring(0, 500),
        type,
        from: 'stranger',
        timestamp: new Date().toISOString()
      };
      if (sessionId) {
        const history = sessionMessages.get(sessionId) || [];
        history.push({ ...msg, senderSocketId: socket.id, receiverSocketId: partnerId });
        sessionMessages.set(sessionId, history.slice(-20));
      }
      io.to(partnerId).emit('receive_message', msg);
      socket.emit('message_sent', { ...msg, from: 'me' });
    });

    // Typing indicator
    socket.on('typing', (isTyping) => {
      const partnerId = activePairs.get(socket.id);
      if (partnerId) io.to(partnerId).emit('stranger_typing', isTyping);
    });

    // Leave chat
    socket.on('leave_chat', () => {
      handleLeave(socket.id);
    });

    // Song dedication
    socket.on('dedicate_song', ({ song }) => {
      const partnerId = activePairs.get(socket.id);
      if (!partnerId) return;
      io.to(partnerId).emit('song_dedicated', {
        song,
        message: 'Your fellow passenger dedicated a song for this journey.'
      });
      socket.emit('dedication_sent', { message: 'Song dedicated to your fellow passenger.' });
    });

    // Game invite
    socket.on('game_invite', ({ game }) => {
      const partnerId = activePairs.get(socket.id);
      if (!partnerId) return;
      io.to(partnerId).emit('game_invited', { game, from: socket.id });
    });

    // Game accept
    socket.on('game_accept', ({ game }) => {
      const partnerId = activePairs.get(socket.id);
      if (!partnerId) return;
      const sessionId = sessionMap.get(socket.id) || uuidv4();

      if (game === 'tictactoe') {
        const state = {
          board: Array(9).fill(null),
          turn: 'X',
          players: { X: partnerId, O: socket.id },
          winner: null,
          gameOver: false
        };
        gameStates.set(sessionId, state);
        io.to(partnerId).emit('game_started', { game, sessionId, symbol: 'X', state });
        socket.emit('game_started', { game, sessionId, symbol: 'O', state });
      } else if (game === 'wordguess') {
        const words = ['JOURNEY', 'STATION', 'PLATFORM', 'SIGNAL', 'COMPARTMENT', 'DEPARTURE', 'ARRIVAL', 'TICKET', 'PASSENGER', 'EXPRESS'];
        const word = words[Math.floor(Math.random() * words.length)];
        const state = {
          word,
          guessed: [],
          wrongGuesses: [],
          maxWrong: 6,
          gameOver: false,
          winner: null,
          guesser: socket.id
        };
        gameStates.set(sessionId, state);
        io.to(partnerId).emit('game_started', { game, sessionId, role: 'setter', word, state: { ...state, word: '?' } });
        socket.emit('game_started', { game, sessionId, role: 'guesser', state });
      }
    });

    // Game decline
    socket.on('game_decline', () => {
      const partnerId = activePairs.get(socket.id);
      if (partnerId) io.to(partnerId).emit('game_declined', { message: 'Your fellow passenger declined the game.' });
    });

    // Close game overlay without ending chat
    socket.on('game_close', ({ sessionId }) => {
      if (sessionId) gameStates.delete(sessionId);
      const partnerId = activePairs.get(socket.id);
      socket.emit('game_closed');
      if (partnerId) io.to(partnerId).emit('game_closed');
    });

    // Tictactoe move
    socket.on('ttt_move', ({ index, sessionId }) => {
      const state = gameStates.get(sessionId);
      if (!state || state.gameOver) return;
      const symbol = state.players.X === socket.id ? 'X' : 'O';
      if (state.turn !== symbol || state.board[index]) return;
      state.board[index] = symbol;
      const winner = checkTTTWinner(state.board);
      const isDraw = !winner && state.board.every(c => c);
      if (winner) { state.winner = winner; state.gameOver = true; }
      if (isDraw) { state.gameOver = true; state.winner = 'draw'; }
      state.turn = symbol === 'X' ? 'O' : 'X';
      gameStates.set(sessionId, state);
      const partnerId = activePairs.get(socket.id);
      socket.emit('ttt_update', state);
      if (partnerId) io.to(partnerId).emit('ttt_update', state);
    });

    // Word guess move
    socket.on('word_guess', ({ letter, sessionId }) => {
      const state = gameStates.get(sessionId);
      if (!state || state.gameOver || state.guesser !== socket.id) return;
      const l = letter.toUpperCase();
      if (state.guessed.includes(l)) return;
      state.guessed.push(l);
      if (!state.word.includes(l)) state.wrongGuesses.push(l);
      if (state.wrongGuesses.length >= state.maxWrong) { state.gameOver = true; state.winner = 'setter'; }
      else if (state.word.split('').every(c => state.guessed.includes(c))) { state.gameOver = true; state.winner = 'guesser'; }
      gameStates.set(sessionId, state);
      const partnerId = activePairs.get(socket.id);
      socket.emit('word_update', state);
      if (partnerId) io.to(partnerId).emit('word_update', state);
    });

    // Disconnect
    socket.on('disconnect', () => {
      handleLeave(socket.id);
      // Remove from queue
      const idx = waitingQueue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) waitingQueue.splice(idx, 1);
      sessionMap.delete(socket.id);
      console.log(`🚉 Passenger alighted: ${socket.id}`);
    });

    function handleLeave(socketId) {
      const partnerId = activePairs.get(socketId);
      if (partnerId) {
        io.to(partnerId).emit('stranger_left', {
          message: 'Your fellow passenger has alighted at a previous stop.'
        });
        activePairs.delete(partnerId);
      }
      activePairs.delete(socketId);
    }
  });

  function checkTTTWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
  }
};
