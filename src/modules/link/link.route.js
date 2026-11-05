import { Router } from 'express';
import { validate } from '#src/middlewares/validate.js';
import { createLinkSchema } from './link.schema.js';
// import { validate } from 'zod';
import { linkController } from './link.controller.js';

const router = Router();

router.post('/links', validate(createLinkSchema), linkController.createLink);
// router.get('/:code', validate(linkParamsSchema), linkController.getLink);
// router.post('/links', validate(createLinkSchema), linkController.createLink);

export default router;
