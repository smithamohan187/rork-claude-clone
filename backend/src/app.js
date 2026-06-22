const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { ok } = require('./utils/apiResponse');

const authRoutes         = require('./modules/auth/auth.routes');
const categoriesRoutes   = require('./modules/categories/categories.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const api = express.Router();

app.get('/health', (req, res) => res.json(ok({ status: 'ok' })));
app.use('/auth',          authRoutes);
app.use('/categories',    categoriesRoutes);

app.use('/api/v1', api);

app.use(globalErrorHandler);

module.exports = app;