const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @desc    Нийтэд нээлттэй хичээлүүд
// @route   GET /api/public/courses
// @access  Public
router.get('/courses', async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT 
        c.id, c.title, c.slug, c.description, c.thumbnail,
        c.price, c.is_free, c.duration, c.rating,
        cat.slug as category,
        u.name as instructor_name,
        u.id as instructor_id,
        cd.discount_percent,
        CASE 
          WHEN cd.id IS NOT NULL THEN ROUND(c.price * (1 - cd.discount_percent / 100))
          ELSE NULL
        END as discount_price,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as students
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_discounts cd ON c.id = cd.course_id 
        AND cd.is_active = 1 
        AND NOW() BETWEEN cd.start_date AND cd.end_date
      WHERE (c.status = 'published' OR c.status IS NULL)
      ORDER BY c.created_at DESC
      LIMIT 20
    `);

    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      price: parseFloat(course.price),
      is_free: course.is_free === 1,
      duration: course.duration,
      rating: parseFloat(course.rating),
      students: course.students,
      discount_percent: course.discount_percent,
      discount_price: course.discount_price,
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
    console.error('Public Courses Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
});

// @desc    Нийтэд нээлттэй статистик
// @route   GET /api/public/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const [totalCourses] = await db.query(
      'SELECT COUNT(*) as count FROM courses WHERE (status = "published" OR status IS NULL)'
    );

    const [totalInstructors] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role IN ("test_admin", "admin")'
    );

    const [activeInstructors] = await db.query(`
      SELECT COUNT(DISTINCT instructor_id) as count 
      FROM courses 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND (status = 'published' OR status IS NULL)
    `);

    res.status(200).json({
      success: true,
      data: {
        totalCourses: totalCourses[0].count,
        totalInstructors: totalInstructors[0].count,
        activeInstructors: activeInstructors[0].count,
        averageRating: '4.8'
      }
    });
  } catch (error) {
    console.error('Public Stats Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
});

module.exports = router;