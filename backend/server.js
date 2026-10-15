require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const socketService = require("./services/socketService");

// Route imports
const sensorRoutes = require("./routes/sensorRoutes");
const eventRoutes = require("./routes/eventRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const visionRoutes = require("./routes/visionRoutes");

const errorHandler = require("./middleware/errorHandler");
const { getExternalSensorData } = require("./services/externalSensorService");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Initialize socket service singleton
socketService.initializeSocket(io);

const PORT = Number(process.env.PORT) || 5001;

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*"
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Root health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    project: "JAL-RAKSHAK EDGE",
    service: "Water Risk Intelligence & Vision Observation Backend",
    status: "ONLINE",
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "main-backend",
    status: "healthy",
    visionModule: "integrated",
    timestamp: new Date().toISOString()
  });
});

// Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/vision", visionRoutes);

// External real sensor route (optional LAN ESP32 bridge)
let latestExternalSensorData = null;
app.get("/api/external-sensors", async (req, res) => {
  try {
    const data = await getExternalSensorData();
    latestExternalSensorData = data;
    res.json({ success: true, data });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "External sensor hardware not responding on local network",
      error: error.message
    });
  }
});

app.get("/api/external-sensors/latest", (req, res) => {
  if (!latestExternalSensorData) {
    return res.status(404).json({
      success: false,
      message: "No external sensor hardware stream received yet"
    });
  }
  res.json({ success: true, data: latestExternalSensorData });
});

// Socket.IO lifecycle
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Frontend client connected: ${socket.id}`);

  // Send initial sensor and vision status
  if (latestExternalSensorData) {
    socket.emit("sensorData", latestExternalSensorData);
  }

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Frontend client disconnected: ${socket.id}`);
  });
});

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.url} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log("========================================");
  console.log("      JAL-RAKSHAK MAIN BACKEND");
  console.log("========================================");
  console.log(`Server URL   : http://localhost:${PORT}`);
  console.log(`Health       : http://localhost:${PORT}/api/health`);
  console.log(`Vision API   : http://localhost:${PORT}/api/vision/status`);
  console.log(`Sensors API  : http://localhost:${PORT}/api/sensors/latest`);
  console.log(`Status       : ONLINE`);
  console.log("========================================");
});

module.exports = { app, server };
