const mongoose = require('mongoose');

const creatorProfileSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80, default: 'Nazmul Islam Farhan' },
  title: { type: String, trim: true, maxlength: 120, default: 'Train Architect' },
  bio: { type: String, trim: true, maxlength: 500, default: 'Built Aagontuk Express as a night platform for strangers, confessions, songs, and small temporary journeys.' },
  image: { type: String, trim: true, default: '' },
  link: { type: String, trim: true, maxlength: 200, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreatorProfile', creatorProfileSchema);
