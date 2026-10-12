const router = require('express').Router();
const c = require('../controllers/accountController');
const { requireAuth, requireStaff } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', c.listAccounts);
router.post('/', c.createStaff);
router.patch('/:id', validateObjectId, c.updateAccount);
router.post('/:id/reset-password', validateObjectId, c.resetPassword);

module.exports = router;
