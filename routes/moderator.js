const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Confession = require('../models/Confession');
const User = require('../models/User');
const { protect, modOrAdmin } = require('../middleware/auth');

router.use(protect, modOrAdmin);

// @GET /api/moderator/stats
router.get('/stats', async (req, res) => {
  try {
    const [pendingConf, pendingReports, totalReports] = await Promise.all([
      Confession.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments()
    ]);
    res.json({ pendingConf, pendingReports, totalReports });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load moderator stats.' });
  }
});

// @GET /api/moderator/reports
router.get('/reports', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('reportedBy', 'name email')
      .populate('reviewedBy', 'name');
    res.json({ reports, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reports.' });
  }
});

// @PUT /api/moderator/reports/:id
router.put('/reports/:id', async (req, res) => {
  try {
    const { status, note } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote: note || '', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    res.json({ message: 'Report updated.', report });
  } catch (err) {
    res.status(500).json({ message: 'Update failed.' });
  }
});

// @GET /api/moderator/confessions/pending
router.get('/confessions/pending', async (req, res) => {
  try {
    const confessions = await Confession.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email');
    res.json({ confessions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending confessions.' });
  }
});

// @PUT /api/moderator/confessions/:id/review
router.put('/confessions/:id/review', async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action.' });
    }
    const confession = await Confession.findByIdAndUpdate(
      req.params.id,
      {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: req.user._id,
        reviewNote: note || '',
        reviewedAt: new Date()
      },
      { new: true }
    );
    res.json({ message: `Confession ${action}d.`, confession });
  } catch (err) {
    res.status(500).json({ message: 'Review failed.' });
  }
});

module.exports = router;
