import { Router } from 'express';
import { linkController } from './link.controller.js';
import { linkParamsSchema } from './link.schema.js';
import { validate } from '#src/middlewares/validate.js';

const router = Router();

router.get('/:code', validate(linkParamsSchema), linkController.visit);

export default router;
