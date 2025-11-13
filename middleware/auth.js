const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Token баталгаажуулах
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Header-с token авах
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Token байгаа эсэхийг шалгах
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Нэвтрэх эрх шаардлагатай'
      });
    }

    // Token баталгаажуулах
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Хэрэглэгчийг database-с авах
    const [users] = await db.query(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Хэрэглэгч олдсонгүй'
      });
    }

    // Хэрэглэгч идэвхтэй эсэхийг шалгах
    if (users[0].status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Таны эрх түр хаагдсан байна'
      });
    }

    // Хэрэглэгчийг request руу нэмэх
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth Middleware Алдаа:', error);
    return res.status(401).json({
      success: false,
      message: 'Token буруу эсвэл хүчингүй болсон'
    });
  }
};

// Admin эрх шалгах
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Танд энэ үйлдэл хийх эрх байхгүй'
      });
    }
    next();
  };
};

// Test Admin эрхийг хязгаарлах (зөвхөн харах эрхтэй)
exports.restrictTestAdmin = (action) => {
  return (req, res, next) => {
    if (req.user.role === 'test_admin') {
      // Test admin зөвхөн GET request хийж болно
      const allowedActions = ['read', 'view', 'list'];
      if (!allowedActions.includes(action) && req.method !== 'GET') {
        return res.status(403).json({
          success: false,
          message: 'Test Admin-д зөвхөн харах эрх байна'
        });
      }
    }
    next();
  };
};