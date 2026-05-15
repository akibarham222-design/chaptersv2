const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ADMIN_EMAIL = 'n.i.farhan44@gmail.com';

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'No boarding pass. Please login first.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Passenger not found. Invalid boarding pass.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your boarding pass has been revoked.' });
    }
    // Always enforce admin for admin email
    if (user.email === ADMIN_EMAIL && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Boarding pass expired or invalid.' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin' || req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Control room access denied. Admins only.' });
  }
  next();
};

const modOrAdmin = (req, res, next) => {
  if (!req.user || !['moderator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Station staff access required.' });
  }
  next();
};

module.exports = { protect, adminOnly, modOrAdmin };
