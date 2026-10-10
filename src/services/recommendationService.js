const CheckIn = require('../models/CheckIn');
const Task = require('../models/Task');

const priorityWeightMap = {
  low: 25,
  medium: 50,
  high: 80,
};

function getEnergyFit(task, energyScore) {
  const energyMap = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const taskEnergy = energyMap[task.requiredEnergy] || 1;
  const userEnergyBand = energyScore >= 75 ? 3 : energyScore >= 45 ? 2 : 1;
  const gap = Math.abs(taskEnergy - userEnergyBand);
  return Math.max(0, 100 - gap * 25);
}

function getAttentionFit(task, attentionScore) {
  const attentionMap = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const taskAttention = attentionMap[task.requiredAttention] || 1;
  const userAttentionBand = attentionScore >= 75 ? 3 : attentionScore >= 45 ? 2 : 1;
  const gap = Math.abs(taskAttention - userAttentionBand);
  return Math.max(0, 100 - gap * 25);
}

function getDeadlineUrgency(deadline) {
  if (!deadline) {
    return 30;
  }

  const millisecondsUntilDeadline = new Date(deadline).getTime() - Date.now();
  const hoursUntilDeadline = millisecondsUntilDeadline / (1000 * 60 * 60);

  if (hoursUntilDeadline <= 12) return 100;
  if (hoursUntilDeadline <= 24) return 85;
  if (hoursUntilDeadline <= 72) return 70;
  if (hoursUntilDeadline <= 168) return 55;
  return 35;
}

function buildExplanation(task, energyFit, attentionFit, priorityFit, urgencyFit) {
  const parts = [];

  if (energyFit >= 75) {
    parts.push('matches your current energy');
  } else if (energyFit >= 50) {
    parts.push('fits your energy level reasonably well');
  } else {
    parts.push('may feel draining at your current energy');
  }

  if (attentionFit >= 75) {
    parts.push('and suits your current focus');
  } else if (attentionFit >= 50) {
    parts.push('and is manageable for your current focus');
  } else {
    parts.push('and may need more attention than you have right now');
  }

  if (priorityFit >= 70) {
    parts.push(`with ${task.priority} priority`);
  }

  if (urgencyFit >= 70) {
    parts.push('and a near deadline');
  }

  return parts.join(' ');
}

async function getRecommendationsForUser({ userId, availableMinutes }) {
  const latestCheckIn = await CheckIn.findOne({ userId }).sort({ createdAt: -1 }).lean();

  if (!latestCheckIn) {
    return null;
  }

  const pendingTasks = await Task.find({
    userId,
    status: 'pending',
    estimatedMinutes: { $lte: availableMinutes },
  })
    .sort({ deadline: 1, priority: -1, createdAt: -1 })
    .lean();

  const rankedTasks = pendingTasks
    .map((task) => {
      const energyFit = getEnergyFit(task, latestCheckIn.energyScore || 0);
      const attentionFit = getAttentionFit(task, latestCheckIn.attentionScore || 0);
      const priorityFit = priorityWeightMap[task.priority] || 25;
      const urgencyFit = getDeadlineUrgency(task.deadline);

      const totalScore =
        energyFit * 0.4 + attentionFit * 0.3 + priorityFit * 0.2 + urgencyFit * 0.1;

      return {
        task: {
          id: task._id.toString(),
          title: task.title,
          estimatedMinutes: task.estimatedMinutes,
          requiredEnergy: task.requiredEnergy,
          requiredAttention: task.requiredAttention,
          priority: task.priority,
          deadline: task.deadline,
          status: task.status,
          createdAt: task.createdAt,
        },
        score: totalScore,
        explanation: buildExplanation(task, energyFit, attentionFit, priorityFit, urgencyFit),
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    energyScore: latestCheckIn.energyScore,
    attentionScore: latestCheckIn.attentionScore,
    availableMinutes,
    recommendations: rankedTasks,
  };
}

module.exports = {
  getRecommendationsForUser,
};
