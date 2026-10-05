import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { FinancialService } from '@/services/financial.service';
import prisma from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        financialYear: true,
        transactions: {
          include: {
            category: true,
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404 }
      );
    }

    if (!Permissions.canAccessSociety(session, event.societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const summary = await FinancialService.getEventFinancialSummary(event.societyId, event.id);

    return NextResponse.json({
      success: true,
      data: {
        event,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve event' } },
      { status: 500 }
    );
  }
}
