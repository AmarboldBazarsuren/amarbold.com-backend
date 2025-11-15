const bcrypt = require('bcryptjs');
const db = require('../config/db');

// ==================== ХЭРЭГЛЭГЧ УДИРДЛАГА ====================

// @desc    Бүх хэрэглэгчдийг харах
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    let query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.created_at,
        (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id) as enrolled_courses,
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = u.id AND is_completed = 1) as completed_lessons
      FROM users u
      WHERE 1=1
    `;
    
    const params = [];

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (status) {
      query += ' AND u.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC';

    const [users] = await db.query(query, params);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('GetAllUsers Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Багшийн суралцагчдыг харах (Test Admin өөрийнхөө)
// @route   GET /api/admin/my-students
// @access  Private/Admin (Test Admin)
// @desc    Багшийн суралцагчдыг харах
// @route   GET /api/admin/my-students
// @access  Private/Admin (Test Admin болон Admin)
exports.getMyStudents = async (req, res) => {
  try {
    const instructorId = req.user.id;

    const [courses] = await db.query(
      'SELECT id, title FROM courses WHERE instructor_id = ?',
      [instructorId]
    );

    if (courses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        totalCourses: 0,
        totalStudents: 0
      });
    }

    const courseIds = courses.map(c => c.id);

    const [students] = await db.query(`
      SELECT DISTINCT
        u.id, u.name, u.email,
        e.enrolled_at,
        c.title as course_title,
        c.id as course_id
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE c.id IN (?)
      ORDER BY e.enrolled_at DESC
    `, [courseIds]);

    res.status(200).json({
      success: true,
      data: students,
      totalCourses: courses.length,
      totalStudents: new Set(students.map(s => s.id)).size
    });
  } catch (error) {
    console.error('GetMyStudents Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хэрэглэгчийн дэлгэрэнгүй мэдээлэл
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await db.query(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id) as total_enrollments,
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = u.id AND is_completed = 1) as completed_lessons
      FROM users u
      WHERE u.id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хэрэглэгч олдсонгүй'
      });
    }

    // Хэрэглэгчийн бүртгүүлсэн хичээлүүд
    const [enrollments] = await db.query(`
      SELECT 
        c.id, c.title, c.thumbnail,
        e.enrolled_at, e.expires_at, e.payment_status
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `, [userId]);

    const user = users[0];
    user.enrollments = enrollments;

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('GetUserById Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Test Admin үүсгэх
// @route   POST /api/admin/users/create-test-admin
// @access  Private/Admin (Super Admin only)
exports.createTestAdmin = async (req, res) => {
  try {
    // Зөвхөн Super Admin л test admin үүсгэж чадна
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Зөвхөн Super Admin л test admin үүсгэх эрхтэй'
      });
    }

    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Бүх талбарыг бөглөнө үү'
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

    // Test Admin үүсгэх
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'test_admin']
    );

    // Admin log хадгалах
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create_test_admin', 'user', result.insertId, `Test Admin үүсгэв: ${email}`]
    );

    res.status(201).json({
      success: true,
      message: 'Test Admin амжилттай үүсгэлээ',
      data: {
        id: result.insertId,
        name,
        email,
        role: 'test_admin'
      }
    });
  } catch (error) {
    console.error('CreateTestAdmin Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хэрэглэгчийн статус өөрчлөх
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    // Validation
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Буруу статус'
      });
    }

    // Өөрийгөө блоклохыг хориглох
    if (userId == req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Та өөрийнхөө статусыг өөрчилж болохгүй'
      });
    }

    // Super Admin-ийг өөрчилж болохгүй
    const [targetUser] = await db.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хэрэглэгч олдсонгүй'
      });
    }

    if (targetUser[0].role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Та Super Admin-ийн статусыг өөрчилж чадахгүй'
      });
    }

    // Статус өөрчлөх
    await db.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, userId]
    );

    // Admin log
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update_user_status', 'user', userId, `Статус: ${status}`]
    );

    res.status(200).json({
      success: true,
      message: 'Хэрэглэгчийн статус амжилттай өөрчлөгдлөө'
    });
  } catch (error) {
    console.error('UpdateUserStatus Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хэрэглэгчийн эрх өөрчлөх
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin (Super Admin only)
// @desc    Хэрэглэгчийн эрх өөрчлөх
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin (Super Admin only)
exports.updateUserRole = async (req, res) => {
  try {
    // Зөвхөн Super Admin л эрх өөрчилж чадна
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Зөвхөн Super Admin л эрх өөрчилж чадна'
      });
    }

    const userId = req.params.id;
    const { role } = req.body;

    // Validation
    if (!['user', 'test_admin', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Буруу эрх'
      });
    }

    // Өөрийгөө өөрчилж болохгүй
    if (userId == req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Та өөрийнхөө эрхийг өөрчилж болохгүй'
      });
    }

    // Хэрэглэгчийн мэдээлэл авах
    const [users] = await db.query('SELECT name, role FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хэрэглэгч олдсонгүй'
      });
    }

    // ✅ Эрх өөрчлөх + test_admin бол багшийн талбар нэмэх
    if (role === 'test_admin' || role === 'admin') {
      // Багш болгохдоо bio, teaching_categories автоматаар нэмнэ
      await db.query(
        `UPDATE users SET 
          role = ?,
          bio = COALESCE(bio, 'Танилцуулга нэмэгдээгүй байна'),
          teaching_categories = COALESCE(teaching_categories, 'Ангилал тодорхойгүй')
        WHERE id = ?`,
        [role, userId]
      );
    } else {
      // Энгийн user болгох
      await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    // Admin log
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update_user_role', 'user', userId, `Эрх: ${users[0].role} → ${role}`]
    );

    console.log(`✅ ${users[0].name} (ID: ${userId}) - ${users[0].role} → ${role}`);

    res.status(200).json({
      success: true,
      message: 'Хэрэглэгчийн эрх амжилттай өөрчлөгдлөө'
    });
  } catch (error) {
    console.error('UpdateUserRole Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};
// ==================== ХИЧЭЭЛ УДИРДЛАГА ====================

// @desc    Хичээл үүсгэх
// @route   POST /api/admin/courses
// @access  Private/Admin
// CREATE хичээл хэсгийг ингэж зас (мөр 159 орчим)

exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      full_description,
      category_id,
      price,
      is_free,
      duration,
      level,
      thumbnail
    } = req.body;

    // Validation
    if (!title || !description || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Шаардлагатай талбаруудыг бөглөнө үү'
      });
    }

    // Slug үүсгэх (энгийн хувилбар)
    const slug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // ✅ ЭНЭ ХЭСГИЙГ ЗАСАХ - status='published' болгох
    const [result] = await db.query(`
      INSERT INTO courses 
      (title, slug, description, full_description, category_id, instructor_id, 
       price, is_free, duration, level, thumbnail, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `, [
      title,
      slug + '-' + Date.now(),
      description,
      full_description || description,
      category_id,
      req.user.id,
      price || 0,
      is_free || false,
      duration || 0,
      level || 'beginner',
      thumbnail || null
    ]);

    // Admin log
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create_course', 'course', result.insertId, `Хичээл үүсгэв: ${title}`]
    );

    res.status(201).json({
      success: true,
      message: 'Хичээл амжилттай үүсгэлээ',
      data: {
        id: result.insertId,
        title,
        slug: slug + '-' + Date.now()
      }
    });
  } catch (error) {
    console.error('CreateCourse Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээл шинэчлэх
// @route   PUT /api/admin/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const {
      title,
      description,
      full_description,
      category_id,
      price,
      is_free,
      duration,
      level,
      thumbnail,
      status
    } = req.body;

    // Хичээл байгаа эсэхийг шалгах
    const [courses] = await db.query(
      'SELECT id FROM courses WHERE id = ?',
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    // Шинэчлэх
    await db.query(`
      UPDATE courses SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        full_description = COALESCE(?, full_description),
        category_id = COALESCE(?, category_id),
        price = COALESCE(?, price),
        is_free = COALESCE(?, is_free),
        duration = COALESCE(?, duration),
        level = COALESCE(?, level),
        thumbnail = COALESCE(?, thumbnail),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      title,
      description,
      full_description,
      category_id,
      price,
      is_free,
      duration,
      level,
      thumbnail,
      status,
      courseId
    ]);

    // Admin log
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update_course', 'course', courseId, 'Хичээл шинэчилсэн']
    );

    res.status(200).json({
      success: true,
      message: 'Хичээл амжилттай шинэчлэгдлээ'
    });
  } catch (error) {
    console.error('UpdateCourse Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээл устгах
// @route   DELETE /api/admin/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Хичээл байгаа эсэхийг шалгах
    const [courses] = await db.query(
      'SELECT title FROM courses WHERE id = ?',
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    // Устгах
    await db.query('DELETE FROM courses WHERE id = ?', [courseId]);

    // Admin log
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'delete_course', 'course', courseId, `Хичээл устгав: ${courses[0].title}`]
    );

    res.status(200).json({
      success: true,
      message: 'Хичээл амжилттай устгагдлаа'
    });
  } catch (error) {
    console.error('DeleteCourse Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээлд section нэмэх
// @route   POST /api/admin/courses/:id/sections
// @access  Private/Admin
exports.addCourseSection = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, description, order_number } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Section-ий нэр шаардлагатай'
      });
    }

    const [result] = await db.query(
      'INSERT INTO course_sections (course_id, title, description, order_number) VALUES (?, ?, ?, ?)',
      [courseId, title, description || null, order_number || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Section амжилттай нэмэгдлээ',
      data: {
        id: result.insertId,
        title
      }
    });
  } catch (error) {
    console.error('AddCourseSection Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Section-д хичээл нэмэх
// @route   POST /api/admin/sections/:sectionId/lessons
// @access  Private/Admin
exports.addLesson = async (req, res) => {
  try {
    const sectionId = req.params.sectionId;
    const {
      title,
      description,
      video_url,
      duration,
      order_number,
      is_free_preview
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Хичээлийн нэр шаардлагатай'
      });
    }

    // Section-ийн course_id авах
    const [sections] = await db.query(
      'SELECT course_id FROM course_sections WHERE id = ?',
      [sectionId]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section олдсонгүй'
      });
    }

    const [result] = await db.query(`
      INSERT INTO lessons 
      (section_id, course_id, title, description, video_url, duration, order_number, is_free_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sectionId,
      sections[0].course_id,
      title,
      description || null,
      video_url || null,
      duration || 0,
      order_number || 0,
      is_free_preview || false
    ]);

    res.status(201).json({
      success: true,
      message: 'Хичээл амжилттай нэмэгдлээ',
      data: {
        id: result.insertId,
        title
      }
    });
  } catch (error) {
    console.error('AddLesson Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// ==================== СТАТИСТИК ====================

// @desc    Dashboard статистик
// @route   GET /api/admin/stats
// @access  Private/Admin
// @desc    Dashboard статистик (Test Admin өөрийнхөө, Super Admin бүгдийг)
// @route   GET /api/admin/stats
// @access  Private/Admin
// @desc    Dashboard статистик (Test Admin өөрийнхөө, Super Admin бүгдийг)
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Нийт хэрэглэгчид (зөвхөн Super Admin харна)
    let totalUsers = 0;
    if (userRole === 'admin') {
      const [users] = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE role = "user"'
      );
      totalUsers = users[0].count;
    }

    // ✅ Нийт хичээлүүд
    let totalCoursesQuery = 'SELECT COUNT(*) as count FROM courses WHERE status = "published"';
    let totalCoursesParams = [];
    
    if (userRole === 'test_admin') {
      totalCoursesQuery += ' AND instructor_id = ?';
      totalCoursesParams.push(userId);
    }
    
    const [totalCourses] = await db.query(totalCoursesQuery, totalCoursesParams);

    // ✅ Нийт бүртгэлүүд
    let enrollmentsQuery = 'SELECT COUNT(*) as count FROM enrollments';
    let enrollmentsParams = [];
    
    if (userRole === 'test_admin') {
      enrollmentsQuery += ' WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?)';
      enrollmentsParams.push(userId);
    }
    
    const [totalEnrollments] = await db.query(enrollmentsQuery, enrollmentsParams);

    // ✅ Орлого (төлбөртэй бүртгэлүүд)
    let revenueQuery = 'SELECT SUM(payment_amount) as total FROM enrollments WHERE payment_status = "paid"';
    let revenueParams = [];
    
    if (userRole === 'test_admin') {
      revenueQuery += ' AND course_id IN (SELECT id FROM courses WHERE instructor_id = ?)';
      revenueParams.push(userId);
    }
    
    const [totalRevenue] = await db.query(revenueQuery, revenueParams);

    // ✅ Шинэ хэрэглэгчид (сүүлийн 30 хоног) - зөвхөн Super Admin
    let newUsers = 0;
    if (userRole === 'admin') {
      const [newUsersResult] = await db.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      newUsers = newUsersResult[0].count;
    }

    // ✅ Топ хичээлүүд
    let topCoursesQuery = `
      SELECT 
        c.id, c.title, c.thumbnail,
        COUNT(e.id) as enrollments
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.status = 'published'
    `;
    let topCoursesParams = [];
    
    if (userRole === 'test_admin') {
      topCoursesQuery += ' AND c.instructor_id = ?';
      topCoursesParams.push(userId);
    }
    
    topCoursesQuery += ' GROUP BY c.id ORDER BY enrollments DESC LIMIT 5';
    
    const [topCourses] = await db.query(topCoursesQuery, topCoursesParams);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCourses: totalCourses[0].count,
        totalEnrollments: totalEnrollments[0].count,
        totalRevenue: totalRevenue[0].total || 0,
        newUsersThisMonth: newUsers,
        topCourses
      }
    });
  } catch (error) {
    console.error('GetAdminStats Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};
// @desc    Admin logs харах
// @route   GET /api/admin/logs
// @access  Private/Admin
exports.getAdminLogs = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const [logs] = await db.query(`
      SELECT 
        al.*,
        u.name as admin_name,
        u.email as admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('GetAdminLogs Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
  
};// @desc    Админ самбарын хичээлүүд авах (Test Admin өөрийнхөө, Super Admin бүгдийг)
// @route   GET /api/admin/courses
// @access  Private/Admin
exports.getAdminCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        c.*,
        cat.name as category_name,
        cat.slug as category_slug,
        u.name as instructor_name,
        u.id as instructor_id,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // ✅ Test Admin зөвхөн өөрийнхөө хичээлүүдийг харна
    if (userRole === 'test_admin') {
      query += ' AND c.instructor_id = ?';
      params.push(userId);
    }
    // Super Admin бүх хичээлийг харна

    query += ' ORDER BY c.created_at DESC';

    const [courses] = await db.query(query, params);

    // Хичээл бүрийн мэдээллийг format хийх
    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      full_description: course.full_description,
      thumbnail: course.thumbnail,
      category: course.category_slug,
      category_id: course.category_id,
      price: parseFloat(course.price),
      is_free: course.is_free === 1,
      duration: course.duration,
      level: course.level,
      rating: parseFloat(course.rating),
      students: course.total_students,
      status: course.status,
      instructor: {
        id: course.instructor_id,
        name: course.instructor_name
      }
    }));

    res.status(200).json({
      success: true,
      count: formattedCourses.length,
      data: formattedCourses
    });
  } catch (error) {
    console.error('GetAdminCourses Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};
// @desc    Section засах
// @route   PUT /api/admin/sections/:id
// @access  Private/Admin
exports.updateSection = async (req, res) => {
  try {
    const sectionId = req.params.id;
    const { title, description, order_number } = req.body;

    // Section байгаа эсэхийг шалгах
    const [sections] = await db.query(
      'SELECT id, course_id FROM course_sections WHERE id = ?',
      [sectionId]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section олдсонгүй'
      });
    }

    // Эрх шалгах (Test Admin зөвхөн өөрийнхөө хичээлийн section засна)
    if (req.user.role === 'test_admin') {
      const [courses] = await db.query(
        'SELECT instructor_id FROM courses WHERE id = ?',
        [sections[0].course_id]
      );
      
      if (courses.length === 0 || courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Танд энэ section засах эрх байхгүй'
        });
      }
    }

    // Шинэчлэх
    await db.query(`
      UPDATE course_sections SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        order_number = COALESCE(?, order_number)
      WHERE id = ?
    `, [title, description, order_number, sectionId]);

    res.status(200).json({
      success: true,
      message: 'Section амжилттай шинэчлэгдлээ'
    });
  } catch (error) {
    console.error('UpdateSection Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Section устгах
// @route   DELETE /api/admin/sections/:id
// @access  Private/Admin
exports.deleteSection = async (req, res) => {
  try {
    const sectionId = req.params.id;

    // Section байгаа эсэхийг шалгах
    const [sections] = await db.query(
      'SELECT id, course_id, title FROM course_sections WHERE id = ?',
      [sectionId]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section олдсонгүй'
      });
    }

    // Эрх шалгах
    if (req.user.role === 'test_admin') {
      const [courses] = await db.query(
        'SELECT instructor_id FROM courses WHERE id = ?',
        [sections[0].course_id]
      );
      
      if (courses.length === 0 || courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Танд энэ section устгах эрх байхгүй'
        });
      }
    }

    // Устгах
    await db.query('DELETE FROM course_sections WHERE id = ?', [sectionId]);

    res.status(200).json({
      success: true,
      message: 'Section амжилттай устгагдлаа'
    });
  } catch (error) {
    console.error('DeleteSection Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Lesson засах
// @route   PUT /api/admin/lessons/:id
// @access  Private/Admin
exports.updateLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;
    const {
      title,
      description,
      video_url,
      duration,
      order_number,
      is_free_preview
    } = req.body;

    // Lesson байгаа эсэхийг шалгах
    const [lessons] = await db.query(
      'SELECT id, course_id FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    // Эрх шалгах
    if (req.user.role === 'test_admin') {
      const [courses] = await db.query(
        'SELECT instructor_id FROM courses WHERE id = ?',
        [lessons[0].course_id]
      );
      
      if (courses.length === 0 || courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Танд энэ хичээл засах эрх байхгүй'
        });
      }
    }

    // Шинэчлэх
    await db.query(`
      UPDATE lessons SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        video_url = COALESCE(?, video_url),
        duration = COALESCE(?, duration),
        order_number = COALESCE(?, order_number),
        is_free_preview = COALESCE(?, is_free_preview)
      WHERE id = ?
    `, [
      title,
      description,
      video_url,
      duration,
      order_number,
      is_free_preview,
      lessonId
    ]);

    res.status(200).json({
      success: true,
      message: 'Хичээл амжилттай шинэчлэгдлээ'
    });
  } catch (error) {
    console.error('UpdateLesson Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Lesson устгах
// @route   DELETE /api/admin/lessons/:id
// @access  Private/Admin
exports.deleteLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;

    // Lesson байгаа эсэхийг шалгах
    const [lessons] = await db.query(
      'SELECT id, course_id, title FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    // Эрх шалгах
    if (req.user.role === 'test_admin') {
      const [courses] = await db.query(
        'SELECT instructor_id FROM courses WHERE id = ?',
        [lessons[0].course_id]
      );
      
      if (courses.length === 0 || courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Танд энэ хичээл устгах эрх байхгүй'
        });
      }
    }

    // Устгах
    await db.query('DELETE FROM lessons WHERE id = ?', [lessonId]);

    res.status(200).json({
      success: true,
      message: 'Хичээл амжилттай устгагдлаа'
    });
  } catch (error) {
    console.error('DeleteLesson Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};