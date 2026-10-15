function info(message, ...data) {
  console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...data);
}

function warn(message, ...data) {
  console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...data);
}

function warning(message, ...data) {
  warn(message, ...data);
}

function error(message, ...data) {
  console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...data);
}

module.exports = {
  info,
  warn,
  warning,
  error
};
