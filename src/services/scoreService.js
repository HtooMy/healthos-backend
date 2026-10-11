function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function normalizeActivityLevel(activityLevel) {
  const normalized = String(activityLevel || '').trim().toLowerCase();
  const values = {
    low: 30,
    moderate: 60,
    medium: 60,
    high: 120,
    'very high': 180,
    'very-high': 180,
    'veryhigh': 180,
  };

  return values[normalized] ?? 60;
}

function normalizeMoodScore(mood) {
  const value = String(mood || 'neutral').trim().toLowerCase();
  const mapping = {
    excited: 5,
    happy: 4,
    good: 4,
    calm: 4,
    neutral: 3,
    tired: 2,
    stressed: 2,
    anxious: 2,
    sad: 1,
    low: 1,
    angry: 1,
    exhausted: 1,
  };

  return mapping[value] ?? 3;
}

async function getGeminiScores(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const rawModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const model = rawModel.startsWith('models/') ? rawModel.replace('models/', '') : rawModel;
  const normalizedModel = model === 'gemini-2.0-flash' ? 'gemini-3.8-flash' : model;
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Return JSON only with this exact schema: {"energyScore": number, "attentionScore": number}. Use this user data only: sleepHours=${payload.sleepHours}, activityLevel=${payload.activityLevel || 'moderate'}, mood=${payload.mood || 'neutral'}. Do not do any local calculations. Simply score the user's likely energy and attention for the day from 0 to 100.`,
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
      `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`,
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
      energyScore: clampScore(parsed.energyScore ?? parsed.energy ?? 0),
      attentionScore: clampScore(parsed.attentionScore ?? parsed.attention ?? 0),
    };
  } catch (error) {
    console.warn('Gemini scoring failed.', error.message);
    return null;
  }
}

async function calculateCheckInScores(payload) {
  const geminiScores = await getGeminiScores(payload);
  if (!geminiScores) {
    throw new Error('Gemini API is not configured or failed to return energy and attention scores.');
  }

  return geminiScores;
}

module.exports = {
  calculateCheckInScores,
  normalizeActivityLevel,
  normalizeMoodScore,
};
