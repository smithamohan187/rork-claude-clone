const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { ok } = require('./utils/apiResponse');

const authRoutes         = require('./modules/auth/auth.routes');
const categoriesRoutes   = require('./modules/categories/categories.routes');
const profileRoutes      = require('./modules/profile/profile.routes');
const businessRoutes     = require('./modules/businesses/business.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

const api = express.Router();

app.get('/health', (req, res) => res.json(ok({ status: 'ok' })));
app.use('/auth',          authRoutes);
app.use('/categories',    categoriesRoutes);
app.use('/profile',       profileRoutes);
app.use('/businesses',    businessRoutes);

app.use('/api/v1', api);

app.use(globalErrorHandler);

module.exports = app;