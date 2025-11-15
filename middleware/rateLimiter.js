const rateLimit = require('express-rate-limit');

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Хэт олон хүсэлт илгээсэн байна. 15 минутын дараа дахин оролдоно уу'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Хэт олон оролдлого хийсэн байна. 15 минутын дараа дахин оролдоно уу'
  },
});