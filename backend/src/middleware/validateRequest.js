function validateRequest(schema, target = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: true,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, data: null, error: error.details[0].message });
    }
    // req.query is a getter-only accessor on Express 5's request prototype — a plain assignment
    // silently no-ops instead of applying Joi's validated/coerced value. Object.defineProperty
    // creates an own property that shadows it (it's declared configurable for exactly this).
    Object.defineProperty(req, target, { value, writable: true, enumerable: true, configurable: true });
    next();
  };
}

module.exports = { validateRequest };
