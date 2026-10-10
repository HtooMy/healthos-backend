const {
  registerUser,
  loginUser,
  resendConfirmationEmail,
  confirmEmail,
} = require('../services/authenticationService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);
  return res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  return res.status(200).json(result);
});

const resendConfirmation = asyncHandler(async (req, res) => {
  const result = await resendConfirmationEmail(req.body);
  return res.status(200).json(result);
});

const confirmEmailRoute = asyncHandler(async (req, res) => {
  const result = await confirmEmail({
    email: req.body.email || req.query.email,
    code: req.body.code || req.query.code,
    token: req.body.token || req.query.token,
  });
  return res.status(200).json(result);
});

module.exports = { register, login, resendConfirmation, confirmEmailRoute };
