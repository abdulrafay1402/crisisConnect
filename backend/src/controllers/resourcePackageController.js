const { ResourcePackage, Resource } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');

const normalizeRequesterType = (value) => {
  const t = String(value || '').trim().toLowerCase();
  if (t === 'ngo') return 'NGO';
  if (t === 'rescueteam' || t === 'rescue_team' || t === 'rescue team' || t === 'rescue') return 'RescueTeam';
  return value || null;
};

const getAllResourcePackages = asyncHandler(async (req, res) => {
  const packages = await ResourcePackage.findAll();
  res.json({ success: true, data: packages });
});

const getPendingPackages = asyncHandler(async (req, res) => {
  const packages = await ResourcePackage.findPending();
  res.json({ success: true, data: packages });
});

const getPackagesByRequester = asyncHandler(async (req, res) => {
  const requesterId = req.params.requesterId || req.user.id;
  const requesterType = normalizeRequesterType(
    req.query.requesterType || req.query.type || (!req.params.requesterId ? (req.user.userType || req.user.role) : null)
  );
  const packages = await ResourcePackage.findByRequester(requesterId, requesterType);
  res.json({ success: true, data: packages });
});

const getResourcePackageById = asyncHandler(async (req, res) => {
  const pkg = await ResourcePackage.findById(req.params.id);
  if (!pkg) throw new NotFoundError('Resource package not found');
  res.json({ success: true, data: pkg });
});

const createResourcePackage = asyncHandler(async (req, res) => {
  const { resourceID, quantity, purpose, priority, disasterID } = req.body;
  if (!resourceID || !quantity) throw new BadRequestError('Resource ID and quantity are required');
  const requesterType = normalizeRequesterType(req.user.userType || req.user.role);
  if (requesterType !== 'NGO' && requesterType !== 'RescueTeam') {
    throw new BadRequestError('Only NGO or Rescue Team accounts can request resource packages');
  }
  const resource = await Resource.findById(resourceID);
  if (!resource) throw new NotFoundError('Resource not found');

  const packageID = await ResourcePackage.insert({
    resourceID,
    quantity,
    purpose,
    priority: priority || 'Medium',
    requestedBy: req.user.id,
    requestedByType: requesterType,
    totalCost: Number(resource.costPerUnit || 0) * Number(quantity || 0),
    disasterID
  });
  const pkg = await ResourcePackage.findById(packageID);
  await notify('Admin', 'resource_request', 'New Resource Request',
    `${resource.resourceName} x${quantity} requested (${priority || 'Medium'} priority)`,
    { relatedEntity: 'ResourcePackage', relatedID: packageID, redirectPath: '/admin/resources' });
  res.status(201).json({ success: true, message: 'Resource package requested', data: pkg });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const pkg = await ResourcePackage.findById(req.params.id);
  if (!pkg) throw new NotFoundError('Resource package not found');
  await ResourcePackage.updateStatus(req.params.id, status);
  const updated = await ResourcePackage.findById(req.params.id);
  res.json({ success: true, message: 'Package status updated', data: updated });
});

const approvePackage = asyncHandler(async (req, res) => {
  const pkg = await ResourcePackage.findById(req.params.id);
  if (!pkg) throw new NotFoundError('Resource package not found');
  if (pkg.status !== 'Pending') throw new BadRequestError(`Only pending requests can be approved (current: ${pkg.status})`);

  const resource = await Resource.findById(pkg.resourceID);
  if (!resource) throw new NotFoundError('Resource not found for this package');

  const available = Number(resource.totalQuantity || 0) - Number(resource.allocatedQuantity || 0);
  const requestedQty = Number(pkg.quantity || 0);
  if (requestedQty <= 0) throw new BadRequestError('Invalid package quantity');
  if (requestedQty > available) {
    throw new BadRequestError(`Insufficient stock for ${resource.resourceName}. Available: ${available}, requested: ${requestedQty}`);
  }

  await Resource.allocate(pkg.resourceID, requestedQty);
  await ResourcePackage.approve(req.params.id, pkg.requestedBy, pkg.requestedByType);
  await ResourcePackage.updateStatus(req.params.id, 'Allocated');
  const updated = await ResourcePackage.findById(req.params.id);
  await notify('User', 'resource_request', 'Resource Request Approved',
    `Your resource request ${pkg.packageID} has been approved and allocated for dispatch.`,
    { targetUserID: pkg.requestedBy, relatedEntity: 'ResourcePackage', relatedID: pkg.packageID, redirectPath: '/ngo/resources' });
  res.json({ success: true, message: 'Package approved', data: updated });
});

const rejectPackage = asyncHandler(async (req, res) => {
  const pkg = await ResourcePackage.findById(req.params.id);
  if (!pkg) throw new NotFoundError('Resource package not found');
  if (pkg.status !== 'Pending') throw new BadRequestError(`Only pending requests can be rejected (current: ${pkg.status})`);
  await ResourcePackage.reject(req.params.id);
  const updated = await ResourcePackage.findById(req.params.id);
  await notify('User', 'resource_request', 'Resource Request Rejected',
    `Your resource request ${pkg.packageID} was rejected.`,
    { targetUserID: pkg.requestedBy, relatedEntity: 'ResourcePackage', relatedID: pkg.packageID, redirectPath: '/ngo/resources' });
  res.json({ success: true, message: 'Package rejected', data: updated });
});

const confirmPackageReceived = asyncHandler(async (req, res) => {
  const pkg = await ResourcePackage.findById(req.params.id);
  if (!pkg) throw new NotFoundError('Resource package not found');

  const requesterType = normalizeRequesterType(req.user.userType || req.user.role);
  if (pkg.requestedBy !== req.user.id || pkg.requestedByType !== requesterType) {
    throw new BadRequestError('You can only confirm your own resource package requests');
  }

  if (pkg.status !== 'Allocated' && pkg.status !== 'Approved') {
    throw new BadRequestError(`Only allocated/approved requests can be confirmed (current: ${pkg.status})`);
  }

  await ResourcePackage.updateStatus(req.params.id, 'Completed');
  const updated = await ResourcePackage.findById(req.params.id);

  await notify('Admin', 'resource_request', 'Resource Delivery Confirmed',
    `${pkg.packageID} has been marked as received by ${pkg.requestedBy}.`,
    { relatedEntity: 'ResourcePackage', relatedID: pkg.packageID, redirectPath: '/admin/resources' });

  res.json({ success: true, message: 'Package marked as completed', data: updated });
});

const deleteResourcePackage = asyncHandler(async (req, res) => {
  const pkg = await ResourcePackage.findById(req.params.id);
  if (!pkg) throw new NotFoundError('Resource package not found');
  await ResourcePackage.delete(req.params.id);
  res.json({ success: true, message: 'Resource package deleted' });
});

module.exports = {
  getAllResourcePackages, getPendingPackages, getPackagesByRequester, getResourcePackageById,
  createResourcePackage, updateStatus, approvePackage, rejectPackage, confirmPackageReceived, deleteResourcePackage
};
