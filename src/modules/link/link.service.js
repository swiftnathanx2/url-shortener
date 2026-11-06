import makeCode from '#src/utils/generator.js';
import { AppError } from '#src/middlewares/error-handler.js';
import { query, pool } from '#src/db/index.js';

export const linkService = {
  //   getLink: async (code) => {
  //     return { code: code, target_url: 'https://example.com', click_count: 0 };
  //   },

  createLink: async ({ code, target_url, expires_at }) => {
    const userChoseCode = Boolean(code);

    const maxTries = userChoseCode ? 1 : 5;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      const chosenCode = code ?? makeCode();

      try {
        const result = await query(
          `INSERT INTO links (code, target_url, expires_at) VALUES ($1, $2, $3) RETURNING code, target_url, created_at, expires_at, click_count`,
          [chosenCode, target_url, expires_at ?? null],
        );

        return result.rows[0];
      } catch (err) {
        if (err.code !== '23505') throw err;
        if (userChoseCode) throw new AppError('That code is already taken', 409);
      }
    }
    throw new AppError('Could not generate a unique code, please try again', 500);
  },

  visit: async (code, referrer, userAgent) => {
    const result = await query(`SELECT id, target_url, expires_at FROM links WHERE code = $1`, [code]);

    const link = result.rows[0];

    if (!link) {
      throw new AppError('Link not found', 404);
    }

    if (link.expires_at && link.expires_at <= new Date()) {
      throw new AppError('Link has expired', 410);
    }

    const client = await pool.connect();

    try {
      // start transaction
      await client.query('BEGIN');

      await client.query(`INSERT INTO clicks (link_id, referrer, user_agent) VALUES ($1, $2, $3)`, [link.id, referrer, userAgent]);

      await client.query(`UPDATE links SET click_count = click_count + 1 WHERE id= $1`, [link.id]);

      // commit if successful
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return link.target_url;
  },

  getLink: async (code) => {
    const result = await query(`SELECT code, target_url,created_at, expires_at,click_count FROM links WHERE code = $1`, [code]);

    const link = result.rows[0];

    if (!link) {
      throw new AppError('Link not found', 404);
    }
    return link;
  },

  deleteLink: async (code) => {
    const result = await query(`DELETE FROM links WHERE code = $1`, [code]);

    if (result.rowCount === 0) {
      throw new AppError('Link not found', 404);
    }
  },
};
