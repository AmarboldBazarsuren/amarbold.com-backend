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
  getMyStudents,
  getAdminCourses,
  updateSection,      // ✅ Шинэ
  deleteSection,      // ✅ Шинэ
  updateLesson,       // ✅ Шинэ
  deleteLesson        // ✅ Шинэ
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { validateCourse } = require('../middleware/validator');
router.use(protect);
router.use(authorize('admin', 'test_admin'));

// ==================== СТАТИСТИК ====================
router.get('/stats', getAdminStats);
router.get('/logs', authorize('admin'), getAdminLogs);
router.get('/my-students', getMyStudents);

// ==================== ХЭРЭГЛЭГЧ УДИРДЛАГА ====================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users/create-test-admin', authorize('admin'), createTestAdmin);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
router.put('/users/:id/status', authorize('admin'), updateUserStatus);

// ==================== ХИЧЭЭЛ УДИРДЛАГА ====================
router.get('/courses', getAdminCourses);
router.post('/courses', validateCourse, createCourse);
router.put('/courses/:id',validateCourse, updateCourse);
router.delete('/courses/:id', authorize('admin'), deleteCourse);

// Section
router.post('/courses/:id/sections', addCourseSection);
router.put('/sections/:id', updateSection);           // ✅ Шинэ
router.delete('/sections/:id', deleteSection);        // ✅ Шинэ

// Lesson
router.post('/sections/:sectionId/lessons', addLesson);
router.put('/lessons/:id', updateLesson);             // ✅ Шинэ
router.delete('/lessons/:id', deleteLesson);          // ✅ Шинэ

module.exports = router;