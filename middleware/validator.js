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

// 🔥 ЗАСВАРЛАСАН - category_id optional болгосон
exports.validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Хичээлийн нэр 3-255 тэмдэгттэй байх ёстой'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Тайлбар дор хаяж 10 тэмдэгттэй байх ёстой'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Үнэ 0-с их байх ёстой'),
  body('thumbnail')
    .trim()
    .notEmpty()
    .withMessage('Зургийн URL шаардлагатай'),
  body('category_id')
    .optional() // 🔥 Category заавал биш
    .isInt()
    .withMessage('Ангилал тоо байх ёстой'),
  body('preview_video_url')
    .optional() // 🔥 Preview video заавал биш
    .trim(),
  handleValidationErrors
];