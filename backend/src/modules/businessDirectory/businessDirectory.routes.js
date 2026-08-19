

// Routes layer — middleware chain and controller binding only. No logic here.
const { Router } = require('express');
const { validateRequest } = require('../../middleware/validateRequest');
const { optionalAuthenticate } = require('../../middleware/authenticate');
const { listBusinessesSchema } = require('./businessDirectory.validation');
const { listBusinessesHandler, getCategoriesHandler } = require('./businessDirectory.controller');

const router = Router();

// Public routes — anyone can browse the directory. optionalAuthenticate personalises the
// listing (is_subscribed) when a valid token is present, but never blocks anonymous access.

// Static route must come before root route to avoid any future /:id conflicts
router.get('/categories', getCategoriesHandler);
router.get('/', optionalAuthenticate, validateRequest(listBusinessesSchema, 'query'), listBusinessesHandler);



module.exports = router;
