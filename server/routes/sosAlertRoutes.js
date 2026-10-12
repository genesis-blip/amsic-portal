const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/sosAlertController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('sos.view'), c.listAlerts);
router.get('/metrics', can('sos.view'), c.getMetrics);
router.get('/:id', can('sos.view'), validateObjectId, c.getAlert);
router.post('/', can('sos.respond'), c.createAlert);
router.patch('/:id/status', can('sos.respond'), validateObjectId, c.updateAlertStatus);
router.delete('/:id', can('sos.delete'), validateObjectId, c.deleteAlert);

module.exports = router;
