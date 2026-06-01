const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'contact.mamlicha@gmail.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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

  await transporter.sendMail({
    from: `"ממליצה לך בגדול" <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: '📬 המלצה חדשה התקבלה – ממליצה לך בגדול',
    text: body
  });
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

  await transporter.sendMail({
    from: `"ממליצה לך בגדול" <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: '💬 פוסט חדש בפורום – ממליצה לך בגדול',
    text: body
  });
}

module.exports = { sendRecommendationEmail, sendForumPostEmail };
