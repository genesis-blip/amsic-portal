const router = require('express').Router();
const c = require('../controllers/meController');
const cert = require('../controllers/certificateController');
const { requireAuth, requireResident } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireResident);

router.get('/', c.getProfile);
router.patch('/', c.updateProfile);
router.get('/requests', c.listRequests);
router.post('/requests/quote', c.quote);
router.post('/requests', c.createRequest);
router.get('/requests/:id', validateObjectId, c.getRequest);
router.get('/requests/:id/certificate', validateObjectId, cert.myCertificate);
router.patch('/requests/:id/cancel', validateObjectId, c.cancelRequest);
router.get('/payment-options', c.paymentOptions);
router.post('/requests/:id/pay', validateObjectId, c.startPayment);
router.get('/requests/:id/pay', validateObjectId, c.paymentStatus);
router.post('/requests/:id/pay/simulate', validateObjectId, c.simulatePayment);
router.get('/incidents', c.listIncidents);
router.post('/incidents', c.createIncident);
router.get('/sos', c.listSos);
router.post('/sos', c.createSos);
router.get('/payments', c.listPayments);
router.get('/health-records', c.listHealthRecords);

module.exports = router;
