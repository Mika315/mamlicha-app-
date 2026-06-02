const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'contact.mamlicha@gmail.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Use explicit SMTP settings instead of service:'gmail'
// This is more reliable on cloud hosts like Render that may block generic service configs
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Gmail App Password (16 chars, no spaces)
  }
});

// Verify connection on startup so any config errors appear in logs immediately
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ Email transporter verification failed:', err.message);
    console.error('   Make sure EMAIL_USER and EMAIL_PASS are set correctly in .env');
  } else {
    console.log('✅ Email transporter ready — will send to', ADMIN_EMAIL);
  }
});

/**
 * Send admin email for a new recommendation
 */
async function sendRecommendationEmail(rec) {
  const deleteLink = `${BASE_URL}/api/admin/delete/recommendation/${rec._id}?token=${rec.deleteToken}`;

  const body = `
📬 המלצה חדשה התקבלה באתר ממליצה לך בגדול!

📏 מידות:
  היקף: ${rec.circumference}
  קאפ: ${rec.cup}

🏷️ קטגוריה: ${rec.category}

🛍️ פרטי מוצר:
  חנות: ${rec.store || '—'}
  קישור: ${rec.link || '—'}

✨ מאפיינים: ${rec.features && rec.features.length ? rec.features.join(', ') : '—'}

📝 תיאור: ${rec.description || '—'}

🖼️ תמונה: ${rec.imageUrl || '—'}

👤 אנונימי: ${rec.isAnonymous ? 'כן' : 'לא'}

🗓️ תאריך: ${new Date(rec.createdAt).toLocaleString('he-IL')}

---
🗑️ למחיקת ההמלצה לחצי כאן:
${deleteLink}
  `;

  const info = await transporter.sendMail({
    from: `"ממליצה לך בגדול" <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: '📬 המלצה חדשה התקבלה – ממליצה לך בגדול',
    text: body
  });

  console.log('✅ Recommendation email sent, messageId:', info.messageId);
}

/**
 * Send admin email for a new forum post
 */
async function sendForumPostEmail(post) {
  const deleteLink = `${BASE_URL}/api/admin/delete/forum/${post._id}?token=${post.deleteToken}`;

  const body = `
💬 פוסט חדש בפורום ממליצה לך בגדול!

📌 כותרת: ${post.title}

📝 תוכן:
${post.body}

👤 שם מוצג: ${post.displayName || 'אנונימית'}

🖼️ תמונה: ${post.imageUrl || '—'}

🗓️ תאריך: ${new Date(post.createdAt).toLocaleString('he-IL')}

---
🗑️ למחיקת הפוסט לחצי כאן:
${deleteLink}
  `;

  const info = await transporter.sendMail({
    from: `"ממליצה לך בגדול" <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: '💬 פוסט חדש בפורום – ממליצה לך בגדול',
    text: body
  });

  console.log('✅ Forum email sent, messageId:', info.messageId);
}

module.exports = { sendRecommendationEmail, sendForumPostEmail };
