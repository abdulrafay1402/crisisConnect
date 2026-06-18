const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/messageController');

router.get('/contacts', verifyToken, authorize('RescueTeam', 'NGO', 'Citizen'), c.getContacts);
router.get('/available-contacts', verifyToken, authorize('RescueTeam', 'NGO', 'Citizen'), c.getAvailableContacts);
router.get('/unread-count', verifyToken, authorize('RescueTeam', 'NGO', 'Citizen'), c.getUnreadCount);
router.get('/:contactId', verifyToken, authorize('RescueTeam', 'NGO', 'Citizen'), c.getConversation);
router.post('/', verifyToken, authorize('RescueTeam', 'NGO', 'Citizen'), c.sendMessage);

module.exports = router;
