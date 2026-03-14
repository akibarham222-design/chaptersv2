const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Bot Gemini keys — up to 5, named GEMINI_BOT_KEY_1 through GEMINI_BOT_KEY_5
// Falls back to GEMINI_API_KEY if no bot keys set
function getBotKeys() {
  const keys = [];
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GEMINI_BOT_KEY_${i}`];
    if (k) keys.push(k);
  }
  if (!keys.length && GEMINI_API_KEY) keys.push(GEMINI_API_KEY);
  return keys;
}
const INDEX_PATH    = path.join(__dirname, 'public', 'index.html');
const STAGED_PATH   = path.join(__dirname, 'public', 'index.staged.html');
const BACKUP_PATH   = path.join(__dirname, 'public', 'index.backup.html');

// Multer config — images only, max 5MB
const adStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'ad_' + Date.now() + ext);
  }
});
const adUpload = multer({
  storage: adStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Images only.'));
  }
});

const app = express();
const server = http.createServer(app);

// Only allow connections from our own domain — prevents other sites hijacking user sockets
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000');
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET','POST'] }
});

app.use(express.json({ limit: '50kb' }));
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Fix 3: Content-Security-Policy — restricts scripts/styles/connections to trusted sources only
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://itunes.apple.com https://oauth2.googleapis.com https://www.googleapis.com",
    "img-src 'self' data: https:",
    "frame-ancestors 'none'"
  ].join('; '));
  next();
});

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const confessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many confessions. Please wait an hour.' },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests.' },
});

app.use('/api/', generalLimiter);

// ─── Iconic Pair Pool ─────────────────────────────────────────────────────────

const PAIRS = [
  // Literature
  { a:'Frodo',      b:'Sam',        ref:'The Lord of the Rings',              bond:'Two friends who carried the weight of the world — one step at a time.' },
  { a:'Pip',        b:'Estella',    ref:'Great Expectations',                 bond:'A boy who loved a girl who did not know how to love back.' },
  { a:'Jo',         b:'Laurie',     ref:'Little Women',                       bond:'A writer and her neighbour — fire meeting warmth.' },
  { a:'Scout',      b:'Atticus',    ref:'To Kill a Mockingbird',              bond:'A daughter learning the world through her father\'s quiet courage.' },
  { a:'Ishmael',    b:'Ahab',       ref:'Moby Dick',                          bond:'A wanderer and an obsessed captain — one chasing meaning, one chasing the abyss.' },
  { a:'Dorian',     b:'Basil',      ref:'The Picture of Dorian Gray',         bond:'The painter gave him beauty. The portrait kept the truth.' },
  { a:'Holden',     b:'Phoebe',     ref:'The Catcher in the Rye',             bond:'A lost brother and the younger sister who still believed in him.' },
  { a:'Dante',      b:'Virgil',     ref:'The Divine Comedy',                  bond:'A soul descending into darkness — guided by the ghost of a poet.' },
  { a:'Jane',       b:'Rochester',  ref:'Jane Eyre',                          bond:'Plain and honest. Dark and haunted. Equal in soul.' },
  { a:'Heathcliff', b:'Catherine',  ref:'Wuthering Heights',                  bond:'Wildness recognising wildness. Love as a storm that destroys everything.' },
  { a:'Quixote',    b:'Sancho',     ref:'Don Quixote',                        bond:'The dreamer and the realist — neither complete without the other.' },
  { a:'Sherlock',   b:'Watson',     ref:'Sherlock Holmes',                    bond:'Genius needs a witness. Every mind needs a companion.' },
  { a:'Jekyll',     b:'Hyde',       ref:'Strange Case of Dr Jekyll and Mr Hyde', bond:'Two souls sharing one body — order and the chaos it was hiding.' },
  { a:'Raskolnikov',b:'Sonia',      ref:'Crime and Punishment',               bond:'A murderer and a saint. She followed him all the way to Siberia.' },
  { a:'Gatsby',     b:'Nick',       ref:'The Great Gatsby',                   bond:'The dreamer and the only honest witness to his dream — and its ruin.' },
  { a:'Bilbo',      b:'Gandalf',    ref:'The Hobbit',                         bond:'A comfortable homebody and a wizard who refused to let him stay comfortable.' },
  { a:'Edmond',     b:'Haydée',     ref:'The Count of Monte Cristo',          bond:'A man who became a legend, and the woman who loved the man beneath it.' },
  // Shakespeare
  { a:'Hamlet',     b:'Horatio',    ref:'Hamlet',                             bond:'A prince undone by grief — kept standing by the one friend who never lied.' },
  { a:'Viola',      b:'Sebastian',  ref:'Twelfth Night',                      bond:'Twins separated by a shipwreck, surviving by becoming someone else entirely.' },
  { a:'Rosalind',   b:'Celia',      ref:'As You Like It',                     bond:'Cousins who chose each other over court, over safety, over everything.' },
  { a:'Benedick',   b:'Beatrice',   ref:'Much Ado About Nothing',             bond:'Two people who argued their way all the way into loving each other.' },
  { a:'Prospero',   b:'Caliban',    ref:'The Tempest',                        bond:'A man who held power over another — and the complicated weight of that.' },
  { a:'Hamlet',     b:'Ophelia',    ref:'Hamlet',                             bond:'Two people undone by the same grief, in completely different ways.' },
  { a:'Macbeth',    b:'Banquo',     ref:'Macbeth',                            bond:'Once brothers in arms. Then ambition turned one of them into the other\'s ghost.' },
  { a:'Portia',     b:'Shylock',    ref:'The Merchant of Venice',             bond:'The sharpest mind in the room — disguised as someone no one expected.' },
  // More Film & Drama
  { a:'Elizabeth',  b:'Darcy',      ref:'Pride and Prejudice',                bond:'Two people who misjudged each other completely — then could not imagine anyone else.' },
  { a:'Anna',       b:'Vronsky',    ref:'Anna Karenina',                      bond:'A love that burned too bright to survive the world it was born into.' },
  { a:'Rick',       b:'Ilsa',       ref:'Casablanca',                         bond:'The right people at the wrong time. He let her go because he loved her.' },
  { a:'Tony',       b:'Maria',      ref:'West Side Story',                    bond:'Two worlds apart. One song between them. Not enough time.' },
  { a:'Inigo',      b:'Westley',    ref:'The Princess Bride',                 bond:'A man of revenge and a man of love — sharing the same impossible road.' },
  { a:'Michael',    b:'Kay',        ref:'The Godfather',                      bond:'She thought she knew him. By the end, she understood she never had.' },
  { a:'Newland',    b:'Ellen',      ref:'The Age of Innocence',               bond:'They loved each other perfectly — and never said a word about it.' },
  { a:'Abed',       b:'Troy',       ref:'Community',                          bond:'A friendship so specific, so warm, it became its own private language.' },
];

function pickTwoNames() {
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const flip = Math.random() < 0.5;
  return [
    flip ? pair.b : pair.a,
    flip ? pair.a : pair.b,
    pair.ref,
    pair.bond
  ];
}


// ─── Database ─────────────────────────────────────────────────────────────────

const db = new Database('chapters.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    account_a TEXT,
    account_b TEXT,
    chapter_a INTEGER,
    chapter_b INTEGER,
    name_a TEXT,
    name_b TEXT,
    started_at INTEGER DEFAULT (strftime('%s','now')),
    ended_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_account TEXT NOT NULL,
    reported_account TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    reason TEXT,
    read_at INTEGER,
    action_taken TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS banned_accounts (
    account_id TEXT PRIMARY KEY,
    banned_at INTEGER DEFAULT (strftime('%s','now')),
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT,
    sender_account TEXT,
    content TEXT,
    sent_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS confessions (
    id TEXT PRIMARY KEY,
    from_name TEXT NOT NULL,
    to_name TEXT NOT NULL,
    content TEXT NOT NULL,
    song_title TEXT,
    song_artist TEXT,
    song_url TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    token TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    link_url TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS staging (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migrate existing accounts table — safe no-op if columns already exist
try { db.prepare('ALTER TABLE accounts ADD COLUMN email TEXT').run(); } catch {}
try { db.prepare('ALTER TABLE accounts ADD COLUMN email_verified INTEGER DEFAULT 0').run(); } catch {}
try { db.prepare('ALTER TABLE accounts ADD COLUMN oauth_provider TEXT').run(); } catch {}
try { db.prepare('ALTER TABLE accounts ADD COLUMN oauth_id TEXT').run(); } catch {}
try { db.prepare('ALTER TABLE accounts ADD COLUMN is_admin INTEGER DEFAULT 0').run(); } catch {}
try { db.prepare('ALTER TABLE accounts ADD COLUMN is_moderator INTEGER DEFAULT 0').run(); } catch {}
try { db.prepare('ALTER TABLE confessions ADD COLUMN poster_account_id TEXT').run(); } catch {}
try { db.prepare('ALTER TABLE confessions ADD COLUMN status TEXT DEFAULT \'approved\'').run(); } catch {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

function getAccountByToken(token) {
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(`
    SELECT a.* FROM accounts a
    JOIN auth_tokens t ON t.account_id = a.id
    LEFT JOIN banned_accounts b ON b.account_id = a.id
    WHERE t.token = ? AND t.expires_at > ? AND b.account_id IS NULL
  `).get(token, now);
  return row || null;
}

function getChapterNumber(accountId) {
  const r = db.prepare(`SELECT COUNT(*) as c FROM conversations WHERE account_a = ? OR account_b = ?`).get(accountId, accountId);
  return (r?.c || 0) + 1;
}

function createConversation(accA, accB) {
  const id = uuidv4();
  const [nameA, nameB, pairRef, pairBond] = pickTwoNames();
  // Use a transaction so chapter numbers are assigned atomically
  const info = db.transaction(() => {
    const cA = getChapterNumber(accA);
    const cB = getChapterNumber(accB);
    db.prepare(`INSERT INTO conversations (id, account_a, account_b, chapter_a, chapter_b, name_a, name_b) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, accA, accB, cA, cB, nameA, nameB);
    return { cA, cB };
  })();
  return { id, chapterA: info.cA, chapterB: info.cB, nameA, nameB, pairRef, pairBond };
}

