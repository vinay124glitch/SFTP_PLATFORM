import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { ReportService } from '@/services/report.service';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const societyId = searchParams.get('societyId') || session.currentSocietyId;
    if (!societyId) {
      return new NextResponse('Society ID required', { status: 400 });
    }

    if (!Permissions.canAccessSociety(session, societyId)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const financialYearId = searchParams.get('financialYearId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const eventId = searchParams.get('eventId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { societyId };
    if (financialYearId) where.financialYearId = financialYearId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (eventId) where.eventId = eventId;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        event: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: 2000,
    });

    const csvContent = ReportService.generateCSV(transactions);
    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('CSV Export error:', error);
    return new NextResponse('Failed to generate CSV', { status: 500 });
  }
}
