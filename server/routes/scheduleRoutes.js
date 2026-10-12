const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/scheduleController');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/availability', c.getAvailability);
router.get('/calendar', c.getCalendar);
router.get('/blocks', c.listBlocks);
router.post('/blocks', requireAuth, requireStaff, can('schedule.manage'), c.createBlock);
router.delete('/blocks/:id', requireAuth, requireStaff, can('schedule.manage'), validateObjectId, c.deleteBlock);

module.exports = router;
