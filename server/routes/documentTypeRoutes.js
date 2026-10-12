const router = require('express').Router();
const { requireAuth, requireStaff, can } = require('../middleware/auth');
const c = require('../controllers/documentTypeController');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', c.listDocumentTypes);
router.get('/:id', validateObjectId, c.getDocumentType);
router.post('/', requireAuth, requireStaff, can('document_types.manage'), c.createDocumentType);
router.put('/:id', requireAuth, requireStaff, can('document_types.manage'), validateObjectId, c.updateDocumentType);
router.delete('/:id', requireAuth, requireStaff, can('document_types.manage'), validateObjectId, c.deleteDocumentType);

module.exports = router;
