const errorResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
});

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Linkly URL Shortener API',
    version: '1.0.0',
    description: 'Create short links, redirect visitors, and track clicks.',
  },
  paths: {
    '/links': {
      post: {
        summary: 'Create a short link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLink' },
            },
          },
        },
        responses: {
          201: {
            description: 'The link was created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LinkResponse' },
              },
            },
          },
          400: errorResponse('Invalid URL, code or expiry date'),
          409: errorResponse('That vanity code is already taken'),
        },
      },
    },
    '/links/{code}': {
      get: {
        summary: 'Get the details of a link',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          200: {
            description: 'The link details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LinkResponse' },
              },
            },
          },
          400: errorResponse('Badly formed code'),
          404: errorResponse('Unknown code'),
        },
      },

      delete: {
        summary: 'Delete a link and all of its clicks',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          204: { description: 'Deleted, nothing to send back' },
          400: errorResponse('Badly formed code'),
          404: errorResponse('Unknown code, or already deleted'),
        },
      },
    },
  },
  components: {
    parameters: {
      Code: {
        name: 'code',
        in: 'path',
        required: true,
        description: '3 to 16 characters: letters, digits, _ or -',
        schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{3,16}$', example: 'abc123' },
      },
    },
    schemas: {
      CreateLink: {
        type: 'object',
        required: ['target_url'],
        properties: {
          target_url: {
            type: 'string',
            example: 'www.linkedin.com/in/someone',
            description: 'An http or https URL. If the protocol is missing, https:// is added.',
          },
          code: {
            type: 'string',
            pattern: '^[A-Za-z0-9_-]{3,16}$',
            example: 'my-link',
            description: 'Optional vanity code. A random code is generated when omitted.',
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            example: '2027-01-01T00:00:00Z',
            description: 'Optional, must be in the future. After this time the link returns 410.',
          },
        },
      },
      Link: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'abc123' },
          target_url: { type: 'string', example: 'https://example.com' },
          created_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time', nullable: true },
          click_count: { type: 'integer', example: 0 },
        },
      },
      LinkResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { $ref: '#/components/schemas/Link' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 404 },
          message: { type: 'string', example: 'Link not found' },
        },
      },
    },
  },
};
