import { z } from 'zod';

const phoneRegex = /^[\d\s+\-()]{7,20}$/;

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name must be at most 100 characters'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || phoneRegex.test(value),
      'Enter a valid phone number',
    ),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'Enter a valid email address',
    ),
  notes: z.string().max(500, 'Notes must be at most 500 characters'),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const customerFormDefaults: CustomerFormValues = {
  name: '',
  phone: '',
  email: '',
  notes: '',
};
