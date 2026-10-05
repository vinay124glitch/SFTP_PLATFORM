import prisma from '@/lib/db';
import { calculatePercentage, paiseToRupees } from '@/lib/currency';

export class FinancialService {
  /**
   * Retrieves the configured opening balance for a society's financial year in paise.
   */
  static async getOpeningBalance(societyId: string, financialYearId: string): Promise<bigint> {
    const fy = await prisma.financialYear.findFirst({
      where: { id: financialYearId, societyId },
      select: { openingBalance: true },
    });
    return fy ? fy.openingBalance : BigInt(0);
  }

  /**
   * Calculates total approved income in paise.
   */
  static async getTotalIncome(societyId: string, financialYearId: string): Promise<bigint> {
    const incomeTxns = await prisma.transaction.aggregate({
      where: {
        societyId,
        financialYearId,
        type: 'INCOME',
        status: 'APPROVED',
      },
      _sum: {
        amount: true,
      },
    });
    return incomeTxns._sum.amount || BigInt(0);
  }

  /**
   * Calculates total approved expenses in paise.
   */
  static async getTotalExpenses(societyId: string, financialYearId: string): Promise<bigint> {
    const expenseTxns = await prisma.transaction.aggregate({
      where: {
        societyId,
        financialYearId,
        type: 'EXPENSE',
        status: 'APPROVED',
      },
      _sum: {
        amount: true,
      },
    });
    return expenseTxns._sum.amount || BigInt(0);
  }

  /**
   * Calculates official current closing balance:
   * Current Balance = Opening Balance + Approved Income - Approved Expenses
   */
  static async getCurrentBalance(societyId: string, financialYearId: string): Promise<{
    openingBalance: bigint;
    totalIncome: bigint;
    totalExpenses: bigint;
    currentBalance: bigint;
  }> {
    const [openingBalance, totalIncome, totalExpenses] = await Promise.all([
      this.getOpeningBalance(societyId, financialYearId),
      this.getTotalIncome(societyId, financialYearId),
      this.getTotalExpenses(societyId, financialYearId),
    ]);

    const currentBalance = openingBalance + totalIncome - totalExpenses;

    return {
      openingBalance,
      totalIncome,
      totalExpenses,
      currentBalance,
    };
  }

