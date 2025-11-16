// routes/uploadRoutes.js - CLOUDINARY ХУВИЛБАР
const express = require('express');
const router = express.Router();
const {
  uploadCourseThumbnail,
  uploadProfileImage,
  uploadProfileBanner
} = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ==================== ХИЧЭЭЛИЙН ЗУРАГ ====================
router.post(
  '/course-thumbnail',
  authorize('admin', 'test_admin'),
  uploadCourseThumbnail.single('thumbnail'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Зураг сонгоогүй байна'
        });
      }

      // ✅ Cloudinary-с ирсэн URL
      const fileUrl = req.file.path; // Cloudinary URL

      res.status(200).json({
        success: true,
        message: 'Зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl, // ✅ https://res.cloudinary.com/...
          size: req.file.size,
          cloudinaryId: req.file.filename // Deletion-д хэрэглэнэ
        }
      });
    } catch (error) {
      console.error('Upload алдаа:', error);
      res.status(500).json({
        success: false,
        message: 'Upload хийхэд алдаа гарлаа'
      });
    }
  }
);

// ==================== ПРОФАЙЛ ЗУРАГ ====================
router.post(
  '/profile-image',
  uploadProfileImage.single('profile_image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Зураг сонгоогүй байна'
        });
      }

      const fileUrl = req.file.path;

      res.status(200).json({
        success: true,
        message: 'Профайл зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Upload алдаа:', error);
      res.status(500).json({
        success: false,
        message: 'Upload хийхэд алдаа гарлаа'
      });
    }
  }
);

// ==================== BANNER ЗУРАГ ====================
router.post(
  '/profile-banner',
  uploadProfileBanner.single('profile_banner'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Зураг сонгоогүй байна'
        });
      }

      const fileUrl = req.file.path;

      res.status(200).json({
        success: true,
        message: 'Banner зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Upload алдаа:', error);
      res.status(500).json({
        success: false,
        message: 'Upload хийхэд алдаа гарлаа'
      });
    }
  }
);

module.exports = router;