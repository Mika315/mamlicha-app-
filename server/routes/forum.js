const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const ForumPost = require('../models/ForumPost');
const { sendForumPostEmail } = require('../services/email');

// GET /api/forum — fetch all posts
router.get('/', async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-email -deleteToken');
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/forum — create new post
router.post('/', async (req, res) => {
  try {
    const { title, body, displayName, isAnonymous, email, imageUrl } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'כותרת ותוכן הם שדות חובה' });
    }

    let hashedEmail = '';
    if (email) {
      hashedEmail = await bcrypt.hash(email, 10);
    }

    // Generate secure delete token
    const deleteToken = crypto.randomBytes(32).toString('hex');

    const post = new ForumPost({
      title,
      body,
      displayName: isAnonymous ? 'אנונימית' : (displayName || 'אנונימית'),
      isAnonymous: Boolean(isAnonymous),
      email: hashedEmail,
      imageUrl: imageUrl || '',
      deleteToken
    });

    await post.save();

    // Send admin email (non-blocking)
    sendForumPostEmail(post).catch(err =>
      console.error('Failed to send forum email:', err.message)
    );

    const saved = post.toObject();
    delete saved.email;
    delete saved.deleteToken;
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/forum/:id/reply — reply to a post
router.post('/:id/reply', async (req, res) => {
  try {
    const { body, displayName, isAnonymous } = req.body;
    if (!body) return res.status(400).json({ success: false, message: 'תוכן התגובה חסר' });

    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'פוסט לא נמצא' });

    post.replies.push({
      body,
      displayName: isAnonymous ? 'אנונימית' : (displayName || 'אנונימית'),
      isAnonymous: Boolean(isAnonymous)
    });

    await post.save();
    res.json({ success: true, data: post.replies[post.replies.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
