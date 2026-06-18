const { Donation, DisasterAssignment, BankAccount } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');
const path = require('path');
const { extractTextFromImage, parseReceipt } = require('../utils/ocrService');

// Bank type → regex for sender account number format validation
const SENDER_FORMAT = {
  EasyPaisa:   { pattern: /^03\d{9}$/, label: 'phone number (03XXXXXXXXX, 11 digits)' },
  JazzCash:    { pattern: /^03\d{9}$/, label: 'phone number (03XXXXXXXXX, 11 digits)' },
  SadaPay:     { pattern: /^03\d{9}$/, label: 'phone number (03XXXXXXXXX, 11 digits)' },
  NayaPay:     { pattern: /^03\d{9}$/, label: 'phone number (03XXXXXXXXX, 11 digits)' },
  UPaisa:      { pattern: /^03\d{9}$/, label: 'phone number (03XXXXXXXXX, 11 digits)' },
  Traditional: { pattern: /^\d{5,30}$/, label: 'bank account number (5–30 digits)' },
};

const getAllDonations = asyncHandler(async (req, res) => {
  const donations = await Donation.findAll();
  res.json({ success: true, data: donations });
});

const getRecentDonations = asyncHandler(async (req, res) => {
  const donations = await Donation.findRecent();
  res.json({ success: true, data: donations });
});

const getDonationById = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new NotFoundError('Donation not found');
  res.json({ success: true, data: donation });
});

const getMyDonations = asyncHandler(async (req, res) => {
  const donations = await Donation.findByCitizen(req.user.id);
  res.json({ success: true, data: donations });
});

const getDonationsByDisaster = asyncHandler(async (req, res) => {
  const donations = await Donation.findByDisaster(req.params.disasterId);
  res.json({ success: true, data: donations });
});

const getDonationsByDonor = asyncHandler(async (req, res) => {
  const donations = await Donation.findByDonor(req.params.donorId);
  res.json({ success: true, data: donations });
});

const createDonation = asyncHandler(async (req, res) => {
  const { amount, donationType, disasterID, donorID, paymentMethod, isAnonymous, message,
          transactionRef, transactionID, bankAccountID, senderAccountNumber } = req.body;
  const parsedAmount = parseFloat(amount);
  const parsedIsAnonymous =
    isAnonymous === true ||
    isAnonymous === 'true' ||
    isAnonymous === 1 ||
    isAnonymous === '1';

  if (!req.file || !req.file.path) {
    throw new BadRequestError('Receipt photo is required');
  }
  if (!parsedAmount || parsedAmount <= 0) throw new BadRequestError('Valid donation amount is required');
  if (!bankAccountID) throw new BadRequestError('Please select a bank account to donate to');
  if (!senderAccountNumber || !senderAccountNumber.trim()) throw new BadRequestError('Your sender account number is required');

  // Verify the bank account exists and is active
  const bankAccount = await BankAccount.findById(bankAccountID);
  if (!bankAccount || !bankAccount.isActive) throw new BadRequestError('Selected bank account is not available');

  // Validate sender account format based on bank type
  const bankType = bankAccount.bankType || 'Traditional';
  const fmt = SENDER_FORMAT[bankType] || SENDER_FORMAT.Traditional;
  const cleanSender = senderAccountNumber.replace(/[-\s]/g, '');
  if (!fmt.pattern.test(cleanSender)) {
    throw new BadRequestError(`Your sender account for ${bankType} must be a valid ${fmt.label}`);
  }

  // Validate amount against bank account limits
  if (bankAccount.minAmount && parsedAmount < bankAccount.minAmount) {
    throw new BadRequestError(`Minimum donation amount for this account is PKR ${bankAccount.minAmount}`);
  }
  if (bankAccount.maxAmount && parsedAmount > bankAccount.maxAmount) {
    throw new BadRequestError(`Maximum donation amount for this account is PKR ${bankAccount.maxAmount}`);
  }

  const receiptImagePath = req.file.path;

  const donationCreated = await Donation.insert({
    donorID: donorID || null, citizenID: req.user.id,
    amount: parsedAmount, donationType: donationType || 'Money',
    disasterID, paymentMethod: paymentMethod || bankAccount.bankType, isAnonymous: parsedIsAnonymous, message,
    transactionID: transactionRef || transactionID || null,
    bankAccountID,
    senderAccountNumber: cleanSender,
    receiptImagePath
  });
  const donationID = donationCreated?.donationID;
  const donation = await Donation.findById(donationID);
  await notify('Admin', 'donation', 'New Donation Received',
    `PKR ${amount} donation received via ${bankAccount.bankName} (${bankType})`,
    { relatedEntity: 'Donation', relatedID: donationID, redirectPath: '/admin/donations' });

  // Notify assigned NGOs and Rescue Teams for this disaster
  if (disasterID) {
    try {
      const { teams, ngos } = await DisasterAssignment.getAllForDisaster(disasterID);
      for (const team of teams) {
        await notify('RescueTeam', 'donation', 'New Donation for Your Disaster',
          `PKR ${amount} donation received for disaster you are assigned to`,
          { targetUserID: team.teamID, relatedEntity: 'Donation', relatedID: donationID, redirectPath: '/rescue/donations' });
      }
      for (const ngo of ngos) {
        await notify('NGO', 'donation', 'New Donation for Your Disaster',
          `PKR ${amount} donation received for disaster you are assigned to`,
          { targetUserID: ngo.ngoID, relatedEntity: 'Donation', relatedID: donationID, redirectPath: '/ngo/donations' });
      }
    } catch (err) {
      console.error('Failed to notify assigned teams/NGOs:', err.message);
    }
  }

  res.status(201).json({ success: true, message: 'Donation submitted and is now in process for admin review.', data: donation });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const allowedStatuses = ['Pending', 'Received', 'Distributed', 'Completed'];
  if (!allowedStatuses.includes(status)) {
    throw new BadRequestError(`Invalid status. Allowed values: ${allowedStatuses.join(', ')}`);
  }
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new NotFoundError('Donation not found');
  await Donation.updateStatus(req.params.id, status, req.user?.id || null);
  const updated = await Donation.findById(req.params.id);
  res.json({ success: true, message: 'Donation status updated', data: updated });
});

const deleteDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new NotFoundError('Donation not found');
  await Donation.delete(req.params.id);
  res.json({ success: true, message: 'Donation deleted' });
});

const getDonationStats = asyncHandler(async (req, res) => {
  const stats = await Donation.getStats();
  res.json({ success: true, data: stats });
});

const getMonthlySummary = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year) || new Date().getFullYear();
  const summary = await Donation.getMonthlySummary(year);
  res.json({ success: true, data: { year, months: summary } });
});

const scanReceipt = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.path) {
    throw new BadRequestError('Receipt image is required');
  }
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw new NotFoundError('Donation not found');

  const imagePath = path.resolve(req.file.path);
  const { text, confidence } = await extractTextFromImage(imagePath);
  const parsed = parseReceipt(text || '') || {};

  res.json({
    success: true,
    message: 'Receipt scanned successfully',
    data: {
      ocrText: text,
      confidence: confidence / 100,
      amount: parsed.amount,
      date: parsed.date,
      transactionID: parsed.transactionID,
      paymentMethod: parsed.paymentMethod,
      bankType: parsed.bankType,
      bankName: parsed.bankName,
      senderAccountNumber: parsed.senderAccountNumber,
      filePath: req.file.path,
      fileName: req.file.filename,
      fileSize: req.file.size
    }
  });
});

// Standalone receipt scan (no donation ID needed) for citizens
const scanReceiptStandalone = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.path) {
    throw new BadRequestError('Receipt image is required');
  }
  const imagePath = path.resolve(req.file.path);
  const { text, confidence } = await extractTextFromImage(imagePath);
  const parsed = parseReceipt(text || '') || {};

  res.json({
    success: true,
    message: 'Receipt scanned successfully',
    data: {
      ocrText: text,
      confidence: confidence / 100,
      amount: parsed.amount,
      date: parsed.date,
      transactionID: parsed.transactionID,
      paymentMethod: parsed.paymentMethod,
      bankType: parsed.bankType,
      bankName: parsed.bankName,
      senderAccountNumber: parsed.senderAccountNumber
    }
  });
});

module.exports = {
  getAllDonations, getRecentDonations, getDonationById, getMyDonations,
  getDonationsByDisaster, getDonationsByDonor,
  createDonation, updateStatus, deleteDonation, getDonationStats, getMonthlySummary,
  scanReceipt, scanReceiptStandalone
};
