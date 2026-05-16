const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const { protect, modOrAdmin, adminOnly } = require('../middleware/auth');

// @POST /api/reports - Submit a report
router.post('/', protect, async (req, res) => {
  try {
    const { reportedSocketId, reason, chatSession } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ message: 'Please provide a reason for the report.' });
    }
    const report = await Report.create({
      reportedBy: req.user._id,
      reportedSocketId: reportedSocketId || '',
      reason: reason.trim(),
      chatSession: chatSession || '',
      status: 'pending'
    });
    res.status(201).json({ message: 'Your report has been sent to station staff.', report });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit report.' });
  }
});

// @GET /api/reports - Mod/Admin: get reports
router.get('/', protect, modOrAdmin, async (req, res) => {
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

// @PUT /api/reports/:id/review - Mod/Admin: update report status
router.put('/:id/review', protect, modOrAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['reviewed', 'actioned', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
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

module.exports = router;
