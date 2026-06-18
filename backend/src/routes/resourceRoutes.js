const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/resourceController');

router.get('/', verifyToken, c.getAllResources);
router.get('/available', verifyToken, c.getAvailableResources);
router.get('/low-stock', verifyToken, authorize('Admin'), c.getLowStockResources);
router.get('/stats', verifyToken, authorize('Admin'), c.getResourceStats);
router.get('/:id', verifyToken, c.getResourceById);
router.post('/', verifyToken, authorize('Admin'), c.createResource);
router.put('/:id', verifyToken, authorize('Admin'), c.updateResource);
router.put('/:id/allocate', verifyToken, authorize('Admin'), c.allocateResource);
router.put('/:id/deallocate', verifyToken, authorize('Admin'), c.deallocateResource);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteResource);

module.exports = router;
