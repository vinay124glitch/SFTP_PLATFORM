import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { EventCreateSchema } from '@/lib/validation';
import { rupeesToPaise, paiseToRupees, calculatePercentage } from '@/lib/currency';
import { createAuditLog } from '@/lib/audit';
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
        { success: false, error: { code: 'BAD_REQUEST', message: 'Society ID is required' } },
        { status: 400 }
      );
    }

    if (!Permissions.canAccessSociety(session, societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const events = await prisma.event.findMany({
      where: { societyId },
      include: {
        financialYear: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedEvents = await Promise.all(
      events.map(async (ev) => {
        const [incomeAgg, expenseAgg] = await Promise.all([
          prisma.transaction.aggregate({
            where: { societyId, eventId: ev.id, type: 'INCOME', status: 'APPROVED' },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { societyId, eventId: ev.id, type: 'EXPENSE', status: 'APPROVED' },
            _sum: { amount: true },
          }),
        ]);

        const approvedIncome = incomeAgg._sum.amount || BigInt(0);
        const approvedExpenses = expenseAgg._sum.amount || BigInt(0);
        const remainingBudget = ev.allocatedBudget - approvedExpenses;
        const utilization = calculatePercentage(approvedExpenses, ev.allocatedBudget);

        return {
          ...ev,
          allocatedBudget: ev.allocatedBudget.toString(),
          approvedIncome: approvedIncome.toString(),
          approvedExpenses: approvedExpenses.toString(),
          remainingBudget: remainingBudget.toString(),
          utilization,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { events: enrichedEvents },
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve events' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = EventCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid event data',
            details: result.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = result.data;
    if (!Permissions.canManageEvents(session, input.societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied to manage events' } },
        { status: 403 }
      );
    }

    const budgetPaise = rupeesToPaise(input.allocatedBudget);

    const event = await prisma.event.create({
      data: {
        societyId: input.societyId,
        financialYearId: input.financialYearId,
        name: input.name,
        description: input.description || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        organizer: input.organizer || null,
        allocatedBudget: budgetPaise,
        status: input.status,
      },
    });

    await createAuditLog({
      societyId: input.societyId,
      userId: session.userId,
      action: 'EVENT_CREATE',
      entityType: 'EVENT',
      entityId: event.id,
      newData: { name: event.name, allocatedBudget: budgetPaise.toString() },
    });

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'EVENT_CREATE_FAILED', message: error.message || 'Failed to create event' } },
      { status: 400 }
    );
  }
}
