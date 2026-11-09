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

  tags: [
    { name: 'Links', description: 'Create, read and delete short links' },
    { name: 'Redirect', description: 'Visit a short link' },
    { name: 'Clicks', description: 'The click log of a link' },
  ],
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

    '/{code}': {
      get: {
        summary: 'Visit a short link',
        description: 'Records a click and redirects to the target URL.',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          302: {
            description: 'Redirect to the target URL',
            headers: {
              Location: { description: 'The target URL', schema: { type: 'string' } },
            },
          },
          404: errorResponse('Unknown code'),
          410: errorResponse('The link has expired'),
        },
      },
    },

    '/links/{code}/clicks': {
      get: {
        summary: 'Page through the click log',
        description:
          'Keyset pagination. Start with after=0 (or leave it out). Pass the returned cursor as `after` to get the next page. A cursor of null means this was the last page.',
        parameters: [
          { $ref: '#/components/parameters/Code' },
          {
            name: 'after',
            in: 'query',
            description: 'The id of the last click already seen. Use 0 for the first page.',
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'How many clicks per page',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'One page of clicks, oldest first',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ClicksPage' },
              },
            },
          },
          400: errorResponse('Invalid after or limit'),
          404: errorResponse('Unknown code'),
        },
      },
    },

    '/links/{code}/clicks.csv': {
      get: {
        summary: 'Download the whole click log as CSV',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          200: {
            description: 'A CSV file, streamed',
            content: {
              'text/csv': {
                schema: { type: 'string' },
                example: 'id,clicked_at,referrer,user_agent\n55,2026-11-06T21:41:47.528Z,,curl/8.18.0',
              },
            },
          },
          404: errorResponse('Unknown code'),
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

      Click: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 55 },
          clicked_at: { type: 'string', format: 'date-time' },
          referrer: { type: 'string', nullable: true },
          user_agent: { type: 'string', nullable: true },
        },
      },
      ClicksPage: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Click' } },
          cursor: {
            type: 'integer',
            nullable: true,
            description: 'Pass this value as `after` to get the next page. null means there are no more pages.',
          },
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
