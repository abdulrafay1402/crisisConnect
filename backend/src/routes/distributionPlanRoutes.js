const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/distributionPlanController');

router.get('/', verifyToken, c.getAllDistributionPlans);
router.get('/active', verifyToken, c.getActivePlans);
router.get('/ngo/:ngoId', verifyToken, c.getPlansByNGO);
router.get('/ngo/:ngoId/available-resources', verifyToken, c.getNGOAvailableResources);
router.get('/disaster/:disasterId', verifyToken, c.getPlansByDisaster);
router.get('/:id', verifyToken, c.getDistributionPlanById);
router.post('/', verifyToken, authorize('Admin', 'NGO'), c.createDistributionPlan);
router.put('/:id/status', verifyToken, c.updateStatus);
router.put('/:id/beneficiaries', verifyToken, c.updateBeneficiaries);
router.delete('/:id', verifyToken, authorize('Admin', 'NGO'), c.deleteDistributionPlan);

module.exports = router;
