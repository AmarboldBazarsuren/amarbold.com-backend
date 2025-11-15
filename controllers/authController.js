const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    // ✅ БҮХ ТАЛБАРУУДЫГ АВАХ - bio, teaching_categories, profile_banner нэмсэн
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

    console.log('✅ /api/auth/me response:', users[0]); // ✅ Debug log

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