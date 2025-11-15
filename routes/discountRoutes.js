const express = require('express');
const router = express.Router();
const {
  createCourseDiscount,
  getCourseDiscounts,
  deactivateDiscount,
  deleteDiscount,
  getActiveDiscounts
} = require('../controllers/discountController');
const { protect, authorize } = require('../middleware/auth');

// Бүх routes хамгаалагдсан
router.use(protect);

// Идэвхтэй хямдралууд (бүх хэрэглэгч үзнэ)
router.get('/active', getActiveDiscounts);

// Хичээлийн хямдралууд (Admin only)
router.post('/courses/:courseId', authorize('admin', 'test_admin'), createCourseDiscount);
router.get('/courses/:courseId', authorize('admin', 'test_admin'), getCourseDiscounts);

// Хямдрал удирдах
router.put('/:discountId/deactivate', authorize('admin', 'test_admin'), deactivateDiscount);
router.delete('/:discountId', authorize('admin', 'test_admin'), deleteDiscount);

module.exports = router;