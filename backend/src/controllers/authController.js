const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');
const { generateId } = require('../utils/idGenerator');
const crypto = require('crypto');
const path = require('path');
const { extractTextFromImage, parseCNICDetails } = require('../utils/ocrService');
const { notify } = require('../utils/notifier');

const SALT_ROUNDS = 10;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const CNIC_REGEX = /^\d{13}$/;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$/;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '24h';

const tableMap = {
  Admin: { table: 'Admin', idCol: 'adminID', usernameCol: 'username' },
  Citizen: { table: 'Citizen', idCol: 'citizenID', usernameCol: 'username' },
  RescueTeam: { table: 'RescueTeam', idCol: 'teamID', usernameCol: 'username' },
  NGO: { table: 'NGO', idCol: 'ngoID', usernameCol: 'username' }
};

const isBcryptHash = (value) => typeof value === 'string' && BCRYPT_HASH_REGEX.test(value);

const verifyPassword = async (providedPassword, storedPassword) => {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(providedPassword, storedPassword);
  }
  // Backward compatibility for imported databases with legacy plain-text passwords.
  return providedPassword === storedPassword;
};

const maybeUpgradePasswordHash = async (pool, roleInfo, user, plainPassword) => {
  if (isBcryptHash(user.password)) return;
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  await pool.request()
    .input('id', sql.VarChar, user[roleInfo.idCol])
    .input('password', sql.VarChar, hashedPassword)
    .query(`UPDATE ${roleInfo.table} SET password = @password WHERE ${roleInfo.idCol} = @id`);
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password, role, identifier } = req.body;
    const loginId = identifier || username;

    if (!loginId || !password || !role) {
      return res.status(400).json({ success: false, message: 'Username/ID, password, and role are required.', error: 'VALIDATION_ERROR' });
    }

    const roleInfo = tableMap[role];
    if (!roleInfo) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.', error: 'INVALID_ROLE' });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('loginId', sql.VarChar, loginId)
      .query(`SELECT * FROM ${roleInfo.table} WHERE ${roleInfo.usernameCol} = @loginId OR ${roleInfo.idCol} = @loginId OR email = @loginId`);

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.', error: 'AUTH_FAILED' });
    }

    const user = result.recordset[0];

    // BR-013: Check if NGO/RescueTeam is approved
    if ((role === 'NGO' || role === 'RescueTeam') && !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account pending approval.', error: 'ACCOUNT_PENDING' });
    }

    if (role === 'Citizen' && !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.', error: 'ACCOUNT_INACTIVE' });
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.', error: 'AUTH_FAILED' });
    }

    await maybeUpgradePasswordHash(pool, roleInfo, user, password);

    // Update lastLogin for Admin
    if (role === 'Admin') {
      await pool.request()
        .input('id', sql.VarChar, user.adminID)
        .query('UPDATE Admin SET lastLogin = GETDATE() WHERE adminID = @id');
    }

    const tokenPayload = { id: user[roleInfo.idCol], role, username: user.username };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: { token, user: userWithoutPassword, role },
      message: 'Login successful.'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.', error: 'INTERNAL_ERROR' });
  }
};

// POST /api/auth/register/citizen
exports.registerCitizen = async (req, res) => {
  try {
    const { name, cnic, contactNumber, email, address, city, dateOfBirth, username, password } = req.body;

    if (!name || !cnic || !contactNumber || !username || !password) {
      return res.status(400).json({ success: false, message: 'Name, CNIC, contact number, username, and password are required.', error: 'VALIDATION_ERROR' });
    }

    // CNIC validation: exactly 13 numeric digits
    if (!CNIC_REGEX.test(cnic)) {
      return res.status(400).json({ success: false, message: 'CNIC must be exactly 13 numeric digits.', error: 'INVALID_CNIC' });
    }

    // Password validation
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with 1 uppercase letter and 1 digit.', error: 'WEAK_PASSWORD' });
    }

    const pool = getPool();

    // Check CNIC uniqueness (BR-014)
    const cnicCheck = await pool.request()
      .input('cnic', sql.VarChar, cnic)
      .query('SELECT citizenID FROM Citizen WHERE cnic = @cnic');

    if (cnicCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'CNIC already registered.', error: 'DUPLICATE_CNIC' });
    }

    // Check username uniqueness
    const usernameCheck = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT citizenID FROM Citizen WHERE username = @username');

    if (usernameCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already taken.', error: 'DUPLICATE_USERNAME' });
    }

    const citizenID = await generateId('CIT', 'Citizen', 'citizenID');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.request()
      .input('citizenID', sql.VarChar, citizenID)
      .input('name', sql.VarChar, name)
      .input('cnic', sql.VarChar, cnic)
      .input('contactNumber', sql.VarChar, contactNumber)
      .input('email', sql.VarChar, email || null)
      .input('address', sql.NVarChar(sql.MAX), address || null)
      .input('city', sql.VarChar, city || null)
      .input('dateOfBirth', sql.Date, dateOfBirth || null)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .query(`INSERT INTO Citizen (citizenID, name, cnic, contactNumber, email, address, city, dateOfBirth, username, password)
              VALUES (@citizenID, @name, @cnic, @contactNumber, @email, @address, @city, @dateOfBirth, @username, @password)`);

    res.status(201).json({
      success: true,
      data: { citizenID, username },
      message: 'Citizen registered successfully.'
    });
  } catch (err) {
    console.error('Register citizen error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.', error: 'INTERNAL_ERROR' });
  }
};

