// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadSingle } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// ✅ Бүх upload хамгаалагдсан
router.use(protect);

// ==================== ХИЧЭЭЛИЙН ЗУРАГ ====================
router.post(
  '/course-thumbnail',
  authorize('admin', 'test_admin'),
  uploadSingle('thumbnail'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Зураг сонгоогүй байна'
        });
      }

      // ✅ FRONTEND-ээс хандах боломжтой URL
      const fileUrl = `http://localhost:5000/uploads/courses/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: 'Зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl, // ✅ Энэ URL-ийг frontend ашиглана
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

// ==================== ПРОФАЙЛ ЗУРАГ ====================
router.post(
  '/profile-image',
  uploadSingle('profile_image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Зураг сонгоогүй байна'
        });
      }

      const fileUrl = `http://localhost:5000/uploads/profiles/${req.file.filename}`;

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
  uploadSingle('profile_banner'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Зураг сонгоогүй байна'
        });
      }

      const fileUrl = `http://localhost:5000/uploads/banners/${req.file.filename}`;

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