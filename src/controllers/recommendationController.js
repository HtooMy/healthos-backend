const { getRecommendationsForUser } = require('../services/recommendationService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getRecommendations = asyncHandler(async (req, res) => {
  const availableMinutes = Number(req.query.availableMinutes);

  if (!Number.isInteger(availableMinutes) || availableMinutes <= 0) {
    return res.status(400).json({ message: 'availableMinutes must be a positive integer.' });
  }

  const result = await getRecommendationsForUser({
    userId: req.userId,
    availableMinutes,
  });

  if (!result) {
    return res.status(404).json({
      message: 'No daily check-in found. Complete a check-in before requesting recommendations.',
    });
  }

  return res.status(200).json(result);
});

module.exports = { getRecommendations };
