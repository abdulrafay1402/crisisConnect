const { Emergency, EmergencyAssignment, EmergencyUpdate, Alert } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');
const { emitToRole, emitToUser } = require('../utils/socketManager');

const normalizeEmergency = (emergency) => {
  if (!emergency) return emergency;

  return {
    ...emergency,
    reportedDate: emergency.reportedDate || emergency.timestamp || null,
    resolvedDate: emergency.resolvedDate || emergency.resolvedTime || null,
    severity: emergency.severity || 'High'
  };
};

const normalizeEmergencies = (emergencies) => (emergencies || []).map(normalizeEmergency);

const getAllEmergencies = asyncHandler(async (req, res) => {
  const emergencies = await Emergency.findAll();
  res.json({ success: true, data: normalizeEmergencies(emergencies) });
});

const getPendingEmergencies = asyncHandler(async (req, res) => {
  const emergencies = await Emergency.findPending();
  res.json({ success: true, data: normalizeEmergencies(emergencies) });
});

const getEmergencyById = asyncHandler(async (req, res) => {
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  res.json({ success: true, data: normalizeEmergency(emergency) });
});

const getEmergenciesByCitizen = asyncHandler(async (req, res) => {
  const citizenID = req.params.citizenId || req.user.id;
  const emergencies = await Emergency.findByCitizen(citizenID);
  res.json({ success: true, data: normalizeEmergencies(emergencies) });
});

const getEmergenciesByTeam = asyncHandler(async (req, res) => {
  const teamID = req.params.teamId || req.user.id;
  const emergencies = await Emergency.findByTeam(teamID);
  res.json({ success: true, data: normalizeEmergencies(emergencies) });
});

const getEmergenciesByNGO = asyncHandler(async (req, res) => {
  const ngoID = req.params.ngoId || req.user.id;
  const emergencies = await Emergency.findByNGO(ngoID);
  res.json({ success: true, data: normalizeEmergencies(emergencies) });
});

const createEmergency = asyncHandler(async (req, res) => {
  const { emergencyType, description, location, city, latitude, longitude, severity, disasterID } = req.body;
  if (!emergencyType || !location) throw new BadRequestError('Emergency type and location are required');

  const emergencyID = await Emergency.insert({
    citizenID: req.user.id, emergencyType, description,
    location, city, latitude, longitude, severity: severity || 'High',
    disasterID: disasterID || null
  });
  const emergency = await Emergency.findById(emergencyID);
  const creatorRole = req.user.role || req.user.userType;
  const allRoles = ['Admin', 'Citizen', 'RescueTeam', 'NGO'];
  for (const role of allRoles) {
    if (role === creatorRole) continue;
    const redirectMap = { Admin: '/admin/emergencies', Citizen: '/citizen/emergency', RescueTeam: '/rescue/emergencies', NGO: '/ngo/disasters' };
    await notify(role, 'emergency', 'New Emergency SOS',
      `${emergencyType} emergency reported at ${location}`,
      { relatedEntity: 'Emergency', relatedID: emergencyID, redirectPath: redirectMap[role] });
  }
  emitToRole('Admin', 'emergency:new', emergency);
  emitToRole('RescueTeam', 'emergency:new', emergency);
  res.status(201).json({ success: true, message: 'Emergency reported', data: normalizeEmergency(emergency) });
});

const assignTeam = asyncHandler(async (req, res) => {
  const teamID = req.body.teamID || req.body.rescueTeamID;
  if (!teamID) throw new BadRequestError('Team ID is required');
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  await EmergencyAssignment.assignTeam(req.params.id, teamID, req.body.role, req.user.id, req.body.notes);
  if (!emergency.assignedTeamID) {
    await Emergency.assignTeam(req.params.id, teamID);
  } else {
    await Emergency.updateStatus(req.params.id, 'Assigned');
  }
  const updated = await Emergency.findById(req.params.id);
  await notify('RescueTeam', 'emergency', 'Emergency Assigned to You',
    `You have been assigned to emergency ${req.params.id} — ${emergency.emergencyType} at ${emergency.location}`,
    { targetUserID: teamID, relatedEntity: 'Emergency', relatedID: req.params.id, redirectPath: '/rescue/emergencies' });
  const normalizedEmergency = normalizeEmergency(updated);
  emitToRole('RescueTeam', 'emergency:assigned', normalizedEmergency);
  res.json({ success: true, message: 'Team assigned', data: normalizedEmergency });
});

const getEmergencyAssignments = asyncHandler(async (req, res) => {
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  const assignments = await EmergencyAssignment.getAllForEmergency(req.params.id);
  res.json({ success: true, data: assignments });
});

const getEmergencyUpdates = asyncHandler(async (req, res) => {
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  const updates = await EmergencyUpdate.getByEmergency(req.params.id);
  res.json({ success: true, data: updates });
});

