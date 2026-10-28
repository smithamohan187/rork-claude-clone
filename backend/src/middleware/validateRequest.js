function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, data: null, error: error.details[0].message });
    }
    req.body = value;
    next();
  };
}

module.exports = { validateRequest };
