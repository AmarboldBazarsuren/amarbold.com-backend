const express = require('express');

const router = express.Router();
const publicRouter = express.Router();

const {
  updateProfile,
  changePassword,
  updateInstructorProfile,
  getInstructorProfile
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');

// ========================
// Private routes
// ========================
router.use(protect);

router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/instructor-profile', updateInstructorProfile);

// ========================
// Public routes
// ========================
publicRouter.get('/instructor/:id', protect, getInstructorProfile);  // ✅ protect нэмсэн

// ========================
// EXPORTS
// ========================
module.exports = {
  router,
  publicRouter,
};