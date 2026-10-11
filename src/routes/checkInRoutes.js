const express = require('express');
const { createCheckIn, createSmartCheckIn, getLatestCheckIn } = require('../controllers/checkInController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createCheckIn);
router.post('/smart', createSmartCheckIn);
router.get('/latest', getLatestCheckIn);

module.exports = router;
