import prisma from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { NotificationService } from './notification.service';
import { formatINR } from '@/lib/currency';
import { Permissions, PermissionContext } from '@/lib/permissions';

export class TransactionService {
  /**
   * Generates a unique transaction reference number
   */
  static async generateTxnNumber(societyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.transaction.count({
      where: { societyId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `TXN-${year}-${seq}`;
  }

  /**
   * Create a new transaction (Draft or Submitted for approval)
   */
  static async createTransaction(
    ctx: PermissionContext,
    data: {
      societyId: string;
      financialYearId: string;
      type: 'INCOME' | 'EXPENSE';
      amount: bigint;
      categoryId: string;
      eventId?: string | null;
      description: string;
      transactionDate: Date;
      paymentMethod: string;
      referenceNumber?: string | null;
      submitForApproval?: boolean;
    }
  ) {
    if (!Permissions.canCreateTransaction(ctx, data.societyId)) {
      throw new Error('FORBIDDEN: You do not have permission to create transactions in this society');
    }

    // Verify category exists and matches transaction type
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) throw new Error('Category not found');
    if (category.societyId && category.societyId !== data.societyId) {
      throw new Error('Category belongs to a different society');
    }
    if (category.type !== 'BOTH' && category.type !== data.type) {
      throw new Error(`Invalid category: Category is configured for ${category.type} only`);
    }

    // Verify event if provided
    if (data.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: data.eventId, societyId: data.societyId },
      });
      if (!event) throw new Error('Event not found or does not belong to this society');
    }

