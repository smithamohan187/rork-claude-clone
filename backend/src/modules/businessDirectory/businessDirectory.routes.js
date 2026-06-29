

// Routes layer — middleware chain and controller binding only. No logic here.
const { Router } = require('express');
const { validateRequest } = require('../../middleware/validateRequest');
const { listBusinessesSchema } = require('./businessDirectory.validation');
const { listBusinessesHandler, getCategoriesHandler } = require('./businessDirectory.controller');

const router = Router();

// Public routes — no authenticate middleware needed; anyone can browse the directory

// Static route must come before root route to avoid any future /:id conflicts
router.get('/categories', getCategoriesHandler);
router.get('/', validateRequest(listBusinessesSchema, 'query'), listBusinessesHandler);



module.exports = router;
