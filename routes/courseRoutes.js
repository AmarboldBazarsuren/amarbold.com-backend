const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ✅ БҮГДИЙГ FUNCTION БОЛГОЖ ЗАСАХ

// @desc    Бүх хичээлүүд
// @route   GET /api/courses
// @access  Private
const getAllCourses = async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT 
        c.id, 
        c.title, 
        c.slug, 
        c.description, 
        c.thumbnail,
        c.price, 
        c.is_free, 
        c.duration,
        c.rating,
        cat.slug as category,
        u.name as instructor_name,
        u.id as instructor_id,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as students
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.status = 'published'
      ORDER BY c.created_at DESC
    `);

    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      price: parseFloat(course.price || 0),
      is_free: course.is_free === 1,
      duration: course.duration || 0,
      rating: parseFloat(course.rating || 4.5),
      students: course.students || 0,
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

// @desc    Хичээлийн дэлгэрэнгүй
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    const [courses] = await db.query(`
      SELECT 
        c.*,
        cat.name as category_name,
        cat.slug as category_slug,
        u.name as instructor_name,
        u.id as instructor_id
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

    // Бүртгүүлсэн эсэхийг шалгах
    const [enrollments] = await db.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    const isEnrolled = enrollments.length > 0;

    // Section болон Lesson-ууд
    const [sections] = await db.query(`
      SELECT 
        cs.id,
        cs.title,
        cs.description,
        cs.order_number
      FROM course_sections cs
      WHERE cs.course_id = ?
      ORDER BY cs.order_number ASC
    `, [courseId]);

    for (let section of sections) {
      const [lessons] = await db.query(`
        SELECT 
          id,
          title,
          description,
          video_url,
          duration,
          order_number,
          is_free_preview
        FROM lessons
        WHERE section_id = ?
        ORDER BY order_number ASC
      `, [section.id]);
      section.lessons = lessons;
    }

    course.sections = sections;

    const formattedCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      full_description: course.full_description,
      thumbnail: course.thumbnail,
      preview_video_url: course.preview_video_url,
      category: course.category_slug,
      price: parseFloat(course.price),
      is_free: course.is_free === 1,
      duration: course.duration,
      rating: parseFloat(course.rating || 4.5),
      instructor: {
        id: course.instructor_id,
        name: course.instructor_name
      },
      sections: course.sections
    };

    res.status(200).json({
      success: true,
      course: formattedCourse,
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
const enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    // Хичээл байгаа эсэхийг шалгах
    const [courses] = await db.query(
      'SELECT id, price, is_free FROM courses WHERE id = ?',
      [courseId]
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
    await db.query(
      'INSERT INTO enrollments (user_id, course_id, payment_status, payment_amount) VALUES (?, ?, ?, ?)',
      [userId, courseId, course.is_free ? 'free' : 'paid', course.price]
    );

    res.status(200).json({
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
const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const [enrollments] = await db.query(`
      SELECT 
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        c.duration,
        c.price,
        u.name as instructor_name,
        u.id as instructor_id,
        e.enrolled_at,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND course_id = c.id AND is_completed = 1) as completed_lessons
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
        description: course.description,
        thumbnail: course.thumbnail,
        duration: course.duration,
        price: parseFloat(course.price),
        instructor: {
          id: course.instructor_id,
          name: course.instructor_name
        },
        enrolledAt: course.enrolled_at,
        totalLessons: course.total_lessons,
        completedLessons: course.completed_lessons,
        progress
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

// @desc    Dashboard статистик
// @route   GET /api/courses/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const [totalCourses] = await db.query(
      'SELECT COUNT(*) as count FROM courses WHERE status = "published"'
    );

    const [totalInstructors] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role IN ("test_admin", "admin")'
    );

    const [activeInstructors] = await db.query(`
      SELECT COUNT(DISTINCT instructor_id) as count 
      FROM courses 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    res.status(200).json({
      success: true,
      data: {
        totalCourses: totalCourses[0].count || 0,
        totalInstructors: totalInstructors[0].count || 0,
        activeInstructors: activeInstructors[0].count || 0,
        averageRating: '4.8'
      }
    });
  } catch (error) {
    console.error('GetDashboardStats Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// ✅ ROUTES
router.get('/stats', getDashboardStats);
router.get('/', getAllCourses);
router.get('/my-courses', getMyCourses);
router.get('/:id', getCourseById);
router.post('/:id/enroll', enrollCourse);

module.exports = router;