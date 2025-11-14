const express = require('express');
const router = express.Router();
const {
  getAllInstructors,
  getInstructorDetail
} = require('../controllers/instructorController');
const { protect } = require('../middleware/auth');

// Бүх routes хамгаалагдсан
router.use(protect);

router.get('/', getAllInstructors);
router.get('/:id', getInstructorDetail);

module.exports = router;