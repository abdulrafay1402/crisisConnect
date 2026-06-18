const { FundAccount } = require('../models');
const { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { notify } = require('../utils/notifier');

// ── Fund Accounts ──

exports.getMyAccounts = asyncHandler(async (req, res) => {
  const ownerType = req.user.role;
  const accounts = await FundAccount.findByOwner(req.user.id, ownerType);
  res.json({ success: true, data: accounts });
});

exports.getAllAccounts = asyncHandler(async (req, res) => {
  const accounts = await FundAccount.findAll();
  res.json({ success: true, data: accounts });
});

exports.getAccountById = asyncHandler(async (req, res) => {
  const account = await FundAccount.findById(req.params.id);
  if (!account) throw new NotFoundError('Fund account not found');
  res.json({ success: true, data: account });
});

exports.createAccount = asyncHandler(async (req, res) => {
  const bankName = typeof req.body.bankName === 'string' ? req.body.bankName.trim() : '';
  const accountTitle = typeof req.body.accountTitle === 'string' ? req.body.accountTitle.trim() : '';
  const accountNumber = typeof req.body.accountNumber === 'string' ? req.body.accountNumber.trim() : '';
  const iban = typeof req.body.iban === 'string' ? req.body.iban.trim() : '';
  const branchCode = typeof req.body.branchCode === 'string' ? req.body.branchCode.trim() : '';
  const branchName = typeof req.body.branchName === 'string' ? req.body.branchName.trim() : '';
  const swiftCode = typeof req.body.swiftCode === 'string' ? req.body.swiftCode.trim() : '';
  const accountType = typeof req.body.accountType === 'string' ? req.body.accountType.trim() : 'Current';
  const currency = typeof req.body.currency === 'string' ? req.body.currency.trim() : 'PKR';
  const purpose = typeof req.body.purpose === 'string' ? req.body.purpose.trim() : '';
  const bankType = typeof req.body.bankType === 'string' ? req.body.bankType.trim() : 'Traditional';
  const minAmount = req.body.minAmount != null && req.body.minAmount !== '' ? parseFloat(req.body.minAmount) : null;
  const maxAmount = req.body.maxAmount != null && req.body.maxAmount !== '' ? parseFloat(req.body.maxAmount) : null;
  if (!bankName || !accountTitle || !accountNumber) {
    throw new BadRequestError('bankName, accountTitle, and accountNumber are required');
  }
  if (minAmount != null && Number.isNaN(minAmount)) throw new BadRequestError('minAmount must be a valid number');
  if (maxAmount != null && Number.isNaN(maxAmount)) throw new BadRequestError('maxAmount must be a valid number');
  if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
    throw new BadRequestError('Minimum amount cannot be greater than maximum amount');
  }
  const accountID = await FundAccount.insert({
    ownerID: req.user.id,
    ownerType: req.user.role,
    bankName, accountTitle, accountNumber, iban, branchCode, branchName,
    swiftCode, accountType, currency, purpose, bankType, minAmount, maxAmount
  });
  res.status(201).json({ success: true, message: 'Fund account added', data: { accountID } });
});

exports.updateAccount = asyncHandler(async (req, res) => {
  const existing = await FundAccount.findById(req.params.id);
  if (!existing) throw new NotFoundError('Fund account not found');
  if (existing.ownerID !== req.user.id && req.user.role !== 'Admin') {
    throw new BadRequestError('You can only edit your own accounts');
  }
  const bankName = typeof req.body.bankName === 'string' ? req.body.bankName.trim() : '';
  const accountTitle = typeof req.body.accountTitle === 'string' ? req.body.accountTitle.trim() : '';
  const accountNumber = typeof req.body.accountNumber === 'string' ? req.body.accountNumber.trim() : '';
  const iban = typeof req.body.iban === 'string' ? req.body.iban.trim() : '';
  const branchCode = typeof req.body.branchCode === 'string' ? req.body.branchCode.trim() : '';
  const branchName = typeof req.body.branchName === 'string' ? req.body.branchName.trim() : '';
  const swiftCode = typeof req.body.swiftCode === 'string' ? req.body.swiftCode.trim() : '';
  const accountType = typeof req.body.accountType === 'string' ? req.body.accountType.trim() : 'Current';
  const currency = typeof req.body.currency === 'string' ? req.body.currency.trim() : 'PKR';
  const purpose = typeof req.body.purpose === 'string' ? req.body.purpose.trim() : '';
  const bankType = typeof req.body.bankType === 'string' ? req.body.bankType.trim() : 'Traditional';
  const minAmount = req.body.minAmount != null && req.body.minAmount !== '' ? parseFloat(req.body.minAmount) : null;
  const maxAmount = req.body.maxAmount != null && req.body.maxAmount !== '' ? parseFloat(req.body.maxAmount) : null;

  if (!bankName || !accountTitle || !accountNumber) {
    throw new BadRequestError('bankName, accountTitle, and accountNumber are required');
  }
  if (minAmount != null && Number.isNaN(minAmount)) throw new BadRequestError('minAmount must be a valid number');
  if (maxAmount != null && Number.isNaN(maxAmount)) throw new BadRequestError('maxAmount must be a valid number');
  if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
    throw new BadRequestError('Minimum amount cannot be greater than maximum amount');
  }

  await FundAccount.update(req.params.id, {
    bankName, accountTitle, accountNumber, iban, branchCode, branchName,
    swiftCode, accountType, currency, purpose, bankType, minAmount, maxAmount
  });
  res.json({ success: true, message: 'Fund account updated' });
});

