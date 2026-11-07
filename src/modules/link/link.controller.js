// import { AppError } from '#src/middlewares/error-handler.js';
import { linkService } from './link.service.js';
import { toCsvCell } from '#src/utils/csv.js';
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

  exportClicksCsv: async (req, res) => {
    const { code } = req.validated.params;
    await linkService.getLink(code);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${code}-clicks.csv"`);

    res.write('id,clicked_at,referrer,user_agent\n');

    let after = 0;

    while (after !== null) {
      const { rows, cursor } = await linkService.getClicks(code, after, 500);

      for (const row of rows) {
        const line = [row.id, row.clicked_at, row.referrer, row.user_agent].map(toCsvCell).join(',');
        res.write(`${line}\n`);
      }

      after = cursor;
    }

    res.end();
  },
};
