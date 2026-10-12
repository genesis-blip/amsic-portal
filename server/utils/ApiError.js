class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }

  static badRequest(message, errors) { return new ApiError(400, message, errors); }
  static notFound(what = 'Record') { return new ApiError(404, `${what} not found`); }
}

module.exports = ApiError;
