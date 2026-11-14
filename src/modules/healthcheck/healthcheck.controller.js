import { logger } from '#src/middlewares/logger.js';
import { query } from '#src/db/index.js';

export const healthcheckController = {
  // GET /health
  getHealth: async (_req, res) => {
    try {
      await query('SELECT 1');
      res.status(200).json({
        status: 'success',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (err) {
      logger.error(`Health check failed: ${err.message}`);
      res.status(503).json({
        status: 'error',
        message: 'Database is unreachable ',
        timestamp: new Date().toISOString(),
      });
    }
  },
};
