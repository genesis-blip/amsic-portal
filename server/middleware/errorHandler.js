function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.values(err.errors).forEach((e) => { errors[e.path] = e.message; });
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    const fromMessage = (String(err.message).match(/index: (\w+?)_-?\d/) || [])[1];
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || fromMessage;
    if (!field) return res.status(400).json({ message: 'A record with the same unique value already exists' });
    return res.status(400).json({ message: `${field} already exists`, errors: { [field]: `This ${field} is already taken` } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message, ...(err.errors ? { errors: err.errors } : {}) });
  }
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server' });
}

module.exports = errorHandler;
