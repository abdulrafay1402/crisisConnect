const { Alert } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');
const { emitToAll } = require('../utils/socketManager');
const { notify } = require('../utils/notifier');

const normalizeAlertForClient = (a) => ({
  ...a,
  severity: a.severity || a.priority,
  issuedDate: a.issuedDate || a.createdDate
});

const getAllAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.findAll();
  res.json({ success: true, data: alerts.map(normalizeAlertForClient) });
});

const getActiveAlerts = asyncHandler(async (req, res) => {
  await Alert.cancelForEndedDisasters();
  const alerts = await Alert.findActive();
  res.json({ success: true, data: alerts.map(normalizeAlertForClient) });
});

const getCriticalAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.findCritical();
  res.json({ success: true, data: alerts.map(normalizeAlertForClient) });
});

const getAlertById = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new NotFoundError('Alert not found');
  res.json({ success: true, data: normalizeAlertForClient(alert) });
});

const getAlertsByDisaster = asyncHandler(async (req, res) => {
  const alerts = await Alert.findByDisaster(req.params.disasterId);
  res.json({ success: true, data: alerts.map(normalizeAlertForClient) });
});

const createAlert = asyncHandler(async (req, res) => {
  const { disasterID, alertType, title, message, priority, severity, targetAudience, affectedAreas, expiryDate } = req.body;
  if (!message) throw new BadRequestError('Message is required');

  let normalizedExpiryDate = null;
  if (expiryDate) {
    const parsed = new Date(expiryDate);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestError('Invalid expiry date format');
    normalizedExpiryDate = parsed;
  }

  const normalizedDisasterID = typeof disasterID === 'string' && disasterID.trim() ? disasterID.trim() : null;
  const normalizedTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Alert';
  const normalizedMessage = String(message).trim();
  if (!normalizedMessage) throw new BadRequestError('Message is required');

  const alertID = await Alert.insert({
    disasterID: normalizedDisasterID,
    alertType: alertType || 'General',
    title: normalizedTitle,
    message: normalizedMessage,
    priority: priority || severity || 'Normal',
    createdBy: req.user.id, targetAudience: targetAudience || 'All',
    affectedAreas: affectedAreas || null,
    expiryDate: normalizedExpiryDate
  });
  const alert = await Alert.findById(alertID);
  emitToAll('alert:new', alert);
  const alertTargets = [
    { role: 'Citizen', path: '/citizen/alerts' },
    { role: 'RescueTeam', path: '/rescue/disasters' },
    { role: 'NGO', path: '/ngo/disasters' },
    { role: 'Admin', path: '/admin/alerts' }
  ];
  for (const t of alertTargets) {
    await notify(t.role, 'alert', alert.title || 'New Alert',
      alert.message,
      { relatedEntity: 'Alert', relatedID: alertID, redirectPath: t.path });
  }
  res.status(201).json({ success: true, message: 'Alert created', data: alert });
});

const updateAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new NotFoundError('Alert not found');
  await Alert.update(req.params.id, req.body);
  const updated = await Alert.findById(req.params.id);
  res.json({ success: true, message: 'Alert updated', data: updated });
});

const cancelAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new NotFoundError('Alert not found');
  await Alert.cancel(req.params.id);
  const updated = await Alert.findById(req.params.id);
  res.json({ success: true, message: 'Alert cancelled', data: updated });
});

const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new NotFoundError('Alert not found');
  await Alert.delete(req.params.id);
  res.json({ success: true, message: 'Alert deleted' });
});

module.exports = {
  getAllAlerts, getActiveAlerts, getCriticalAlerts, getAlertById, getAlertsByDisaster,
  createAlert, updateAlert, cancelAlert, deleteAlert
};
