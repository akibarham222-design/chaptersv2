const mongoose = require('mongoose');

const journeyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['chat_started', 'chat_ended', 'confession_submitted', 'song_dedicated', 'game_played', 'stranger_met'],
    required: true
  },
  details: { type: String },
  duration: { type: Number }, // in seconds for chats
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JourneyLog', journeyLogSchema);
