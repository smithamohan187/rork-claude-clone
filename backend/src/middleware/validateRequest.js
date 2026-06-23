function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    req.body = value;
    console.log('Validated request body:', req.body);
    next();
  };
}

module.exports = { validateRequest };
