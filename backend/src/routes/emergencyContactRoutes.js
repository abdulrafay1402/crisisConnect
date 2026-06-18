const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/emergencyContactController');

router.get('/', c.getAllEmergencyContacts);
router.get('/:id', c.getEmergencyContactById);
router.post('/', verifyToken, authorize('Admin'), c.createEmergencyContact);
router.put('/:id', verifyToken, authorize('Admin'), c.updateEmergencyContact);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteEmergencyContact);

module.exports = router;
