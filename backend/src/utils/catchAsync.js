/**
 * Catch async errors utility
 * Wraps async functions to catch and forward errors to Express error handler
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;
