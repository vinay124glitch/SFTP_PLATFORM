import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  societyCode: z.string().optional(),
});

export const TransactionCreateSchema = z.object({
  societyId: z.string().min(1, 'Society is required'),
  financialYearId: z.string().min(1, 'Financial year is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Amount must be greater than 0'),
  categoryId: z.string().min(1, 'Category is required'),
  eventId: z.string().optional().nullable(),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  transactionDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid transaction date',
  }),
  paymentMethod: z.enum(['BANK_TRANSFER', 'UPI', 'CASH', 'CARD', 'CHEQUE', 'OTHER']),
  referenceNumber: z.string().optional().nullable(),
  submitForApproval: z.boolean().default(false),
});

export const TransactionRejectSchema = z.object({
  reason: z.string().min(5, 'Rejection reason is mandatory and must be at least 5 characters'),
});

export const TransactionVoidSchema = z.object({
  reason: z.string().min(5, 'Void reason is mandatory and must be at least 5 characters'),
});

export const BudgetCreateSchema = z.object({
  societyId: z.string().min(1, 'Society is required'),
  financialYearId: z.string().min(1, 'Financial year is required'),
  eventId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  allocatedAmount: z.number().positive('Allocated budget must be greater than 0'),
  notes: z.string().optional().nullable(),
});

export const EventCreateSchema = z.object({
  societyId: z.string().min(1, 'Society is required'),
  financialYearId: z.string().min(1, 'Financial year is required'),
  name: z.string().min(3, 'Event name must be at least 3 characters'),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  organizer: z.string().optional().nullable(),
  allocatedBudget: z.number().nonnegative('Budget cannot be negative').default(0),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
});

export const CategoryCreateSchema = z.object({
  societyId: z.string().optional().nullable(),
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  type: z.enum(['INCOME', 'EXPENSE', 'BOTH']),
  description: z.string().optional().nullable(),
});

export const TransparencySettingsSchema = z.object({
  showTotalIncome: z.boolean().default(true),
  showTotalExpenses: z.boolean().default(true),
  showCategoryBreakdown: z.boolean().default(true),
  showEventBudgets: z.boolean().default(true),
  showTransactionLevelData: z.boolean().default(false),
  showReports: z.boolean().default(true),
  showMonthlyTrends: z.boolean().default(true),
  customDisclaimer: z.string().optional().nullable(),
});

export const SocietyCreateSchema = z.object({
  name: z.string().min(3, 'Society name is required'),
  code: z.string().min(2, 'Society code is required').regex(/^[a-z0-9-]+$/, 'Code must be lowercase alphanumeric with hyphens'),
  description: z.string().optional().nullable(),
  contactEmail: z.string().email('Valid contact email is required'),
  contactPhone: z.string().optional().nullable(),
  openingBalance: z.number().nonnegative('Opening balance must be 0 or greater').default(0),
  financialYearName: z.string().default('2026-27'),
});
