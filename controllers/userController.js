const bcrypt = require('bcryptjs');
const db = require('../config/db');

// @desc    Профайл мэдээлэл шинэчлэх
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Нэр болон имэйл шаардлагатай'
      });
    }

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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

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

// @desc    Багшийн профайл шинэчлэх
// @route   PUT /api/users/instructor-profile
// @access  Private (Test Admin эсвэл Admin)
exports.updateInstructorProfile = async (req, res) => {
  try {
    const { bio, teaching_categories, profile_image, profile_banner } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'test_admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Зөвхөн багш эрхтэй хүмүүс профайл засах боломжтой'
      });
    }

    await db.query(
      `UPDATE users SET 
        bio = COALESCE(?, bio),
        teaching_categories = COALESCE(?, teaching_categories),
        profile_image = COALESCE(?, profile_image),
        profile_banner = COALESCE(?, profile_banner)
      WHERE id = ?`,
      [bio, teaching_categories, profile_image, profile_banner, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Багшийн профайл амжилттай шинэчлэгдлээ'
    });
  } catch (error) {
    console.error('UpdateInstructorProfile Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Багшийн нийтийн профайл авах
// @route   GET /api/users/instructor/:id
// @access  Private
exports.getInstructorProfile = async (req, res) => {
  try {
    const instructorId = req.params.id;

    const [instructors] = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.bio, u.teaching_categories,
        u.profile_image, u.profile_banner, u.created_at,
        (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id AND status = 'published') as total_courses,
        (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e 
         JOIN courses c ON e.course_id = c.id 
         WHERE c.instructor_id = u.id) as total_students
      FROM users u
      WHERE u.id = ? AND (u.role = 'test_admin' OR u.role = 'admin')
    `, [instructorId]);

    if (instructors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Багш олдсонгүй'
      });
    }

    const [courses] = await db.query(`
      SELECT id, title, description, thumbnail, price, rating, 
             (SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id) as students
      FROM courses
      WHERE instructor_id = ? AND status = 'published'
      ORDER BY created_at DESC
    `, [instructorId]);

    res.status(200).json({
      success: true,
      instructor: {
        ...instructors[0],
        courses
      }
    });
  } catch (error) {
    console.error('GetInstructorProfile Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};