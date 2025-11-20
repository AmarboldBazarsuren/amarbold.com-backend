const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @desc    Нийтэд нээлттэй хичээлүүд
// @route   GET /api/public/courses
// @access  Public
router.get('/courses', async (req, res) => {
  try {
    // ✅ QUERY ЯМР ТАЛБАРУУД БАЙГААГ ШАЛГАХ
    const [courses] = await db.query(`
      SELECT 
        c.id, 
        c.title, 
        c.slug, 
        c.description, 
        c.thumbnail,
        c.price, 
        c.is_free, 
        COALESCE(c.duration, 0) as duration,
        COALESCE(c.rating, 4.5) as rating,
        COALESCE(cat.slug, 'general') as category,
        COALESCE(u.name, 'Unknown') as instructor_name,
        u.id as instructor_id,
        cd.discount_percent,
        CASE 
          WHEN cd.id IS NOT NULL AND cd.discount_percent IS NOT NULL 
          THEN ROUND(c.price * (1 - cd.discount_percent / 100))
          ELSE NULL
        END as discount_price,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as students
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_discounts cd ON c.id = cd.course_id 
        AND cd.is_active = 1 
        AND cd.end_date > NOW()
      WHERE 1=1
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
      price: parseFloat(course.price || 0),
      is_free: course.is_free === 1,
      duration: course.duration || 0,
      rating: parseFloat(course.rating || 4.5),
      students: course.students || 0,
      discount_percent: course.discount_percent || null,
      discount_price: course.discount_price || null,
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
    console.error('❌ Public Courses Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Нийтэд нээлттэй статистик
// @route   GET /api/public/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const [totalCourses] = await db.query(
      'SELECT COUNT(*) as count FROM courses'
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
    console.error('❌ Public Stats Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;