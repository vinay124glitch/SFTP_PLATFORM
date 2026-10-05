import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { FinancialService } from '@/services/financial.service';
import { BudgetCreateSchema } from '@/lib/validation';
import { rupeesToPaise } from '@/lib/currency';
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this society' } },
        { status: 403 }
      );
    }

    let financialYearId = searchParams.get('financialYearId');
    if (!financialYearId) {
      const activeFy = await prisma.financialYear.findFirst({
        where: { societyId, isCurrent: true },
      });
      financialYearId = activeFy?.id || '';
    }

    if (!financialYearId) {
      return NextResponse.json({
        success: true,
        data: { budgets: [] },
      });
    }

    const budgets = await FinancialService.getBudgetUtilization(societyId, financialYearId);

    return NextResponse.json({
      success: true,
      data: { budgets },
    });
  } catch (error: any) {
    console.error('Get budgets error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve budgets' } },
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
    const result = BudgetCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid budget parameters',
            details: result.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = result.data;
    if (!Permissions.canManageBudgets(session, input.societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied to manage budgets' } },
        { status: 403 }
      );
    }

    // Verify event and category belong to society
    if (input.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: input.eventId, societyId: input.societyId },
      });
      if (!event) throw new Error('Event does not belong to this society');
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) throw new Error('Category not found');
      if (category.societyId && category.societyId !== input.societyId) {
        throw new Error('Category belongs to another society');
      }
    }

    const allocatedPaise = rupeesToPaise(input.allocatedAmount);

    const budget = await prisma.budget.create({
      data: {
        societyId: input.societyId,
        financialYearId: input.financialYearId,
        eventId: input.eventId || null,
        categoryId: input.categoryId || null,
        allocatedAmount: allocatedPaise,
        createdById: session.userId,
        notes: input.notes || null,
      },
    });

    await createAuditLog({
      societyId: input.societyId,
      userId: session.userId,
      action: 'BUDGET_CREATE',
      entityType: 'BUDGET',
      entityId: budget.id,
      newData: {
        allocatedAmount: allocatedPaise.toString(),
        eventId: input.eventId,
        categoryId: input.categoryId,
      },
    });

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error: any) {
    console.error('Create budget error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'BUDGET_CREATE_FAILED', message: error.message || 'Failed to create budget' } },
      { status: 400 }
    );
  }
}
