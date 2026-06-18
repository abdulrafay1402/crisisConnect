const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.get('/', verifyToken, c.getMyNotifications);
router.get('/unread-count', verifyToken, c.getUnreadCount);
router.put('/read-all', verifyToken, c.markAllRead);
router.put('/:id/read', verifyToken, c.markRead);
router.delete('/:id', verifyToken, c.deleteNotification);

module.exports = router;
