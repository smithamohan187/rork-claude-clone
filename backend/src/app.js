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

app.use('/api/v1', api);

app.use(globalErrorHandler);

module.exports = app;