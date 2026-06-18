const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/fundAccountController');
const { uploadReceipts } = require('../middleware/upload');

// Fund Accounts – NGO & RescueTeam manage their own; Admin can view all
router.get('/my', verifyToken, authorize('NGO', 'RescueTeam'), c.getMyAccounts);
router.get('/', verifyToken, authorize('Admin'), c.getAllAccounts);

// Fund Transactions
router.get('/transactions/my', verifyToken, c.getMyTransactions);
router.get('/transactions/all', verifyToken, authorize('Admin'), c.getAllTransactions);
router.get('/transactions/source-accounts', verifyToken, authorize('Admin'), c.getAdminSourceAccounts);
router.get('/transactions/summary', verifyToken, authorize('Admin'), c.getAdminFundSummary);
router.post('/transactions/allocate', verifyToken, authorize('Admin'), uploadReceipts.single('receipt'), c.allocateFunds);
router.put('/transactions/:id/status', verifyToken, authorize('Admin'), c.updateTransactionStatus);
router.put('/transactions/:id/confirm-received', verifyToken, authorize('NGO', 'RescueTeam'), c.confirmTransactionReceived);

router.get('/:id', verifyToken, c.getAccountById);
router.post('/', verifyToken, authorize('NGO', 'RescueTeam'), c.createAccount);
router.put('/:id', verifyToken, c.updateAccount);
router.put('/:id/toggle', verifyToken, c.toggleAccount);
router.delete('/:id', verifyToken, c.deleteAccount);

module.exports = router;
