export const linkService = {
  getLink: async (code) => {
    return { code: code, target_url: 'https://example.com', click_count: 0 };
  },
};
