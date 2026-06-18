const express = require('express');
const router = express.Router();
const { verifyToken, optionalAuth } = require('../middleware/auth');
const c = require('../controllers/chatController');

router.post('/', verifyToken, c.ask);
router.get('/health', optionalAuth, c.health);

module.exports = router;
