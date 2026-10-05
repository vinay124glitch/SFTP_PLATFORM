import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { CategoryCreateSchema } from '@/lib/validation';
import { createAuditLog } from '@/lib/audit';
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
    const type = searchParams.get('type'); // INCOME | EXPENSE

    const where: any = {
      active: true,
      OR: [{ societyId: null }, ...(societyId ? [{ societyId }] : [])],
    };

    if (type) {
      where.type = { in: [type, 'BOTH'] };
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve categories' } },
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
    const result = CategoryCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category data',
            details: result.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = result.data;
    if (!Permissions.canManageCategories(session, input.societyId || undefined)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied to manage categories' } },
        { status: 403 }
      );
    }

    const category = await prisma.category.create({
      data: {
        societyId: input.societyId || null,
        name: input.name,
        type: input.type,
        description: input.description || null,
      },
    });

    await createAuditLog({
      societyId: input.societyId || null,
      userId: session.userId,
      action: 'CATEGORY_CREATE',
      entityType: 'CATEGORY',
      entityId: category.id,
      newData: { name: category.name, type: category.type },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CATEGORY_CREATE_FAILED', message: error.message } },
      { status: 400 }
    );
  }
}
