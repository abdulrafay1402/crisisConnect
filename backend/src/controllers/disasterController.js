const { Disaster, DisasterAssignment, DisasterUpdate, Alert } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');
const { emitToAll } = require('../utils/socketManager');
const path = require('path');
const { extractTextFromImage, parseDisasterEvidence } = require('../utils/ocrService');

const normalizeDisaster = (disaster) => {
  if (!disaster) return disaster;

  const disasterType = disaster.disasterType || disaster.type || null;
  const reportedDate = disaster.reportedDate || disaster.dateReported || disaster.startDate || null;

  return {
    ...disaster,
    disasterType,
    disasterName: disaster.disasterName || (disasterType ? `${disasterType} Disaster` : disaster.disasterID),
    dateReported: reportedDate,
    startDate: reportedDate,
    createdDate: disaster.createdDate || reportedDate
  };
};

const normalizeDisasters = (disasters) => (disasters || []).map(normalizeDisaster);

const sameId = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
};

const getAllDisasters = asyncHandler(async (req, res) => {
  const { status, type, severity } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (severity) filters.severity = severity;
  const disasters = await Disaster.findAll(filters);
  res.json({ success: true, data: normalizeDisasters(disasters) });
});

const getActiveDisasters = asyncHandler(async (req, res) => {
  const disasters = await Disaster.findActive();
  res.json({ success: true, data: normalizeDisasters(disasters) });
});

const getDisasterById = asyncHandler(async (req, res) => {
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  res.json({ success: true, data: normalizeDisaster(disaster) });
});

const getByType = asyncHandler(async (req, res) => {
  const disasters = await Disaster.getByType(req.params.type);
  res.json({ success: true, data: disasters });
});

const getByReporter = asyncHandler(async (req, res) => {
  const disasters = await Disaster.findByReporter(req.user.role, req.user.id);
  res.json({ success: true, data: normalizeDisasters(disasters) });
});

const createDisaster = asyncHandler(async (req, res) => {
  const { type, location, city, severity, description, affectedArea, estimatedCasualties, estimatedDamage, latitude, longitude } = req.body;
  if (!type || !location) throw new BadRequestError('Type and location are required');
  const disasterID = await Disaster.insert({
    type, location, city, severity: severity || 'Moderate', description,
    affectedArea, estimatedCasualties, estimatedDamage, latitude, longitude,
    reportedByType: req.user.role || req.user.userType, reportedByID: req.user.id
  });
  const disaster = await Disaster.findById(disasterID);
  const creatorRole = req.user.role || req.user.userType;
  const allRoles = ['Admin', 'Citizen', 'RescueTeam', 'NGO'];
  for (const role of allRoles) {
    if (role === creatorRole) continue;
    const redirectMap = { Admin: '/admin/disasters', Citizen: '/citizen/disasters', RescueTeam: '/rescue/disasters', NGO: '/ngo/disasters' };
    await notify(role, 'disaster', 'New Disaster Reported',
      `${type} disaster reported at ${location} — Severity: ${severity || 'Moderate'}`,
      { relatedEntity: 'Disaster', relatedID: disasterID, redirectPath: redirectMap[role] });
  }
  const normalizedDisaster = normalizeDisaster(disaster);
  emitToAll('disaster:new', normalizedDisaster);
  res.status(201).json({ success: true, message: 'Disaster reported', data: normalizedDisaster });
});

const updateDisaster = asyncHandler(async (req, res) => {
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  await Disaster.update({ ...req.body, disasterID: req.params.id });
  const updated = await Disaster.findById(req.params.id);
  res.json({ success: true, message: 'Disaster updated', data: normalizeDisaster(updated) });
});

const deleteDisaster = asyncHandler(async (req, res) => {
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  await Disaster.delete(req.params.id);
  res.json({ success: true, message: 'Disaster deleted' });
});

const assignTeam = asyncHandler(async (req, res) => {
  const { teamID } = req.body;
  if (!teamID) throw new BadRequestError('Team ID is required');
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  await DisasterAssignment.assignTeam(req.params.id, teamID, req.body.role, req.user.id, req.body.notes);
  if (!disaster.assignedTeamID) {
    await Disaster.assignTeam(req.params.id, teamID);
  }
  const updated = await Disaster.findById(req.params.id);
  res.json({ success: true, message: 'Team assigned', data: normalizeDisaster(updated) });
});