function endConversation(id) {
  db.prepare(`UPDATE conversations SET ended_at = strftime('%s','now') WHERE id = ?`).run(id);
}

function saveMessage(convId, senderAcc, content) {
  db.prepare(`INSERT INTO messages (conversation_id, sender_account, content) VALUES (?, ?, ?)`).run(convId, senderAcc, sanitize(content));
}

function getHistory(accountId) {
  const convs = db.prepare(`
    SELECT *, CASE WHEN account_a = ? THEN chapter_a ELSE chapter_b END as my_chapter
    FROM conversations WHERE account_a = ? OR account_b = ? ORDER BY started_at DESC
  `).all(accountId, accountId, accountId);

  return convs.map(conv => {
    const isA = conv.account_a === accountId;
    const myName = isA ? conv.name_a : conv.name_b;
    const theirName = isA ? conv.name_b : conv.name_a;
    const msgs = db.prepare(`
      SELECT *, CASE WHEN sender_account = ? THEN 'you' ELSE 'stranger' END as sender
      FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC
    `).all(accountId, conv.id);
    return {
      id: conv.id, chapter: conv.my_chapter,
      myName, theirName,
      startedAt: conv.started_at * 1000,
      endedAt: conv.ended_at ? conv.ended_at * 1000 : null,
      messageCount: msgs.length, preview: msgs[0]?.content || '',
      messages: msgs.map(m => ({ sender: m.sender, content: m.content, sentAt: m.sent_at * 1000 }))
    };
  });
}

// ─── Email Verification ───────────────────────────────────────────────────────

