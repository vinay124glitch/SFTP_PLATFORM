export type UserRole = 
  | 'PUBLIC'
  | 'MEMBER'
  | 'TREASURER'
  | 'FACULTY_COORDINATOR'
  | 'SOCIETY_ADMIN'
  | 'SUPER_ADMIN';

export type SystemRole = 'SUPER_ADMIN' | 'USER';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'VOIDED';

export type PaymentMethod = 
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CASH'
  | 'CARD'
  | 'CHEQUE'
  | 'OTHER';

export type EventStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';

export type ReportType = 
  | 'MONTHLY'
  | 'ANNUAL'
  | 'INCOME'
  | 'EXPENSE'
  | 'CATEGORY'
  | 'EVENT'
  | 'BUDGET';

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'TRANSACTION_CREATE'
  | 'TRANSACTION_UPDATE'
  | 'TRANSACTION_SUBMIT'
  | 'TRANSACTION_APPROVE'
  | 'TRANSACTION_REJECT'
  | 'TRANSACTION_VOID'
  | 'BUDGET_CREATE'
  | 'BUDGET_UPDATE'
  | 'EVENT_CREATE'
  | 'EVENT_UPDATE'
  | 'USER_ROLE_CHANGE'
  | 'DOCUMENT_UPLOAD'
  | 'REPORT_GENERATE'
  | 'SETTING_UPDATE';

export type BudgetWarningStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVER_BUDGET';

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  systemRole: SystemRole;
  currentSocietyId?: string;
  currentSocietyRole?: UserRole;
  societyMemberships: {
    societyId: string;
    societyName: string;
    societyCode: string;
    role: UserRole;
  }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
