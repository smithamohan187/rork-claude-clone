const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { toggleSchema } = require('./savedOffer.validation');
const { toggleHandler, myOffersHandler } = require('./savedOffer.controller');

const router = Router();

router.post('/toggle',   authenticate, validateRequest(toggleSchema), toggleHandler);
router.get('/my-offers', authenticate, myOffersHandler);

module.exports = router;
