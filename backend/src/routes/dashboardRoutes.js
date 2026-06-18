const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');
const { getAuditLogs } = require('../utils/auditLog');

router.get('/stats', verifyToken, authorize('Admin'), getDashboardStats);

router.get('/audit-logs', verifyToken, authorize('Admin'), async (req, res) => {
  try {
    const logs = await getAuditLogs(req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
