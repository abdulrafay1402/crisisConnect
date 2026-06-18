const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/ngoController');

router.get('/', c.getAllNGOs);
router.get('/available', c.getAvailableNGOs);
router.get('/stats', verifyToken, authorize('Admin'), c.getNGOStats);
router.get('/:id', c.getNGOById);
router.put('/:id', verifyToken, c.updateNGO);
router.put('/:id/status', verifyToken, c.updateNGOStatus);
router.put('/:id/approve', verifyToken, authorize('Admin'), c.approveNGO);
router.put('/:id/reject', verifyToken, authorize('Admin'), c.rejectNGO);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteNGO);

module.exports = router;
