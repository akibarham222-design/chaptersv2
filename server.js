require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const passport = require('passport');

// Route imports
const authRoutes = require('./routes/auth');
const confessionRoutes = require('./routes/confessions');
const songRoutes = require('./routes/songs');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const moderatorRoutes = require('./routes/moderator');
const noticeRoutes = require('./routes/notices');
const journeyRoutes = require('./routes/journeyLogs');

// Socket handler
const initChatSocket = require('./socket/chat');

// Connect to DB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Passport config
require('./config/passport')(passport);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/confessions', confessionRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/journeys', journeyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Aagontuk Express is on schedule', timestamp: new Date() });
});

// Initialize socket
initChatSocket(io);


// Serve bundled frontend from /public on the same Render web service.
const frontendDistPath = path.join(__dirname, 'public');
app.use(express.static(frontendDistPath));

// React Router fallback. Keep this after all /api and /uploads routes.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Signal lost. Please try again.' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aagontuk Express running on port ${PORT}`);
});

module.exports = { app, io };
