const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Confession = require('../models/Confession');
const JourneyLog = require('../models/JourneyLog');
const { protect, modOrAdmin } = require('../middleware/auth');

// @POST /api/confessions - Submit a confession (requires login)
router.post('/', protect, [
  body('from').trim().isLength({ min: 1, max: 60 }).withMessage('From field is required'),
  body('to').trim().isLength({ min: 1, max: 60 }).withMessage('To field is required'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be 10-1000 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  try {
    const { from, to, message, song } = req.body;
    const confession = await Confession.create({
      from, to, message,
      song: song || {},
      submittedBy: req.user._id,
      status: 'pending'
    });

    // Log journey
    await JourneyLog.create({
      userId: req.user._id,
      type: 'confession_submitted',
      details: `Confession from "${from}" to "${to}"`,
      metadata: { confessionId: confession._id }
    });

    res.status(201).json({ message: 'Your confession has been submitted and is awaiting review at the station.', confession });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit confession.' });
  }
});

// @GET /api/confessions/public - Get approved confessions with search
router.get('/public', async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;
    const query = { status: 'approved' };

    if (search && search.trim()) {
      query.$or = [
        { from: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'song.title': { $regex: search, $options: 'i' } },
        { 'song.artist': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Confession.countDocuments(query);
    const confessions = await Confession.find(query)
      .sort({ reviewedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-submittedBy -reviewedBy -reviewNote');

    res.json({ confessions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch confessions.' });
  }
});

// @GET /api/confessions/pending - Mod/Admin: get pending
router.get('/pending', protect, modOrAdmin, async (req, res) => {
  try {
    const confessions = await Confession.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email');
    res.json({ confessions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending confessions.' });
  }
});

// @GET /api/confessions/all - Mod/Admin: get all
router.get('/all', protect, modOrAdmin, async (req, res) => {
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

// @PUT /api/confessions/:id/review - Mod/Admin: approve or reject
router.put('/:id/review', protect, modOrAdmin, async (req, res) => {
  try {
    const { action, note } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve or reject.' });
    }
    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ message: 'Confession not found at this station.' });
    }
    confession.status = action === 'approve' ? 'approved' : 'rejected';
    confession.reviewedBy = req.user._id;
    confession.reviewNote = note || '';
    confession.reviewedAt = new Date();
    await confession.save();
    res.json({ message: `Confession ${action}d successfully.`, confession });
  } catch (err) {
    res.status(500).json({ message: 'Review failed.' });
  }
});

// @DELETE /api/confessions/:id - Admin only
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    await Confession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Confession removed from the station.' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed.' });
  }
});

module.exports = router;
