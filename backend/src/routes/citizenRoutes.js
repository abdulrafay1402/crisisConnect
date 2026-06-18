const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/citizenController');

router.get('/', verifyToken, authorize('Admin'), c.getAllCitizens);
router.get('/cnic/:cnic', verifyToken, c.getCitizenByCnic);
router.get('/:id', verifyToken, c.getCitizenById);
router.put('/:id', verifyToken, c.updateCitizen);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteCitizen);

module.exports = router;
