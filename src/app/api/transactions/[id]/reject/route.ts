import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { TransactionService } from '@/services/transaction.service';
import { TransactionRejectSchema } from '@/lib/validation';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = TransactionRejectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A rejection reason of at least 5 characters is mandatory',
            details: result.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const rejected = await TransactionService.rejectTransaction(session, id, result.data.reason);
    return NextResponse.json({
      success: true,
      data: rejected,
    });
  } catch (error: any) {
    console.error('Reject transaction error:', error);
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isForbidden ? 'FORBIDDEN' : 'REJECTION_FAILED',
          message: error.message || 'Failed to reject transaction',
        },
      },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
