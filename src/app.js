import express from 'express';

import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import hpp from 'hpp';

import { ENV } from '#src/config/env.js';
import { morganMiddleware } from '#src/middlewares/logger.js';
import { AppError, errorHandler } from '#src/middlewares/error-handler.js';
import healthcheckRoutes from '#src/modules/healthcheck/healthcheck.route.js';
import linkRoutes from '#src/modules/link/link.route.js';
import redirectRoutes from '#src/modules/link/redirectRoutes.js';

import swaggerUi from 'swagger-ui-express';
import { openapiDocument } from './docs/openapi.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(hpp());

  app.use(
    cors({
      origin: ENV.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  app.use(morganMiddleware);

  app.use(healthcheckRoutes);

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use(linkRoutes);

  app.use(redirectRoutes);

  // app.use();

  app.use((_req, _res, next) => {
    next(new AppError('Route not found', 404));
  });

  app.use(errorHandler);

  return app;
};
