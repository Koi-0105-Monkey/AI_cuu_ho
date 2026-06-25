const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.errors || error.issues || [];
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: issues.map(err => ({
          path: err.path.join('.').replace('body.', '').replace('params.', '').replace('query.', ''),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

module.exports = validate;
