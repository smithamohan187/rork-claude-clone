const { Router } = require('express');
const { getCategories } = require('./categories.controller');

const router = Router();

router.get('/', getCategories);

module.exports = router;