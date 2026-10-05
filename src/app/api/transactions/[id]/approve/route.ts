import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { TransactionService } from '@/services/transaction.service';

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

    const approved = await TransactionService.approveTransaction(session, id);
    return NextResponse.json({
      success: true,
      data: approved,
    });
  } catch (error: any) {
    console.error('Approve transaction error:', error);
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isForbidden ? 'FORBIDDEN' : 'APPROVAL_FAILED',
          message: error.message || 'Failed to approve transaction',
        },
      },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
