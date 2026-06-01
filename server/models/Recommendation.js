const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  circumference: { type: Number, required: true, min: 60, max: 150 },
  cup: { type: String, required: true, enum: ['D','DD','E','F','G','H','I','J','K','L'] },
  category: {
    type: String,
    required: true,
    enum: ['חולצות וגופיות', 'גוזיות וחולצות ספורט', 'חזיות', 'שמלות ערב', 'שמלות כלה', 'בגד ים', 'אחר']
  },
  link: { type: String, default: '' },
  store: { type: String, default: '' },
  features: [{ type: String }],
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isAnonymous: { type: Boolean, default: false },
  email: { type: String, default: '' }, // bcrypt-hashed
  embedding: { type: [Number], default: [] },
  deleteToken: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recommendation', recommendationSchema);
