const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const c = require('../controllers/authController');
const { uploadCNIC } = require('../middleware/upload');

router.post('/login', c.login);
router.post('/register/citizen', c.registerCitizen);
router.post('/register/ngo', c.registerNGO);
router.post('/register/rescueteam', c.registerRescueTeam);
router.post('/scan-cnic', uploadCNIC.single('cnicImage'), c.scanCNIC);
router.get('/me', verifyToken, c.getMe);
router.put('/change-password', verifyToken, c.changePassword);
router.post('/logout', verifyToken, c.logout);
router.post('/forgot-password', c.forgotPassword);
router.post('/reset-password', c.resetPassword);

module.exports = router;
