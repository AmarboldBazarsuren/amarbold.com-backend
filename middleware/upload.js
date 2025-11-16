// middleware/upload.js - CLOUDINARY ХУВИЛБАР
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// ✅ Cloudinary тохируулах
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Course thumbnail storage
const courseThumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eduvia/courses',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

// ✅ Profile image storage
const profileImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eduvia/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
  }
});

// ✅ Profile banner storage
const profileBannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eduvia/banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 400, crop: 'fill' }]
  }
});

// ✅ Multer config
const uploadCourseThumbnail = multer({
  storage: courseThumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadProfileBanner = multer({
  storage: profileBannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = {
  uploadCourseThumbnail,
  uploadProfileImage,
  uploadProfileBanner,
  cloudinary // Export for potential deletion
};