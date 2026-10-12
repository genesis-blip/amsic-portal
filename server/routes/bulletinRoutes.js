const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/bulletinController');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', c.listBulletins);
router.get('/:id', validateObjectId, c.getBulletin);
router.post('/', requireAuth, requireStaff, can('bulletins.manage'), c.createBulletin);
router.put('/:id', requireAuth, requireStaff, can('bulletins.manage'), validateObjectId, c.updateBulletin);
router.delete('/:id', requireAuth, requireStaff, can('bulletins.manage'), validateObjectId, c.deleteBulletin);

module.exports = router;
