const express = require('express');
const router = express.Router();
const JourneyLog = require('../models/JourneyLog');
const { protect } = require('../middleware/auth');

// @GET /api/journeys/mine - Current user's journey logs
router.get('/mine', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await JourneyLog.countDocuments({ userId: req.user._id });
    const logs = await JourneyLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ logs, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve journey chapters.' });
  }
});

// @POST /api/journeys - Create log entry
router.post('/', protect, async (req, res) => {
  try {
    const { type, details, duration, metadata } = req.body;
    const log = await JourneyLog.create({
      userId: req.user._id,
      type, details, duration, metadata
    });
    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record journey trace.' });
  }
});

module.exports = router;
