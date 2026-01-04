import { z } from 'zod';

export const invoiceSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(500),
  payment_type: z.enum(['direct', 'escrow']),
  client_name: z.string().max(255).optional(),
  client_email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      'Invalid email'
    ),
  auto_release_days: z.number().min(1).max(90).optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
