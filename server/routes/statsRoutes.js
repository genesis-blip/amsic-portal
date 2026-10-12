const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/statsController');

router.use(requireAuth, requireStaff);

router.get('/overview', can('dashboard.view'), c.getOverview);

module.exports = router;
