// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadSingle, uploadFields } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// ✅ Бүх upload хамгаалагдсан
router.use(protect);

// ==================== НЭГЭН ЗУРАГ UPLOAD ====================

// @desc    Хичээлийн зураг upload
// @route   POST /api/upload/course-thumbnail
// @access  Private (Admin, Test Admin)
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

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/courses/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: 'Зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          path: `/uploads/courses/${req.file.filename}`,
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

// @desc    Профайл зураг upload
// @route   POST /api/upload/profile-image
// @access  Private
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

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/profiles/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: 'Профайл зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          path: `/uploads/profiles/${req.file.filename}`,
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

// @desc    Banner зураг upload
// @route   POST /api/upload/profile-banner
// @access  Private
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

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/banners/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: 'Banner зураг амжилттай upload хийгдлээ',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          path: `/uploads/banners/${req.file.filename}`,
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

// ==================== ОЛОН ЗУРАГ НЭГЭН ДОР ====================

// @desc    Хичээл + Багшийн зураг
// @route   POST /api/upload/course-with-profile
// @access  Private (Admin, Test Admin)
router.post(
  '/course-with-profile',
  authorize('admin', 'test_admin'),
  uploadFields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
    { name: 'profile_banner', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const result = {};

      if (req.files.thumbnail) {
        const file = req.files.thumbnail[0];
        result.thumbnail = `${req.protocol}://${req.get('host')}/uploads/courses/${file.filename}`;
      }

      if (req.files.profile_image) {
        const file = req.files.profile_image[0];
        result.profile_image = `${req.protocol}://${req.get('host')}/uploads/profiles/${file.filename}`;
      }

      if (req.files.profile_banner) {
        const file = req.files.profile_banner[0];
        result.profile_banner = `${req.protocol}://${req.get('host')}/uploads/banners/${file.filename}`;
      }

      res.status(200).json({
        success: true,
        message: 'Зургууд амжилттай upload хийгдлээ',
        data: result
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

// ==================== ERROR HANDLER ====================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Файлын хэмжээ 5MB-аас их байна'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

module.exports = router;