// POST /api/auth/register/ngo
exports.registerNGO = async (req, res) => {
  try {
    const { ngoName, registrationNumber, contactNumber, email, address, city, focusArea, username, password } = req.body;

    if (!ngoName || !registrationNumber || !contactNumber || !username || !password) {
      return res.status(400).json({ success: false, message: 'NGO name, registration number, contact, username, and password are required.', error: 'VALIDATION_ERROR' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with 1 uppercase letter and 1 digit.', error: 'WEAK_PASSWORD' });
    }

    const pool = getPool();

    const regCheck = await pool.request()
      .input('regNum', sql.VarChar, registrationNumber)
      .query('SELECT ngoID FROM NGO WHERE registrationNumber = @regNum');

    if (regCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Registration number already exists.', error: 'DUPLICATE_REGISTRATION' });
    }

    const usernameCheck = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT ngoID FROM NGO WHERE username = @username');

    if (usernameCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already taken.', error: 'DUPLICATE_USERNAME' });
    }

    const ngoID = await generateId('NGO', 'NGO', 'ngoID');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.request()
      .input('ngoID', sql.VarChar, ngoID)
      .input('ngoName', sql.VarChar, ngoName)
      .input('registrationNumber', sql.VarChar, registrationNumber)
      .input('contactNumber', sql.VarChar, contactNumber)
      .input('email', sql.VarChar, email || null)
      .input('address', sql.NVarChar(sql.MAX), address || null)
      .input('city', sql.VarChar, city || null)
      .input('focusArea', sql.VarChar, focusArea || null)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .query(`INSERT INTO NGO (ngoID, ngoName, registrationNumber, contactNumber, email, address, city, focusArea, username, password, isActive, status)
              VALUES (@ngoID, @ngoName, @registrationNumber, @contactNumber, @email, @address, @city, @focusArea, @username, @password, 0, 'Pending')`);

    await notify('Admin', 'general', 'NGO Approval Needed',
      `New NGO "${ngoName}" (${ngoID}) registered and awaits approval.`,
      { relatedEntity: 'NGO', relatedID: ngoID, redirectPath: '/admin/users' });

    res.status(201).json({
      success: true,
      data: { ngoID, username },
      message: 'NGO registered successfully. Awaiting admin approval.'
    });
  } catch (err) {
    console.error('Register NGO error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.', error: 'INTERNAL_ERROR' });
  }
};

// POST /api/auth/register/rescueteam
exports.registerRescueTeam = async (req, res) => {
  try {
    const { teamName, specialization, teamSize, contactNumber, email, location, city, username, password } = req.body;

    if (!teamName || !contactNumber || !username || !password) {
      return res.status(400).json({ success: false, message: 'Team name, contact, username, and password are required.', error: 'VALIDATION_ERROR' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with 1 uppercase letter and 1 digit.', error: 'WEAK_PASSWORD' });
    }

    const pool = getPool();

    const usernameCheck = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT teamID FROM RescueTeam WHERE username = @username');

    if (usernameCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already taken.', error: 'DUPLICATE_USERNAME' });
    }

    const teamID = await generateId('RT', 'RescueTeam', 'teamID');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.request()
      .input('teamID', sql.VarChar, teamID)
      .input('teamName', sql.VarChar, teamName)
      .input('specialization', sql.VarChar, specialization || null)
      .input('teamSize', sql.Int, teamSize || null)
      .input('contactNumber', sql.VarChar, contactNumber)
      .input('email', sql.VarChar, email || null)
      .input('location', sql.NVarChar(sql.MAX), location || null)
      .input('city', sql.VarChar, city || null)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .query(`INSERT INTO RescueTeam (teamID, teamName, specialization, teamSize, contactNumber, email, location, city, username, password, isActive, status)
              VALUES (@teamID, @teamName, @specialization, @teamSize, @contactNumber, @email, @location, @city, @username, @password, 0, 'Pending')`);

    await notify('Admin', 'general', 'Rescue Team Approval Needed',
      `New Rescue Team "${teamName}" (${teamID}) registered and awaits approval.`,
      { relatedEntity: 'RescueTeam', relatedID: teamID, redirectPath: '/admin/users' });

    res.status(201).json({
      success: true,
      data: { teamID, username },
      message: 'Rescue team registered successfully. Awaiting admin approval.'
    });
  } catch (err) {
    console.error('Register rescue team error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.', error: 'INTERNAL_ERROR' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const roleInfo = tableMap[role];

    if (!roleInfo) {
      return res.status(400).json({ success: false, message: 'Invalid role.', error: 'INVALID_ROLE' });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .query(`SELECT * FROM ${roleInfo.table} WHERE ${roleInfo.idCol} = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.', error: 'NOT_FOUND' });
    }

    const { password: _, ...user } = result.recordset[0];
    res.json({ success: true, data: { user, role }, message: 'Profile retrieved.' });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Server error.', error: 'INTERNAL_ERROR' });
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.', error: 'VALIDATION_ERROR' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters with 1 uppercase letter and 1 digit.', error: 'WEAK_PASSWORD' });
    }

    const roleInfo = tableMap[role];
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .query(`SELECT password FROM ${roleInfo.table} WHERE ${roleInfo.idCol} = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.', error: 'NOT_FOUND' });
    }

    const isMatch = await verifyPassword(currentPassword, result.recordset[0].password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.', error: 'INVALID_PASSWORD' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.request()
      .input('id', sql.VarChar, id)
      .input('password', sql.VarChar, hashedPassword)
      .query(`UPDATE ${roleInfo.table} SET password = @password WHERE ${roleInfo.idCol} = @id`);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Server error.', error: 'INTERNAL_ERROR' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully. Please discard your token.' });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { username, role } = req.body;

    if (!username || !role) {
      return res.status(400).json({ success: false, message: 'Username and role are required.', error: 'VALIDATION_ERROR' });
    }

    const roleInfo = tableMap[role];
    if (!roleInfo) {
      return res.status(400).json({ success: false, message: 'Invalid role.', error: 'INVALID_ROLE' });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`SELECT ${roleInfo.idCol} FROM ${roleInfo.table} WHERE username = @username`);

    if (result.recordset.length === 0) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If the account exists, a reset token has been generated.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log(`Password reset token for ${username} (${role}): ${resetToken}`);

    res.json({ success: true, message: 'If the account exists, a reset token has been generated.', data: { resetToken } });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error.', error: 'INTERNAL_ERROR' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { username, role, resetToken, newPassword } = req.body;

    if (!username || !role || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.', error: 'VALIDATION_ERROR' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with 1 uppercase letter and 1 digit.', error: 'WEAK_PASSWORD' });
    }

    const roleInfo = tableMap[role];
    if (!roleInfo) {
      return res.status(400).json({ success: false, message: 'Invalid role.', error: 'INVALID_ROLE' });
    }

    const pool = getPool();
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .query(`UPDATE ${roleInfo.table} SET password = @password WHERE username = @username`);

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error.', error: 'INTERNAL_ERROR' });
  }
};

// POST /api/auth/scan-cnic
exports.scanCNIC = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'CNIC image is required.', error: 'NO_FILE' });
    }

    const imagePath = path.resolve(req.file.path);
    const { text, confidence } = await extractTextFromImage(imagePath);
    if (!text) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Unable to read text from image. Please try again with a clearer photo.'
      });
    }

    const details = parseCNICDetails(text) || {};

    res.json({
      success: true,
      data: {
        ...details,
        confidence: confidence / 100 // normalize 0–1
      },
      message: 'CNIC scanned successfully.'
    });
  } catch (err) {
    console.error('Scan CNIC error:', err);
    res.status(500).json({ success: false, message: 'Failed to process CNIC image.', error: 'INTERNAL_ERROR' });
  }
};
