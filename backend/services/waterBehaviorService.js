const {
  calculateRiseRate,
  calculateAcceleration,
  determineTrend,
  calculateDeviation
} = require("../utils/calculations");

const previousReadings = new Map();

const calculateHistoricalBaseline = (history = []) => {
  if (!history.length) {
    return {
      averageLevel: 0,
      maxLevel: 0,
      averageRiseRate: 0,
      maxRiseRate: 0,
      averageRainfall: 0
    };
  }

  const levels = history.map((x) => Number(x.waterLevel)).filter(Number.isFinite);
  const rainfalls = history.map((x) => Number(x.rainfall)).filter(Number.isFinite);
  const rates = history.map((x) => Number(x.riseRate)).filter(Number.isFinite);

  const average = (values) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return {
    averageLevel: average(levels),
    maxLevel: levels.length ? Math.max(...levels) : 0,
    averageRiseRate: average(rates),
    maxRiseRate: rates.length ? Math.max(...rates) : 0,
    averageRainfall: average(rainfalls)
  };
};

const analyzeWaterBehavior = (current, previousParam, historical = {}) => {
  const deviceId = current.deviceId || "default";
  let previous = previousParam;

  if (!previous && previousReadings.has(deviceId)) {
    previous = previousReadings.get(deviceId);
  }

  const currentLevel = Number(current.waterLevel || 0);
  const previousLevel = previous?.waterLevel !== undefined ? Number(previous.waterLevel) : currentLevel;

  const currentTime = new Date(current.timestamp || Date.now()).getTime();
  const previousTime = previous?.timestamp
    ? new Date(previous.timestamp).getTime()
    : currentTime - 15 * 60000;

  const timeMinutes = Math.max((currentTime - previousTime) / 60000, 0.1);

  const riseRate = calculateRiseRate(currentLevel, previousLevel, timeMinutes);
  const previousRate = previous?.riseRate !== undefined ? Number(previous.riseRate) : 0;
  const acceleration = calculateAcceleration(riseRate, previousRate, timeMinutes);
  const waterTrend = determineTrend(riseRate);

  const averageLevel = historical.averageLevel ?? currentLevel;
  const averageRiseRate = historical.averageRiseRate ?? 0;
  const averageRainfall = historical.averageRainfall ?? Number(current.rainfall || 0);

  const result = {
    ...current,
    waterLevel: currentLevel,
    rainfall: Number(current.rainfall || 0),
    temperature: Number(current.temperature || 25),
    riseRate: Number(riseRate.toFixed(3)),
    acceleration: Number(acceleration.toFixed(3)),
    waterTrend,
    historicalAverageLevel: Number(averageLevel.toFixed(3)),
    historicalMaxLevel: Number((historical.maxLevel ?? currentLevel).toFixed(3)),
    historicalAverageRiseRate: Number(averageRiseRate.toFixed(3)),
    historicalMaxRiseRate: Number((historical.maxRiseRate ?? riseRate).toFixed(3)),
    historicalAverageRainfall: Number(averageRainfall.toFixed(3)),
    levelDeviation: Number(calculateDeviation(currentLevel, averageLevel).toFixed(3)),
    riseRateDeviation: Number(calculateDeviation(riseRate, averageRiseRate).toFixed(3)),
    rainfallDeviation: Number(calculateDeviation(Number(current.rainfall || 0), averageRainfall).toFixed(3))
  };

  previousReadings.set(deviceId, {
    waterLevel: currentLevel,
    riseRate: result.riseRate,
    timestamp: current.timestamp || new Date().toISOString()
  });

  return result;
};

module.exports = {
  analyzeWaterBehavior,
  calculateHistoricalBaseline
};
