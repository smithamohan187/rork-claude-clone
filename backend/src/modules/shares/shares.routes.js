const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { logShareBodySchema } = require('./shares.validation');
const { logShareHandler } = require('./shares.controller');

const router = Router();

router.post('/', authenticate, validateRequest(logShareBodySchema), logShareHandler);

module.exports = router;
