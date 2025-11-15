const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

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

// Request logging
app.use((req, res, next) => {
  console.log(req.method + ' ' + req.path + ' - ' + new Date().toISOString());
  next();
});

// ==================== ROUTES ====================
// ⚠️ ЧУХАЛ: Routes-ыг 404 handler-ээс ӨМНӨ тодорхойлох ёстой!

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const { router: userRoutes, publicRouter } = require('./routes/userRoutes');

// Health check - хамгийн эхэнд
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
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', publicRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/instructors', instructorRoutes); // ⭐ ЭНЭ МӨРИЙГ ШАЛГААРАЙ

// ==================== ERROR HANDLING ====================
// ⚠️ ЧУХАЛ: 404 handler нь routes-ын ДАРАА байх ёстой!

// 404 Handler - routes-ын дараа
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
  console.log('   POST   /api/auth/login');
  console.log('   POST   /api/auth/register');
  console.log('   GET    /api/courses');
  console.log('   GET    /api/instructors  <-- ЭНЭ БАЙГАА ЭСЭХИЙГ ШАЛГААРАЙ');
  console.log('   GET    /api/admin/stats');
  console.log('==================================================');
  console.log('');
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

module.exports = app;