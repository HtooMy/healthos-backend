const express = require('express');
const { createCheckIn, createSmartCheckIn, getLatestCheckIn, getCheckInHistory } = require('../controllers/checkInController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getCheckInHistory);
router.post('/', createCheckIn);
router.post('/smart', createSmartCheckIn);
router.get('/latest', getLatestCheckIn);
router.get('/history', getCheckInHistory);

module.exports = router;
