const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const ForumPost = require('../models/ForumPost');

// --- Auth middleware ---
function requireAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, message: 'סיסמה שגויה' });
  }
  next();
}

// --- Login ---
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, message: 'סיסמה שגויה' });
  }
  res.json({ success: true });
});

// --- Data routes ---
router.get('/data/recommendations', requireAdmin, async (req, res) => {
  try {
    const recs = await Recommendation.find()
      .sort({ createdAt: -1 })
      .select('-email -embedding');
    res.json({ success: true, data: recs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/data/forum', requireAdmin, async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .sort({ createdAt: -1 })
      .select('-email');
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/data/recommendation/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['circumference', 'cup', 'category', 'store', 'link', 'features', 'description', 'isAnonymous'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const rec = await Recommendation.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .select('-email -embedding');
    if (!rec) return res.status(404).json({ success: false, message: 'לא נמצא' });
    res.json({ success: true, data: rec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/data/forum/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'body', 'displayName', 'isAnonymous'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const post = await ForumPost.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .select('-email -deleteToken');
    if (!post) return res.status(404).json({ success: false, message: 'לא נמצא' });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/data/recommendation/:id', requireAdmin, async (req, res) => {
  try {
    await Recommendation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/data/forum/:id', requireAdmin, async (req, res) => {
  try {
    await ForumPost.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Email-link delete routes ---
const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" /><title>נמחק בהצלחה</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff0f6}.box{text-align:center;padding:2rem;background:#fff;border-radius:1rem;box-shadow:0 4px 20px rgba(0,0,0,.1)}h1{color:#c0607f}</style>
</head>
<body><div class="box"><h1>הפוסט נמחק בהצלחה</h1><p>הפריט הוסר ממסד הנתונים.</p><a href="/">חזרה לאתר</a></div></body>
</html>`;

const FORBIDDEN_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"/><title>שגיאה</title></head>
<body dir="rtl"><h2>טוקן לא תקין או פג תוקף.</h2></body>
</html>`;

router.get('/delete/recommendation/:id', async (req, res) => {
  try {
    const rec = await Recommendation.findById(req.params.id);
    if (!rec || rec.deleteToken !== req.query.token) return res.status(403).send(FORBIDDEN_HTML);
    await Recommendation.findByIdAndDelete(req.params.id);
    res.send(SUCCESS_HTML);
  } catch (err) {
    res.status(500).send('שגיאת שרת: ' + err.message);
  }
});

router.get('/delete/forum/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post || post.deleteToken !== req.query.token) return res.status(403).send(FORBIDDEN_HTML);
    await ForumPost.findByIdAndDelete(req.params.id);
    res.send(SUCCESS_HTML);
  } catch (err) {
    res.status(500).send('שגיאת שרת: ' + err.message);
  }
});

// --- Test email ---
router.get('/test-email', async (req, res) => {
  try {
    const { sendRecommendationEmail } = require('../services/email');
    await sendRecommendationEmail({
      _id: 'TEST123', circumference: 90, cup: 'F', category: 'חזיות',
      store: 'בדיקה', link: 'https://example.com', features: ['מחזיק במיוחד'],
      description: 'המלצת בדיקה', imageUrl: '', isAnonymous: false,
      createdAt: new Date(), deleteToken: 'test-token-123'
    });
    res.send('<h2>מייל בדיקה נשלח בהצלחה!</h2>');
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.body, null, 2) : err.stack;
    res.status(500).send('<h2>שגיאה:</h2><pre>' + err.message + '\n\n' + detail + '</pre>');
  }
});

module.exports = router;
