const router = require('express').Router();
const c = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', c.login);
router.post('/verify-otp', c.verifyOtp);
router.post('/resend-otp', c.resendOtp);
router.post('/register', c.register);
router.post('/forgot-password', c.forgotPassword);
router.post('/reset-password', c.resetPassword);
router.get('/me', requireAuth, c.me);
router.patch('/me', requireAuth, c.updateMe);
router.post('/change-password', requireAuth, c.changePassword);

module.exports = router;
