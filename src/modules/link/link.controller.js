import { linkService } from './link.service.js';

export const linkController = {
  createLink: async (req, res) => {
    const link = await linkService.createLink(req.validated.body);
    res.status(201).json({ status: 'success', data: link });
  },

  visit: async (req, res) => {
    const target = await linkService.visit(req.params.code);
    res.redirect(302, target);
  },
};
