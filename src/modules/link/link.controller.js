import { linkService } from './link.service.js';

export const linkController = {
  createLink: async (req, res) => {
    const link = await linkService.createLink(req.validated.body);
    res.status(201).json({ status: 'success', data: link });
  },

  getLink: async (req, res) => {
    const link = await linkService.getLink(req.params.code);
    res.status(200).json({ status: 'success', data: link });
  },
};
