class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') { super(message, 400); }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401); }
}
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403); }
}
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') { super(message, 404); }
}
class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(message, 409); }
}
class ValidationError extends AppError {
  constructor(message = 'Validation Error', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

const containsTechnicalDetails = (message = '') => {
  const value = String(message).toLowerCase();
  const signatures = [
    'sql', 'select ', 'insert ', 'update ', 'delete ',
    'odbc', 'stack', 'constraint', 'invalid column', 'timeout expired'
  ];
  return signatures.some((sig) => value.includes(sig));
};

const safeMessage = (message = '') => {
  if (!message || containsTechnicalDetails(message)) {
    return 'A server error occurred while processing your request.';
  }
  return message;
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  const userMessage = safeMessage(err.message);

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: userMessage,
      ...(containsTechnicalDetails(err.message) && { debugMessage: err.message }),
      error: containsTechnicalDetails(err.message) ? undefined : err,
      stack: containsTechnicalDetails(err.message) ? undefined : err.stack
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: userMessage,
      ...(err.errors && { errors: err.errors })
    });
  }

  console.error('ERROR:', err);
  return res.status(500).json({ status: 'error', message: 'Something went wrong' });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError, BadRequestError, UnauthorizedError, ForbiddenError,
  NotFoundError, ConflictError, ValidationError,
  notFoundHandler, errorHandler, asyncHandler
};
