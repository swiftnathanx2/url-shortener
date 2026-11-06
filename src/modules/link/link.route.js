import { Router } from 'express';
import { validate } from '#src/middlewares/validate.js';
import { createLinkSchema, linkParamsSchema, clickSchema } from './link.schema.js';
// import { validate } from 'zod';
import { linkController } from './link.controller.js';

const router = Router();

router.post('/links', validate(createLinkSchema), linkController.createLink);
router.get('/links/:code', validate(linkParamsSchema), linkController.getLink);
router.delete('/links/:code', validate(linkParamsSchema), linkController.deleteLink);
router.get('/links/:code/clicks', validate(clickSchema), linkController.getClicks);
// router.get('/:code', validate(linkParamsSchema), linkController.getLink);
// router.post('/links', validate(createLinkSchema), linkController.createLink);

export default router;