async function sendVerificationEmail(email, username, verifyToken) {
  const APP_URL = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  const link = `${APP_URL}/api/verify-email?token=${verifyToken}`;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_KEY) {
    // Development fallback — print link to console
    console.log(`\n  📧 Verify email for ${username}: ${link}\n`);
    return;
  }

  const html = `
<!DOCTYPE html><html><body style="background:#0c0b09;color:#f0e8d5;font-family:Georgia,serif;padding:40px 20px;max-width:480px;margin:0 auto;">
  <p style="font-size:11px;letter-spacing:3px;color:#6b5020;text-transform:uppercase;margin-bottom:24px;">Chapters</p>
  <h1 style="font-size:32px;font-weight:300;color:#f0e8d5;margin-bottom:8px;">Verify your email</h1>
  <p style="font-size:16px;color:#c8b898;font-style:italic;margin-bottom:32px;">One step before your anthology begins, ${username}.</p>
  <a href="${link}" style="display:inline-block;padding:14px 36px;border:1px solid #6b5020;color:#c4973e;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,serif;">Verify &amp; Enter →</a>
  <p style="margin-top:32px;font-size:11px;color:#4a3e2a;">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
</body></html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Chapters <noreply@resend.dev>',
        to: email,
        subject: 'Verify your Chapters account',
        html
      })
    });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}

// ─── OAuth Helpers ────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'n.i.farhan44@gmail.com';

function oauthCreateOrFind(oauthProvider, oauthId, email, displayName) {
  // Check existing OAuth account
  const existing = db.prepare('SELECT * FROM accounts WHERE oauth_provider = ? AND oauth_id = ?').get(oauthProvider, oauthId);
  if (existing) {
    // Auto-grant admin if this is the admin email
    if (email === ADMIN_EMAIL && !existing.is_admin) {
      db.prepare('UPDATE accounts SET is_admin = 1 WHERE id = ?').run(existing.id);
    }
    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    db.prepare('INSERT INTO auth_tokens (token, account_id, expires_at) VALUES (?, ?, ?)').run(token, existing.id, expiresAt);
    return { token, username: existing.username, isNew: false };
  }

  // Generate a clean username from display name
  let base = (displayName || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_').slice(0, 16);
  if (base.length < 3) base = 'user_' + base;
  let username = base;
  let suffix = 1;
  while (db.prepare('SELECT id FROM accounts WHERE username = ?').get(username)) {
    username = base + '_' + suffix++;
    if (suffix > 9999) username = base + '_' + uuidv4().slice(0, 6);
  }

  const id = uuidv4();
  const isAdmin = email === ADMIN_EMAIL ? 1 : 0;
  db.prepare('INSERT INTO accounts (id, username, password_hash, email, email_verified, oauth_provider, oauth_id, is_admin) VALUES (?, ?, ?, ?, 1, ?, ?, ?)')
    .run(id, username, '', email || '', oauthProvider, oauthId, isAdmin);

  const token = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
  db.prepare('INSERT INTO auth_tokens (token, account_id, expires_at) VALUES (?, ?, ?)').run(token, id, expiresAt);
  return { token, username, isNew: true };
}

function oauthRedirectSuccess(res, token, username) {
  res.redirect(`/auth.html?oauth_token=${encodeURIComponent(token)}&oauth_user=${encodeURIComponent(username)}`);
}

function oauthRedirectError(res, msg) {
  res.redirect(`/auth.html?oauth_error=${encodeURIComponent(msg || 'Login failed')}`);
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

app.get('/api/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(501).json({ error: 'Google OAuth not configured.' });
  const APP_URL = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return oauthRedirectError(res, 'Google login was cancelled.');
  const APP_URL = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return oauthRedirectError(res, 'Google auth failed.');

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();
    if (!user.id) return oauthRedirectError(res, 'Could not get Google profile.');

    const { token, username } = oauthCreateOrFind('google', user.id, user.email, user.given_name || user.name);
    oauthRedirectSuccess(res, token, username);
  } catch (e) {
    console.error('Google OAuth error:', e.message);
    oauthRedirectError(res, 'Google login error.');
  }
});

// ─── Email Verification Route ─────────────────────────────────────────────────

app.get('/api/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/auth.html?verified=fail');
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare('SELECT * FROM email_verifications WHERE token = ? AND expires_at > ?').get(token, now);
  if (!row) return res.redirect('/auth.html?verified=fail');
  db.prepare('UPDATE accounts SET email_verified = 1 WHERE id = ?').run(row.account_id);
  db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
  res.redirect('/auth.html?verified=success');
});

app.post('/api/resend-verification', authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  const e = email.trim().toLowerCase();
  const account = db.prepare('SELECT * FROM accounts WHERE email = ? AND email_verified = 0 AND oauth_provider IS NULL').get(e);
  if (!account) return res.json({ ok: true }); // silent — don't reveal whether email exists
  // Delete old tokens for this account and issue a fresh one
  db.prepare('DELETE FROM email_verifications WHERE account_id = ?').run(account.id);
  const verifyToken = uuidv4();
  const verifyExpires = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
  db.prepare('INSERT INTO email_verifications (token, account_id, expires_at) VALUES (?, ?, ?)').run(verifyToken, account.id, verifyExpires);
  sendVerificationEmail(e, account.username, verifyToken);
  res.json({ ok: true });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/register', authLimiter, async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email address is required.' });
  const u = username.trim();
  const e = email.trim().toLowerCase();
  if (u.length < 3 || u.length > 20) return res.status(400).json({ error: 'Username must be 3-20 characters.' });
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return res.status(400).json({ error: 'Only letters, numbers and underscores.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return res.status(400).json({ error: 'Password needs at least one uppercase letter and one number.' });

  const existing = db.prepare('SELECT id FROM accounts WHERE username = ?').get(u);
  if (existing) {
    const adj = ['cool','dear','calm','soft','true','wild','wise','brave','kind','real','dark','lost','free','lone','quiet'];
    const num = () => Math.floor(Math.random()*900)+100;
    const candidates = [
      u + '_' + num(),
      u + num(),
      adj[Math.floor(Math.random()*adj.length)] + '_' + u,
      u + '_' + adj[Math.floor(Math.random()*adj.length)],
      u + '_' + num(),
      '_' + u + num(),
    ];
    const suggestions = candidates.filter(s => s.length <= 20 && !db.prepare('SELECT id FROM accounts WHERE username = ?').get(s)).slice(0, 4);
    return res.status(409).json({ error: 'Username already taken.', suggestions });
  }
  const emailTaken = db.prepare('SELECT id FROM accounts WHERE email = ?').get(e);
  if (emailTaken) return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  db.prepare('INSERT INTO accounts (id, username, password_hash, email, email_verified) VALUES (?, ?, ?, ?, 1)').run(id, u, hash, e);

  // Issue token immediately — no email verification required
  const token = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
  db.prepare('INSERT INTO auth_tokens (token, account_id, expires_at) VALUES (?, ?, ?)').run(token, id, expiresAt);

  res.json({ token, username: u, id });
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const account = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username.trim());
  if (!account) return res.status(401).json({ error: 'Invalid credentials.' });
  if (account.oauth_provider) return res.status(400).json({ error: `This account uses ${account.oauth_provider} login. Please sign in with ${account.oauth_provider}.` });

  const match = await bcrypt.compare(password, account.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

  const banned = db.prepare('SELECT 1 FROM banned_accounts WHERE account_id = ?').get(account.id);
  if (banned) return res.status(403).json({ error: 'This account has been suspended.' });

  const token = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
  db.prepare('INSERT INTO auth_tokens (token, account_id, expires_at) VALUES (?, ?, ?)').run(token, account.id, expiresAt);
  res.json({ token, username: account.username, id: account.id });
});

app.get('/api/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token.' });
  const account = getAccountByToken(token);
  if (!account) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  res.json({ username: account.username, id: account.id, is_admin: account.is_admin || 0, is_moderator: account.is_moderator || 0 });
});

// Bot Gemini keys — served only to authenticated users
app.get('/api/bot-config', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ keys: [] });
  const account = getAccountByToken(token);
  if (!account) return res.status(401).json({ keys: [] });
  res.json({ keys: getBotKeys() });
});

// Get all confessions (newest first, paginated)
app.get('/api/confessions', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  // Check if admin
  const token2 = req.headers.authorization?.replace('Bearer ', '');
  const acc2 = token2 ? getAccountByToken(token2) : null;
  const isAdmin2 = acc2 && acc2.is_admin;
  const whereStatus = isAdmin2 ? '' : "WHERE status = 'approved'";
  const rows = db.prepare(`SELECT * FROM confessions ${whereStatus} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM confessions ${whereStatus}`).get().c;
  res.json({ confessions: rows, total, page });
});

// Search confessions by from_name or to_name
app.get('/api/confessions/search', (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 1) return res.json({ confessions: [] });
  if (q.length > 100) return res.json({ confessions: [] });
  const pattern = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM confessions
    WHERE (from_name LIKE ? OR to_name LIKE ?) AND status = 'approved'
    ORDER BY created_at DESC LIMIT 50
  `).all(pattern, pattern);
  res.json({ confessions: rows });
});

