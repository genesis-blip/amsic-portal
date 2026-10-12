const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/blotterController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('blotter.view'), c.listBlotters);
router.get('/:id', can('blotter.view'), validateObjectId, c.getBlotter);
router.post('/', can('blotter.manage'), c.createBlotter);
router.put('/:id', can('blotter.manage'), validateObjectId, c.updateBlotter);
router.patch('/:id/status', can('blotter.manage'), validateObjectId, c.updateBlotterStatus);
router.post('/:id/actions', can('blotter.manage'), validateObjectId, c.addAction);
router.delete('/:id', can('blotter.manage'), validateObjectId, c.deleteBlotter);

module.exports = router;
