const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/paymentController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('payments.view'), c.listPayments);
router.get('/summary', can('payments.view'), c.getSummary);
router.get('/:id', can('payments.view'), validateObjectId, c.getPayment);
router.post('/', can('payments.manage'), c.createPayment);
router.patch('/:id/void', can('payments.manage'), validateObjectId, c.voidPayment);

module.exports = router;
