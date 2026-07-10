const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { toggleSchema } = require('./savedEvent.validation');
const { toggleHandler, myEventsHandler } = require('./savedEvent.controller');

const router = Router();

router.post('/toggle',    authenticate, validateRequest(toggleSchema), toggleHandler);
router.get('/my-events',  authenticate, myEventsHandler);

module.exports = router;
