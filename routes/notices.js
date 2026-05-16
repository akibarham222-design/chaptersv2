const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect, adminOnly } = require('../middleware/auth');

// @GET /api/notices - Public active notices
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const notices = await Notice.find({
      isActive: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }]
    }).sort({ createdAt: -1 }).limit(5);
    res.json({ notices });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notices.' });
  }
});

// @GET /api/notices/all - Admin: all notices
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.json({ notices });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notices.' });
  }
});

// @POST /api/notices - Admin: create notice
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, content, type, expiresAt } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content required.' });
    const notice = await Notice.create({
      title, content,
      type: type || 'announcement',
      expiresAt: expiresAt || null,
      createdBy: req.user._id
    });
    res.status(201).json({ message: 'Notice posted at the station.', notice });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notice.' });
  }
});

// @PUT /api/notices/:id - Admin: update notice
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Notice updated.', notice });
  } catch (err) {
    res.status(500).json({ message: 'Update failed.' });
  }
});

// @DELETE /api/notices/:id - Admin: delete notice
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice removed from station board.' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed.' });
  }
});

module.exports = router;
