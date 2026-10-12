const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/residentController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('residents.view'), c.listResidents);
router.get('/demographics', can('residents.view'), c.getDemographics);
router.get('/:id', can('residents.view'), validateObjectId, c.getResident);
router.post('/', can('residents.manage'), c.createResident);
router.put('/:id', can('residents.manage'), validateObjectId, c.updateResident);
router.delete('/:id', can('residents.manage'), validateObjectId, c.deleteResident);

module.exports = router;
