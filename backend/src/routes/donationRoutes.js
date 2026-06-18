const express = require('express');
const router = express.Router();
const { verifyToken, authorize, optionalAuth } = require('../middleware/auth');
const c = require('../controllers/donationController');
const { uploadReceipts } = require('../middleware/upload');

router.get('/', verifyToken, c.getAllDonations);
router.get('/recent', c.getRecentDonations);
router.get('/stats', verifyToken, authorize('Admin'), c.getDonationStats);
router.get('/monthly/:year', verifyToken, authorize('Admin'), c.getMonthlySummary);
router.get('/my-donations', verifyToken, c.getMyDonations);
router.get('/disaster/:disasterId', c.getDonationsByDisaster);
router.get('/donor/:donorId', verifyToken, c.getDonationsByDonor);
router.get('/:id', verifyToken, c.getDonationById);
router.post('/', verifyToken, authorize('Citizen'), uploadReceipts.single('receipt'), c.createDonation);
router.put('/:id/status', verifyToken, authorize('Admin'), c.updateStatus);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteDonation);
router.post('/scan-receipt', verifyToken, authorize('Citizen'), uploadReceipts.single('receipt'), c.scanReceiptStandalone);
router.post('/:id/scan-receipt', verifyToken, authorize('Admin'), uploadReceipts.single('receipt'), c.scanReceipt);

module.exports = router;
