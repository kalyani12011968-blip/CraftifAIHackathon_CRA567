const { getRiskBand } = require("../utils/calculations");

const calculateRisk = (data = {}) => {
  const rainfall = Number(data.rainfall || 0);
  const riseRate = Number(data.riseRate || 0);
  const acceleration = Number(data.acceleration || 0);
  const levelDeviation = Number(data.levelDeviation || 0);
  const riseRateDeviation = Number(data.riseRateDeviation || 0);
  const waterLevel = Number(data.waterLevel || 0);
  const sensorQuality = Number(data.sensorQuality ?? 1);

  let score = 0;
  const factors = [];

  // Absolute water level / baseline deviation
  if (levelDeviation > 10 || waterLevel >= 50) {
    score += 15;
    factors.push("water level above local baseline");
  }

  if (levelDeviation > 30 || waterLevel >= 75) {
    score += 15;
    factors.push("water level significantly above baseline");
  }

  if (levelDeviation > 50 || waterLevel >= 90) {
    score += 15;
    factors.push("water level near critical threshold");
  }

  // Rate of rise
  if (riseRate > 2) {
    score += 15;
    factors.push("water is rising");
  }

  if (riseRate > 5) {
    score += 15;
    factors.push("rapid water-level rise");
  }

  // Acceleration
  if (acceleration > 1) {
    score += 10;
    factors.push("rise rate is accelerating");
  }

  // Rainfall
  if (rainfall > 20) {
    score += 10;
    factors.push("elevated rainfall");
  }

  if (rainfall > 50) {
    score += 10;
    factors.push("heavy rainfall");
  }

  if (riseRateDeviation > 5) {
    score += 10;
    factors.push("rise rate above normal behavior");
  }

  // Sensor quality penalty
  if (sensorQuality < 0.7 && sensorQuality < 70) {
    score -= 10;
    factors.push("reduced sensor confidence");
  }

  score = Math.max(0, Math.min(100, score));

  const status =
    score >= 76
      ? "CRITICAL"
      : score >= 51
      ? "WARNING"
      : score >= 26
      ? "WATCH"
      : "SAFE";

  return {
    ...data,
    riskScore: score,
    status,
    factors
  };
};

module.exports = {
  calculateRisk
};
