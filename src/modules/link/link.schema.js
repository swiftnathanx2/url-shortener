import { z } from 'zod';

const addProtocol = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
};
export const createLinkSchema = z.object({
  body: z.object({
    code: z
      .string()
      .regex(/^[A-Za-z0-9_-]{3,16}$/, {
        message: 'Vanity code must be between 3 and 16 characters long',
      })
      .optional(),

    target_url: z.preprocess(
      addProtocol,
      z
        .string()
        .url()
        .refine(
          (url) => {
            return url.startsWith('http://') || url.startsWith('https://');
          },
          {
            message: 'Link must start with http:// or https://',
          },
        )
        .refine(
          (url) => {
            try {
              return new URL(url).hostname.includes('.');
            } catch {
              return false;
            }
          },
          {
            message: 'Link must have a valid domain like example.com',
          },
        ),
    ),

    expires_at: z.coerce
      .date()
      .refine((dateStr) => new Date(dateStr) > new Date(), { message: 'The expiry date should be in the future' })
      .optional(),
  }),
});

export const linkParamsSchema = z.object({
  params: z.object({
    code: z.string().regex(/^[A-Za-z0-9_-]{3,16}$/, { message: 'Vanity code must range between 3 to 16 characters long' }),
  }),
});

export const clickSchema = z.object({
  params: z.object({
    code: z.string().regex(/^[A-Za-z0-9_-]{3,16}$/, { message: 'Invalid code' }),
  }),

  query: z.object({
    after: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
