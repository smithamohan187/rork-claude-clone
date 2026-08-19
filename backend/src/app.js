const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { ok } = require('./utils/apiResponse');

const authRoutes              = require('./modules/auth/auth.routes');
const categoriesRoutes        = require('./modules/categories/categories.routes');
const profileRoutes           = require('./modules/profile/profile.routes');
const businessRoutes          = require('./modules/businesses/business.routes');
const businessDirectoryRoutes = require('./modules/businessDirectory/businessDirectory.routes');
const offersRoutes            = require('./modules/offers/offers.routes');
const eventsRoutes            = require('./modules/events/events.routes');
const postsRoutes             = require('./modules/posts/posts.routes');
const subscriptionRoutes      = require('./modules/subscriptions/subscription.routes');
const reviewsRoutes           = require('./modules/reviews/reviews.routes');
const savedBusinessRoutes     = require('./modules/savedBusinesses/savedBusiness.routes');
const savedOfferRoutes        = require('./modules/savedOffers/savedOffer.routes');
const savedEventRoutes        = require('./modules/savedEvents/savedEvent.routes');
const savedPostRoutes         = require('./modules/savedPosts/savedPost.routes');
const feedRoutes              = require('./modules/feed/feed.routes');
const likesRoutes             = require('./modules/likes/likes.routes');
const commentsRoutes          = require('./modules/comments/comments.routes');
const sharesRoutes            = require('./modules/shares/shares.routes');
const rewardConfigRoutes      = require('./modules/rewardConfig/rewardConfig.routes');
const marketplaceRoutes       = require('./modules/marketplace/marketplace.routes');
const shareReferralRoutes     = require('./modules/shareReferrals/shareReferrals.routes');
const { sharePreviewPageHandler } = require('./modules/shareReferrals/shareReferrals.controller');
const pointsRoutes            = require('./modules/points/points.routes');
const globalRewardTierRoutes  = require('./modules/globalRewardTiers/globalRewardTiers.routes');
const customerInviteRoutes    = require('./modules/customerInvites/customerInvite.routes');
const referralRoutes          = require('./modules/referrals/referral.routes');
const notificationRoutes      = require('./modules/notifications/notifications.routes');
const chatRoutes              = require('./modules/chat/chat.routes');
const dashboardFeedRoutes     = require('./modules/dashboardFeed/dashboardFeed.routes');
const analyticsRoutes         = require('./modules/analytics/analytics.routes');
const { businessRouter: couponsBusinessRouter, couponRouter } = require('./modules/coupons/coupons.routes');
const { getScanLandingPageHandler } = require('./modules/businesses/business.controller');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', (req, res, next) => {
  // Allow cross-origin image loads — frontend runs on a different port
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '..', '..', 'uploads')));

const api = express.Router();

app.get('/health', (req, res) => res.json(ok({ status: 'ok' })));
app.get('/test', (req, res) => res.json({ works: true }));
app.use('/auth',          authRoutes);
app.use('/categories',    categoriesRoutes);
app.use('/profile',       profileRoutes);
app.use('/businesses',         businessRoutes);
console.log('Registering businessdirectory routes...');
app.use('/businessdirectory', businessDirectoryRoutes);
console.log('Done.');
app.use('/offers',            offersRoutes);
app.use('/events',            eventsRoutes);
app.use('/posts',             postsRoutes);
app.use('/subscriptions',     subscriptionRoutes);
app.use('/reviews',           reviewsRoutes);
app.use('/saved-businesses',  savedBusinessRoutes);
app.use('/saved-offers',      savedOfferRoutes);
app.use('/saved-events',      savedEventRoutes);
app.use('/saved-posts',       savedPostRoutes);
app.use('/feed',              feedRoutes);
app.use('/feed/share',              shareReferralRoutes);
// Public link-preview page for scrapers (Facebook/WhatsApp/iMessage) hitting SHARE_BASE_URL/s/:code
// directly — must be plain server-rendered HTML, not part of the JSON API above.
app.get('/s/:code',                 sharePreviewPageHandler);
// Public landing page for a business's "Scan to subscribe" QR code (built by
// GET /businesses/:id/scan-code) — same plain-HTML-for-scrapers pattern as /s/:code above.
app.get('/b/:id',                   getScanLandingPageHandler);
app.use('/likes',             likesRoutes);
app.use('/comments',          commentsRoutes);
app.use('/shares',            sharesRoutes);
app.use('/marketplace',       marketplaceRoutes);
app.use('/points',            pointsRoutes);
app.use('/rewards',           globalRewardTierRoutes);
app.use('/invites',           customerInviteRoutes);
app.use('/referrals',         referralRoutes);
app.use('/notifications',     notificationRoutes);
app.use('/conversations',     chatRoutes);
app.use('/dashboard/feed',    dashboardFeedRoutes);
app.use('/analytics',         analyticsRoutes);
app.use('/businesses',        couponsBusinessRouter);
app.use('/coupons',           couponRouter);
app.use('/',                  rewardConfigRoutes);

app.use('/api/v1', api);

app.use(globalErrorHandler);

module.exports = app;