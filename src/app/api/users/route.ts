import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
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

    const members = await prisma.societyMember.findMany({
      where: { societyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { members },
    });
  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve members' } },
      { status: 500 }
    );
  }
}

// Add user to society or update member role
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
    const { societyId, email, role } = body;

    if (!societyId || !email || !role) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'societyId, email, and role are required' } },
        { status: 400 }
      );
    }

    if (!Permissions.canManageMembers(session, societyId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied to manage members' } },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'No registered user found with this email' } },
        { status: 404 }
      );
    }

    const membership = await prisma.societyMember.upsert({
      where: {
        societyId_userId: {
          societyId,
          userId: user.id,
        },
      },
      update: {
        role,
        active: true,
      },
      create: {
        societyId,
        userId: user.id,
        role,
        active: true,
      },
    });

    await createAuditLog({
      societyId,
      userId: session.userId,
      action: 'USER_ROLE_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      newData: { role, targetUser: user.email },
    });

    return NextResponse.json({
      success: true,
      data: membership,
    });
  } catch (error: any) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'MEMBER_UPDATE_FAILED', message: error.message } },
      { status: 400 }
    );
  }
}
