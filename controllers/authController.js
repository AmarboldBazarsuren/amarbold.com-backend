const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

// JWT Token үүсгэх
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Бүртгүүлэх
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Бүх талбарыг бөглөнө үү'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой'
      });
    }

    // Email давхардаж байгаа эсэхийг шалгах
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна'
      });
    }

    // Нууц үг hash хийх
    const hashedPassword = await bcrypt.hash(password, 10);

    // Хэрэглэгч үүсгэх
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;

    // Token үүсгэх
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: 'Амжилттай бүртгүүллээ',
      token,
      user: {
        id: userId,
        name,
        email,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Register Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Нэвтрэх
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Имэйл болон нууц үгээ оруулна уу'
      });
    }

    // Хэрэглэгч хайх
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Имэйл эсвэл нууц үг буруу байна'
      });
    }

    const user = users[0];

    // Нууц үг шалгах
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Имэйл эсвэл нууц үг буруу байна'
      });
    }

    // Status шалгах
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Таны эрх түр хаагдсан байна. Админтай холбогдоно уу'
      });
    }

    // Token үүсгэх
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Амжилттай нэвтэрлээ',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Одоогийн хэрэглэгчийн мэдээлэл авах
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT 
        id, name, email, role, status, 
        profile_image, profile_banner,
        bio, teaching_categories,
        created_at 
      FROM users 
      WHERE id = ?`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('GetMe Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Forgot Password - Reset token илгээх
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Имэйл хаяг оруулна уу'
      });
    }

    // Хэрэглэгч хайх
    const [users] = await db.query(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // ✅ Имэйл олдсонгүй - Шууд алдаа буцаах
      return res.status(404).json({
        success: false,
        message: 'Энэ имэйл хаяг бүртгэлгүй байна'
      });
    }

    const user = users[0];

    // 6 оронтой код үүсгэх
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Token hash хийх
    const resetToken = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Database-д хадгалах (15 минут хүчинтэй)
    await db.query(
      `UPDATE users SET 
        reset_password_token = ?,
        reset_password_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
      WHERE id = ?`,
      [resetToken, user.id]
    );

    // 🔥 Production-д энд Email илгээнэ
    console.log('========================================');
    console.log('🔑 PASSWORD RESET CODE:', resetCode);
    console.log('📧 Email:', user.email);
    console.log('👤 User:', user.name);
    console.log('⏰ Хүчинтэй: 15 минут');
    console.log('========================================');

    // Development-д код буцаах (Production-д устгах!)
    const response = {
      success: true,
      message: 'Нууц үг сэргээх код илгээгдлээ'
    };

    if (process.env.NODE_ENV !== 'production') {
      response.resetCode = resetCode; // 🔥 Production-д устгах!
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('ForgotPassword Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Reset Password - Кодоор шинэчлэх
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Бүх талбарыг бөглөнө үү'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой'
      });
    }

    // Token hash хийх
    const resetToken = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Хэрэглэгч олох + Token шалгах
    const [users] = await db.query(
      `SELECT id, email, name FROM users 
       WHERE email = ? 
       AND reset_password_token = ? 
       AND reset_password_expires > NOW()`,
      [email, resetToken]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Код буруу эсвэл хүчингүй болсон'
      });
    }

    // Нууц үг шинэчлэх
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users SET 
        password = ?,
        reset_password_token = NULL,
        reset_password_expires = NULL
      WHERE id = ?`,
      [hashedPassword, users[0].id]
    );

    console.log('✅ Password reset successful:', users[0].email);

    res.status(200).json({
      success: true,
      message: 'Нууц үг амжилттай солигдлоо. Одоо нэвтэрч болно'
    });
  } catch (error) {
    console.error('ResetPassword Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};