const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/resourcePackageController');

router.get('/', verifyToken, c.getAllResourcePackages);
router.get('/pending', verifyToken, authorize('Admin'), c.getPendingPackages);
router.get('/my-packages', verifyToken, c.getPackagesByRequester);
router.get('/requester/:requesterId', verifyToken, c.getPackagesByRequester);
router.get('/:id', verifyToken, c.getResourcePackageById);
router.post('/', verifyToken, authorize('NGO', 'RescueTeam'), c.createResourcePackage);
router.put('/:id/status', verifyToken, authorize('Admin'), c.updateStatus);
router.put('/:id/approve', verifyToken, authorize('Admin'), c.approvePackage);
router.put('/:id/reject', verifyToken, authorize('Admin'), c.rejectPackage);
router.put('/:id/confirm-received', verifyToken, authorize('NGO', 'RescueTeam'), c.confirmPackageReceived);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteResourcePackage);

module.exports = router;
