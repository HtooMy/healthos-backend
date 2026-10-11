const CheckIn = require('../models/CheckIn');

async function getCheckInHistory({ userId, startDate, endDate, limit = 30 }) {
  const query = { userId };

  if (startDate || endDate) {
    query.createdAt = {};

    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      const normalizedEndDate = new Date(endDate);
      normalizedEndDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = normalizedEndDate;
    }
  }

  const checkIns = await CheckIn.find(query)
    .sort({ createdAt: 1 })
    .limit(Number(limit) || 30)
    .lean();

  return checkIns.map((item) => ({
    id: item._id.toString(),
    userId: item.userId.toString(),
    sleepHours: item.sleepHours,
    sleepQuality: item.sleepQuality,
    activityMinutes: item.activityMinutes,
    perceivedEnergy: item.perceivedEnergy,
    perceivedFocus: item.perceivedFocus,
    energyScore: item.energyScore,
    attentionScore: item.attentionScore,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

module.exports = {
  getCheckInHistory,
};
