import morgan from 'morgan';
import logger from '../config/logger.js';

// Create a stream object for morgan that uses Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging for health check endpoint in production
const skip = (req) => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' && req.url === '/health';
};

// Define Morgan format
// :method :url :status :response-time ms - :res[content-length]
const morganFormat = ':method :url :status :response-time ms - :res[content-length]';

// Create Morgan middleware
export const httpLogger = morgan(
  morganFormat,
  {
    stream,
    skip,
  }
);

// Custom Morgan tokens for more detailed logging
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

morgan.token('user-role', (req) => {
  return req.profile?.role || 'none';
});

// Detailed Morgan format for development
export const detailedHttpLogger = morgan(
  ':method :url :status :response-time ms - :res[content-length] - User: :user-id (:user-role)',
  {
    stream,
    skip,
  }
);
