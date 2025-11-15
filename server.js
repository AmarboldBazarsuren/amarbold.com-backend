const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

dotenv.config();
require('./config/db');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use('/api/', apiLimiter);
// Request logging
app.use((req, res, next) => {
  console.log(req.method + ' ' + req.path + ' - ' + new Date().toISOString());
  next();
});

// ==================== ROUTES ====================
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const discountRoutes = require('./routes/discountRoutes'); // ✅ Шинэ
const ratingRoutes = require('./routes/ratingRoutes');
const { router: userRoutes, publicRouter } = require('./routes/userRoutes');

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server ажиллаж байна',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AmarBold.mn API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', publicRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/discounts', discountRoutes); // ✅ Хямдрал routes
app.use('/api/ratings', ratingRoutes);
// ==================== ERROR HANDLING ====================
// 404 Handler
app.use((req, res) => {
  console.log('❌ 404 - Route олдсонгүй:', req.method, req.path);
  res.status(404).json({
    success: false,
    message: 'Route олдсонгүй'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Алдаа:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Серверийн алдаа',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('==================================================');
  console.log('🚀 Server: http://localhost:' + PORT);
  console.log('==================================================');
  console.log('✅ Routes бүртгэгдсэн:');
  console.log('   AUTH:');
  console.log('   POST   /api/auth/login');
  console.log('   POST   /api/auth/register');
  console.log('   GET    /api/auth/me');
  console.log('');
  console.log('   COURSES:');
  console.log('   GET    /api/courses');
  console.log('   GET    /api/courses/my-courses');
  console.log('   GET    /api/courses/:id');
  console.log('   POST   /api/courses/:id/enroll');
  console.log('');
  console.log('   INSTRUCTORS:');
  console.log('   GET    /api/instructors');
  console.log('   GET    /api/instructors/:id');
  console.log('');
  console.log('   LESSONS:');
  console.log('   POST   /api/lessons/:lessonId/complete');
  console.log('   DELETE /api/lessons/:lessonId/complete');
  console.log('   GET    /api/lessons/:courseId/progress');
  console.log('');
  console.log('   DISCOUNTS: ✅');
  console.log('   GET    /api/discounts/active');
  console.log('   POST   /api/discounts/courses/:courseId');
  console.log('   GET    /api/discounts/courses/:courseId');
  console.log('   PUT    /api/discounts/:discountId/deactivate');
  console.log('   DELETE /api/discounts/:discountId');
  console.log('');
  console.log('   USERS:');
  console.log('   PUT    /api/users/profile');
  console.log('   PUT    /api/users/change-password');
  console.log('   PUT    /api/users/instructor-profile');
  console.log('');
  console.log('   ADMIN:');
  console.log('   GET    /api/admin/stats');
  console.log('   GET    /api/admin/courses');
  console.log('   POST   /api/admin/courses');
  console.log('==================================================');
  console.log('');
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

module.exports = app;