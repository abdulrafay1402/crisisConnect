const { validationResult, body, param, query } = require('express-validator');
const { ValidationError } = require('./errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));
    throw new ValidationError('Validation failed', errorMessages);
  }
  next();
};

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const commonValidations = {
  email: body('email').optional().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  requiredEmail: body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  password: body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  username: body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  name: body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  contactNumber: body('contactNumber').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Please provide a valid contact number'),
  requiredContactNumber: body('contactNumber').trim().notEmpty().withMessage('Contact number is required').matches(/^[0-9+\-\s()]+$/).withMessage('Please provide a valid contact number'),
  city: body('city').optional().trim().isLength({ max: 100 }).withMessage('City name must not exceed 100 characters'),
  address: body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  latitude: body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  longitude: body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  rating: body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  quantity: body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
};

module.exports = { validate, validatePagination, commonValidations, body, param, query };
