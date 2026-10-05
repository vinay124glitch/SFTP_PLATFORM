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

    const updated = await TransactionService.submitForApproval(session, id);
    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Submit transaction error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SUBMIT_FAILED', message: error.message || 'Failed to submit transaction' } },
      { status: 400 }
    );
  }
}
