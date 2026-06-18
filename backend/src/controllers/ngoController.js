const bcrypt = require('bcryptjs');
const { NGO } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');

const getAllNGOs = asyncHandler(async (req, res) => {
  const ngos = await NGO.findAll();
  const data = ngos.map(({ password, ...rest }) => rest);
  res.json({ success: true, data });
});

const getNGOById = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) throw new NotFoundError('NGO not found');
  const { password, ...data } = ngo;
  res.json({ success: true, data });
});

const getAvailableNGOs = asyncHandler(async (req, res) => {
  const ngos = await NGO.findAvailable();
  const data = ngos.map(({ password, ...rest }) => rest);
  res.json({ success: true, data, count: data.length });
});

const updateNGO = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) throw new NotFoundError('NGO not found');

  if (req.user.userType !== 'Admin' && req.user.id !== req.params.id) {
    throw new BadRequestError('Not authorized');
  }

  const { ngoName, registrationNumber, contactNumber, email, address, city, focusArea, status, username, password: pwd, isActive } = req.body;
  if (username && username !== ngo.username) {
    const existing = await NGO.findByUsername(username);
    if (existing) throw new ConflictError('Username already exists');
  }
  if (registrationNumber && registrationNumber !== ngo.registrationNumber) {
    const existing = await NGO.findByRegistrationNumber(registrationNumber);
    if (existing) throw new ConflictError('Registration number already exists');
  }

  const updates = { ...ngo };
  if (ngoName) updates.ngoName = ngoName;
  if (registrationNumber) updates.registrationNumber = registrationNumber;
  if (contactNumber !== undefined) updates.contactNumber = contactNumber;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;
  if (focusArea) updates.focusArea = focusArea;
  if (status) updates.status = status;
  if (username) updates.username = username;
  if (req.user.userType === 'Admin' && isActive !== undefined) updates.isActive = isActive;
  if (pwd) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(pwd, salt);
  }
  await NGO.update(updates);
  const updated = await NGO.findById(req.params.id);
  const { password, ...data } = updated;
  res.json({ success: true, message: 'NGO updated', data });
});

const updateNGOStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) throw new NotFoundError('NGO not found');
  await NGO.updateStatus(req.params.id, status);
  const updated = await NGO.findById(req.params.id);
  const { password, ...data } = updated;
  res.json({ success: true, message: 'NGO status updated', data });
});

const deleteNGO = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) throw new NotFoundError('NGO not found');
  await NGO.delete(req.params.id);
  res.json({ success: true, message: 'NGO deleted' });
});

const getNGOStats = asyncHandler(async (req, res) => {
  const stats = await NGO.getStats();
  res.json({ success: true, data: stats });
});

const approveNGO = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) throw new NotFoundError('NGO not found');
  await NGO.approve(req.params.id, req.user.id);
  const updated = await NGO.findById(req.params.id);
  const { password, ...data } = updated;
  await notify('NGO', 'general', 'Registration Approved',
    `Your NGO "${ngo.ngoName}" has been approved. You can now login and access the platform.`,
    { targetUserID: req.params.id, relatedEntity: 'NGO', relatedID: req.params.id, redirectPath: '/ngo' });
  await notify('Admin', 'ngo_update', 'NGO Approved',
    `NGO "${ngo.ngoName}" (${req.params.id}) has been approved by ${req.user.name || req.user.id}`,
    { relatedEntity: 'NGO', relatedID: req.params.id, redirectPath: '/admin/users' });
  res.json({ success: true, message: 'NGO approved', data });
});

const rejectNGO = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) throw new NotFoundError('NGO not found');
  await NGO.reject(req.params.id);
  const updated = await NGO.findById(req.params.id);
  const { password, ...data } = updated;
  await notify('NGO', 'general', 'Registration Rejected',
    `Your NGO "${ngo.ngoName}" registration has been rejected. Please contact support for details.`,
    { targetUserID: req.params.id, relatedEntity: 'NGO', relatedID: req.params.id });
  res.json({ success: true, message: 'NGO rejected', data });
});

module.exports = { getAllNGOs, getNGOById, getAvailableNGOs, updateNGO, updateNGOStatus, deleteNGO, getNGOStats, approveNGO, rejectNGO };
