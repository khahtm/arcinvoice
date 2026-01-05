import { z } from 'zod';

export const milestoneSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description required').max(200),
});

export const invoiceSchema = z
  .object({
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
    milestones: z.array(milestoneSchema).max(10).optional(),
  })
  .refine(
    (data) => {
      // If milestones provided, sum must equal amount
      if (data.milestones && data.milestones.length > 0) {
        const sum = data.milestones.reduce((acc, m) => acc + m.amount, 0);
        return Math.abs(sum - data.amount) < 0.01; // Allow small floating point diff
      }
      return true;
    },
    { message: 'Milestone amounts must equal invoice total' }
  );

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type MilestoneFormData = z.infer<typeof milestoneSchema>;
