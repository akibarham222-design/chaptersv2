const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const ADMIN_EMAIL = 'n.i.farhan44@gmail.com';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const sendUserData = (user, res, statusCode = 200) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      authProvider: user.authProvider,
      createdAt: user.createdAt
    }
  });
};

// @POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'A passenger with this email already has a boarding pass.' });
    }
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';
    const user = await User.create({ name, email, password, role, authProvider: 'local' });
    sendUserData(user, res, 201);
  } catch (err) {
    res.status(500).json({ message: 'Registration failed. Try again.' });
  }
});

// @POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid boarding credentials.' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid boarding credentials.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your boarding pass has been revoked.' });
    }
    // Ensure admin role
    if (email === ADMIN_EMAIL) user.role = 'admin';
    user.lastSeen = new Date();
    await user.save();
    sendUserData(user, res);
  } catch (err) {
    res.status(500).json({ message: 'Login failed. Signal lost.' });
  }
});

// Google OAuth initiate
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const token = generateToken(req.user._id);
    const userData = encodeURIComponent(JSON.stringify({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      authProvider: req.user.authProvider
    }));
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
  }
);

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// @PUT /api/auth/profile - Update profile (name, avatar)
router.put('/profile', protect, uploadImage.single('avatar'), async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (req.file) {
      // Delete old avatar if local
      if (user.avatar && user.avatar.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', user.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.avatar = `/uploads/images/${req.file.filename}`;
    }
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Profile update failed.' });
  }
});

// @GET /api/auth/verify - Verify token validity
router.get('/verify', protect, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
