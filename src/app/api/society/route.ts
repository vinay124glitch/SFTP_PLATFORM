import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { TransparencySettingsSchema, SocietyCreateSchema } from '@/lib/validation';
import { createAuditLog } from '@/lib/audit';
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

    const society = await prisma.society.findUnique({
      where: { id: societyId },
      include: {
        transparencySettings: true,
        financialYears: { orderBy: { startDate: 'desc' } },
        _count: {
          select: {
            members: true,
            transactions: true,
            events: true,
            budgets: true,
          },
        },
      },
    });

    if (!society) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: society,
    });
  } catch (error: any) {
    console.error('Get society error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve society' } },
      { status: 500 }
    );
  }
}

// Update transparency settings or society info
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { societyId, transparencySettings, societyDetails } = body;

    if (!societyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Society ID is required' } },
        { status: 400 }
      );
    }

    if (!Permissions.canManageTransparencySettings(session, societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied to manage society settings' } },
        { status: 403 }
      );
    }

    if (transparencySettings) {
      const parsed = TransparencySettingsSchema.safeParse(transparencySettings);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid settings payload' } },
          { status: 400 }
        );
      }

      await prisma.transparencySettings.upsert({
        where: { societyId },
        update: {
          ...parsed.data,
          updatedAt: new Date(),
        },
        create: {
          societyId,
          ...parsed.data,
        },
      });

      await createAuditLog({
        societyId,
        userId: session.userId,
        action: 'SETTING_UPDATE',
        entityType: 'SETTING',
        newData: parsed.data,
      });
    }

    if (societyDetails) {
      await prisma.society.update({
        where: { id: societyId },
        data: {
          name: societyDetails.name,
          description: societyDetails.description,
          contactEmail: societyDetails.contactEmail,
          contactPhone: societyDetails.contactPhone,
        },
      });

      await createAuditLog({
        societyId,
        userId: session.userId,
        action: 'SOCIETY_UPDATE',
        entityType: 'SOCIETY',
        entityId: societyId,
        newData: societyDetails,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Society settings updated successfully',
    });
  } catch (error: any) {
    console.error('Update society error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: error.message } },
      { status: 400 }
    );
  }
}

// Create new society (Super Admin or initial setup)
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !Permissions.isSuperAdmin(session)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only Super Administrators can create societies' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = SocietyCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid society data', details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const input = result.data;
    const openingPaise = rupeesToPaise(input.openingBalance);

    const society = await prisma.society.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description || null,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone || null,
        status: 'ACTIVE',
        transparencySettings: {
          create: {
            showTotalIncome: true,
            showTotalExpenses: true,
            showCategoryBreakdown: true,
            showEventBudgets: true,
            showTransactionLevelData: false,
            showReports: true,
            showMonthlyTrends: true,
          },
        },
        financialYears: {
          create: {
            name: input.financialYearName,
            startDate: new Date('2026-04-01T00:00:00Z'),
            endDate: new Date('2027-03-31T23:59:59Z'),
            isCurrent: true,
            openingBalance: openingPaise,
          },
        },
        members: {
          create: {
            userId: session.userId,
            role: 'SOCIETY_ADMIN',
          },
        },
      },
      include: {
        financialYears: true,
      },
    });

    await createAuditLog({
      societyId: society.id,
      userId: session.userId,
      action: 'SOCIETY_CREATE',
      entityType: 'SOCIETY',
      entityId: society.id,
      newData: { name: society.name, code: society.code },
    });

    return NextResponse.json({
      success: true,
      data: society,
    });
  } catch (error: any) {
    console.error('Create society error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SOCIETY_CREATE_FAILED', message: error.message } },
      { status: 400 }
    );
  }
}
