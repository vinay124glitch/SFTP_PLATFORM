import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (session) {
      await createAuditLog({
        societyId: session.currentSocietyId || null,
        userId: session.userId,
        action: 'LOGOUT',
        entityType: 'AUTH',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete('sftp_active_society');

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LOGOUT_FAILED', message: 'Failed to complete logout' },
      },
      { status: 500 }
    );
  }
}
