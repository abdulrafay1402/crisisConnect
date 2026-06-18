const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError, asyncHandler } = require('./errorHandler');

const generateToken = (user, userType) => {
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '24h';
  return jwt.sign(
    {
      id: user.adminID || user.citizenID || user.ngoID || user.teamID,
      username: user.username,
      userType,
      role: userType,
      name: user.name || user.ngoName || user.teamName
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: jwtExpiresIn }
  );
};

const verifyToken = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) throw new UnauthorizedError('Access denied. No token provided.');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new UnauthorizedError('Token has expired');
    throw new UnauthorizedError('Invalid token');
  }
});

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) throw new UnauthorizedError('Not authenticated');
    const userRole = req.user.userType || req.user.role;
    if (!allowedRoles.includes(userRole)) throw new ForbiddenError('You do not have permission to perform this action');
    next();
  };
};

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    } catch (error) { /* continue without user */ }
  }
  next();
});

module.exports = { generateToken, verifyToken, authorize, optionalAuth };
module.exports.auth = verifyToken;
