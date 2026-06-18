const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/donorController');

router.get('/', verifyToken, c.getAllDonors);
router.get('/top', c.getTopDonors);
router.get('/stats', verifyToken, authorize('Admin'), c.getDonorStats);
router.get('/citizen/:citizenId', verifyToken, c.getDonorByCitizen);
router.get('/:id', verifyToken, c.getDonorById);
router.post('/', verifyToken, c.createDonor);
router.put('/:id/verify', verifyToken, authorize('Admin'), c.verifyDonor);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteDonor);

module.exports = router;
