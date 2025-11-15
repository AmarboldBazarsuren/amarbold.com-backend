const express = require('express');
const router = express.Router();
const {
  rateCourse,
  getMyRating,
  getCourseRatings
} = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');

// Бүх routes хамгаалагдсан
router.use(protect);

router.post('/courses/:courseId', rateCourse);
router.get('/courses/:courseId/my-rating', getMyRating);
router.get('/courses/:courseId', getCourseRatings);

module.exports = router;