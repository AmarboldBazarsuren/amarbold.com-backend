const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createTestAdmin,
  updateUserStatus,
  updateUserRole,
  createCourse,
  updateCourse,
  deleteCourse,
  addCourseSection,
  addLesson,
  getAdminStats,
  getAdminLogs,
  getMyStudents
} = require('../controllers/adminController');
const { protect, authorize, restrictTestAdmin } = require('../middleware/auth');

// Бүх routes Admin эрх шаардлагатай
router.use(protect);
router.use(authorize('admin', 'test_admin'));

// ==================== СТАТИСТИК ====================
router.get('/stats', getAdminStats);
router.get('/logs', getAdminLogs);
router.get('/my-students', getMyStudents); // <- Энийг нэмэх
// ==================== ХЭРЭГЛЭГЧ УДИРДЛАГА ====================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);

// Зөвхөн Super Admin
router.post('/users/create-test-admin', authorize('admin'), createTestAdmin);
router.put('/users/:id/role', authorize('admin'), updateUserRole);

// Admin болон Test Admin (харин Test Admin зөвхөн GET)
router.put('/users/:id/status', restrictTestAdmin('update'), updateUserStatus);

// ==================== ХИЧЭЭЛ УДИРДЛАГА ====================
// Test Admin зөвхөн үзэх эрхтэй
router.post('/courses', restrictTestAdmin('create'), createCourse);
router.put('/courses/:id', restrictTestAdmin('update'), updateCourse);
router.delete('/courses/:id', restrictTestAdmin('delete'), authorize('admin'), deleteCourse);
router.post('/courses/:id/sections', restrictTestAdmin('create'), addCourseSection);
router.post('/sections/:sectionId/lessons', restrictTestAdmin('create'), addLesson);

module.exports = router;