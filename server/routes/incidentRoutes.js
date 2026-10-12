const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/incidentController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('incidents.view'), c.listIncidents);
router.get('/:id', can('incidents.view'), validateObjectId, c.getIncident);
router.post('/', can('incidents.update'), c.createIncident);
router.put('/:id', can('incidents.update'), validateObjectId, c.updateIncident);
router.patch('/:id/status', can('incidents.update'), validateObjectId, c.updateIncidentStatus);
router.delete('/:id', can('incidents.delete'), validateObjectId, c.deleteIncident);

module.exports = router;
