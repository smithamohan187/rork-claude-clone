const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { submitReviewSchema } = require('./reviews.validation');
const {
  submitReviewHandler,
  deleteReviewHandler,
  getRatingSummaryHandler,
  getMyReviewHandler,
  getBusinessReviewsHandler,
  getRatingBreakdownHandler,
} = require('./reviews.controller');

const router = Router();

router.post('/', authenticate, validateRequest(submitReviewSchema), submitReviewHandler);
router.delete('/', authenticate, deleteReviewHandler);
router.get('/summary', getRatingSummaryHandler);
router.get('/me', authenticate, getMyReviewHandler);
router.get('/list', getBusinessReviewsHandler);
router.get('/breakdown', getRatingBreakdownHandler);

module.exports = router;
