const BankAccount = require('../models/BankAccount');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const accounts = await BankAccount.findAll();
  res.json({ success: true, data: accounts });
});

exports.getActive = asyncHandler(async (req, res) => {
  const accounts = await BankAccount.findActive();
  res.json({ success: true, data: accounts });
});

exports.getById = asyncHandler(async (req, res) => {
  const account = await BankAccount.findById(req.params.id);
  if (!account) throw new NotFoundError('Bank account not found');
  res.json({ success: true, data: account });
});

exports.create = asyncHandler(async (req, res) => {
  const bankName = typeof req.body.bankName === 'string' ? req.body.bankName.trim() : '';
  const accountTitle = typeof req.body.accountTitle === 'string' ? req.body.accountTitle.trim() : '';
  const accountNumber = typeof req.body.accountNumber === 'string' ? req.body.accountNumber.trim() : '';
  if (!bankName || !accountTitle || !accountNumber) {
    throw new ValidationError('Bank name, account title, and account number are required');
  }
  const minAmount = req.body.minAmount === '' || req.body.minAmount === null || req.body.minAmount === undefined ? null : Number(req.body.minAmount);
  const maxAmount = req.body.maxAmount === '' || req.body.maxAmount === null || req.body.maxAmount === undefined ? null : Number(req.body.maxAmount);
  if (Number.isFinite(minAmount) && Number.isFinite(maxAmount) && maxAmount < minAmount) {
    throw new ValidationError('Maximum amount must be greater than or equal to minimum amount');
  }
  const accountID = await BankAccount.insert({
    ...req.body,
    bankName,
    accountTitle,
    accountNumber,
    minAmount: Number.isFinite(minAmount) ? minAmount : null,
    maxAmount: Number.isFinite(maxAmount) ? maxAmount : null,
    addedBy: req.user.id
  });
  const account = await BankAccount.findById(accountID);
  res.status(201).json({ success: true, data: account, message: 'Bank account added successfully' });
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await BankAccount.findById(req.params.id);
  if (!existing) throw new NotFoundError('Bank account not found');
  const bankName = typeof req.body.bankName === 'string' ? req.body.bankName.trim() : '';
  const accountTitle = typeof req.body.accountTitle === 'string' ? req.body.accountTitle.trim() : '';
  const accountNumber = typeof req.body.accountNumber === 'string' ? req.body.accountNumber.trim() : '';
  if (!bankName || !accountTitle || !accountNumber) {
    throw new ValidationError('Bank name, account title, and account number are required');
  }
  const minAmount = req.body.minAmount === '' || req.body.minAmount === null || req.body.minAmount === undefined ? null : Number(req.body.minAmount);
  const maxAmount = req.body.maxAmount === '' || req.body.maxAmount === null || req.body.maxAmount === undefined ? null : Number(req.body.maxAmount);
  if (Number.isFinite(minAmount) && Number.isFinite(maxAmount) && maxAmount < minAmount) {
    throw new ValidationError('Maximum amount must be greater than or equal to minimum amount');
  }
  await BankAccount.update(req.params.id, {
    ...req.body,
    bankName,
    accountTitle,
    accountNumber,
    minAmount: Number.isFinite(minAmount) ? minAmount : null,
    maxAmount: Number.isFinite(maxAmount) ? maxAmount : null
  });
  const updated = await BankAccount.findById(req.params.id);
  res.json({ success: true, data: updated, message: 'Bank account updated' });
});

exports.toggleActive = asyncHandler(async (req, res) => {
  const existing = await BankAccount.findById(req.params.id);
  if (!existing) throw new NotFoundError('Bank account not found');
  const newStatus = !existing.isActive;
  await BankAccount.toggleActive(req.params.id, newStatus);
  res.json({ success: true, message: `Bank account ${newStatus ? 'activated' : 'deactivated'}` });
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await BankAccount.findById(req.params.id);
  if (!existing) throw new NotFoundError('Bank account not found');
  await BankAccount.delete(req.params.id);
  res.json({ success: true, message: 'Bank account deleted' });
});
