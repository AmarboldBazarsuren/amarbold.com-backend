const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  enrollCourse,
  getMyCourses
} = require('../controllers/courseController');
const { protect } = require('../middleware/auth');

// Бүх routes хамгаалагдсан (нэвтэрсэн хэрэглэгч шаардлагатай)
router.use(protect);

router.get('/', getAllCourses);
router.get('/my-courses', getMyCourses);
router.get('/:id', getCourseById);
router.post('/:id/enroll', enrollCourse);

module.exports = router;