// Post a confession (requires auth)
app.post('/api/confessions', confessionLimiter, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Sign in to post a confession.' });
  const account = getAccountByToken(token);
  if (!account) return res.status(401).json({ error: 'Session expired.' });

  const { from_name, to_name, content, song_title, song_artist, song_url } = req.body;
  if (!from_name || !to_name || !content) return res.status(400).json({ error: 'From, To and confession are required.' });
  if (from_name.trim().length > 60) return res.status(400).json({ error: 'From name too long.' });
  if (to_name.trim().length > 60) return res.status(400).json({ error: 'To name too long.' });
  if (content.trim().length > 500) return res.status(400).json({ error: 'Confession too long (max 500 characters).' });
  if (content.trim().length < 10) return res.status(400).json({ error: 'Confession too short.' });

  const id = uuidv4();

  let safeSongUrl = null;
  if (song_url) {
    try {
      const parsed = new URL(song_url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        safeSongUrl = song_url.slice(0, 512); // max length
      }
    } catch { /* invalid URL, ignore */ }
  }

  db.prepare(`
    INSERT INTO confessions (id, from_name, to_name, content, song_title, song_artist, song_url, status, poster_account_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id,
    sanitize(from_name.trim()),
    sanitize(to_name.trim()),
    sanitize(content.trim()),
    song_title ? sanitize(song_title).slice(0, 200) : null,
    song_artist ? sanitize(song_artist).slice(0, 200) : null,
    safeSongUrl,
    account.id
  );

  // Broadcast new confession to all connected clients
  io.emit('new_confession', { id });
  res.json({ success: true, id });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

const waitingQueue = [];
const activeChats = new Map();
const socketMsgCount = new Map(); // socket.id -> {count, resetAt}

function socketRateOk(socketId) {
  const now = Date.now();
  const s = socketMsgCount.get(socketId) || { count: 0, resetAt: now + 10000 };
  if (now > s.resetAt) { s.count = 0; s.resetAt = now + 10000; }
  s.count++;
  socketMsgCount.set(socketId, s);
  return s.count <= 20; // max 20 messages per 10 seconds
}

io.on('connection', (socket) => {
  socket.on('auth', ({ token }) => {
    const account = getAccountByToken(token);
    if (!account) { socket.emit('auth_error'); return; }
    // Double check ban
    const banned = db.prepare(`SELECT 1 FROM banned_accounts WHERE account_id = ?`).get(account.id);
    if (banned) { socket.emit('auth_error'); return; }
    socket.accountId = account.id;
    socket.username = account.username;
    socket.emit('authed', { username: account.username });
    socket.emit('history', getHistory(account.id));
    io.emit('online_count', io.engine.clientsCount);
  });

  socket.on('find_stranger', () => {
    if (!socket.accountId || activeChats.has(socket.id)) return;
    const existing = waitingQueue.findIndex(q => q.socketId === socket.id);
    if (existing !== -1) waitingQueue.splice(existing, 1);

    const partner = waitingQueue.find(q => q.accountId !== socket.accountId);
    if (partner) {
      const idx = waitingQueue.indexOf(partner);
      waitingQueue.splice(idx, 1);
      const ps = io.sockets.sockets.get(partner.socketId);
      if (!ps?.connected) { waitingQueue.push({ socketId: socket.id, accountId: socket.accountId }); socket.emit('waiting'); return; }

      const conv = createConversation(socket.accountId, partner.accountId);
      activeChats.set(socket.id, { partnerId: partner.socketId, convId: conv.id, chapter: conv.chapterA, myName: conv.nameA, theirName: conv.nameB, partnerAccountId: partner.accountId });
      activeChats.set(partner.socketId, { partnerId: socket.id, convId: conv.id, chapter: conv.chapterB, myName: conv.nameB, theirName: conv.nameA, partnerAccountId: socket.accountId });
      socket.emit('matched', { chapter: conv.chapterA, myName: conv.nameA, theirName: conv.nameB, pairRef: conv.pairRef, pairBond: conv.pairBond });
      ps.emit('matched', { chapter: conv.chapterB, myName: conv.nameB, theirName: conv.nameA, pairRef: conv.pairRef, pairBond: conv.pairBond });
    } else {
      waitingQueue.push({ socketId: socket.id, accountId: socket.accountId });
      socket.emit('waiting');
    }
  });

  socket.on('message', ({ content }) => {
    const chat = activeChats.get(socket.id);
    if (!chat || !content) return;
    if (!socketRateOk(socket.id)) return;
    const clean = sanitize(content.trim());
    if (clean.length === 0 || clean.length > 4000) return;
    saveMessage(chat.convId, socket.accountId, clean);
    const p = io.sockets.sockets.get(chat.partnerId);
    if (p?.connected) p.emit('message', { content: clean });
    socket.emit('message_sent', { content: clean });
  });

  socket.on('typing', () => { const p = io.sockets.sockets.get(activeChats.get(socket.id)?.partnerId); if (p?.connected) p.emit('stranger_typing'); });
  socket.on('stop_typing', () => { const p = io.sockets.sockets.get(activeChats.get(socket.id)?.partnerId); if (p?.connected) p.emit('stranger_stop_typing'); });
  socket.on('report', ({ reason }) => {
    const chat = activeChats.get(socket.id);
    if (!chat || !socket.accountId) return;
    const existing = db.prepare(`SELECT id FROM reports WHERE reporter_account=? AND conversation_id=?`).get(socket.accountId, chat.convId);
    if (existing) { socket.emit('report_result', { error: 'Already reported.' }); return; }
    db.prepare(`INSERT INTO reports (id, reporter_account, reported_account, conversation_id, reason) VALUES (?,?,?,?,?)`)
      .run(uuidv4(), socket.accountId, chat.partnerAccountId, chat.convId, sanitize(reason || 'No reason given'));
    socket.emit('report_result', { success: true });
  });

  // ── Game relay events (server just forwards, no state validation) ────────
  socket.on('game_invite', ({ gameType }) => {
    const chat = activeChats.get(socket.id);
    if (!chat) return;
    const p = io.sockets.sockets.get(chat.partnerId);
    if (p?.connected) p.emit('game_invite', { gameType });
  });
  socket.on('game_response', ({ accepted, gameType }) => {
    const chat = activeChats.get(socket.id);
    if (!chat) return;
    const p = io.sockets.sockets.get(chat.partnerId);
    if (p?.connected) p.emit('game_response', { accepted, gameType });
  });
  socket.on('game_action', (data) => {
    const chat = activeChats.get(socket.id);
    if (!chat) return;
    const p = io.sockets.sockets.get(chat.partnerId);
    if (p?.connected) p.emit('game_action', data);
  });

  socket.on('leave_chat', () => handleLeave(socket));
  socket.on('cancel_search', () => { const i = waitingQueue.findIndex(q => q.socketId === socket.id); if (i !== -1) waitingQueue.splice(i, 1); socket.emit('search_cancelled'); });
  socket.on('get_history', () => { if (socket.accountId) socket.emit('history', getHistory(socket.accountId)); });

  socket.on('disconnect', () => {
    const i = waitingQueue.findIndex(q => q.socketId === socket.id);
    if (i !== -1) waitingQueue.splice(i, 1);
    handleLeave(socket);
    socketMsgCount.delete(socket.id);
    io.emit('online_count', io.engine.clientsCount);
  });

  function handleLeave(socket) {
    const chat = activeChats.get(socket.id);
    if (!chat) return;
    endConversation(chat.convId);
    const p = io.sockets.sockets.get(chat.partnerId);
    if (p?.connected) { p.emit('stranger_left'); activeChats.delete(chat.partnerId); if (p.accountId) p.emit('history', getHistory(p.accountId)); }
    activeChats.delete(socket.id);
    if (socket.accountId) socket.emit('history', getHistory(socket.accountId));
  }
});

// Clean expired tokens daily
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  db.prepare('DELETE FROM auth_tokens WHERE expires_at < ?').run(now);
}, 24 * 60 * 60 * 1000);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chapters-admin-2024';

// Fix 2: Rate limit admin endpoints — prevents brute-forcing the admin password
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many admin attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const crypto = require('crypto');

function adminAuth(req, res, next) {
  const pass = req.headers['x-admin-password'] || '';
  // Constant-time comparison — prevents timing attacks on the password
  const passBuffer = Buffer.from(pass.padEnd(ADMIN_PASSWORD.length));
  const expectedBuffer = Buffer.from(ADMIN_PASSWORD);
  const match = passBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(passBuffer, expectedBuffer);
  if (!match) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

// Stats overview
app.get('/admin/api/stats', adminLimiter, adminAuth, (req, res) => {
  const totalUsers    = db.prepare(`SELECT COUNT(*) as c FROM accounts`).get().c;
  const totalChats    = db.prepare(`SELECT COUNT(*) as c FROM conversations`).get().c;
  const totalMessages = db.prepare(`SELECT COUNT(*) as c FROM messages`).get().c;
  const totalReports  = db.prepare(`SELECT COUNT(*) as c FROM reports`).get().c;
  const unreadReports = db.prepare(`SELECT COUNT(*) as c FROM reports WHERE read_at IS NULL`).get().c;
  const bannedUsers   = db.prepare(`SELECT COUNT(*) as c FROM banned_accounts`).get().c;
  const todayStart    = Math.floor(new Date().setHours(0,0,0,0) / 1000);
  const todayUsers    = db.prepare(`SELECT COUNT(*) as c FROM accounts WHERE created_at >= ?`).get(todayStart).c;
  const todayChats    = db.prepare(`SELECT COUNT(*) as c FROM conversations WHERE started_at >= ?`).get(todayStart).c;
  const todayReports  = db.prepare(`SELECT COUNT(*) as c FROM reports WHERE created_at >= ?`).get(todayStart).c;
  res.json({ totalUsers, totalChats, totalMessages, totalReports, unreadReports, bannedUsers, todayUsers, todayChats, todayReports });
});

// All reports paginated
app.get('/admin/api/reports', adminLimiter, adminAuth, (req, res) => {
  const VALID_FILTERS = ['all', 'unread', 'read'];
  const filter = VALID_FILTERS.includes(req.query.filter) ? req.query.filter : 'all';
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  let where = '';
  if (filter === 'unread') where = 'WHERE r.read_at IS NULL';
  if (filter === 'read')   where = 'WHERE r.read_at IS NOT NULL';

  const reports = db.prepare(`
    SELECT r.*,
      rep.username as reporter_name,
      rpd.username as reported_name,
      CASE WHEN b.account_id IS NOT NULL THEN 1 ELSE 0 END as is_banned
    FROM reports r
    LEFT JOIN accounts rep ON rep.id = r.reporter_account
    LEFT JOIN accounts rpd ON rpd.id = r.reported_account
    LEFT JOIN banned_accounts b ON b.account_id = r.reported_account
    ${where}
    ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM reports ${where}`).get().c;
  res.json({ reports, total, page });
});

// Get conversation messages for a report
app.get('/admin/api/conversation/:id', adminLimiter, adminAuth, (req, res) => {
  const msgs = db.prepare(`
    SELECT m.*, a.username FROM messages m
    LEFT JOIN accounts a ON a.id = m.sender_account
    WHERE m.conversation_id = ? ORDER BY m.sent_at ASC
  `).all(req.params.id);
  const conv = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(req.params.id);
  res.json({ messages: msgs, conversation: conv });
});

// Mark report as read
app.post('/admin/api/reports/:id/read', adminLimiter, adminAuth, (req, res) => {
  db.prepare(`UPDATE reports SET read_at = strftime('%s','now'), action_taken = ? WHERE id = ?`)
    .run(req.body.action || 'reviewed', req.params.id);
  res.json({ success: true });
});

// Ban user
app.post('/admin/api/ban/:accountId', adminLimiter, adminAuth, (req, res) => {
  const { accountId } = req.params;
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(accountId);
  if (!acc) return res.status(404).json({ error: 'User not found.' });
  db.prepare(`INSERT OR IGNORE INTO banned_accounts (account_id, reason) VALUES (?, ?)`)
    .run(accountId, req.body.reason || 'Banned by admin');
  // Invalidate all tokens
  db.prepare(`DELETE FROM auth_tokens WHERE account_id = ?`).run(accountId);
  // Mark all their reports as actioned
  db.prepare(`UPDATE reports SET action_taken = 'banned', read_at = strftime('%s','now') WHERE reported_account = ? AND read_at IS NULL`).run(accountId);
  res.json({ success: true, username: acc.username });
});

// Unban user
app.post('/admin/api/unban/:accountId', adminLimiter, adminAuth, (req, res) => {
  db.prepare(`DELETE FROM banned_accounts WHERE account_id = ?`).run(req.params.accountId);
  res.json({ success: true });
});

// All users
app.get('/admin/api/users', adminLimiter, adminAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;
  const q = req.query.q || '';
  const users = db.prepare(`
    SELECT a.*, 
      CASE WHEN b.account_id IS NOT NULL THEN 1 ELSE 0 END as is_banned,
      (SELECT COUNT(*) FROM reports WHERE reported_account = a.id) as report_count,
      (SELECT COUNT(*) FROM conversations WHERE account_a = a.id OR account_b = a.id) as chat_count
    FROM accounts a
    LEFT JOIN banned_accounts b ON b.account_id = a.id
    WHERE a.username LIKE ?
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(`%${q}%`, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM accounts WHERE username LIKE ?`).get(`%${q}%`).c;
  res.json({ users, total, page });
});

// ─── In-app Admin/Mod API ─────────────────────────────────────────────────────
function inAppAdminAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  const account = getAccountByToken(token);
  if (!account || !account.is_admin) return res.status(403).json({ error: 'Admin only.' });
  req.adminAccount = account;
  next();
}

function inAppModAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  const account = getAccountByToken(token);
  if (!account || (!account.is_admin && !account.is_moderator)) return res.status(403).json({ error: 'Not authorized.' });
  req.adminAccount = account;
  req.isFullAdmin = !!account.is_admin;
  next();
}

// Get pending confessions — mods + admin
app.get('/api/admin/confessions/pending', inAppModAuth, (req, res) => {
  const rows = db.prepare(`SELECT c.*, a.email as poster_email, a.username as poster_username
    FROM confessions c LEFT JOIN accounts a ON a.id = c.poster_account_id
    WHERE c.status = 'pending' ORDER BY c.created_at ASC`).all();
  // Strip email from moderator view
  const out = rows.map(r => {
    if (!req.isFullAdmin) { delete r.poster_email; }
    return r;
  });
  res.json({ confessions: out });
});

// Get all confessions — mods + admin
app.get('/api/admin/confessions/all', inAppModAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;
  const rows = db.prepare(`SELECT c.*, a.email as poster_email, a.username as poster_username
    FROM confessions c LEFT JOIN accounts a ON a.id = c.poster_account_id
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM confessions`).get().c;
  const out = rows.map(r => { if (!req.isFullAdmin) delete r.poster_email; return r; });
  res.json({ confessions: out, total, page });
});

// Approve confession — mods + admin
app.post('/api/admin/confessions/:id/approve', inAppModAuth, (req, res) => {
  db.prepare(`UPDATE confessions SET status = 'approved' WHERE id = ?`).run(req.params.id);
  io.emit('new_confession');
  res.json({ success: true });
});

// Reject confession — mods + admin
app.post('/api/admin/confessions/:id/reject', inAppModAuth, (req, res) => {
  db.prepare(`UPDATE confessions SET status = 'rejected' WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// Delete confession — ADMIN ONLY
app.delete('/api/admin/confessions/:id', inAppAdminAuth, (req, res) => {
  db.prepare(`DELETE FROM confessions WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// Get reports — mods + admin
app.get('/api/admin/reports', inAppModAuth, (req, res) => {
  const reports = db.prepare(`
    SELECT r.*,
      rep.username as reporter_name, rep.email as reporter_email,
      rpd.username as reported_name, rpd.email as reported_email,
      CASE WHEN b.account_id IS NOT NULL THEN 1 ELSE 0 END as is_banned
    FROM reports r
    LEFT JOIN accounts rep ON rep.id = r.reporter_account
    LEFT JOIN accounts rpd ON rpd.id = r.reported_account
    LEFT JOIN banned_accounts b ON b.account_id = r.reported_account
    ORDER BY r.created_at DESC LIMIT 50
  `).all();
  const out = reports.map(r => {
    if (!req.isFullAdmin) { delete r.reporter_email; delete r.reported_email; }
    return r;
  });
  res.json({ reports: out });
});

// Ban user — mods + admin
app.post('/api/admin/ban/:accountId', inAppModAuth, (req, res) => {
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(req.params.accountId);
  if (!acc) return res.status(404).json({ error: 'User not found.' });
  if (acc.is_admin) return res.status(400).json({ error: 'Cannot ban admin.' });
  db.prepare(`INSERT OR IGNORE INTO banned_accounts (account_id, reason) VALUES (?, ?)`).run(req.params.accountId, 'Banned by admin');
  db.prepare(`DELETE FROM auth_tokens WHERE account_id = ?`).run(req.params.accountId);
  res.json({ success: true, username: acc.username });
});

// Unban user — ADMIN ONLY
app.post('/api/admin/unban/:accountId', inAppAdminAuth, (req, res) => {
  db.prepare(`DELETE FROM banned_accounts WHERE account_id = ?`).run(req.params.accountId);
  res.json({ success: true });
});

// Mark report read — mods + admin
app.post('/api/admin/reports/:id/read', inAppModAuth, (req, res) => {
  db.prepare(`UPDATE reports SET read_at = strftime('%s','now') WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// Search users by email or username — ADMIN ONLY
app.get('/api/admin/users/search', inAppAdminAuth, (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ users: [] });
  const pattern = '%' + q + '%';
  const users = db.prepare(`
    SELECT a.id, a.username, a.email, a.created_at,
      a.is_moderator,
      CASE WHEN b.account_id IS NOT NULL THEN 1 ELSE 0 END as is_banned
    FROM accounts a
    LEFT JOIN banned_accounts b ON b.account_id = a.id
    WHERE (a.username LIKE ? OR a.email LIKE ?) AND a.is_admin = 0
    LIMIT 10
  `).all(pattern, pattern);
  res.json({ users });
});

// All members paginated + real-time search — ADMIN ONLY
app.get('/api/admin/members', inAppAdminAuth, (req, res) => {
  const q = (req.query.q || '').trim();
  const page = parseInt(req.query.page) || 1;
  const limit = 25;
  const offset = (page - 1) * limit;
  const pattern = '%' + q + '%';
  const where = q.length > 0 ? 'WHERE (a.username LIKE ? OR a.email LIKE ?)' : '';
  const params = q.length > 0 ? [pattern, pattern, limit, offset] : [limit, offset];
  const users = db.prepare(`
    SELECT a.id, a.username, a.email, a.created_at, a.is_moderator, a.oauth_provider,
      CASE WHEN b.account_id IS NOT NULL THEN 1 ELSE 0 END as is_banned,
      (SELECT COUNT(*) FROM conversations WHERE account_a = a.id OR account_b = a.id) as chat_count,
      (SELECT COUNT(*) FROM reports WHERE reported_account = a.id) as report_count
    FROM accounts a
    LEFT JOIN banned_accounts b ON b.account_id = a.id
    ${where}
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...params);
  const total = q.length > 0
    ? db.prepare(`SELECT COUNT(*) as c FROM accounts a WHERE (a.username LIKE ? OR a.email LIKE ?)`).get(pattern, pattern).c
    : db.prepare(`SELECT COUNT(*) as c FROM accounts`).get().c;
  res.json({ users, total, page });
});

// Grant moderator — ADMIN ONLY
app.post('/api/admin/mod/grant/:accountId', inAppAdminAuth, (req, res) => {
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(req.params.accountId);
  if (!acc) return res.status(404).json({ error: 'User not found.' });
  db.prepare(`UPDATE accounts SET is_moderator = 1 WHERE id = ?`).run(req.params.accountId);
  res.json({ success: true, username: acc.username });
});

// Revoke moderator — ADMIN ONLY
app.post('/api/admin/mod/revoke/:accountId', inAppAdminAuth, (req, res) => {
  db.prepare(`UPDATE accounts SET is_moderator = 0 WHERE id = ?`).run(req.params.accountId);
  res.json({ success: true });
});

// List all moderators — ADMIN ONLY
app.get('/api/admin/moderators', inAppAdminAuth, (req, res) => {
  const mods = db.prepare(`SELECT id, username, email, created_at FROM accounts WHERE is_moderator = 1`).all();
  res.json({ moderators: mods });
});

// ── Ad Routes ─────────────────────────────────────────────────────────────────

// Public — get current active ad (shown after login)
app.get('/api/ad', (req, res) => {
  const ad = db.prepare(`SELECT * FROM ads ORDER BY created_at DESC LIMIT 1`).get();
  res.json({ ad: ad || null });
});

// Admin — upload image from device
app.post('/api/admin/ad/upload', inAppAdminAuth, (req, res) => {
  adUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const url = '/uploads/' + req.file.filename;
    res.json({ success: true, url });
  });
});

// Admin — post new ad (image URL + optional link)
app.post('/api/admin/ad', inAppAdminAuth, (req, res) => {
  const { image_url, link_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'Image URL required.' });
  // Allow relative paths (from device upload) or full URLs
  if (!image_url.startsWith('/uploads/')) {
    try { new URL(image_url); } catch { return res.status(400).json({ error: 'Invalid image URL.' }); }
  }
  // Only one active ad at a time — clear old ones
  db.prepare(`DELETE FROM ads`).run();
  const id = uuidv4();
  db.prepare(`INSERT INTO ads (id, image_url, link_url) VALUES (?, ?, ?)`).run(id, image_url, link_url || null);
  res.json({ success: true, id });
});

// Admin — delete current ad
app.delete('/api/admin/ad', inAppAdminAuth, (req, res) => {
  db.prepare(`DELETE FROM ads`).run();
  res.json({ success: true });
});

// Make a user admin (one-time setup — secured by ADMIN_PASSWORD)
app.post('/api/admin/make-admin', (req, res) => {
  const { username, password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password.' });
  const acc = db.prepare(`SELECT * FROM accounts WHERE username = ?`).get(username);
  if (!acc) return res.status(404).json({ error: 'User not found.' });
  db.prepare(`UPDATE accounts SET is_admin = 1 WHERE id = ?`).run(acc.id);
  res.json({ success: true, message: `${username} is now admin.` });
});

// ── Staging Middleware — serve staged index.html to admin+mods ────────────────
app.use((req, res, next) => {
  if (req.path !== '/' && req.path !== '/index.html') return next();
  if (!fs.existsSync(STAGED_PATH)) return next();
  const stagingRow = db.prepare(`SELECT value FROM staging WHERE key='active'`).get();
  if (!stagingRow || stagingRow.value !== '1') return next();
  // Check if requester is admin or mod via token cookie/header
  const token = req.query._t || '';
  if (!token) return next(); // regular users see live version
  const account = getAccountByToken(token);
  if (account && (account.is_admin || account.is_moderator)) {
    return res.sendFile(STAGED_PATH);
  }
  next();
});

// ── AI / Gemini Routes (admin only) ──────────────────────────────────────────

// Get staging status
app.get('/api/admin/ai/status', inAppAdminAuth, (req, res) => {
  const active = db.prepare(`SELECT value FROM staging WHERE key='active'`).get();
  const prompt = db.prepare(`SELECT value FROM staging WHERE key='last_prompt'`).get();
  const diff   = db.prepare(`SELECT value FROM staging WHERE key='diff_summary'`).get();
  const hasStagedFile = fs.existsSync(STAGED_PATH);
  res.json({
    active: active?.value === '1' && hasStagedFile,
    last_prompt: prompt?.value || '',
    diff_summary: diff?.value || '',
    has_staged: hasStagedFile
  });
});

// Generate staged version via Gemini
app.post('/api/admin/ai/generate', inAppAdminAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || prompt.trim().length < 5) return res.status(400).json({ error: 'Describe what you want changed.' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment.' });

  try {
    const currentHtml = fs.readFileSync(INDEX_PATH, 'utf8');

    const systemPrompt = `You are a precise frontend code editor for a web app called "Chapters".
You will receive the full index.html file and a change request from the admin.
Your job: make ONLY the requested change. Do not change anything else.
Return ONLY the complete modified HTML file — no explanation, no markdown, no code fences.
The very first character of your response must be < (the start of the HTML).
Keep all existing functionality intact.`;

    const userPrompt = `Here is the current index.html:\n\n${currentHtml}\n\n---\nChange request: ${prompt.trim()}\n\nReturn the complete modified index.html only.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 65536 }
        })
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok || !geminiData.candidates?.[0]) {
      return res.status(500).json({ error: 'Gemini API error: ' + (geminiData.error?.message || 'Unknown error') });
    }

    let newHtml = geminiData.candidates[0].content.parts[0].text || '';
    // Strip any accidental markdown fences
    newHtml = newHtml.replace(/^```html\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

    if (!newHtml.startsWith('<')) {
      return res.status(500).json({ error: 'Gemini returned invalid HTML. Try rephrasing your request.' });
    }

    // Save staged file
    fs.writeFileSync(STAGED_PATH, newHtml, 'utf8');

    // Generate a simple diff summary
    const oldLines = currentHtml.split('\n').length;
    const newLines = newHtml.split('\n').length;
    const lineDiff = newLines - oldLines;
    const diffSummary = `${lineDiff >= 0 ? '+' : ''}${lineDiff} lines · ${newHtml.length - currentHtml.length >= 0 ? '+' : ''}${newHtml.length - currentHtml.length} bytes`;

    // Store staging state
    db.prepare(`INSERT OR REPLACE INTO staging (key,value) VALUES ('active','1')`).run();
    db.prepare(`INSERT OR REPLACE INTO staging (key,value) VALUES ('last_prompt',?)`).run(prompt.trim());
    db.prepare(`INSERT OR REPLACE INTO staging (key,value) VALUES ('diff_summary',?)`).run(diffSummary);

    res.json({ success: true, diff_summary: diffSummary });
  } catch (err) {
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// Publish staged → live
app.post('/api/admin/ai/publish', inAppAdminAuth, (req, res) => {
  if (!fs.existsSync(STAGED_PATH)) return res.status(400).json({ error: 'No staged version to publish.' });
  // Backup current live
  fs.copyFileSync(INDEX_PATH, BACKUP_PATH);
  // Replace live with staged
  fs.copyFileSync(STAGED_PATH, INDEX_PATH);
  fs.unlinkSync(STAGED_PATH);
  db.prepare(`INSERT OR REPLACE INTO staging (key,value) VALUES ('active','0')`).run();
  res.json({ success: true });
  // Restart server after response sent
  setTimeout(() => process.exit(0), 500);
});

// Reject staged — discard
app.post('/api/admin/ai/reject', inAppAdminAuth, (req, res) => {
  if (fs.existsSync(STAGED_PATH)) fs.unlinkSync(STAGED_PATH);
  db.prepare(`INSERT OR REPLACE INTO staging (key,value) VALUES ('active','0')`).run();
  res.json({ success: true });
});

// Rollback to backup
app.post('/api/admin/ai/rollback', inAppAdminAuth, (req, res) => {
  if (!fs.existsSync(BACKUP_PATH)) return res.status(400).json({ error: 'No backup available.' });
  fs.copyFileSync(BACKUP_PATH, INDEX_PATH);
  res.json({ success: true });
  setTimeout(() => process.exit(0), 500);
});

// Serve staged file to admin/mod for preview (via direct URL with token query param)
app.get('/preview-staged', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Not authorized.');
  const account = getAccountByToken(token);
  if (!account || (!account.is_admin && !account.is_moderator)) return res.status(403).send('Not authorized.');
  if (!fs.existsSync(STAGED_PATH)) return res.status(404).send('No staged version available.');
  res.sendFile(STAGED_PATH);
});

// Serve admin panel
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── Static ───────────────────────────────────────────────────────────────────
// Block direct access to admin.html (it's served only via the /admin route which requires auth)
app.use((req, res, next) => {
  if (req.path.toLowerCase() === '/admin.html') return res.status(404).send('Not found.');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n  📖 Chapters → http://localhost:${PORT}\n`));
