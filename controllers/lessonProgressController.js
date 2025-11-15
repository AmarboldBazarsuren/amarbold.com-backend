const db = require('../config/db');

// @desc    Хичээлийг үзсэн гэж тэмдэглэх
// @route   POST /api/lessons/:lessonId/complete
// @access  Private
exports.markLessonComplete = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    // Lesson байгаа эсэхийг шалгах + course_id авах
    const [lessons] = await db.query(
      'SELECT course_id FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    const courseId = lessons[0].course_id;

    // Хэрэглэгч энэ хичээлд бүртгүүлсэн эсэхийг шалгах
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

    // Аль хэдийн тэмдэглэсэн эсэхийг шалгах
    const [existing] = await db.query(
      'SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?',
      [userId, lessonId]
    );

    if (existing.length > 0) {
      // Аль хэдийн бүртгэлтэй бол completed = 1 болгох
      await db.query(
        'UPDATE lesson_progress SET is_completed = 1, completed_at = NOW() WHERE user_id = ? AND lesson_id = ?',
        [userId, lessonId]
      );
    } else {
      // Шинээр үүсгэх
      await db.query(
        'INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, completed_at) VALUES (?, ?, ?, 1, NOW())',
        [userId, lessonId, courseId]
      );
    }

    // Прогресс тооцоолох
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress 
         WHERE user_id = ? AND course_id = ? AND is_completed = 1) as completed_lessons
      FROM lessons 
      WHERE course_id = ?
    `, [userId, courseId, courseId]);

    const progress = stats[0].total_lessons > 0 
      ? Math.round((stats[0].completed_lessons / stats[0].total_lessons) * 100)
      : 0;

    res.status(200).json({
      success: true,
      message: 'Хичээл үзсэн гэж тэмдэглэгдлээ',
      data: {
        lessonId,
        courseId,
        completed: true,
        progress,
        completedLessons: stats[0].completed_lessons,
        totalLessons: stats[0].total_lessons
      }
    });
  } catch (error) {
    console.error('MarkLessonComplete Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээлийг үзээгүй гэж буцаах
// @route   DELETE /api/lessons/:lessonId/complete
// @access  Private
exports.unmarkLessonComplete = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    // Lesson байгаа эсэхийг шалгах + course_id авах
    const [lessons] = await db.query(
      'SELECT course_id FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Хичээл олдсонгүй'
      });
    }

    const courseId = lessons[0].course_id;

    // Устгах эсвэл completed = 0 болгох
    await db.query(
      'UPDATE lesson_progress SET is_completed = 0, completed_at = NULL WHERE user_id = ? AND lesson_id = ?',
      [userId, lessonId]
    );

    // Прогресс тооцоолох
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress 
         WHERE user_id = ? AND course_id = ? AND is_completed = 1) as completed_lessons
      FROM lessons 
      WHERE course_id = ?
    `, [userId, courseId, courseId]);

    const progress = stats[0].total_lessons > 0 
      ? Math.round((stats[0].completed_lessons / stats[0].total_lessons) * 100)
      : 0;

    res.status(200).json({
      success: true,
      message: 'Хичээлийн үзсэн тэмдэг хасагдлаа',
      data: {
        lessonId,
        courseId,
        completed: false,
        progress,
        completedLessons: stats[0].completed_lessons,
        totalLessons: stats[0].total_lessons
      }
    });
  } catch (error) {
    console.error('UnmarkLessonComplete Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// @desc    Хичээлийн прогресс авах
// @route   GET /api/lessons/:courseId/progress
// @access  Private
exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Хэрэглэгч бүртгүүлсэн эсэхийг шалгах
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

    // Хичээл бүрийн progress
    const [lessons] = await db.query(`
      SELECT 
        l.id,
        l.title,
        CASE 
          WHEN lp.is_completed = 1 THEN true
          ELSE false
        END as is_completed,
        lp.completed_at
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
      WHERE l.course_id = ?
      ORDER BY l.section_id, l.order_number
    `, [userId, courseId]);

    // Нийт прогресс
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress 
         WHERE user_id = ? AND course_id = ? AND is_completed = 1) as completed_lessons
      FROM lessons 
      WHERE course_id = ?
    `, [userId, courseId, courseId]);

    const progress = stats[0].total_lessons > 0 
      ? Math.round((stats[0].completed_lessons / stats[0].total_lessons) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        courseId,
        progress,
        completedLessons: stats[0].completed_lessons,
        totalLessons: stats[0].total_lessons,
        lessons
      }
    });
  } catch (error) {
    console.error('GetCourseProgress Алдаа:', error);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};