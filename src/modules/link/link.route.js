import { Router } from 'express';
// import { validate } from 'zod';
import {linkController} from './link.controller.js'


const router = Router();

router.get('/links/:code', linkController.getLink)
// router.post('/links', validate(createLinkSchema), linkController.createLink);

export default router;