exports.toggleAccount = asyncHandler(async (req, res) => {
  const existing = await FundAccount.findById(req.params.id);
  if (!existing) throw new NotFoundError('Fund account not found');
  if (existing.ownerID !== req.user.id && req.user.role !== 'Admin') {
    throw new BadRequestError('You can only modify your own accounts');
  }
  await FundAccount.toggleActive(req.params.id);
  res.json({ success: true, message: 'Account status toggled' });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const existing = await FundAccount.findById(req.params.id);
  if (!existing) throw new NotFoundError('Fund account not found');
  if (existing.ownerID !== req.user.id && req.user.role !== 'Admin') {
    throw new BadRequestError('You can only delete your own accounts');
  }
  await FundAccount.delete(req.params.id);
  res.json({ success: true, message: 'Fund account deleted' });
});

// ── Fund Transactions ──

exports.getMyTransactions = asyncHandler(async (req, res) => {
  const transactions = await FundAccount.getTransactions(req.user.id);
  res.json({ success: true, data: transactions });
});

exports.getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await FundAccount.getAllTransactions();
  res.json({ success: true, data: transactions });
});

exports.getAdminSourceAccounts = asyncHandler(async (req, res) => {
  const accounts = await FundAccount.getAdminSourceAccountsWithBalances();
  res.json({ success: true, data: accounts });
});

exports.getAdminFundSummary = asyncHandler(async (req, res) => {
  const summary = await FundAccount.getAdminFundSummary();
  res.json({ success: true, data: summary });
});

exports.allocateFunds = asyncHandler(async (req, res) => {
  const { toType, toID, amount, purpose, disasterID, notes, fromBankAccountID, recipientAccountID, senderAccountNumber, transactionRef } = req.body;
  const parsedAmount = parseFloat(amount);
  if (!toType || !toID || !parsedAmount || parsedAmount <= 0) {
    throw new BadRequestError('toType, toID, and a positive amount are required');
  }
  if (!['NGO', 'RescueTeam'].includes(toType)) {
    throw new BadRequestError('toType must be NGO or RescueTeam');
  }
  if (!fromBankAccountID) {
    throw new BadRequestError('Please select sender admin account');
  }
  if (!recipientAccountID) {
    throw new BadRequestError('Please select recipient bank account');
  }
  if (!senderAccountNumber || !String(senderAccountNumber).trim()) {
    throw new BadRequestError('Sender account number is required');
  }
  if (!transactionRef || !String(transactionRef).trim()) {
    throw new BadRequestError('Transaction reference is required');
  }
  if (!req.file || !req.file.path) {
    throw new BadRequestError('Transfer receipt is required');
  }

  const recipientAccount = await FundAccount.findById(recipientAccountID);
  if (!recipientAccount) {
    throw new NotFoundError('Recipient bank account not found');
  }
  if (String(recipientAccount.ownerID).trim() !== String(toID).trim() || String(recipientAccount.ownerType).trim() !== String(toType).trim()) {
    throw new BadRequestError('Selected bank account does not belong to selected recipient');
  }
  if (!recipientAccount.isActive) {
    throw new BadRequestError('Selected bank account is inactive');
  }

  const cleanSenderAccount = String(senderAccountNumber).replace(/[-\s]/g, '');

  const sourceAccounts = await FundAccount.getAdminSourceAccountsWithBalances();
  const sourceAccount = sourceAccounts.find((acc) => String(acc.accountID).trim() === String(fromBankAccountID).trim());
  if (!sourceAccount) {
    throw new BadRequestError('Selected sender account is not available');
  }
  const sourceAvailable = Number(sourceAccount.availableAmount || 0);
  if (parsedAmount > sourceAvailable) {
    throw new BadRequestError(`Insufficient balance in selected sender account. Available amount is PKR ${sourceAvailable.toLocaleString()}`);
  }

  const transactionID = await FundAccount.insertTransaction({
    fromType: 'Admin', fromID: req.user.id,
    toType,
    toID,
    amount: parsedAmount,
    purpose,
    disasterID,
    notes,
    fromBankAccountID,
    recipientAccountID,
    senderAccountNumber: cleanSenderAccount || String(sourceAccount.accountNumber || ''),
    transactionRef: String(transactionRef).trim(),
    receiptImagePath: req.file.path
  });

  const recipientPath = toType === 'NGO' ? '/ngo/bank-accounts' : '/rescue/bank-accounts';
  await notify(toType, 'donation', 'Funds Allocated To You',
    `Admin allocated PKR ${parsedAmount.toLocaleString()} to your account. Transaction: ${transactionID}. Please confirm receipt.`,
    { targetUserID: toID, relatedEntity: 'FundTransaction', relatedID: transactionID, redirectPath: recipientPath });

  await notify('Admin', 'donation', 'Funds Allocation Created',
    `PKR ${parsedAmount.toLocaleString()} allocated to ${toType} (${toID}). Transaction: ${transactionID}.`,
    { targetUserID: req.user.id, relatedEntity: 'FundTransaction', relatedID: transactionID, redirectPath: '/admin/donations' });

  res.status(201).json({ success: true, message: 'Funds allocation created and marked as InProcess until recipient confirms receipt.', data: { transactionID } });
});