const assignNGO = asyncHandler(async (req, res) => {
  const { ngoID } = req.body;
  if (!ngoID) throw new BadRequestError('NGO ID is required');
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  await DisasterAssignment.assignNGO(req.params.id, ngoID, req.body.role, req.user.id, req.body.notes);
  if (!disaster.assignedNGOID) {
    await Disaster.assignNGO(req.params.id, ngoID);
  }
  const updated = await Disaster.findById(req.params.id);
  res.json({ success: true, message: 'NGO assigned', data: normalizeDisaster(updated) });
});

const resolveDisaster = asyncHandler(async (req, res) => {
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  await Disaster.resolve(req.params.id);
  await Alert.cancelByDisaster(req.params.id);
  const updated = await Disaster.findById(req.params.id);
  const normalizedDisaster = normalizeDisaster(updated);
  emitToAll('disaster:update', normalizedDisaster);
  res.json({ success: true, message: 'Disaster resolved', data: normalizedDisaster });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  await Disaster.updateStatus(req.params.id, status);
  if (['Resolved', 'Cancelled', 'Closed', 'Ended'].includes(status)) {
    await Alert.cancelByDisaster(req.params.id);
  }
  const updated = await Disaster.findById(req.params.id);
  res.json({ success: true, message: 'Status updated', data: normalizeDisaster(updated) });
});

const getDisasterStats = asyncHandler(async (req, res) => {
  const stats = await Disaster.getStats();
  res.json({ success: true, data: stats });
});

const getBySeverity = asyncHandler(async (req, res) => {
  const disasters = await Disaster.findAll({ severity: req.params.severity });
  res.json({ success: true, data: disasters });
});

const getByStatus = asyncHandler(async (req, res) => {
  const disasters = await Disaster.findAll({ status: req.params.status });
  res.json({ success: true, data: disasters });
});

const getDisasterAssignments = asyncHandler(async (req, res) => {
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  const assignments = await DisasterAssignment.getAllForDisaster(req.params.id);
  res.json({ success: true, data: assignments });
});

const addTeamAssignment = asyncHandler(async (req, res) => {
  const { teamID, role, notes } = req.body;
  if (!teamID) throw new BadRequestError('Team ID is required');
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  const assignmentID = await DisasterAssignment.assignTeam(req.params.id, teamID, role, req.user.id, notes);
  if (!disaster.assignedTeamID) {
    await Disaster.assignTeam(req.params.id, teamID);
  }
  res.status(201).json({ success: true, message: 'Team assigned to disaster', data: { assignmentID } });
});

const removeTeamAssignment = asyncHandler(async (req, res) => {
  await DisasterAssignment.removeTeamFromDisaster(req.params.id, req.params.teamId);
  const remainingTeams = await DisasterAssignment.getTeamsForDisaster(req.params.id);
  const disaster = await Disaster.findById(req.params.id);
  if (disaster?.assignedTeamID === req.params.teamId) {
    await Disaster.assignTeam(req.params.id, remainingTeams[0]?.teamID || null);
  }
  res.json({ success: true, message: 'Team removed from disaster' });
});

const addNGOAssignment = asyncHandler(async (req, res) => {
  const { ngoID, role, notes } = req.body;
  if (!ngoID) throw new BadRequestError('NGO ID is required');
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  const assignmentID = await DisasterAssignment.assignNGO(req.params.id, ngoID, role, req.user.id, notes);
  if (!disaster.assignedNGOID) {
    await Disaster.assignNGO(req.params.id, ngoID);
  }
  res.status(201).json({ success: true, message: 'NGO assigned to disaster', data: { assignmentID } });
});

const removeNGOAssignment = asyncHandler(async (req, res) => {
  await DisasterAssignment.removeNGOFromDisaster(req.params.id, req.params.ngoId);
  const remainingNGOs = await DisasterAssignment.getNGOsForDisaster(req.params.id);
  const disaster = await Disaster.findById(req.params.id);
  if (disaster?.assignedNGOID === req.params.ngoId) {
    await Disaster.assignNGO(req.params.id, remainingNGOs[0]?.ngoID || null);
  }
  res.json({ success: true, message: 'NGO removed from disaster' });
});

