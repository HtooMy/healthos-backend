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

async function getGeminiScores(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Return JSON only with this exact schema: {"energyScore": number, "attentionScore": number}. Score both values from 0 to 100. Use only this daily wellness data: sleepHours=${payload.sleepHours}, sleepQuality=${payload.sleepQuality}, activityMinutes=${payload.activityMinutes}, perceivedEnergy=${payload.perceivedEnergy}, perceivedFocus=${payload.perceivedFocus}.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Gemini request failed.');
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '{}';
    const parsed = JSON.parse(responseText);

    return {
      energyScore: clampScore(parsed.energyScore),
      attentionScore: clampScore(parsed.attentionScore),
    };
  } catch (error) {
    console.warn('Gemini scoring failed, falling back to local heuristic score.', error.message);
    return null;
  }
}

async function calculateCheckInScores(payload) {
  const geminiScores = await getGeminiScores(payload);
  if (geminiScores) {
    return geminiScores;
  }

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