    const txnNumber = await this.generateTxnNumber(data.societyId);
    const initialStatus = data.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT';

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          societyId: data.societyId,
          financialYearId: data.financialYearId,
          type: data.type,
          status: initialStatus,
          amount: data.amount,
          categoryId: data.categoryId,
          eventId: data.eventId || null,
          description: data.description,
          transactionDate: data.transactionDate,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber || null,
          createdById: ctx.userId,
        },
      });

      await createAuditLog(
        {
          societyId: data.societyId,
          userId: ctx.userId,
          action: data.submitForApproval ? 'TRANSACTION_SUBMIT' : 'TRANSACTION_CREATE',
          entityType: 'TRANSACTION',
          entityId: created.id,
          newData: {
            transactionNumber: txnNumber,
            type: data.type,
            amount: data.amount.toString(),
            status: initialStatus,
            description: data.description,
          },
        },
        tx
      );

      return created;
    });

    // If submitted for approval, notify faculty coordinators and admins
    if (data.submitForApproval) {
      const formattedAmount = formatINR(data.amount);
      await NotificationService.notifyApprovers({
        societyId: data.societyId,
        type: 'APPROVAL_REQUEST',
        title: `New ${data.type} Pending Approval`,
        message: `${formattedAmount} for "${data.description}" (${txnNumber}) requires review.`,
        link: `/approvals`,
        excludeUserId: ctx.userId,
      });
    }

    return transaction;
  }

  /**
   * Submit an existing DRAFT transaction for approval
   */
  static async submitForApproval(ctx: PermissionContext, transactionId: string) {
    const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!txn) throw new Error('Transaction not found');
    if (!Permissions.canAccessSociety(ctx, txn.societyId)) {
      throw new Error('Unauthorized');
    }
    if (txn.status !== 'DRAFT') {
      throw new Error(`Cannot submit transaction with status ${txn.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'PENDING_APPROVAL' },
      });

      await createAuditLog(
        {
          societyId: txn.societyId,
          userId: ctx.userId,
          action: 'TRANSACTION_SUBMIT',
          entityType: 'TRANSACTION',
          entityId: txn.id,
          oldData: { status: 'DRAFT' },
          newData: { status: 'PENDING_APPROVAL' },
        },
        tx
      );

      return res;
    });

    await NotificationService.notifyApprovers({
      societyId: txn.societyId,
      type: 'APPROVAL_REQUEST',
      title: `Transaction Submitted for Review`,
      message: `${txn.transactionNumber} for ${formatINR(txn.amount)} submitted for approval.`,
      link: `/approvals`,
      excludeUserId: ctx.userId,
    });

    return updated;
  }

  /**
   * Approve a transaction
   */
  static async approveTransaction(ctx: PermissionContext, transactionId: string) {
    const txn = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { society: true },
    });
    if (!txn) throw new Error('Transaction not found');

    if (!Permissions.canApproveTransaction(ctx, txn.societyId, txn.createdById)) {
      throw new Error(
        'FORBIDDEN: You do not have permission to approve this transaction. A user cannot approve their own transaction.'
      );
    }

    if (txn.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve transaction with status ${txn.status}`);
    }

    const approvedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'APPROVED',
          approvedById: ctx.userId,
          approvedAt,
          rejectionReason: null,
        },
      });

      await createAuditLog(
        {
          societyId: txn.societyId,
          userId: ctx.userId,
          action: 'TRANSACTION_APPROVE',
          entityType: 'TRANSACTION',
          entityId: txn.id,
          oldData: { status: txn.status },
          newData: { status: 'APPROVED', approvedBy: ctx.userId, approvedAt },
        },
        tx
      );

      return res;
    });

    // Notify transaction creator
    await NotificationService.notifyUser({
      userId: txn.createdById,
      societyId: txn.societyId,
      type: 'APPROVAL_GRANTED',
      title: `Transaction Approved`,
      message: `Your transaction ${txn.transactionNumber} (${formatINR(txn.amount)}) has been approved.`,
      link: `/transactions/${txn.id}`,
    });

    return updated;
  }

  /**
   * Reject a transaction
   */
  static async rejectTransaction(ctx: PermissionContext, transactionId: string, reason: string) {
    const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!txn) throw new Error('Transaction not found');

    if (!Permissions.canApproveTransaction(ctx, txn.societyId, txn.createdById)) {
      throw new Error('FORBIDDEN: You do not have permission to reject this transaction.');
    }

    if (txn.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot reject transaction with status ${txn.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
        },
      });

      await createAuditLog(
        {
          societyId: txn.societyId,
          userId: ctx.userId,
          action: 'TRANSACTION_REJECT',
          entityType: 'TRANSACTION',
          entityId: txn.id,
          oldData: { status: txn.status },
          newData: { status: 'REJECTED', rejectionReason: reason },
        },
        tx
      );

      return res;
    });

    // Notify transaction creator
    await NotificationService.notifyUser({
      userId: txn.createdById,
      societyId: txn.societyId,
      type: 'APPROVAL_REJECTED',
      title: `Transaction Rejected`,
      message: `Your transaction ${txn.transactionNumber} was rejected. Reason: "${reason}"`,
      link: `/transactions/${txn.id}`,
    });

    return updated;
  }

  /**
   * Void an approved transaction (Immutable ledger practice)
   */
  static async voidTransaction(ctx: PermissionContext, transactionId: string, reason: string) {
    const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!txn) throw new Error('Transaction not found');

    if (!Permissions.canVoidTransaction(ctx, txn.societyId)) {
      throw new Error('FORBIDDEN: You do not have permission to void transactions');
    }

    if (txn.status !== 'APPROVED') {
      throw new Error('Only approved transactions can be voided');
    }

    const voidedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'VOIDED',
          voidReason: reason,
          voidedById: ctx.userId,
          voidedAt,
        },
      });

      await createAuditLog(
        {
          societyId: txn.societyId,
          userId: ctx.userId,
          action: 'TRANSACTION_VOID',
          entityType: 'TRANSACTION',
          entityId: txn.id,
          oldData: { status: 'APPROVED' },
          newData: { status: 'VOIDED', voidReason: reason, voidedById: ctx.userId, voidedAt },
        },
        tx
      );

      return res;
    });

    return updated;
  }
}
