const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/adminController');

router.get('/', verifyToken, authorize('Admin'), c.getAllAdmins);
router.get('/:id', verifyToken, authorize('Admin'), c.getAdminById);
router.post('/', verifyToken, authorize('Admin'), c.createAdmin);
router.put('/:id', verifyToken, authorize('Admin'), c.updateAdmin);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteAdmin);

module.exports = router;
