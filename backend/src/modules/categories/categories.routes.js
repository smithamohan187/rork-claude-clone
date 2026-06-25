const { Router } = require('express');
const { getCategories, getBusinessCategories } = require('./categories.controller');

const router = Router();

router.get('/', getCategories);
router.get('/business', getBusinessCategories);

module.exports = router;