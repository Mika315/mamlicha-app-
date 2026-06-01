const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a base64 image string to Cloudinary
 * @param {string} base64Data - base64 encoded image (with or without data URI prefix)
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - Cloudinary secure URL
 */
async function uploadBase64Image(base64Data, folder = 'mamlicha') {
  const result = await cloudinary.uploader.upload(base64Data, {
    folder,
    resource_type: 'image'
  });
  return result.secure_url;
}

module.exports = { uploadBase64Image };
