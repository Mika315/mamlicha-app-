const sgMail = require('@sendgrid/mail');

const ADMIN_EMAIL = 'contact.mamlicha@gmail.com';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'contact.mamlicha@gmail.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

if (!process.env.SENDGRID_API_KEY) {
  console.error('⚠️  SENDGRID_API_KEY is not set in environment variables!');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid email service ready — will send to', ADMIN_EMAIL);
}

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

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: FROM_EMAIL,
    subject: '📬 המלצה חדשה התקבלה – ממליצה לך בגדול',
    text: body,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false }
    }
  });

  console.log('✅ Recommendation email sent via SendGrid to', ADMIN_EMAIL);
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

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: FROM_EMAIL,
    subject: '💬 פוסט חדש בפורום – ממליצה לך בגדול',
    text: body,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false }
    }
  });

  console.log('✅ Forum email sent via SendGrid to', ADMIN_EMAIL);
}

module.exports = { sendRecommendationEmail, sendForumPostEmail };
