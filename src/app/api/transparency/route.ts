import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { FinancialService } from '@/services/financial.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const societyCode = searchParams.get('society') || searchParams.get('societyCode');

    // If no society specified, return list of active public societies
    if (!societyCode) {
      const societies = await prisma.society.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          logo: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: { societies },
      });
    }

    const society = await prisma.society.findUnique({
      where: { code: societyCode.toLowerCase().trim() },
      include: {
        transparencySettings: true,
        financialYears: {
          orderBy: { startDate: 'desc' },
          select: { id: true, name: true, isCurrent: true, startDate: true, endDate: true },
        },
      },
    });

    if (!society || society.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Society not found or not active' } },
        { status: 404 }
      );
    }

    const settings = society.transparencySettings || {
      showTotalIncome: true,
      showTotalExpenses: true,
      showCategoryBreakdown: true,
      showEventBudgets: true,
      showTransactionLevelData: false,
      showReports: true,
      showMonthlyTrends: true,
      customDisclaimer: null,
    };

    // Determine target financial year
    const requestedFyId = searchParams.get('financialYearId');
    const selectedFy =
      society.financialYears.find((fy) => fy.id === requestedFyId) ||
      society.financialYears.find((fy) => fy.isCurrent) ||
      society.financialYears[0];

    if (!selectedFy) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_DATA', message: 'No financial year records published yet' } },
        { status: 404 }
      );
    }

    // Compute verified ledger figures
    const balanceData = await FinancialService.getCurrentBalance(society.id, selectedFy.id);

    let monthlyTrends = null;
    if (settings.showMonthlyTrends) {
      monthlyTrends = await FinancialService.getMonthlyIncomeExpense(society.id, selectedFy.id);
    }

    let categoryBreakdown = null;
    if (settings.showCategoryBreakdown) {
      categoryBreakdown = await FinancialService.getExpenseCategoryBreakdown(society.id, selectedFy.id);
    }

    let eventBudgets = null;
    if (settings.showEventBudgets) {
      eventBudgets = await FinancialService.getBudgetUtilization(society.id, selectedFy.id);
    }

    let publishedReports = null;
    if (settings.showReports) {
      publishedReports = await prisma.report.findMany({
        where: { societyId: society.id, isPublic: true },
        select: {
          id: true,
          reportNumber: true,
          title: true,
          reportType: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      });
    }

    let publicTransactions = null;
    if (settings.showTransactionLevelData) {
      const txns = await prisma.transaction.findMany({
        where: {
          societyId: society.id,
          financialYearId: selectedFy.id,
          status: 'APPROVED',
        },
        select: {
          id: true,
          transactionNumber: true,
          type: true,
          description: true,
          transactionDate: true,
          amount: true,
          category: { select: { name: true } },
          event: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
        take: 50,
      });

      publicTransactions = txns.map((t) => ({
        ...t,
        amount: t.amount.toString(),
      }));
    }

    // Strip ALL sensitive information (no emails, no phone numbers, no bank info, no user ids)
    return NextResponse.json({
      success: true,
      data: {
        society: {
          id: society.id,
          name: society.name,
          code: society.code,
          description: society.description,
          logo: society.logo,
        },
        financialYear: selectedFy,
        availableYears: society.financialYears,
        summary: {
          openingBalance: balanceData.openingBalance.toString(),
          totalIncome: settings.showTotalIncome ? balanceData.totalIncome.toString() : null,
          totalExpenses: settings.showTotalExpenses ? balanceData.totalExpenses.toString() : null,
          currentBalance: balanceData.currentBalance.toString(),
        },
        monthlyTrends,
        categoryBreakdown,
        eventBudgets,
        publishedReports,
        publicTransactions,
        disclaimer: settings.customDisclaimer,
      },
    });
  } catch (error: any) {
    console.error('Transparency API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve public transparency data' } },
      { status: 500 }
    );
  }
}
