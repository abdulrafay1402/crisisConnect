const { MapLocation } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

const getAllMapLocations = asyncHandler(async (req, res) => {
  const { locationType } = req.query;
  const locations = locationType ? await MapLocation.findByType(locationType) : await MapLocation.findAll();
  res.json({ success: true, data: locations });
});

const getMapLocationById = asyncHandler(async (req, res) => {
  const location = await MapLocation.findById(req.params.id);
  if (!location) throw new NotFoundError('Map location not found');
  res.json({ success: true, data: location });
});

const createMapLocation = asyncHandler(async (req, res) => {
  const { locationName, locationType, latitude, longitude, description } = req.body;
  if (!locationName || !locationType || latitude === undefined || longitude === undefined) {
    throw new BadRequestError('Location name, type, latitude and longitude are required');
  }
  const locationID = await MapLocation.insert({ locationName, locationType, latitude, longitude, description });
  res.status(201).json({ success: true, message: 'Map location created', data: { locationID } });
});

const updateMapLocation = asyncHandler(async (req, res) => {
  const location = await MapLocation.findById(req.params.id);
  if (!location) throw new NotFoundError('Map location not found');
  await MapLocation.update(req.params.id, req.body);
  const updated = await MapLocation.findById(req.params.id);
  res.json({ success: true, message: 'Map location updated', data: updated });
});

const deleteMapLocation = asyncHandler(async (req, res) => {
  const location = await MapLocation.findById(req.params.id);
  if (!location) throw new NotFoundError('Map location not found');
  await MapLocation.delete(req.params.id);
  res.json({ success: true, message: 'Map location deleted' });
});

module.exports = { getAllMapLocations, getMapLocationById, createMapLocation, updateMapLocation, deleteMapLocation };
