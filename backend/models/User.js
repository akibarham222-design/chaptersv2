const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'n.i.farhan44@gmail.com';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  googleId: { type: String },
  avatar: { type: String, default: '' },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  journeyCount: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Auto-assign admin role
userSchema.pre('save', async function (next) {
  if (this.email === ADMIN_EMAIL) {
    this.role = 'admin';
  }
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