exports.updateTransactionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new BadRequestError('Status is required');
  const allowed = ['Pending', 'InProcess', 'Completed', 'Rejected', 'Cancelled'];
  if (!allowed.includes(status)) throw new BadRequestError(`Invalid status. Allowed values: ${allowed.join(', ')}`);

  const tx = await FundAccount.findTransactionById(req.params.id);
  if (!tx) throw new NotFoundError('Transaction not found');

  await FundAccount.updateTransactionStatus(req.params.id, status, req.user.id);

  const recipientPath = tx.toType === 'NGO' ? '/ngo/bank-accounts' : '/rescue/bank-accounts';
  await notify(tx.toType, 'donation', 'Funds Transaction Status Updated',
    `Transaction ${tx.transactionID} status changed to ${status}. Amount: PKR ${Number(tx.amount || 0).toLocaleString()}.`,
    { targetUserID: tx.toID, relatedEntity: 'FundTransaction', relatedID: tx.transactionID, redirectPath: recipientPath });

  await notify('Admin', 'donation', 'Transaction Status Updated',
    `Transaction ${tx.transactionID} updated to ${status}.`,
    { targetUserID: req.user.id, relatedEntity: 'FundTransaction', relatedID: tx.transactionID, redirectPath: '/admin/donations' });

  res.json({ success: true, message: 'Transaction status updated' });
});

exports.confirmTransactionReceived = asyncHandler(async (req, res) => {
  const transaction = await FundAccount.findTransactionById(req.params.id);
  if (!transaction) throw new NotFoundError('Transaction not found');

  const allowedReceiverRoles = ['NGO', 'RescueTeam'];
  if (!allowedReceiverRoles.includes(req.user.role)) {
    throw new ForbiddenError('Only NGO or RescueTeam can confirm receipt');
  }

  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  const updated = await FundAccount.confirmTransactionReceived(req.params.id, req.user.id, req.user.role, note || 'Recipient confirmed receipt');
  if (updated === false) {
    throw new ForbiddenError('You can only confirm transactions allocated to your account');
  }

  await notify('Admin', 'donation', 'Funds Receipt Confirmed',
    `${req.user.role} (${req.user.id}) confirmed receipt for transaction ${transaction.transactionID}. Amount: PKR ${Number(transaction.amount || 0).toLocaleString()}.`,
    { targetUserID: transaction.fromID, relatedEntity: 'FundTransaction', relatedID: transaction.transactionID, redirectPath: '/admin/donations' });

  const recipientPath = req.user.role === 'NGO' ? '/ngo/bank-accounts' : '/rescue/bank-accounts';
  await notify(req.user.role, 'donation', 'Receipt Confirmation Saved',
    `You confirmed receipt for transaction ${transaction.transactionID}. Status is now Completed.`,
    { targetUserID: req.user.id, relatedEntity: 'FundTransaction', relatedID: transaction.transactionID, redirectPath: recipientPath });

  res.json({ success: true, message: 'Transaction marked as Completed after recipient confirmation', data: updated });
});
