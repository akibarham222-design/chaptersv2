const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadSong } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

router.get('/', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).select('-__v');
    res.json({ songs });
  } catch (err) {
    console.error('Song fetch failed:', err);
    res.status(500).json({ message: 'Failed to fetch playlist.' });
  }
});

router.post('/', protect, adminOnly, (req, res) => {
  uploadSong.single('audio')(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('Song multer upload failed:', uploadErr);
      const msg = uploadErr.code === 'LIMIT_FILE_SIZE'
        ? 'Audio file is too large. Use a smaller file under 250MB.'
        : (uploadErr.message || 'Audio upload failed before saving.');
      return res.status(400).json({ message: msg });
    }

    try {
      if (!req.file) return res.status(400).json({ message: 'Choose an audio file first.' });

      const cleanTitle = (req.body.title || '').trim() || path.parse(req.file.originalname).name || 'Untitled track';
      const cleanDescription = (req.body.description || '').trim();

      const song = await Song.create({
        title: cleanTitle,
        description: cleanDescription,
        filename: req.file.filename,
        filepath: `/uploads/songs/${req.file.filename}`,
        uploadedBy: req.user?._id
      });

      res.status(201).json({ message: 'Song uploaded.', song });
    } catch (err) {
      console.error('Song database save failed:', err);
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      res.status(500).json({ message: `Upload reached server but saving failed: ${err.message}` });
    }
  });
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found.' });
    const filePath = path.join(__dirname, '../uploads/songs', song.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await Song.findByIdAndDelete(req.params.id);
    res.json({ message: 'Song removed.' });
  } catch (err) {
    console.error('Song delete failed:', err);
    res.status(500).json({ message: 'Deletion failed.' });
  }
});

router.put('/:id/play', async (req, res) => {
  try {
    await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
    res.json({ message: 'Playing.' });
  } catch (err) {
    res.json({ message: 'ok' });
  }
});

module.exports = router;
