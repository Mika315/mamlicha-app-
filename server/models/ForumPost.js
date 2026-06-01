const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  body: { type: String, required: true },
  displayName: { type: String, default: 'אנונימית' },
  isAnonymous: { type: Boolean, default: false },
  deleteToken: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const forumPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  displayName: { type: String, default: 'אנונימית' },
  isAnonymous: { type: Boolean, default: false },
  email: { type: String, default: '' }, // bcrypt-hashed, for moderation only
  imageUrl: { type: String, default: '' },
  replies: [replySchema],
  deleteToken: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ForumPost', forumPostSchema);
