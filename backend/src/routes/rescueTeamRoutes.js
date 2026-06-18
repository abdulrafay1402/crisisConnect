const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/rescueTeamController');

router.get('/', c.getAllRescueTeams);
router.get('/available', c.getAvailableTeams);
router.get('/stats', verifyToken, authorize('Admin'), c.getRescueTeamStats);
router.get('/:id', c.getRescueTeamById);
router.put('/:id', verifyToken, c.updateRescueTeam);
router.put('/:id/status', verifyToken, c.updateTeamStatus);
router.put('/:id/approve', verifyToken, authorize('Admin'), c.approveRescueTeam);
router.put('/:id/reject', verifyToken, authorize('Admin'), c.rejectRescueTeam);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteRescueTeam);

module.exports = router;
