const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
  from: { type: String, required: true, trim: true, maxlength: 60 },
  to: { type: String, required: true, trim: true, maxlength: 60 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  song: {
    title: { type: String },
    artist: { type: String },
    artwork: { type: String },
    spotifyUrl: { type: String },
    itunesUrl: { type: String },
    searchQuery: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date }
});

// Text index for search
confessionSchema.index({
  from: 'text',
  to: 'text',
  message: 'text',
  'song.title': 'text',
  'song.artist': 'text'
});

module.exports = mongoose.model('Confession', confessionSchema);
