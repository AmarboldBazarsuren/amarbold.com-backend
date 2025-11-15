const rateLimit = require('express-rate-limit');

// 🔥 Development-д rate limiting-ийг ИДЭВХГҮЙ болгох
const isDevelopment = process.env.NODE_ENV !== 'production';

// Dummy middleware (Development-д юу ч хийхгүй)
const noOpMiddleware = (req, res, next) => next();

// 🔥 General API limiter - МАश зөөлөн (хэрэглэгч олон үйлдэл хийнэ)
exports.apiLimiter = isDevelopment ? noOpMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 2000, // 🔥 2000 request/15min = ~133 req/min (~2 req/sec) - МАШ зохистой
  message: {
    success: false,
    message: 'Хэт олон хүсэлт илгээсэн байна. 15 минутын дараа дахин оролдоно уу'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`⚠️  Rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Хэт олон хүсэлт илгээсэн байна. Түр хүлээнэ үү'
    });
  }
});

// 🔥 Auth limiter (нэвтрэх, бүртгүүлэх)
exports.authLimiter = isDevelopment ? noOpMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15 минутанд 10 оролдлого (Production-д)
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Хэт олон оролдлого хийсэн байна. 15 минутын дараа дахин оролдоно уу'
  },
  handler: (req, res) => {
    console.log(`🚨 Auth rate limit exceeded: ${req.ip} - ${req.body.email || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: 'Хэт олон нэвтрэх оролдлого. 15 минутын дараа дахин оролдоно уу'
    });
  }
});

// 🔥 Heavy operations limiter
exports.heavyOperationLimiter = isDevelopment ? noOpMiddleware : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 цаг
  max: 50, // 1 цагт 50 удаа
  message: {
    success: false,
    message: 'Хэт олон хүсэлт илгээсэн байна'
  }
});

// 🔥 Admin operations limiter
exports.adminLimiter = isDevelopment ? noOpMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Admin илүү их үйлдэл хийх боломжтой
  skipFailedRequests: true
});

// Development-д мэдэгдэл харуулах
if (isDevelopment) {
  console.log('⚠️  Rate limiting ИДЭВХГҮЙ (Development mode)');
} else {
  console.log('✅ Rate limiting ИДЭВХТЭЙ (Production mode)');
}