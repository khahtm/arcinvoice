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

export const milestoneSchema = z.object({
  description: z.string().min(1, 'Description required').max(500, 'Max 500 characters'),
  amount: z.number().min(0.01, 'Amount must be > 0').max(1000000, 'Max $1M per milestone'),
});

export const dealSchema = z.object({
  description: z.string().min(1, 'Description required').max(2000, 'Max 2000 characters'),
  client_name: z.string().max(255).optional(),
  client_email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      'Invalid email'
    ),
  client_wallet: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^0x[a-fA-F0-9]{40}$/.test(val),
      'Invalid wallet address'
    ),
  auto_release_days: z.number().min(1).max(90).default(14),
  milestones: z
    .array(milestoneSchema)
    .min(1, 'At least 1 milestone')
    .max(20, 'Max 20 milestones'),
}).refine(
  (data) => {
    const total = data.milestones.reduce((sum, m) => sum + m.amount, 0);
    return total >= 1;
  },
  { message: 'Total deal amount must be at least $1', path: ['milestones'] }
);

export type DealFormData = z.infer<typeof dealSchema>;