  /**
   * Retrieves pending approvals count and sums for income/expense
   */
  static async getPendingApprovals(societyId: string, financialYearId?: string) {
    const where: any = {
      societyId,
      status: 'PENDING_APPROVAL',
    };
    if (financialYearId) {
      where.financialYearId = financialYearId;
    }

    const pendingTxns = await prisma.transaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
      },
    });

    let count = pendingTxns.length;
    let pendingIncome = BigInt(0);
    let pendingExpenses = BigInt(0);

    for (const txn of pendingTxns) {
      if (txn.type === 'INCOME') {
        pendingIncome += txn.amount;
      } else {
        pendingExpenses += txn.amount;
      }
    }

    return {
      count,
      pendingIncome,
      pendingExpenses,
    };
  }

  /**
   * Calculates budget utilization across all categories/events in a financial year
   */
  static async getBudgetUtilization(societyId: string, financialYearId: string) {
    const budgets = await prisma.budget.findMany({
      where: { societyId, financialYearId },
      include: {
        category: true,
        event: true,
      },
    });

    const results = await Promise.all(
      budgets.map(async (b) => {
        // Query approved expenses for this specific category or event
        const whereClause: any = {
          societyId,
          financialYearId,
          type: 'EXPENSE',
          status: 'APPROVED',
        };

        if (b.eventId) whereClause.eventId = b.eventId;
        if (b.categoryId) whereClause.categoryId = b.categoryId;

        const expenseSum = await prisma.transaction.aggregate({
          where: whereClause,
          _sum: { amount: true },
        });

        const actualSpending = expenseSum._sum.amount || BigInt(0);
        const allocated = b.allocatedAmount;
        const remaining = allocated - actualSpending;
        const utilization = calculatePercentage(actualSpending, allocated);

        let warningStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVER_BUDGET' = 'NORMAL';
        if (utilization > 100) {
          warningStatus = 'OVER_BUDGET';
        } else if (utilization >= 90) {
          warningStatus = 'CRITICAL';
        } else if (utilization >= 70) {
          warningStatus = 'WARNING';
        }

        return {
          id: b.id,
          name: b.event?.name || b.category?.name || 'General Budget',
          categoryName: b.category?.name || null,
          eventName: b.event?.name || null,
          allocatedAmount: allocated.toString(),
          actualSpending: actualSpending.toString(),
          remaining: remaining.toString(),
          utilization,
          warningStatus,
        };
      })
    );

    return results;
  }

  /**
   * Monthly breakdown of approved income vs expenses for charts
   */
  static async getMonthlyIncomeExpense(societyId: string, financialYearId: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        societyId,
        financialYearId,
        status: 'APPROVED',
      },
      select: {
        type: true,
        amount: true,
        transactionDate: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    const monthsMap: Record<string, { month: string; incomePaise: bigint; expensePaise: bigint }> = {};

    for (const txn of transactions) {
      const d = new Date(txn.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthsMap[key]) {
        monthsMap[key] = { month: monthLabel, incomePaise: BigInt(0), expensePaise: BigInt(0) };
      }

      if (txn.type === 'INCOME') {
        monthsMap[key].incomePaise += txn.amount;
      } else {
        monthsMap[key].expensePaise += txn.amount;
      }
    }

    return Object.entries(monthsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => ({
        month: data.month,
        income: paiseToRupees(data.incomePaise),
        expense: paiseToRupees(data.expensePaise),
        net: paiseToRupees(data.incomePaise - data.expensePaise),
      }));
  }

  /**
   * Category breakdown for approved expenses
   */
  static async getExpenseCategoryBreakdown(societyId: string, financialYearId: string) {
    const expenseTxns = await prisma.transaction.findMany({
      where: {
        societyId,
        financialYearId,
        type: 'EXPENSE',
        status: 'APPROVED',
      },
      include: {
        category: true,
      },
    });

    const catMap: Record<string, { name: string; paise: bigint }> = {};

    for (const txn of expenseTxns) {
      const catName = txn.category?.name || 'Uncategorized';
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, paise: BigInt(0) };
      }
      catMap[catName].paise += txn.amount;
    }

    return Object.values(catMap).map((item) => ({
      name: item.name,
      amount: paiseToRupees(item.paise),
      paise: item.paise.toString(),
    }));
  }

  /**
   * Event financial summary
   */
  static async getEventFinancialSummary(societyId: string, eventId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, societyId },
      include: { financialYear: true },
    });
    if (!event) return null;

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { societyId, eventId, type: 'INCOME', status: 'APPROVED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { societyId, eventId, type: 'EXPENSE', status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || BigInt(0);
    const totalExpenses = expenseAgg._sum.amount || BigInt(0);
    const allocatedBudget = event.allocatedBudget;
    const remainingBudget = allocatedBudget - totalExpenses;
    const utilization = calculatePercentage(totalExpenses, allocatedBudget);

    return {
      event,
      allocatedBudget: allocatedBudget.toString(),
      totalIncome: totalIncome.toString(),
      totalExpenses: totalExpenses.toString(),
      remainingBudget: remainingBudget.toString(),
      utilization,
    };
  }

  /**
   * Complete KPI summary for dashboard
   */
  static async getDashboardSummary(societyId: string, financialYearId: string) {
    const [balanceData, pending, monthlyTrends, categoryBreakdown, budgetUtilization, totalTxnCount] =
      await Promise.all([
        this.getCurrentBalance(societyId, financialYearId),
        this.getPendingApprovals(societyId, financialYearId),
        this.getMonthlyIncomeExpense(societyId, financialYearId),
        this.getExpenseCategoryBreakdown(societyId, financialYearId),
        this.getBudgetUtilization(societyId, financialYearId),
        prisma.transaction.count({ where: { societyId, financialYearId } }),
      ]);

    const activeBudgetsCount = await prisma.budget.count({
      where: { societyId, financialYearId },
    });

    return {
      openingBalance: balanceData.openingBalance.toString(),
      totalIncome: balanceData.totalIncome.toString(),
      totalExpenses: balanceData.totalExpenses.toString(),
      currentBalance: balanceData.currentBalance.toString(),
      pendingCount: pending.count,
      pendingIncome: pending.pendingIncome.toString(),
      pendingExpenses: pending.pendingExpenses.toString(),
      activeBudgetsCount,
      totalTxnCount,
      monthlyTrends,
      categoryBreakdown,
      budgetUtilization,
    };
  }
}
