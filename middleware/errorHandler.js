// 🔥 Production-ready error handler

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Database алдаа handler
const handleDBError = (error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return new AppError('Давхардсан өгөгдөл байна', 400);
  }
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return new AppError('Database table олдсонгүй', 500);
  }
  if (error.code === 'PROTOCOL_CONNECTION_LOST') {
    return new AppError('Database холболт тасарсан', 500);
  }
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return new AppError('Database эрх хүрэлцэхгүй байна', 500);
  }
  return error;
};

// JWT алдаа handler
const handleJWTError = () => {
  return new AppError('Token буруу байна. Дахин нэвтэрнэ үү', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Token хүчингүй болсон. Дахин нэвтэрнэ үү', 401);
};

// Development алдаа response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Production алдаа response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } 
  // Programming or unknown error: don't leak error details
  else {
    console.error('❌ АЛДАА:', err);
    res.status(500).json({
      success: false,
      message: 'Серверийн алдаа гарлаа'
    });
  }
};

// 🔥 Main error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log алдаа
  console.error('🚨 Error occurred:', {
    method: req.method,
    path: req.path,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode
  });

  // Database алдаа шалгах
  if (err.code && err.code.startsWith('ER_')) {
    err = handleDBError(err);
  }

  // JWT алдаа шалгах
  if (err.name === 'JsonWebTokenError') err = handleJWTError();
  if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();

  // Environment дээр үндэслэн response өгөх
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

// Async function алдаа барих wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync
};