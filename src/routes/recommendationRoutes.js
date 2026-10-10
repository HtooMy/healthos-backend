const express = require('express');
const { getRecommendations } = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getRecommendations);

module.exports = router;
