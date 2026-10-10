const express = require('express');
const { register, login, resendConfirmation, confirmEmailRoute } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/resend-confirmation', resendConfirmation);
router.get('/confirm-email', confirmEmailRoute);
router.post('/confirm-email', confirmEmailRoute);

module.exports = router;
