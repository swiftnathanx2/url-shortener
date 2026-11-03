import { z } from 'zod';

export const createLinkSchema = z.object({
  body: z.object({
    target_url: z
      .string()
      .url()
      .refine(
        (url) => {
          return url.startsWith('http://') || url.startsWith('https://');
        },
        {
          message: 'Link must start with http:// or https://',
        },
      ),

    code: z
      .string()
      .regex(/^[A-Za-z0-9_-]{3,16}$/, {
        message: 'Vanity code must be between 3 and 16 characters long',
      })
      .optional(),
    expires_at: z
      .string()
      .datetime()
      .refine((dateStr) => new Date(dateStr) > new Date(), { message: 'The expiry date should be in the future' })
      .optional(),
  }),
});

export const linkParamsSchema = z.object({
  params: z.object({
    code: z.string().regex(/^[A-Za-z0-9_-]{3,16}$/, { message: 'Vanity code must range between 3 to 16 characters long' }),
  }),
});
