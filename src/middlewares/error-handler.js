import { logger } from './logger.js';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, issues) {
    super(message);

    this.statusCode = statusCode;
    this.issues = issues;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let issues;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    issues = err.issues;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body is not valid JSON';
  } else {
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
      statusCode = status;
      message = err.message;
    } else {
      logger.error(`Unexpected Error: ${err.message}`);
      logger.error(err.stack);
    }
  }

  res.status(statusCode).json({
    statusCode,
    message,
    ...(issues && { issues }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};
