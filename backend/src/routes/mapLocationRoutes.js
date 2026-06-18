const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/mapLocationController');

router.get('/', c.getAllMapLocations);
router.get('/:id', c.getMapLocationById);
router.post('/', verifyToken, authorize('Admin'), c.createMapLocation);
router.put('/:id', verifyToken, authorize('Admin'), c.updateMapLocation);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteMapLocation);

module.exports = router;
