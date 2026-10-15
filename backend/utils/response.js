function success(res, data, messageOrStatus = "Success") {
  const isStatus = typeof messageOrStatus === "number";
  const statusCode = isStatus ? messageOrStatus : 200;
  const message = isStatus ? "Success" : messageOrStatus;

  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function created(res, data, message = "Created") {
  return res.status(201).json({
    success: true,
    message,
    data
  });
}

function failure(res, message = "Request failed", statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = {
  success,
  created,
  failure
};
