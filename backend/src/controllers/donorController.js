const { Donor } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

const getAllDonors = asyncHandler(async (req, res) => {
  const donors = await Donor.findAll();
  res.json({ success: true, data: donors });
});

const getDonorById = asyncHandler(async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw new NotFoundError('Donor not found');
  res.json({ success: true, data: donor });
});

const getDonorByCitizen = asyncHandler(async (req, res) => {
  const donors = await Donor.findByCitizen(req.params.citizenId || req.user.id);
  res.json({ success: true, data: donors });
});

const getTopDonors = asyncHandler(async (req, res) => {
  const donors = await Donor.findTop(parseInt(req.query.limit) || 10);
  res.json({ success: true, data: donors });
});

const createDonor = asyncHandler(async (req, res) => {
  const { citizenID, name, email, contactNumber, address, city } = req.body;
  const donorID = await Donor.insert({
    citizenID: citizenID || req.user.id,
    name, email, contactNumber, address, city
  });
  const donor = await Donor.findById(donorID);
  res.status(201).json({ success: true, message: 'Donor profile created', data: donor });
});

const verifyDonor = asyncHandler(async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw new NotFoundError('Donor not found');
  await Donor.verify(req.params.id);
  const updated = await Donor.findById(req.params.id);
  res.json({ success: true, message: 'Donor verified', data: updated });
});

const deleteDonor = asyncHandler(async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw new NotFoundError('Donor not found');
  await Donor.delete(req.params.id);
  res.json({ success: true, message: 'Donor deleted' });
});

const getDonorStats = asyncHandler(async (req, res) => {
  const stats = await Donor.getStats();
  res.json({ success: true, data: stats });
});

module.exports = {
  getAllDonors, getDonorById, getDonorByCitizen, getTopDonors,
  createDonor, verifyDonor, deleteDonor, getDonorStats
};
