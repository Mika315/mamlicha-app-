const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Recommendation = require('../models/Recommendation');
const { generateEmbedding } = require('../services/gemini');
const { sendRecommendationEmail } = require('../services/email');

// GET /api/recommendations — fetch with optional filters
router.get('/', async (req, res) => {
  try {
    const { circumference, cup, category, features, q } = req.query;
    const filter = {};

    if (circumference) {
      const vals = circumference.split(',').map(Number).filter(Boolean);
      if (vals.length) filter.circumference = { $in: vals };
    }
    if (cup) {
      const vals = cup.split(',').filter(Boolean);
      if (vals.length) filter.cup = { $in: vals };
    }
    if (category) {
      const vals = category.split(',').filter(Boolean);
      if (vals.length) filter.category = { $in: vals };
    }
    if (features) {
      const vals = features.split(',').filter(Boolean);
      if (vals.length) filter.features = { $all: vals };
    }
    if (q) {
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { store: { $regex: q, $options: 'i' } }
      ];
    }

    const recs = await Recommendation.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-email -embedding -deleteToken');

    res.json({ success: true, data: recs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/recommendations — submit new recommendation
router.post('/', async (req, res) => {
  try {
    const {
      circumference, cup, category, link, store,
      features, description, imageUrl, isAnonymous, email
    } = req.body;

    if (!circumference || !cup || !category) {
      return res.status(400).json({ success: false, message: 'שדות חובה חסרים' });
    }

    // Hash email if provided
    let hashedEmail = '';
    if (email) {
      hashedEmail = await bcrypt.hash(email, 10);
    }

    // Build text for embedding
    const textForEmbedding = `${category} היקף:${circumference} קאפ:${cup} ${description || ''} ${store || ''}`;
    let embedding = [];
    try {
      embedding = await generateEmbedding(textForEmbedding);
    } catch (e) {
      console.warn('Embedding generation failed:', e.message);
    }

    // Generate secure delete token
    const deleteToken = crypto.randomBytes(32).toString('hex');

    const rec = new Recommendation({
      circumference: Number(circumference),
      cup,
      category,
      link: link || '',
      store: store || '',
      features: features || [],
      description: description || '',
      imageUrl: imageUrl || '',
      isAnonymous: Boolean(isAnonymous),
      email: hashedEmail,
      embedding,
      deleteToken
    });

    await rec.save();

    // Send admin email (non-blocking)
    sendRecommendationEmail(rec).catch(err =>
      console.error('Failed to send recommendation email:', err.message)
    );

    const saved = rec.toObject();
    delete saved.email;
    delete saved.embedding;
    delete saved.deleteToken;

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
