const { signup, login } = require('./auth.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const signupHandler = asyncHandler(async (req, res) => {
  const data = await signup(
    req.body,
    req.headers['user-agent'],
    req.ip
  );
  res.status(201).json(ok(data));
});

const loginHandler = asyncHandler(async (req, res) => {
  const data = await login(req.body);
  res.status(200).json(ok(data));
});

module.exports = { signupHandler, loginHandler };
