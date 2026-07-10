const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { saveBodySchema, unsaveBodySchema } = require('./savedBusiness.validation');
const { saveHandler, unsaveHandler, statusHandler, myBusinessesHandler } = require('./savedBusiness.controller');

const router = Router();

router.get('/my-businesses', authenticate, myBusinessesHandler);
router.get('/status',        authenticate, statusHandler);
router.post('/',             authenticate, validateRequest(saveBodySchema),  saveHandler);
router.delete('/',           authenticate, validateRequest(unsaveBodySchema), unsaveHandler);

module.exports = router;
