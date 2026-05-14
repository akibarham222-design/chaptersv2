/**
 * AAGONTUK EXPRESS — Backend Server
 * Node.js + Express
 * Run: node server.js
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ── DATA FILES (simple JSON file-based storage) ──────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function readJSON(file, fallback = []) {
  const p = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// Seed default settings
if (!fs.existsSync(path.join(DATA_DIR, 'settings.json'))) {
  writeJSON('settings.json', {
    aboutText: "Aagontuk Express is just a small night train on the internet. You come in, sit for a while, maybe talk to a stranger, maybe leave a confession, maybe just play a song in the background. Nothing too serious. No profile drama, no followers, no trying to look cool. Just a quiet little platform for random conversations and things people usually keep to themselves.",
    creatorName: "Creator",
    creatorBio: "Building quiet corners of the internet.",
    creatorPhoto: ""
  });
}

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'aagontuk-secret-key-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 3600 * 1000 } // 7 days
}));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ message: 'Not authenticated' });
}

function requireAdmin(req, res, next) {
  const users = readJSON('users.json');
  const user = users.find(u => u.id === req.session.userId);
  if (user && user.isAdmin) return next();
  res.status(403).json({ message: 'Forbidden' });
}

// ── AUTH ROUTES ───────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  const users = readJSON('users.json');
  if (users.find(u => u.email === email)) return res.status(400).json({ message: 'Email already registered.' });

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    email,
    password: hash,
    isAdmin: users.length === 0, // first user is admin
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeJSON('users.json', users);

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

  const users = readJSON('users.json');
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Me
app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not authenticated' });
  const users = readJSON('users.json');
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ message: 'User not found' });
  res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

// ── CONFESSIONS ───────────────────────────────────────────────

app.get('/api/confessions', (req, res) => {
  res.json(readJSON('confessions.json'));
});

app.post('/api/confessions', (req, res) => {
  const { from, to, message, song } = req.body;
  if (!from || !to || !message) return res.status(400).json({ message: 'From, To, Message required.' });

  const confessions = readJSON('confessions.json');
  const c = {
    id: Date.now().toString(),
    from, to, message,
    song: song || null,
    date: new Date().toISOString()
  };
  confessions.push(c);
  writeJSON('confessions.json', confessions);
  res.json(c);
});

app.delete('/api/confessions/:id', requireAdmin, (req, res) => {
  let confessions = readJSON('confessions.json');
  confessions = confessions.filter(c => c.id !== req.params.id);
  writeJSON('confessions.json', confessions);
  res.json({ ok: true });
});

// ── REPORTS ───────────────────────────────────────────────────

app.get('/api/reports', requireAdmin, (req, res) => {
  res.json(readJSON('reports.json'));
});

app.post('/api/reports', (req, res) => {
  const { reason, session: sessionId } = req.body;
  const reports = readJSON('reports.json');
  const r = {
    id: Date.now().toString(),
    reason,
    session: sessionId,
    date: new Date().toISOString(),
    resolved: false
  };
  reports.push(r);
  writeJSON('reports.json', reports);
  res.json(r);
});

app.patch('/api/reports/:id/resolve', requireAdmin, (req, res) => {
  const reports = readJSON('reports.json');
  const r = reports.find(r => r.id === req.params.id);
  if (r) r.resolved = true;
  writeJSON('reports.json', reports);
  res.json({ ok: true });
});

app.delete('/api/reports/:id', requireAdmin, (req, res) => {
  let reports = readJSON('reports.json');
  reports = reports.filter(r => r.id !== req.params.id);
  writeJSON('reports.json', reports);
  res.json({ ok: true });
});

// ── SETTINGS ─────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  res.json(readJSON('settings.json', {}));
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const allowed = ['aboutText', 'creatorName', 'creatorBio', 'creatorPhoto'];
  const current = readJSON('settings.json', {});
  allowed.forEach(k => { if (req.body[k] !== undefined) current[k] = req.body[k]; });
  writeJSON('settings.json', current);
  res.json({ ok: true });
});

// ── JOURNEY LOGS ──────────────────────────────────────────────

app.get('/api/logs', requireAuth, (req, res) => {
  const all = readJSON('logs.json');
  res.json(all.filter(l => l.userId === req.session.userId));
});

app.post('/api/logs', requireAuth, (req, res) => {
  const { excerpt } = req.body;
  const logs = readJSON('logs.json');
  const l = {
    id: Date.now().toString(),
    userId: req.session.userId,
    excerpt: excerpt || null,
    date: new Date().toISOString()
  };
  logs.push(l);
  writeJSON('logs.json', logs);
  res.json(l);
});

app.delete('/api/logs/:id', requireAuth, (req, res) => {
  let logs = readJSON('logs.json');
  logs = logs.filter(l => !(l.id === req.params.id && l.userId === req.session.userId));
  writeJSON('logs.json', logs);
  res.json({ ok: true });
});

// ── MODERATORS ───────────────────────────────────────────────

app.get('/api/admin/moderators', requireAdmin, (req, res) => {
  const users = readJSON('users.json');
  res.json(users.filter(u => u.isMod).map(u => ({ id: u.id, email: u.email })));
});

app.post('/api/admin/moderators', requireAdmin, (req, res) => {
  const { email } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.isMod = true;
  writeJSON('users.json', users);
  res.json({ ok: true });
});

// ── GOOGLE OAUTH (placeholder) ────────────────────────────────
// Replace with real passport-google-oauth20 config
app.get('/auth/google', (req, res) => {
  // TODO: Implement with passport-google-oauth20
  // For now redirect back with an error
  res.redirect('/auth.html?error=google_not_configured');
});

// ── SOCKET.IO — STRANGER MATCHING ────────────────────────────

const waitingPool = []; // sockets waiting for a match
const activeRooms = {}; // roomId -> [socketId, socketId]

io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.id}`);

  // Passenger wants to board
  socket.on('board', () => {
    if (waitingPool.includes(socket.id)) return;

    if (waitingPool.length > 0) {
      // Match with first waiting socket
      const partnerId = waitingPool.shift();
      const roomId = `room_${Date.now()}`;
      activeRooms[roomId] = [socket.id, partnerId];

      socket.join(roomId);
      io.sockets.sockets.get(partnerId)?.join(roomId);

      // Notify both
      io.to(roomId).emit('matched', { roomId });
    } else {
      waitingPool.push(socket.id);
      socket.emit('waiting');
    }
  });

  // Cancel boarding
  socket.on('cancel', () => {
    const idx = waitingPool.indexOf(socket.id);
    if (idx !== -1) waitingPool.splice(idx, 1);
  });

  // Chat message
  socket.on('message', ({ roomId, text }) => {
    socket.to(roomId).emit('message', { text });
  });

  // End chat
  socket.on('end', ({ roomId }) => {
    socket.to(roomId).emit('stranger_left');
    cleanRoom(roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const idx = waitingPool.indexOf(socket.id);
    if (idx !== -1) waitingPool.splice(idx, 1);

    // Notify partner if in room
    for (const [roomId, members] of Object.entries(activeRooms)) {
      if (members.includes(socket.id)) {
        socket.to(roomId).emit('stranger_left');
        cleanRoom(roomId);
        break;
      }
    }
    console.log(`[WS] Disconnected: ${socket.id}`);
  });

  function cleanRoom(roomId) {
    delete activeRooms[roomId];
  }
});

// ── CATCH-ALL — serve index.html ──────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ─────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  Aagontuk Express running on http://localhost:${PORT}\n`);
});
