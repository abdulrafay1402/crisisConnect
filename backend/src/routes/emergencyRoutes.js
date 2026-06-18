const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const c = require('../controllers/emergencyController');

router.get('/', verifyToken, c.getAllEmergencies);
router.get('/pending', verifyToken, c.getPendingEmergencies);
router.get('/my-emergencies', verifyToken, c.getEmergenciesByCitizen);
router.get('/team/:teamId', verifyToken, c.getEmergenciesByTeam);
router.get('/ngo/:ngoId', verifyToken, c.getEmergenciesByNGO);
router.get('/citizen/:citizenId', verifyToken, c.getEmergenciesByCitizen);
router.get('/:id', verifyToken, c.getEmergencyById);
router.get('/:id/assignments', verifyToken, c.getEmergencyAssignments);
router.get('/:id/updates', verifyToken, c.getEmergencyUpdates);
router.post('/', verifyToken, authorize('Citizen', 'Admin'), c.createEmergency);
router.put('/:id/assign-team', verifyToken, authorize('Admin'), c.assignTeam);
router.post('/:id/assignments/teams', verifyToken, authorize('Admin'), c.addTeamAssignment);
router.delete('/:id/assignments/teams/:teamId', verifyToken, authorize('Admin'), c.removeTeamAssignment);
router.post('/:id/assignments/ngos', verifyToken, authorize('Admin'), c.addNGOAssignment);
router.delete('/:id/assignments/ngos/:ngoId', verifyToken, authorize('Admin'), c.removeNGOAssignment);
router.post('/:id/updates', verifyToken, authorize('RescueTeam', 'NGO'), c.postEmergencyUpdate);
router.put('/:id/status', verifyToken, c.updateStatus);
router.put('/:id/resolve', verifyToken, authorize('Admin', 'RescueTeam'), c.resolveEmergency);
router.delete('/:id', verifyToken, authorize('Admin'), c.deleteEmergency);

module.exports = router;
