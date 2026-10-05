import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { ReportService } from '@/services/report.service';
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

    const reports = await prisma.report.findMany({
      where: { societyId },
      include: {
        financialYear: true,
        generatedBy: { select: { id: true, name: true } },
      },
      orderBy: { generatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { reports },
    });
  } catch (error: any) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve reports' } },
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
    const { societyId, financialYearId, title, reportType, publishImmediately, periodStart, periodEnd } = body;

    if (!societyId || !financialYearId || !title || !reportType) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required report parameters' } },
        { status: 400 }
      );
    }

    if (!Permissions.canManageReports(session, societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied to generate reports' } },
        { status: 403 }
      );
    }

    const report = await ReportService.generateReport({
      societyId,
      financialYearId,
      title,
      reportType,
      generatedById: session.userId,
      publishImmediately: !!publishImmediately,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'REPORT_GENERATION_FAILED', message: error.message } },
      { status: 400 }
    );
  }
}
