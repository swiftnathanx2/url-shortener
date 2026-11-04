import { query } from '#src/db/index.js';
import makeCode from '#src/utils/generator.js';
import { AppError } from '#src/middlewares/error-handler.js';

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
        if (err.code === '23505') throw err;
        if (userChoseCode) throw new AppError('That code is already taken', 409);
        throw err;
      }
    }
    throw new AppError('Could not generate a unique code, please try again', 500);
  },
};
