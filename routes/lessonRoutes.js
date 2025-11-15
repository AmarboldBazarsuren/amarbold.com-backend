const express = require('express');
const router = express.Router();
const {
  markLessonComplete,
  unmarkLessonComplete,
  getCourseProgress
} = require('../controllers/lessonProgressController');
const { protect } = require('../middleware/auth');

// Бүх routes хамгаалагдсан
router.use(protect);

// Lesson прогресс
router.post('/:lessonId/complete', markLessonComplete);
router.delete('/:lessonId/complete', unmarkLessonComplete);

// Course прогресс
router.get('/:courseId/progress', getCourseProgress);

module.exports = router;