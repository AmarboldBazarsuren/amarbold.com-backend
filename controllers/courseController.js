const db = require('../config/db');

// @desc    Бүх хичээлүүдийг авах
// @route   GET /api/courses
// @access  Private
exports.getAllCourses = async (req, res) => {
  try {
    const { category, search, status = 'published' } = req.query;
    
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
      WHERE c.status = ?
    `;
    
    const params = [status];

    if (category) {
      query += ' AND cat.slug = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.created_at DESC';

    const [courses] = await db.query(query, params);

    // Хичээл бүрийн мэдээллийг format хийх
    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category_slug,
      price: parseFloat(course.price),
      is_free: course.is_free === 1,
      duration: course.duration,
      level: course.level,
      rating: parseFloat(course.rating),
      students: course.total_students,
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
    console.error('GetAllCourses Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээлийн дэлгэрэнгүй мэдээлэл авах
// @route   GET /api/courses/:id
// @access  Private
exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Хичээлийн үндсэн мэдээлэл
    const [courses] = await db.query(`
      SELECT 
        c.*,
        cat.name as category_name,
        u.name as instructor_name,
        u.id as instructor_id,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [courseId]);

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    const course = courses[0];

    // Хичээлийн бүлгүүд болон хичээлүүд
    const [sections] = await db.query(`
      SELECT * FROM course_sections 
      WHERE course_id = ? 
      ORDER BY order_number ASC
    `, [courseId]);

    // Бүлэг бүрийн хичээлүүд
    for (let section of sections) {
      const [lessons] = await db.query(`
        SELECT id, title, description, duration, order_number, is_free_preview
        FROM lessons 
        WHERE section_id = ? 
        ORDER BY order_number ASC
      `, [section.id]);
      section.lessons = lessons;
    }

    // Хэрэглэгч бүртгүүлсэн эсэхийг шалгах
    const [enrollments] = await db.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, courseId]
    );

    const isEnrolled = enrollments.length > 0;

    res.status(200).json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        fullDescription: course.full_description,
        thumbnail: course.thumbnail,
        category: course.category_name,
        price: parseFloat(course.price),
        is_free: course.is_free === 1,
        duration: course.duration,
        level: course.level,
        rating: parseFloat(course.rating),
        students: course.total_students,
        instructor: {
          id: course.instructor_id,
          name: course.instructor_name
        },
        sections: sections
      },
      isEnrolled
    });
  } catch (error) {
    console.error('GetCourseById Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээлд бүртгүүлэх
// @route   POST /api/courses/:id/enroll
// @access  Private
exports.enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    // Хичээл байгаа эсэхийг шалгах
    const [courses] = await db.query(
      'SELECT id, price, is_free FROM courses WHERE id = ? AND status = ?',
      [courseId, 'published']
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    const course = courses[0];

    // Аль хэдийн бүртгүүлсэн эсэхийг шалгах
    const [existingEnrollment] = await db.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existingEnrollment.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Та энэ хичээлд аль хэдийн бүртгүүлсэн байна'
      });
    }

    // Бүртгэл үүсгэх
    const paymentStatus = course.is_free ? 'free' : 'paid'; // Түр зуур бүх төлбөртэй хичээлийг paid гэж тооцно
    
    await db.query(
      'INSERT INTO enrollments (user_id, course_id, payment_status, payment_amount) VALUES (?, ?, ?, ?)',
      [userId, courseId, paymentStatus, course.price]
    );

    // Хичээлийн суралцагчийн тоог нэмэх
    await db.query(
      'UPDATE courses SET total_students = total_students + 1 WHERE id = ?',
      [courseId]
    );

    res.status(201).json({
      success: true,
      message: 'Амжилттай бүртгүүллээ'
    });
  } catch (error) {
    console.error('EnrollCourse Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Миний хичээлүүд
// @route   GET /api/courses/my-courses
// @access  Private
exports.getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const [enrollments] = await db.query(`
      SELECT 
        c.*,
        e.enrolled_at,
        e.expires_at,
        u.name as instructor_name,
        (SELECT COUNT(*) FROM lesson_progress lp 
         WHERE lp.user_id = ? AND lp.course_id = c.id AND lp.is_completed = 1) as completed_lessons,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `, [userId, userId]);

    const formattedCourses = enrollments.map(course => {
      const progress = course.total_lessons > 0 
        ? Math.round((course.completed_lessons / course.total_lessons) * 100)
        : 0;

      return {
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail,
        duration: course.duration,
        progress: progress,
        completedLessons: course.completed_lessons,
        totalLessons: course.total_lessons,
        enrolledAt: course.enrolled_at,
        expiresAt: course.expires_at,
        instructor: {
          name: course.instructor_name
        }
      };
    });

    res.status(200).json({
      success: true,
      count: formattedCourses.length,
      data: formattedCourses
    });
  } catch (error) {
    console.error('GetMyCourses Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};