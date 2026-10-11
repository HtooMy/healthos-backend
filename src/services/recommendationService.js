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

async function getGeminiTaskRecommendation({ energyScore, attentionScore, availableMinutes, tasks }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !tasks.length) {
    return null;
  }

  const rawModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const model = rawModel.startsWith('models/') ? rawModel.replace('models/', '') : rawModel;
  const normalizedModel = model === 'gemini-2.0-flash' ? 'gemini-3.8-flash' : model;
  const taskSummary = tasks
    .map((task) => ({
      id: task._id.toString(),
      title: task.title,
      estimatedMinutes: task.estimatedMinutes,
      requiredEnergy: task.requiredEnergy,
      requiredAttention: task.requiredAttention,
      priority: task.priority,
      deadline: task.deadline || null,
    }))
    .slice(0, 10);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Return JSON only with this exact schema: {"recommendedTaskId": "string", "reason": "string"}. You are helping a user choose the best task to do right now. Use this current state: energyScore=${energyScore}, attentionScore=${attentionScore}, availableMinutes=${availableMinutes}. Consider time limit, deadline urgency, and whether the task matches the user's energy and attention. Pick the single best task from this list: ${JSON.stringify(taskSummary)}.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini task recommendation failed: ${await response.text()}`);
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '{}';
    const parsed = JSON.parse(responseText);

    if (!parsed?.recommendedTaskId) {
      return null;
    }

    return parsed.recommendedTaskId;
  } catch (error) {
    console.warn('Gemini task recommendation failed, using local recommendation ranking.', error.message);
    return null;
  }
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

  const recommendedId = await getGeminiTaskRecommendation({
    energyScore: latestCheckIn.energyScore || 0,
    attentionScore: latestCheckIn.attentionScore || 0,
    availableMinutes,
    tasks: pendingTasks,
  });

  const bestTask =
    (recommendedId && rankedTasks.find((item) => item.task.id === recommendedId)) ||
    rankedTasks[0] ||
    null;

  return {
    energyScore: latestCheckIn.energyScore,
    attentionScore: latestCheckIn.attentionScore,
    availableMinutes,
    recommendedTask: bestTask
      ? {
          ...bestTask.task,
          score: bestTask.score,
          explanation: bestTask.explanation,
        }
      : null,
    recommendations: rankedTasks,
  };
}

module.exports = {
  getRecommendationsForUser,
};
