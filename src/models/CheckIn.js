const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sleepHours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    sleepQuality: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      integer: true,
    },
    activityMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1440,
      integer: true,
    },
    perceivedEnergy: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      integer: true,
    },
    perceivedFocus: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      integer: true,
    },
    energyScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    attentionScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

checkInSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
