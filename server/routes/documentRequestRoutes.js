const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/documentRequestController');
const cert = require('../controllers/certificateController');
const validateObjectId = require('../middleware/validateObjectId');

router.use(requireAuth, requireStaff);

router.get('/', can('documents.view'), c.listRequests);
router.get('/overdue', can('documents.view'), c.listOverdue);
router.post('/quote', can('documents.view'), c.quote);
router.get('/:id', can('documents.view'), validateObjectId, c.getRequest);
router.get('/:id/certificate', can('documents.view'), validateObjectId, cert.staffCertificate);
router.post('/', can('documents.process'), c.createRequest);
router.put('/:id', can('documents.process'), validateObjectId, c.updateRequest);
router.patch('/:id/status', can('documents.process'), validateObjectId, c.updateStatus);
router.delete('/:id', can('documents.process'), validateObjectId, c.deleteRequest);

module.exports = router;
