const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const ForumPost = require('../models/ForumPost');

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>נמחק בהצלחה</title>
  <style>
    body { font-family: sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#fff0f6; }
    .box { text-align:center; padding:2rem; background:#fff; border-radius:1rem; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
    h1 { color:#c0607f; }
  </style>
</head>
<body>
  <div class="box">
    <h1>הפוסט נמחק בהצלחה ✅</h1>
    <p>הפריט הוסר ממסד הנתונים.</p>
    <a href="/">חזרה לאתר</a>
  </div>
</body>
</html>`;

const FORBIDDEN_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><title>שגיאה</title></head>
<body dir="rtl">
  <h2>❌ טוקן לא תקין או פג תוקף.</h2>
</body>
</html>`;

// GET /api/admin/delete/recommendation/:id?token=...
router.get('/delete/recommendation/:id', async (req, res) => {
  try {
    const rec = await Recommendation.findById(req.params.id);
    if (!rec || rec.deleteToken !== req.query.token) {
      return res.status(403).send(FORBIDDEN_HTML);
    }
    await Recommendation.findByIdAndDelete(req.params.id);
    res.send(SUCCESS_HTML);
  } catch (err) {
    res.status(500).send('שגיאת שרת: ' + err.message);
  }
});

// GET /api/admin/delete/forum/:id?token=...
router.get('/delete/forum/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post || post.deleteToken !== req.query.token) {
      return res.status(403).send(FORBIDDEN_HTML);
    }
    await ForumPost.findByIdAndDelete(req.params.id);
    res.send(SUCCESS_HTML);
  } catch (err) {
    res.status(500).send('שגיאת שרת: ' + err.message);
  }
});


// GET /api/admin/test-email — send a test email to verify configuration
router.get('/test-email', async (req, res) => {
  try {
    const { sendRecommendationEmail } = require('../services/email');
    // Build a fake rec object for testing
    const fakeRec = {
      _id: 'TEST123',
      circumference: 90,
      cup: 'F',
      category: 'חזיות',
      store: 'בדיקה',
      link: 'https://example.com',
      features: ['מחזיק במיוחד'],
      description: 'זוהי המלצת בדיקה',
      imageUrl: '',
      isAnonymous: false,
      createdAt: new Date(),
      deleteToken: 'test-token-123'
    };
    await sendRecommendationEmail(fakeRec);
    res.send('<h2>✅ מייל בדיקה נשלח בהצלחה! בדקי את תיבת הדואר של contact.mamlicha@gmail.com</h2>');
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.body, null, 2) : err.stack;
    res.status(500).send('<h2>❌ שגיאה בשליחת מייל:</h2><pre>' + err.message + '\n\n' + detail + '</pre>');
  }
});

module.exports = router;
