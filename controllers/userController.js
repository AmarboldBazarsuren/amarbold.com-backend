const bcrypt = require('bcryptjs');
const db = require('../config/db');

// @desc    Профайл мэдээлэл шинэчлэх
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Нэр болон имэйл шаардлагатай'
      });
    }

    // Email давхардаж байгаа эсэхийг шалгах
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Энэ имэйл хаяг бусад хэрэглэгчид ашигласан байна'
      });
    }

    // Мэдээлэл шинэчлэх
    await db.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Профайл амжилттай шинэчлэгдлээ'
    });
  } catch (error) {
    console.error('UpdateProfile Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Нууц үг солих
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Бүх талбарыг бөглөнө үү'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой'
      });
    }

    // Одоогийн нууц үг зөв эсэхийг шалгах
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Одоогийн нууц үг буруу байна'
      });
    }

    // Шинэ нууц үг hash хийх
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Нууц үг шинэчлэх
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Нууц үг амжилттай солигдлоо'
    });
  } catch (error) {
    console.error('ChangePassword Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};