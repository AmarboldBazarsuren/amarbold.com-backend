const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Буруу өгөгдөл',
      errors: errors.array() 
    });
  }
  next();
};

exports.validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Нэр 2-100 тэмдэгттэй байх ёстой'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Зөв имэйл хаяг оруулна уу'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой'),
  handleValidationErrors
];

exports.validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Нууц үг шаардлагатай'),
  handleValidationErrors
];

// 🔥 ШИНЭЧИЛСЭН - Хатуу валидаци
exports.validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Хичээлийн нэр 3-255 тэмдэгттэй байх ёстой'),
  body('description')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Товч тайлбар дор хаяж 5 үгтэй байх ёстой')
    .custom((value) => {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 5) {
        throw new Error('Товч тайлбар дор хаяж 5 үгтэй байх ёстой');
      }
      return true;
    }),
  body('full_description')
    .trim()
    .notEmpty()
    .withMessage('Дэлгэрэнгүй тайлбар заавал бөглөх ёстой')
    .isLength({ min: 15 })
    .withMessage('Дэлгэрэнгүй тайлбар дор хаяж 15 үгтэй байх ёстой')
    .custom((value) => {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 15) {
        throw new Error('Дэлгэрэнгүй тайлбар дор хаяж 15 үгтэй байх ёстой');
      }
      return true;
    }),
  body('price')
    .isFloat({ min: 5000 })
    .withMessage('Үнэ дор хаяж 5000₮-с дээш байх ёстой'),
  body('thumbnail')
    .trim()
    .notEmpty()
    .withMessage('Зургийн URL заавал оруулах ёстой')
    .isURL()
    .withMessage('Зургийн URL буруу байна'),
  body('preview_video_url')
    .trim()
    .notEmpty()
    .withMessage('Танилцуулга видео URL заавал оруулах ёстой')
    .isURL()
    .withMessage('Видео URL буруу байна'),
  body('category_id')
    .optional()
    .isInt()
    .withMessage('Ангилал тоо байх ёстой'),
  handleValidationErrors
];