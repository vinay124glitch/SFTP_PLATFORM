import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { FinancialService } from '@/services/financial.service';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const societyId = searchParams.get('societyId') || session.currentSocietyId;

    if (!societyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No society selected' } },
        { status: 400 }
      );
    }

    if (!Permissions.canAccessSociety(session, societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this society' } },
        { status: 403 }
      );
    }

    // Determine financial year
    let financialYearId = searchParams.get('financialYearId');
    if (!financialYearId) {
      const activeFy = await prisma.financialYear.findFirst({
        where: { societyId, isCurrent: true },
      });
      if (activeFy) {
        financialYearId = activeFy.id;
      } else {
        const anyFy = await prisma.financialYear.findFirst({
          where: { societyId },
          orderBy: { startDate: 'desc' },
        });
        financialYearId = anyFy?.id || '';
      }
    }

    if (!financialYearId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No financial year configured for this society' } },
        { status: 404 }
      );
    }

    // Fetch dashboard financial summary
    const summary = await FinancialService.getDashboardSummary(societyId, financialYearId);

    // Fetch recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { societyId, financialYearId },
      include: {
        category: true,
        event: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: 8,
    });

    // Fetch pending approvals
    const pendingTransactions = await prisma.transaction.findMany({
      where: { societyId, financialYearId, status: 'PENDING_APPROVAL' },
      include: {
        category: true,
        event: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // Fetch recent audit activity if authorized
    let recentAudits = null;
    if (Permissions.canViewAuditLogs(session, societyId)) {
      recentAudits = await prisma.auditLog.findMany({
        where: { societyId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        recentTransactions,
        pendingTransactions,
        recentAudits,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard metrics' } },
      { status: 500 }
    );
  }
}
