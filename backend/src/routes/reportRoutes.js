const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/reportController');
const { exportCSV } = require('../utils/exportService');

router.get('/', verifyToken, authorize('Admin'), c.getAllReports);
router.get('/:id', verifyToken, c.getReportById);
router.post('/', verifyToken, authorize('Admin'), c.createReport);
router.post('/export-csv', verifyToken, authorize('Admin'), exportCSV);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteReport);

module.exports = router;
