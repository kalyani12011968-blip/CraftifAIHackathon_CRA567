function errorHandler(err, req, res, next) {
  console.error("Backend Error:", err);

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
}

module.exports = errorHandler;
