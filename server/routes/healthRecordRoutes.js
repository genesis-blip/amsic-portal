const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/healthRecordController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('health.view'), c.listRecords);
router.get('/due', can('health.view'), c.listDue);
router.get('/:id', can('health.view'), validateObjectId, c.getRecord);
router.post('/', can('health.manage'), c.createRecord);
router.put('/:id', can('health.manage'), validateObjectId, c.updateRecord);
router.delete('/:id', can('health.manage'), validateObjectId, c.deleteRecord);

module.exports = router;
