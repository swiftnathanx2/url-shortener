export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Linkly URL Shortener API',
    version: '1.0.0',
    description: 'Create short links, redirect visitors and track clicks',
  },
  paths: {
    '/links/{code}': {
      get: {
        summary: 'Get the details of a link',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'abc123' },
          },
        ],

        responses: {
          200: { description: 'The link details' },
          400: { description: 'Badly formed code' },
          404: { description: 'Unknown code' },
        },
      },
    },
  },
};