const uploadDisasterPhotos = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new BadRequestError('At least one photo is required');
  }
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');

  // OCR is optional and can be heavy; process first image only for text
  const first = req.files[0];
  let ocrText = null;
  try {
    const { text } = await extractTextFromImage(path.resolve(first.path));
    ocrText = parseDisasterEvidence(text || '');
  } catch {
    // ignore OCR failures, still accept upload
  }

  const photos = req.files.map(f => ({
    disasterID: req.params.id,
    filePath: f.path,
    fileName: f.filename,
    fileSize: f.size,
    uploadedBy: req.user.id,
    uploadedByType: req.user.role,
    ocrText: null
  }));

  if (ocrText) {
    photos[0].ocrText = ocrText;
  }

  // Persist via model if it exists later; for now just echo metadata
  res.status(201).json({
    success: true,
    message: 'Photos uploaded successfully',
    data: photos
  });
});

const getDisasterPhotos = asyncHandler(async (req, res) => {
  // Placeholder until DisasterPhoto model is added
  res.json({ success: true, data: [] });
});

const getDisasterUpdates = asyncHandler(async (req, res) => {
  const updates = await DisasterUpdate.getByDisaster(req.params.id);
  res.json({ success: true, data: updates });
});

const postDisasterUpdate = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) throw new BadRequestError('Update message is required');
  const disaster = await Disaster.findById(req.params.id);
  if (!disaster) throw new NotFoundError('Disaster not found');
  const userRole = req.user.role || req.user.userType;
  const updateID = await DisasterUpdate.insert({
    disasterID: req.params.id,
    senderID: req.user.id,
    senderRole: userRole,
    senderName: req.user.name || req.user.id,
    message: message.trim()
  });
  await notify('Admin', 'disaster', 'Disaster Field Update',
    `${userRole === 'RescueTeam' ? 'Rescue Team' : 'NGO'} ${req.user.name || req.user.id} posted an update on ${normalizeDisaster(disaster).disasterName}: "${message.trim().substring(0, 80)}"`,
    { relatedEntity: 'Disaster', relatedID: req.params.id, redirectPath: '/admin/disasters' });
  res.status(201).json({ success: true, message: 'Update posted', data: { updateID } });
});

const getAssignedDisastersForTeam = asyncHandler(async (req, res) => {
  const teamID = req.params.teamId || req.user.id;
  const all = await Disaster.findAll();
  const assignments = [];
  for (const d of all) {
    const teams = await DisasterAssignment.getTeamsForDisaster(d.disasterID);
    const assignmentInfo = teams.find(t => sameId(t.teamID, teamID));
    if (assignmentInfo || sameId(d.assignedTeamID, teamID)) {
      assignments.push(normalizeDisaster({
        ...d,
        assignmentInfo: assignmentInfo || {
          teamID,
          role: 'Assigned',
          notes: null,
          assignedDate: d.createdDate || d.reportedDate || null
        }
      }));
    }
  }
  res.json({ success: true, data: assignments });
});

const getAssignedDisastersForNGO = asyncHandler(async (req, res) => {
  const ngoID = req.params.ngoId || req.user.id;
  const all = await Disaster.findAll();
  const assignments = [];
  for (const d of all) {
    const ngos = await DisasterAssignment.getNGOsForDisaster(d.disasterID);
    const assignmentInfo = ngos.find(n => sameId(n.ngoID, ngoID));
    if (assignmentInfo || sameId(d.assignedNGOID, ngoID)) {
      assignments.push(normalizeDisaster({
        ...d,
        assignmentInfo: assignmentInfo || {
          ngoID,
          role: 'Assigned',
          notes: null,
          assignedDate: d.createdDate || d.reportedDate || null
        }
      }));
    }
  }
  res.json({ success: true, data: assignments });
});

module.exports = {
  getAllDisasters, getActiveDisasters, getDisasterById, getByType, getByReporter,
  createDisaster, updateDisaster, deleteDisaster,
  assignTeam, assignNGO, resolveDisaster, updateStatus, getDisasterStats,
  getNearbyDisasters: getActiveDisasters, getBySeverity, getByStatus,
  getDisasterAssignments, addTeamAssignment, removeTeamAssignment,
  addNGOAssignment, removeNGOAssignment,
  uploadDisasterPhotos, getDisasterPhotos,
  getDisasterUpdates, postDisasterUpdate,
  getAssignedDisastersForTeam, getAssignedDisastersForNGO
};
