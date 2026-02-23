// Standard API response helpers

const successResponse = (data, message = null) => {
  const response = {
    ok: true,
    data
  };
  if (message) {
    response.message = message;
  }
  return response;
};

const errorResponse = (code, message, details = null) => {
  const response = {
    ok: false,
    error: {
      code,
      message
    }
  };
  if (details) {
    response.error.details = details;
  }
  return response;
};

module.exports = {
  successResponse,
  errorResponse
};
