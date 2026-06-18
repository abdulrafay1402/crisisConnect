const express = require('express');
const router = express.Router();
const { verifyToken, authorize, optionalAuth } = require('../middleware/auth');
const c = require('../controllers/alertController');

router.get('/', optionalAuth, c.getAllAlerts);
router.get('/active', c.getActiveAlerts);
router.get('/critical', c.getCriticalAlerts);
router.get('/disaster/:disasterId', c.getAlertsByDisaster);
router.get('/:id', c.getAlertById);
router.post('/', verifyToken, authorize('Admin'), c.createAlert);
router.put('/:id', verifyToken, authorize('Admin'), c.updateAlert);
router.put('/:id/cancel', verifyToken, authorize('Admin'), c.cancelAlert);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteAlert);

module.exports = router;