const postEmergencyUpdate = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) throw new BadRequestError('Update message is required');
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');

  const userRole = req.user.role || req.user.userType;
  const updateID = await EmergencyUpdate.insert({
    emergencyID: req.params.id,
    senderID: req.user.id,
    senderRole: userRole,
    senderName: req.user.name || req.user.id,
    message: message.trim()
  });

  await notify('Admin', 'emergency', 'Emergency Field Update',
    `${userRole === 'RescueTeam' ? 'Rescue Team' : 'NGO'} ${req.user.name || req.user.id} posted an emergency update on ${emergency.emergencyType} (${req.params.id}): "${message.trim().substring(0, 80)}"`,
    { relatedEntity: 'Emergency', relatedID: req.params.id, redirectPath: '/admin/emergencies' });

  res.status(201).json({ success: true, message: 'Update posted', data: { updateID } });
});

const addTeamAssignment = asyncHandler(async (req, res) => {
  const { teamID, role, notes } = req.body;
  if (!teamID) throw new BadRequestError('Team ID is required');
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');

  const assignmentID = await EmergencyAssignment.assignTeam(req.params.id, teamID, role, req.user.id, notes);
  if (!emergency.assignedTeamID) {
    await Emergency.assignTeam(req.params.id, teamID);
  } else {
    await Emergency.updateStatus(req.params.id, 'Assigned');
  }

  res.status(201).json({ success: true, message: 'Team assigned to emergency', data: { assignmentID } });
});

const removeTeamAssignment = asyncHandler(async (req, res) => {
  const { id, teamId } = req.params;
  await EmergencyAssignment.removeTeamFromEmergency(id, teamId);

  const remaining = await EmergencyAssignment.getTeamsForEmergency(id);
  const emergency = await Emergency.findById(id);
  if (emergency?.assignedTeamID === teamId) {
    await Emergency.setPrimaryTeam(id, remaining[0]?.teamID || null);
  }
  if (!remaining.length && emergency?.status !== 'Resolved') {
    await Emergency.updateStatus(id, 'Pending');
  }

  res.json({ success: true, message: 'Team removed from emergency' });
});

const addNGOAssignment = asyncHandler(async (req, res) => {
  const { ngoID, role, notes } = req.body;
  if (!ngoID) throw new BadRequestError('NGO ID is required');
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');

  const assignmentID = await EmergencyAssignment.assignNGO(req.params.id, ngoID, role, req.user.id, notes);
  res.status(201).json({ success: true, message: 'NGO assigned to emergency', data: { assignmentID } });
});

const removeNGOAssignment = asyncHandler(async (req, res) => {
  await EmergencyAssignment.removeNGOFromEmergency(req.params.id, req.params.ngoId);
  res.json({ success: true, message: 'NGO removed from emergency' });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  await Emergency.updateStatus(req.params.id, status);
  if (['Resolved', 'Cancelled', 'Closed', 'Ended'].includes(status) && emergency.disasterID) {
    await Alert.cancelByDisaster(emergency.disasterID);
  }
  const updated = await Emergency.findById(req.params.id);
  res.json({ success: true, message: 'Status updated', data: normalizeEmergency(updated) });
});

const resolveEmergency = asyncHandler(async (req, res) => {
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  const userRole = req.user.role || req.user.userType;
  if (userRole === 'RescueTeam') {
    if (emergency.assignedTeamID !== req.user.id) {
      throw new BadRequestError('You can only resolve emergencies assigned to your team');
    }
    if (emergency.status !== 'Assigned') {
      throw new BadRequestError('Only assigned emergencies can be resolved');
    }
  }
  await Emergency.resolve(req.params.id);
  if (emergency.disasterID) {
    await Alert.cancelByDisaster(emergency.disasterID);
  }
  const updated = await Emergency.findById(req.params.id);
  await notify('Admin', 'emergency', 'Emergency Resolved',
    `Emergency ${req.params.id} resolved — ${emergency.emergencyType} at ${emergency.location}`,
    { relatedEntity: 'Emergency', relatedID: req.params.id, redirectPath: '/admin/emergencies' });
  res.json({ success: true, message: 'Emergency resolved', data: normalizeEmergency(updated) });
});

const deleteEmergency = asyncHandler(async (req, res) => {
  const emergency = await Emergency.findById(req.params.id);
  if (!emergency) throw new NotFoundError('Emergency not found');
  await Emergency.delete(req.params.id);
  res.json({ success: true, message: 'Emergency deleted' });
});

module.exports = {
  getAllEmergencies, getPendingEmergencies, getEmergencyById, getEmergenciesByCitizen,
  getEmergenciesByTeam, getEmergenciesByNGO, createEmergency, assignTeam,
  getEmergencyAssignments, addTeamAssignment, removeTeamAssignment, addNGOAssignment, removeNGOAssignment,
  getEmergencyUpdates, postEmergencyUpdate,
  updateStatus, resolveEmergency, deleteEmergency
};
