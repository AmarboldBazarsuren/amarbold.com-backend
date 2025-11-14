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
  getAdminCourses // ✅ Шинэ функц нэмэх
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Бүх routes Admin эсвэл Test Admin эрх шаардлагатай
router.use(protect);
router.use(authorize('admin', 'test_admin'));

// ==================== СТАТИСТИК ====================
router.get('/stats', getAdminStats);
router.get('/logs', authorize('admin'), getAdminLogs);
router.get('/my-students', getMyStudents);

// ==================== ХЭРЭГЛЭГЧ УДИРДЛАГА ====================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);

// Зөвхөн Super Admin
router.post('/users/create-test-admin', authorize('admin'), createTestAdmin);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
router.put('/users/:id/status', authorize('admin'), updateUserStatus);

// ==================== ХИЧЭЭЛ УДИРДЛАГА ====================
// ✅ Админ самбарын хичээлүүд (Test Admin өөрийнхөө, Super Admin бүгдийг)
router.get('/courses', getAdminCourses);

// Test Admin БАС хичээл нэмж, засах эрхтэй
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', authorize('admin'), deleteCourse);
router.post('/courses/:id/sections', addCourseSection);
router.post('/sections/:sectionId/lessons', addLesson);

module.exports = router;