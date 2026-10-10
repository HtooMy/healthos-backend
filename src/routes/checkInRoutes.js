const express = require('express');
const { createCheckIn, getLatestCheckIn } = require('../controllers/checkInController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createCheckIn);
router.get('/latest', getLatestCheckIn);

module.exports = router;
