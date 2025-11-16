const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler'); // 🔥 Шинэ

dotenv.config();
require('./config/db');

const app = express();

// 🔥 Trust proxy (production-д заавал хэрэгтэй)
app.set('trust proxy', 1);

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' })); // 🔥 Request size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false // 🔥 YouTube embed-д зориулж
}));
app.use(compression());
app.use('/api/', apiLimiter);

// 🔥 Request logging (production-д minimal хэвээр)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ==================== ROUTES ====================
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const discountRoutes = require('./routes/discountRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const { router: userRoutes, publicRouter } = require('./routes/userRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server ажиллаж байна',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AmarBold.mn API',
    version: '1.0.0',
    environment: process.env.NODE_ENV
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
app.use('/api/discounts', discountRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/public', publicRoutes);

// ==================== ERROR HANDLING ====================
// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route олдсонгүй'
  });
});

// 🔥 Global error handler (шинэчилсэн)
app.use(errorHandler);

// ==================== SERVER ====================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('==================================================');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('==================================================');
});

// 🔥 Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// 🔥 Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  
  // Production-д server-ийг унагахгүй, зөвхөн log хийнэ
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  Server үргэлжлүүлэн ажиллаж байна');
  } else {
    server.close(() => {
      process.exit(1);
    });
  }
});

// 🔥 Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! 💥');
  console.error(err.name, err.message);
  console.error(err.stack);
  
  // Production-д server-ийг унагахгүй
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  Server үргэлжлүүлэн ажиллаж байна');
  } else {
    process.exit(1);
  }
});

module.exports = app;