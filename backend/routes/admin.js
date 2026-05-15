const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Confession = require('../models/Confession');
const Report = require('../models/Report');
const Song = require('../models/Song');
const Notice = require('../models/Notice');
const JourneyLog = require('../models/JourneyLog');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// All admin routes require protect + adminOnly
router.use(protect, adminOnly);

// @GET /api/admin/stats - Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [users, confessions, pendingConf, reports, pendingReports, songs] = await Promise.all([
      User.countDocuments(),
      Confession.countDocuments(),
      Confession.countDocuments({ status: 'pending' }),
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Song.countDocuments()
    ]);
    res.json({ users, confessions, pendingConf, reports, pendingReports, songs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch station stats.' });
  }
});

// @GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-password');
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch passengers.' });
  }
});

// @PUT /api/admin/users/:id/role - Change user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Cannot assign admin externally.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Passenger not found.' });
    if (user.email === 'n.i.farhan44@gmail.com') {
      return res.status(403).json({ message: 'Cannot modify admin role.' });
    }
    user.role = role;
    await user.save();
    res.json({ message: `Passenger role updated to ${role}.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Role update failed.' });
  }
});

// @PUT /api/admin/users/:id/ban - Ban/unban user
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { banned, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Passenger not found.' });
    if (user.email === 'n.i.farhan44@gmail.com') {
      return res.status(403).json({ message: 'Cannot ban admin.' });
    }
    user.isBanned = banned;
    user.banReason = reason || '';
    await user.save();
    res.json({ message: `Passenger ${banned ? 'removed from' : 'restored to'} the train.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Ban action failed.' });
  }
});

// @DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Passenger not found.' });
    if (user.email === 'n.i.farhan44@gmail.com') {
      return res.status(403).json({ message: 'Cannot delete admin account.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Passenger record removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed.' });
  }
});

// @GET /api/admin/journey-logs - All journey logs
router.get('/journey-logs', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const total = await JourneyLog.countDocuments();
    const logs = await JourneyLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'name email');
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch journey logs.' });
  }
});

// @POST /api/admin/upload-image - Upload admin image
router.post('/upload-image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image provided.' });
    const url = `/uploads/images/${req.file.filename}`;
    res.json({ url, message: 'Image uploaded successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed.' });
  }
});

// @GET /api/admin/confessions - All confessions
router.get('/confessions', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const total = await Confession.countDocuments(query);
    const confessions = await Confession.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name');
    res.json({ confessions, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch confessions.' });
  }
});

module.exports = router;
