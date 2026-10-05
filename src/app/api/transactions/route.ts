import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { TransactionService } from '@/services/transaction.service';
import { TransactionCreateSchema } from '@/lib/validation';
import { rupeesToPaise } from '@/lib/currency';
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

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '15', 10)));
    const skip = (page - 1) * pageSize;

    const financialYearId = searchParams.get('financialYearId');
    const type = searchParams.get('type'); // INCOME | EXPENSE
    const status = searchParams.get('status'); // DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | VOIDED
    const categoryId = searchParams.get('categoryId');
    const eventId = searchParams.get('eventId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { societyId };

    if (financialYearId) where.financialYearId = financialYearId;
    if (type && (type === 'INCOME' || type === 'EXPENSE')) where.type = type;
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

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search } },
        { description: { contains: search } },
        { referenceNumber: { contains: search } },
      ];
    }

    const [totalCount, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          event: true,
          createdBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
          documents: true,
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (error: any) {
    console.error('List transactions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve transactions' } },
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
    const result = TransactionCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid transaction inputs',
            details: result.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = result.data;
    const amountInPaise = rupeesToPaise(input.amount);

    const transaction = await TransactionService.createTransaction(session, {
      societyId: input.societyId,
      financialYearId: input.financialYearId,
      type: input.type,
      amount: amountInPaise,
      categoryId: input.categoryId,
      eventId: input.eventId,
      description: input.description,
      transactionDate: new Date(input.transactionDate),
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      submitForApproval: input.submitForApproval,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error: any) {
    console.error('Create transaction error:', error);
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TRANSACTION_CREATION_FAILED',
          message: error.message || 'Failed to create transaction',
        },
      },
      { status }
    );
  }
}
