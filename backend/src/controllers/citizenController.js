const bcrypt = require('bcryptjs');
const { Citizen } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const getAllCitizens = asyncHandler(async (req, res) => {
  const citizens = await Citizen.findAll();
  const data = citizens.map(({ password, ...rest }) => rest);
  res.json({ success: true, data });
});

const getCitizenById = asyncHandler(async (req, res) => {
  const citizen = await Citizen.findById(req.params.id);
  if (!citizen) throw new NotFoundError('Citizen not found');
  const { password, ...data } = citizen;
  res.json({ success: true, data });
});

const getCitizenByCnic = asyncHandler(async (req, res) => {
  const citizen = await Citizen.findByCnic(req.params.cnic);
  if (!citizen) throw new NotFoundError('Citizen not found');
  const { password, ...data } = citizen;
  res.json({ success: true, data });
});

const updateCitizen = asyncHandler(async (req, res) => {
  const citizen = await Citizen.findById(req.params.id);
  if (!citizen) throw new NotFoundError('Citizen not found');

  if (req.user.userType !== 'Admin' && req.user.id !== req.params.id) {
    throw new BadRequestError('Not authorized to update this citizen');
  }

  const { name, contactNumber, email, address, city, username, password: pwd, isActive } = req.body;
  if (username && username !== citizen.username) {
    const existing = await Citizen.findByUsername(username);
    if (existing) throw new ConflictError('Username already exists');
  }

  const updates = { ...citizen };
  if (name) updates.name = name;
  if (contactNumber !== undefined) updates.contactNumber = contactNumber;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;
  if (username) updates.username = username;
  if (req.user.userType === 'Admin' && isActive !== undefined) updates.isActive = isActive;
  if (pwd) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(pwd, salt);
  }
  await Citizen.update(req.params.id, updates);
  const updated = await Citizen.findById(req.params.id);
  const { password, ...data } = updated;
  res.json({ success: true, message: 'Citizen updated', data });
});

const deleteCitizen = asyncHandler(async (req, res) => {
  const citizen = await Citizen.findById(req.params.id);
  if (!citizen) throw new NotFoundError('Citizen not found');
  await Citizen.delete(req.params.id);
  res.json({ success: true, message: 'Citizen deleted' });
});

module.exports = { getAllCitizens, getCitizenById, getCitizenByCnic, updateCitizen, deleteCitizen };
