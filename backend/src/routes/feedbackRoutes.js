const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/feedbackController');

router.get('/', verifyToken, authorize('Admin'), c.getAllFeedback);
router.get('/pending', verifyToken, authorize('Admin'), c.getPendingFeedback);
router.get('/stats', verifyToken, authorize('Admin'), c.getFeedbackStats);
router.get('/my-feedback', verifyToken, c.getMyFeedback);
router.get('/:id', verifyToken, c.getFeedbackById);
router.post('/', verifyToken, c.createFeedback);
router.put('/:id/respond', verifyToken, authorize('Admin'), c.respondToFeedback);
router.put('/:id/status', verifyToken, authorize('Admin'), c.updateStatus);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteFeedback);

module.exports = router;
