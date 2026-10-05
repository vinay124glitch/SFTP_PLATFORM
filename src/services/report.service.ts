import prisma from '@/lib/db';
import { FinancialService } from './financial.service';
import { createAuditLog } from '@/lib/audit';
import { ReportType } from '@/lib/types';
import { formatINR, paiseToRupees } from '@/lib/currency';

export class ReportService {
  /**
   * Generates a comprehensive financial report and saves snapshot to database
   */
  static async generateReport(params: {
    societyId: string;
    financialYearId: string;
    title: string;
    reportType: ReportType;
    generatedById: string;
    periodStart?: Date;
    periodEnd?: Date;
    publishImmediately?: boolean;
  }) {
    const { societyId, financialYearId, title, reportType, generatedById } = params;

    // Fetch live calculations from database
    const [balanceData, monthlyTrends, categoryBreakdown, budgetUtilization] = await Promise.all([
      FinancialService.getCurrentBalance(societyId, financialYearId),
      FinancialService.getMonthlyIncomeExpense(societyId, financialYearId),
      FinancialService.getExpenseCategoryBreakdown(societyId, financialYearId),
      FinancialService.getBudgetUtilization(societyId, financialYearId),
    ]);

    const approvedTransactions = await prisma.transaction.findMany({
      where: {
        societyId,
        financialYearId,
        status: 'APPROVED',
        ...(params.periodStart && params.periodEnd
          ? { transactionDate: { gte: params.periodStart, lte: params.periodEnd } }
          : {}),
      },
      include: {
        category: true,
        event: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: 200,
    });

    const reportCount = await prisma.report.count({ where: { societyId } });
    const year = new Date().getFullYear();
    const reportNumber = `REP-${year}-${String(reportCount + 1).padStart(4, '0')}`;

    const summaryPayload = {
      openingBalance: balanceData.openingBalance.toString(),
      totalIncome: balanceData.totalIncome.toString(),
      totalExpenses: balanceData.totalExpenses.toString(),
      currentBalance: balanceData.currentBalance.toString(),
      monthlyTrends,
      categoryBreakdown,
      budgetUtilization,
      transactionSample: approvedTransactions.map((t) => ({
        id: t.id,
        number: t.transactionNumber,
        date: t.transactionDate.toISOString().split('T')[0],
        type: t.type,
        category: t.category.name,
        event: t.event?.name || '-',
        amount: t.amount.toString(),
        description: t.description,
      })),
    };

    const report = await prisma.report.create({
      data: {
        reportNumber,
        societyId,
        financialYearId,
        title,
        reportType,
        periodStart: params.periodStart || null,
        periodEnd: params.periodEnd || null,
        generatedById,
        status: params.publishImmediately ? 'PUBLISHED' : 'DRAFT',
        publishedAt: params.publishImmediately ? new Date() : null,
        isPublic: !!params.publishImmediately,
        summaryJson: JSON.stringify(summaryPayload),
      },
    });

    await createAuditLog({
      societyId,
      userId: generatedById,
      action: 'REPORT_GENERATE',
      entityType: 'REPORT',
      entityId: report.id,
      newData: { reportNumber, title, reportType },
    });

    return report;
  }

  /**
   * Generates CSV string for transactions matching filters
   */
  static generateCSV(transactions: any[]): string {
    const headers = [
      'Transaction Number',
      'Date',
      'Type',
      'Category',
      'Event',
      'Description',
      'Payment Method',
      'Reference Number',
      'Amount (INR)',
      'Status',
    ];

    const rows = transactions.map((t) => [
      `"${t.transactionNumber}"`,
      `"${new Date(t.transactionDate).toISOString().split('T')[0]}"`,
      `"${t.type}"`,
      `"${t.category?.name || 'N/A'}"`,
      `"${t.event?.name || 'N/A'}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.paymentMethod || 'N/A'}"`,
      `"${t.referenceNumber || ''}"`,
      `"${paiseToRupees(t.amount)}"`,
      `"${t.status}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
