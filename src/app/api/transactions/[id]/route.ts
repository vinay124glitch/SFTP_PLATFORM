import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
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

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        event: true,
        financialYear: true,
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        voidedBy: { select: { id: true, name: true, email: true } },
        documents: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    // IDOR Protection: Must belong to user's society or user is Super Admin
    if (!Permissions.canAccessSociety(session, transaction.societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this transaction' } },
        { status: 403 }
      );
    }

    // Fetch related audit logs for this transaction
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'TRANSACTION',
        entityId: transaction.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve transaction' } },
      { status: 500 }
    );
  }
}
