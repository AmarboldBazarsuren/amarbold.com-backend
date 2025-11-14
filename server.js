const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Environment variables
dotenv.config();

// Database холболт
require('./config/db');

// Express app үүсгэх
const app = express();

// ==================== MIDDLEWARE ====================

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Static files (uploads folder)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ==================== ROUTES ====================

// Import routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ❗ userRoutes – ШИНЭ ЗӨВ ИМПОРТ
const { router: userRoutes, publicRouter } = require('./routes/userRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);        // Private routes
app.use('/api/users', publicRouter);      // Public routes
app.use('/api/admin', adminRoutes);

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
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route олдсонгүй'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Алдаа:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Серверийн алдаа',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SERVER ЭХЛҮҮЛЭХ ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log(`🚀 Server ажиллаж байна: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('='.repeat(50));
  console.log('');
  console.log('📍 API Endpoints:');
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Courses: http://localhost:${PORT}/api/courses`);
  console.log(`   - Users: http://localhost:${PORT}/api/users`);
  console.log(`   - Admin: http://localhost:${PORT}/api/admin`);
  console.log('='.repeat(50));
  console.log('');
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

module.exports = app;
