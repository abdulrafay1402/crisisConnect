const { EmergencyContact } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

const getAllEmergencyContacts = asyncHandler(async (req, res) => {
  const { city, serviceName } = req.query;
  let contacts;
  if (city) contacts = await EmergencyContact.findByCity(city);
  else if (serviceName) contacts = await EmergencyContact.findByService(serviceName);
  else contacts = await EmergencyContact.findAll();
  res.json({ success: true, data: contacts });
});

const getEmergencyContactById = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) throw new NotFoundError('Emergency contact not found');
  res.json({ success: true, data: contact });
});

const createEmergencyContact = asyncHandler(async (req, res) => {
  const { serviceName, phoneNumber, contactNumber, city, address } = req.body;
  const normalizedServiceName = typeof serviceName === 'string' ? serviceName.trim() : '';
  const normalizedContactNumber = typeof (contactNumber || phoneNumber) === 'string'
    ? (contactNumber || phoneNumber).trim()
    : '';
  if (!normalizedServiceName || !normalizedContactNumber) {
    throw new BadRequestError('Service name and phone number are required');
  }
  const contactID = await EmergencyContact.insert({
    serviceName: normalizedServiceName,
    contactNumber: normalizedContactNumber,
    city,
    address
  });
  const contact = await EmergencyContact.findById(contactID);
  res.status(201).json({ success: true, message: 'Emergency contact created', data: contact });
});

const updateEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) throw new NotFoundError('Emergency contact not found');
  const payload = {
    ...req.body,
    contactNumber: req.body.contactNumber || req.body.phoneNumber
  };
  await EmergencyContact.update(req.params.id, payload);
  const updated = await EmergencyContact.findById(req.params.id);
  res.json({ success: true, message: 'Emergency contact updated', data: updated });
});

const deleteEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) throw new NotFoundError('Emergency contact not found');
  await EmergencyContact.delete(req.params.id);
  res.json({ success: true, message: 'Emergency contact deleted' });
});

module.exports = { getAllEmergencyContacts, getEmergencyContactById, createEmergencyContact, updateEmergencyContact, deleteEmergencyContact };
