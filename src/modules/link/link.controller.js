// import { AppError } from '#src/middlewares/error-handler.js';
import { linkService } from './link.service.js';

export const linkController = {
  createLink: async (req, res) => {
    const link = await linkService.createLink(req.validated.body);
    res.status(201).json({ status: 'success', data: link });
  },

  visit: async (req, res) => {
    const referrer = req.get('referer') ?? null;

    const userAgent = req.get('user-agent') ?? null;

    const target = await linkService.visit(req.validated.params.code, referrer, userAgent);
    res.redirect(302, target);
  },

  getLink: async (req, res) => {
    const link = await linkService.getLink(req.validated.params.code);
    res.json({ status: 'success', data: link });
  },

  deleteLink: async (req, res) => {
    await linkService.deleteLink(req.validated.params.code);
    res.status(204).send();
  },

  getClicks: async (req, res) => {
    const { code } = req.validated.params;
    const { after, limit } = req.validated.query;

    const { rows, cursor } = await linkService.getClicks(code, after, limit);

    res.json({ status: 'success', data: rows, cursor });
  },
};
