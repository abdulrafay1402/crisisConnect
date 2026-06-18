const bcrypt = require('bcryptjs');
const { RescueTeam } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');

const getAllRescueTeams = asyncHandler(async (req, res) => {
  const teams = await RescueTeam.findAll();
  const data = teams.map(({ password, ...rest }) => rest);
  res.json({ success: true, data });
});

const getRescueTeamById = asyncHandler(async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) throw new NotFoundError('Rescue team not found');
  const { password, ...data } = team;
  res.json({ success: true, data });
});

const getAvailableTeams = asyncHandler(async (req, res) => {
  const teams = await RescueTeam.findAvailable();
  const data = teams.map(({ password, ...rest }) => rest);
  res.json({ success: true, data, count: data.length });
});

const updateRescueTeam = asyncHandler(async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) throw new NotFoundError('Rescue team not found');

  if (req.user.userType !== 'Admin' && req.user.id !== req.params.id) {
    throw new BadRequestError('Not authorized');
  }

  const { teamName, specialization, teamSize, contactNumber, email, location, city, status, username, password: pwd, isActive } = req.body;
  if (username && username !== team.username) {
    const existing = await RescueTeam.findByUsername(username);
    if (existing) throw new ConflictError('Username already exists');
  }

  const updates = { ...team };
  if (teamName) updates.teamName = teamName;
  if (specialization) updates.specialization = specialization;
  if (teamSize !== undefined) updates.teamSize = teamSize;
  if (contactNumber !== undefined) updates.contactNumber = contactNumber;
  if (email !== undefined) updates.email = email;
  if (location !== undefined) updates.location = location;
  if (city !== undefined) updates.city = city;
  if (status) updates.status = status;
  if (username) updates.username = username;
  if (req.user.userType === 'Admin' && isActive !== undefined) updates.isActive = isActive;
  if (pwd) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(pwd, salt);
  }
  await RescueTeam.update(updates);
  const updated = await RescueTeam.findById(req.params.id);
  const { password, ...data } = updated;
  res.json({ success: true, message: 'Rescue team updated', data });
});

const updateTeamStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const team = await RescueTeam.findById(req.params.id);
  if (!team) throw new NotFoundError('Rescue team not found');
  await RescueTeam.updateStatus(req.params.id, status);
  const updated = await RescueTeam.findById(req.params.id);
  const { password, ...data } = updated;
  res.json({ success: true, message: 'Team status updated', data });
});

const deleteRescueTeam = asyncHandler(async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) throw new NotFoundError('Rescue team not found');
  await RescueTeam.delete(req.params.id);
  res.json({ success: true, message: 'Rescue team deleted' });
});

const getRescueTeamStats = asyncHandler(async (req, res) => {
  const stats = await RescueTeam.getStats();
  res.json({ success: true, data: stats });
});

const approveRescueTeam = asyncHandler(async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) throw new NotFoundError('Rescue team not found');
  await RescueTeam.approve(req.params.id, req.user.id);
  const updated = await RescueTeam.findById(req.params.id);
  const { password, ...data } = updated;
  await notify('RescueTeam', 'general', 'Registration Approved',
    `Your rescue team "${team.teamName}" has been approved. You can now login and start handling assigned disasters and emergencies.`,
    { targetUserID: req.params.id, relatedEntity: 'RescueTeam', relatedID: req.params.id, redirectPath: '/rescue' });
  await notify('Admin', 'general', 'Rescue Team Approved',
    `Rescue team "${team.teamName}" (${req.params.id}) has been approved by ${req.user.name || req.user.id}`,
    { relatedEntity: 'RescueTeam', relatedID: req.params.id, redirectPath: '/admin/users' });
  res.json({ success: true, message: 'Rescue team approved', data });
});

const rejectRescueTeam = asyncHandler(async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) throw new NotFoundError('Rescue team not found');
  await RescueTeam.reject(req.params.id);
  const updated = await RescueTeam.findById(req.params.id);
  const { password, ...data } = updated;
  await notify('RescueTeam', 'general', 'Registration Rejected',
    `Your rescue team "${team.teamName}" registration has been rejected. Please contact support.`,
    { targetUserID: req.params.id, relatedEntity: 'RescueTeam', relatedID: req.params.id });
  res.json({ success: true, message: 'Rescue team rejected', data });
});

module.exports = { getAllRescueTeams, getRescueTeamById, getAvailableTeams, updateRescueTeam, updateTeamStatus, deleteRescueTeam, getRescueTeamStats, approveRescueTeam, rejectRescueTeam };
