const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bankAccountController');
const { verifyToken, authorize } = require('../middleware/auth');

// Public: citizens can see active bank accounts for donations
router.get('/active', verifyToken, ctrl.getActive);

// Admin only
router.get('/', verifyToken, authorize('Admin'), ctrl.getAll);
router.get('/:id', verifyToken, authorize('Admin'), ctrl.getById);
router.post('/', verifyToken, authorize('Admin'), ctrl.create);
router.put('/:id', verifyToken, authorize('Admin'), ctrl.update);
router.put('/:id/toggle', verifyToken, authorize('Admin'), ctrl.toggleActive);
router.delete('/:id', verifyToken, authorize('Admin'), ctrl.remove);

module.exports = router;
