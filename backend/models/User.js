const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String, default: '' },
  originalAvatar: { type: String, default: '' }
}, { timestamps: true });

// Uses the existing 'users' collection in MongoDB Atlas
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
