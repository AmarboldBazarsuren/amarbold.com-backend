const db = require('../config/db');

// @desc    Хичээлд үнэлгээ өгөх
// @route   POST /api/ratings/courses/:courseId
// @access  Private
exports.rateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Үнэлгээ 1-5 хооронд байх ёстой'
      });
    }

    // Хичээлд бүртгүүлсэн эсэхийг шалгах
    const [enrollments] = await db.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Та энэ хичээлд бүртгүүлээгүй байна'
      });
    }

    // Хичээл дууссан эсэхийг шалгах (progress >= 80%)
    const [progressData] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM lessons WHERE course_id = ?) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress 
         WHERE user_id = ? AND course_id = ? AND is_completed = 1) as completed_lessons
    `, [courseId, userId, courseId]);

    const progress = progressData[0].total_lessons > 0
      ? (progressData[0].completed_lessons / progressData[0].total_lessons) * 100
      : 0;

    if (progress < 80) {
      return res.status(403).json({
        success: false,
        message: 'Хичээлийн 80%-ийг дуусгасан байх ёстой үнэлгээ өгөхийн тулд'
      });
    }

    // Өмнө үнэлгээ өгсөн эсэхийг шалгах
    const [existingRating] = await db.query(
      'SELECT id FROM course_ratings WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existingRating.length > 0) {
      // Update хийх
      await db.query(
        'UPDATE course_ratings SET rating = ?, review = ? WHERE user_id = ? AND course_id = ?',
        [rating, review || null, userId, courseId]
      );

      return res.status(200).json({
        success: true,
        message: 'Үнэлгээ шинэчлэгдлээ'
      });
    }

    // Шинэ үнэлгээ үүсгэх
    await db.query(
      'INSERT INTO course_ratings (course_id, user_id, rating, review) VALUES (?, ?, ?, ?)',
      [courseId, userId, rating, review || null]
    );

    res.status(201).json({
      success: true,
      message: 'Үнэлгээ амжилттай өгөгдлөө'
    });
  } catch (error) {
    console.error('RateCourse Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хэрэглэгчийн өгсөн үнэлгээ авах
// @route   GET /api/ratings/courses/:courseId/my-rating
// @access  Private
exports.getMyRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const [ratings] = await db.query(
      'SELECT rating, review, created_at FROM course_ratings WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (ratings.length === 0) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: ratings[0]
    });
  } catch (error) {
    console.error('GetMyRating Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээлийн бүх үнэлгээ авах
// @route   GET /api/ratings/courses/:courseId
// @access  Private
exports.getCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;

    const [ratings] = await db.query(`
      SELECT 
        cr.id,
        cr.rating,
        cr.review,
        cr.created_at,
        u.name as user_name
      FROM course_ratings cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.course_id = ?
      ORDER BY cr.created_at DESC
    `, [courseId]);

    res.status(200).json({
      success: true,
      count: ratings.length,
      data: ratings
    });
  } catch (error) {
    console.error('GetCourseRatings Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};