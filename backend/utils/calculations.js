const calculateRiseRate = (currentLevel, previousLevel, timeMinutes) => {
  if (
    previousLevel === null ||
    previousLevel === undefined ||
    !Number.isFinite(timeMinutes) ||
    timeMinutes <= 0
  ) {
    return 0;
  }

  return (currentLevel - previousLevel) / (timeMinutes / 60);
};

const calculateAcceleration = (
  currentRate,
  previousRate,
  timeMinutes
) => {
  if (
    previousRate === null ||
    previousRate === undefined ||
    !Number.isFinite(timeMinutes) ||
    timeMinutes <= 0
  ) {
    return 0;
  }

  return (currentRate - previousRate) / (timeMinutes / 60);
};

const determineTrend = (riseRate) => {
  if (riseRate > 8) return "RAPID_RISE";
  if (riseRate > 2) return "RISING";
  if (riseRate < -8) return "RAPID_FALL";
  if (riseRate < -2) return "FALLING";
  return "STABLE";
};

const calculateDeviation = (current, average) => {
  return current - average;
};

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

function getRiskBand(score) {
  if (score >= 76) return "CRITICAL";
  if (score >= 51) return "WARNING";
  if (score >= 26) return "WATCH";
  return "SAFE";
}

module.exports = {
  calculateRiseRate,
  calculateAcceleration,
  determineTrend,
  calculateDeviation,
  clamp,
  getRiskBand
};
