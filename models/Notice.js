const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  type: {
    type: String,
    enum: ['announcement', 'warning', 'maintenance', 'event'],
    default: 'announcement'
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

module.exports = mongoose.model('Notice', noticeSchema);
