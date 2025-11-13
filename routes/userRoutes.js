const express = require('express');
const router = express.Router();
const {
  updateProfile,
  changePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Бүх routes хамгаалагдсан
router.use(protect);

router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;