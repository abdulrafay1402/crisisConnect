const { Resource } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

const getAllResources = asyncHandler(async (req, res) => {
  const resources = await Resource.findAll();
  res.json({ success: true, data: resources });
});

const getAvailableResources = asyncHandler(async (req, res) => {
  const resources = await Resource.findAvailable();
  res.json({ success: true, data: resources });
});

const getLowStockResources = asyncHandler(async (req, res) => {
  const resources = await Resource.findLowStock();
  res.json({ success: true, data: resources });
});

const getResourceById = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new NotFoundError('Resource not found');
  res.json({ success: true, data: resource });
});

const createResource = asyncHandler(async (req, res) => {
  const { resourceName, type, totalQuantity, unit, location, costPerUnit } = req.body;
  if (!resourceName || !type) throw new BadRequestError('Resource name and type are required');
  const resourceID = await Resource.insert({
    resourceName, type, totalQuantity: totalQuantity || 0, unit,
    location, costPerUnit: costPerUnit || 0
  });
  const resource = await Resource.findById(resourceID);
  res.status(201).json({ success: true, message: 'Resource created', data: resource });
});

const updateResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new NotFoundError('Resource not found');
  await Resource.update(req.params.id, req.body);
  const updated = await Resource.findById(req.params.id);
  res.json({ success: true, message: 'Resource updated', data: updated });
});

const allocateResource = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) throw new BadRequestError('Valid quantity is required');
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new NotFoundError('Resource not found');
  await Resource.allocate(req.params.id, quantity);
  const updated = await Resource.findById(req.params.id);
  res.json({ success: true, message: 'Resource allocated', data: updated });
});

const deallocateResource = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) throw new BadRequestError('Valid quantity is required');
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new NotFoundError('Resource not found');
  await Resource.deallocate(req.params.id, quantity);
  const updated = await Resource.findById(req.params.id);
  res.json({ success: true, message: 'Resource deallocated', data: updated });
});

const deleteResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new NotFoundError('Resource not found');
  await Resource.delete(req.params.id);
  res.json({ success: true, message: 'Resource deleted' });
});

const getResourceStats = asyncHandler(async (req, res) => {
  const stats = await Resource.getStats();
  res.json({ success: true, data: stats });
});

module.exports = {
  getAllResources, getAvailableResources, getLowStockResources, getResourceById,
  createResource, updateResource, allocateResource, deallocateResource, deleteResource, getResourceStats
};
