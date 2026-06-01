const express = require('express');
const router = express.Router();
const { uploadBase64Image } = require('../services/cloudinary');

// POST /api/upload — accepts base64 image string
router.post('/', async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'תמונה חסרה' });

    const url = await uploadBase64Image(image, folder || 'mamlicha');
    res.json({ success: true, url });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ success: false, message: 'שגיאה בהעלאת התמונה' });
  }
});

module.exports = router;
