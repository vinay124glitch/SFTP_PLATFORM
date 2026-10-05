import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
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

    // Get active financial year for current society
    let currentFinancialYear = null;
    let availableFinancialYears: any[] = [];
    if (session.currentSocietyId) {
      availableFinancialYears = await prisma.financialYear.findMany({
        where: { societyId: session.currentSocietyId },
        orderBy: { startDate: 'desc' },
      });
      currentFinancialYear = availableFinancialYears.find((fy) => fy.isCurrent) || availableFinancialYears[0] || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        session,
        currentFinancialYear,
        availableFinancialYears,
      },
    });
  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve session' } },
      { status: 500 }
    );
  }
}

// Switch active society
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { societyId } = await request.json();
    if (!societyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Society ID is required' } },
        { status: 400 }
      );
    }

    // Check user is super admin or member of target society
    const hasMembership =
      session.systemRole === 'SUPER_ADMIN' ||
      session.societyMemberships.some((m) => m.societyId === societyId);

    if (!hasMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this society' } },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Active society switched successfully',
    });

    response.cookies.set({
      name: 'sftp_active_society',
      value: societyId,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Switch society error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to switch society' } },
      { status: 500 }
    );
  }
}
