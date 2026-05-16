const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadSong } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// @GET /api/songs - Get all songs (public)
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).select('-__v');
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch the playlist.' });
  }
});

// @POST /api/songs - Admin uploads a song
router.post('/', protect, adminOnly, uploadSong.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file was provided for the journey.' });
    }
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Song title is required.' });
    }
    const song = await Song.create({
      title,
      description: description || '',
      filename: req.file.filename,
      filepath: `/uploads/songs/${req.file.filename}`,
      uploadedBy: req.user._id
    });
    res.status(201).json({ message: 'Song added to the train\'s playlist.', song });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed. Signal lost.' });
  }
});

// @DELETE /api/songs/:id - Admin deletes a song
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found in the playlist.' });
    }
    // Delete file from disk
    const filePath = path.join(__dirname, '../uploads/songs', song.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await Song.findByIdAndDelete(req.params.id);
    res.json({ message: 'Song removed from the playlist.' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed.' });
  }
});

// @PUT /api/songs/:id/play - Increment play count
router.put('/:id/play', async (req, res) => {
  try {
    await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
    res.json({ message: 'Playing.' });
  } catch (err) {
    res.json({ message: 'ok' });
  }
});

module.exports = router;
