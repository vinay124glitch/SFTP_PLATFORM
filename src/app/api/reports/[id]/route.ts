import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import prisma from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        society: true,
        financialYear: true,
        generatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } },
        { status: 404 }
      );
    }

    // If report is not public, require authentication and society access
    if (!report.isPublic) {
      if (!session || !Permissions.canAccessSociety(session, report.societyId)) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        summary: JSON.parse(report.summaryJson),
      },
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve report' } },
      { status: 500 }
    );
  }
}

// Publish or unpublish report
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } },
        { status: 404 }
      );
    }

    if (!Permissions.canManageReports(session, report.societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isPublic = !!body.isPublic;

    const updated = await prisma.report.update({
      where: { id },
      data: {
        isPublic,
        status: isPublic ? 'PUBLISHED' : 'DRAFT',
        publishedAt: isPublic ? new Date() : null,
      },
    });

    await createAuditLog({
      societyId: report.societyId,
      userId: session.userId,
      action: isPublic ? 'REPORT_PUBLISH' : 'REPORT_UNPUBLISH',
      entityType: 'REPORT',
      entityId: report.id,
      newData: { isPublic },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Publish report error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: error.message } },
      { status: 400 }
    );
  }
}
