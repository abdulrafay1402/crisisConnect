const bcrypt = require('bcryptjs');
const { Admin } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.findAll();
  const data = admins.map(({ password, ...rest }) => rest);
  res.json({ success: true, data });
});

const getAdminById = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) throw new NotFoundError('Admin not found');
  const { password, ...data } = admin;
  res.json({ success: true, data });
});

const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, contactNumber, username, password: pwd } = req.body;
  if (!name || !username || !pwd) throw new BadRequestError('Name, username, and password are required');

  const existing = await Admin.findByUsername(username);
  if (existing) throw new ConflictError('Username already exists');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(pwd, salt);
  const adminID = await Admin.insert({ name, email, contactNumber, username, password: hashedPassword });
  const admin = await Admin.findById(adminID);
  const { password, ...data } = admin;
  res.status(201).json({ success: true, message: 'Admin created successfully', data });
});

const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) throw new NotFoundError('Admin not found');

  const { name, email, contactNumber, username, password: pwd, isActive } = req.body;
  if (username && username !== admin.username) {
    const existing = await Admin.findByUsername(username);
    if (existing) throw new ConflictError('Username already exists');
  }

  const updates = { ...admin };
  if (name) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (contactNumber !== undefined) updates.contactNumber = contactNumber;
  if (username) updates.username = username;
  if (isActive !== undefined) updates.isActive = isActive;
  if (pwd) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(pwd, salt);
  }
  await Admin.update(req.params.id, updates);
  const updated = await Admin.findById(req.params.id);
  const { password, ...data } = updated;
  res.json({ success: true, message: 'Admin updated', data });
});

const deleteAdmin = asyncHandler(async (req, res) => {
  if (req.user.id === req.params.id) throw new BadRequestError('Cannot delete yourself');
  const admin = await Admin.findById(req.params.id);
  if (!admin) throw new NotFoundError('Admin not found');
  await Admin.delete(req.params.id);
  res.json({ success: true, message: 'Admin deleted' });
});

module.exports = { getAllAdmins, getAdminById, createAdmin, updateAdmin, deleteAdmin };
