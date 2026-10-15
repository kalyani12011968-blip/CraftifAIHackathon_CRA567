export const RISK_BANDS = [
  { key: "SAFE", min: 0, max: 25, label: "SAFE", tone: "safe" },
  { key: "WATCH", min: 26, max: 50, label: "WATCH", tone: "watch" },
  { key: "WARNING", min: 51, max: 75, label: "WARNING", tone: "warning" },
  { key: "CRITICAL", min: 76, max: 100, label: "CRITICAL", tone: "critical" }
];

export const EVENTS = ["NORMAL", "FLOOD_ESCALATION", "ABNORMAL_WATER_LOSS", "SENSOR_ANOMALY"];

export const NAV_ITEMS = [
  ["Dashboard", "/dashboard", "LayoutDashboard"],
  ["Vision Edge", "/vision-edge", "Camera"],
  ["Live Monitoring", "/monitoring", "Activity"],
  ["Risk Prediction", "/risk", "ShieldAlert"],
  ["Devices", "/devices", "Cpu"],
  ["Events", "/events", "TriangleAlert"],
  ["Alerts", "/alerts", "BellRing"],
  ["Weather", "/weather", "CloudRain"],
  ["Analytics", "/analytics", "ChartNoAxesCombined"],
  ["AI Assistant", "/ai-assistant", "Sparkles"],
  ["Map", "/map", "Map"],
  ["Settings", "/settings", "Settings"]
];
