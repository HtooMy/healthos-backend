function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function calculateEnergyScore({ sleepHours, sleepQuality, activityMinutes, perceivedEnergy }) {
  const sleepComponent = (Number(sleepHours) / 24) * 40;
  const qualityComponent = (Number(sleepQuality) / 5) * 25;
  const selfReportedComponent = (Number(perceivedEnergy) / 5) * 20;
  const activity = Number(activityMinutes) || 0;

  let activityComponent = 0;
  if (activity <= 30) {
    activityComponent = 10;
  } else if (activity <= 90) {
    activityComponent = 15;
  } else if (activity <= 180) {
    activityComponent = 12;
  } else if (activity <= 300) {
    activityComponent = 5;
  } else {
    activityComponent = -10;
  }

  if (Number(sleepHours) < 6) {
    activityComponent -= 4;
  }

  return clampScore(sleepComponent + qualityComponent + selfReportedComponent + activityComponent);
}

function calculateAttentionScore({ sleepHours, sleepQuality, activityMinutes, perceivedFocus }) {
  const sleepComponent = (Number(sleepHours) / 24) * 30;
  const qualityComponent = (Number(sleepQuality) / 5) * 25;
  const focusComponent = (Number(perceivedFocus) / 5) * 25;
  const activity = Number(activityMinutes) || 0;

  let activityComponent = 0;
  if (activity <= 60) {
    activityComponent = 10;
  } else if (activity <= 150) {
    activityComponent = 12;
  } else if (activity <= 260) {
    activityComponent = 8;
  } else {
    activityComponent = -8;
  }

  if (Number(sleepHours) >= 7) {
    activityComponent += 5;
  }

  return clampScore(sleepComponent + qualityComponent + focusComponent + activityComponent);
}

function calculateCheckInScores(payload) {
  return {
    energyScore: calculateEnergyScore(payload),
    attentionScore: calculateAttentionScore(payload),
  };
}

module.exports = {
  calculateEnergyScore,
  calculateAttentionScore,
  calculateCheckInScores,
};
