const CheckIn = require('../models/CheckIn');
const { getCheckInHistory: getCheckInHistoryService } = require('../services/checkInHistoryService');
const { calculateCheckInScores, normalizeActivityLevel, normalizeMoodScore } = require('../services/scoreService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function validateCheckInInput(payload) {
  if (
    Object.prototype.hasOwnProperty.call(payload, 'energyScore') ||
    Object.prototype.hasOwnProperty.call(payload, 'attentionScore')
  ) {
    return 'Scores are calculated on the server and cannot be submitted by the client.';
  }

  if (!Number.isFinite(Number(payload.sleepHours)) || Number(payload.sleepHours) < 0 || Number(payload.sleepHours) > 24) {
    return 'sleepHours must be a number between 0 and 24.';
  }

  const integerFields = [
    { key: 'sleepQuality', min: 1, max: 5 },
    { key: 'perceivedEnergy', min: 1, max: 5 },
    { key: 'perceivedFocus', min: 1, max: 5 },
  ];

  for (const field of integerFields) {
    const value = Number(payload[field.key]);
    if (!Number.isInteger(value) || value < field.min || value > field.max) {
      return `${field.key} must be an integer between ${field.min} and ${field.max}.`;
    }
  }

  const activityMinutes = Number(payload.activityMinutes);
  if (!Number.isInteger(activityMinutes) || activityMinutes < 0 || activityMinutes > 1440) {
    return 'activityMinutes must be an integer between 0 and 1440.';
  }

  return null;
}

function mapSmartCheckInInput(reqBody) {
  const sleepHours = Number(reqBody.sleepHours);
  const activityLevel = reqBody.activityLevel || 'moderate';
  const mood = reqBody.mood || 'neutral';

  const activityMinutes = normalizeActivityLevel(activityLevel);

  return {
    userId: reqBody.userId,
    sleepHours,
    sleepQuality: reqBody.sleepQuality ?? 3,
    activityMinutes,
    perceivedEnergy: reqBody.perceivedEnergy ?? 3,
    perceivedFocus: reqBody.perceivedFocus ?? 3,
    activityLevel,
    mood,
  };
}

const createCheckIn = asyncHandler(async (req, res) => {
  const payload = {
    userId: req.userId,
    sleepHours: req.body.sleepHours,
    sleepQuality: req.body.sleepQuality,
    activityMinutes: req.body.activityMinutes,
    perceivedEnergy: req.body.perceivedEnergy,
    perceivedFocus: req.body.perceivedFocus,
  };

  const validationError = validateCheckInInput(payload);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const scores = await calculateCheckInScores(payload);
  const checkIn = await CheckIn.create({ ...payload, ...scores });

  return res.status(201).json(checkIn);
});

const createSmartCheckIn = asyncHandler(async (req, res) => {
  const body = req.body || {};

  if (!req.userId) {
    return res.status(401).json({
      message: 'Authentication required.',
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(body, 'energyScore') ||
    Object.prototype.hasOwnProperty.call(body, 'attentionScore')
  ) {
    return res.status(400).json({
      message: 'Scores are calculated on the server.',
    });
  }

  const rawSleepHours = body.sleepHours ?? body.hoursSlept;

  if (
    rawSleepHours === undefined ||
    rawSleepHours === null ||
    (typeof rawSleepHours !== 'number' &&
      typeof rawSleepHours !== 'string') ||
    String(rawSleepHours).trim() === '' ||
    !Number.isFinite(Number(rawSleepHours)) ||
    Number(rawSleepHours) < 0 ||
    Number(rawSleepHours) > 24
  ) {
    return res.status(400).json({
      message: 'sleepHours must be a number between 0 and 24.',
    });
  }

  const activityLevel = String(
    body.activityLevel ?? body.activity ?? 'moderate'
  ).trim().toLowerCase();

  const allowedActivityLevels = [
    'low',
    'moderate',
    'medium',
    'high',
    'very high',
    'very-high',
    'veryhigh',
  ];

  if (!allowedActivityLevels.includes(activityLevel)) {
    return res.status(400).json({
      message: 'Invalid activityLevel.',
    });
  }

  const payload = {
    userId: req.userId,
    sleepHours: Number(rawSleepHours),
    sleepQuality: Number(
      body.sleepQuality ?? body.sleepQualityRating ?? 3
    ),
    activityMinutes: normalizeActivityLevel(activityLevel),
    perceivedEnergy: Number(
      body.perceivedEnergy ?? body.currentEnergy ?? 3
    ),
    perceivedFocus: Number(
      body.perceivedFocus ?? body.currentFocus ?? 3
    ),
    activityLevel,
    mood: String(
      body.mood ?? body.energyMood ?? 'neutral'
    ).trim().toLowerCase(),
  };

  const validationError = validateCheckInInput(payload);

  if (validationError) {
    return res.status(400).json({
      message: validationError,
    });
  }

  let stage = 'scoring';

  try {
    const scores = await calculateCheckInScores(payload);

    if (
      !scores ||
      !Number.isFinite(scores.energyScore) ||
      !Number.isFinite(scores.attentionScore) ||
      scores.energyScore < 0 ||
      scores.energyScore > 100 ||
      scores.attentionScore < 0 ||
      scores.attentionScore > 100
    ) {
      throw new Error('Scoring service returned invalid scores.');
    }

    stage = 'database save';

    // Save only the fields used by your existing CheckIn model.
    const checkIn = await CheckIn.create({
      userId: payload.userId,
      sleepHours: payload.sleepHours,
      sleepQuality: payload.sleepQuality,
      activityMinutes: payload.activityMinutes,
      perceivedEnergy: payload.perceivedEnergy,
      perceivedFocus: payload.perceivedFocus,
      energyScore: scores.energyScore,
      attentionScore: scores.attentionScore,
    });

    return res.status(201).json({
      message: 'Check-in saved successfully.',
      checkIn,
      estimatedEnergy: scores.energyScore,
      estimatedFocus: scores.attentionScore,
      energyScore: scores.energyScore,
      attentionScore: scores.attentionScore,
      source: scores.source || 'unknown',
      label: 'Based on your latest check-in.',
    });
  } catch (error) {
    console.error(`Smart check-in failed during ${stage}:`, error);
    throw error;
  }
});

const getLatestCheckIn = asyncHandler(async (req, res) => {
  const checkIn = await CheckIn.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();

  if (!checkIn) {
    return res.status(404).json({ message: 'No daily check-in found for this user yet.' });
  }

  return res.status(200).json(checkIn);
});

const getCheckInHistory = asyncHandler(async (req, res) => {
  const startDate = req.query.startDate || req.query.from || null;
  const endDate = req.query.endDate || req.query.to || null;
  const limit = Math.max(1, Number(req.query.limit || 30));

  const history = await getCheckInHistoryService({
    userId: req.userId,
    startDate,
    endDate,
    limit,
  });

  return res.status(200).json({
    total: history.length,
    data: history,
    filter: { startDate, endDate, limit },
  });
});

module.exports = { createCheckIn, createSmartCheckIn, getLatestCheckIn, getCheckInHistory };
