import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validation';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = RegisterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration input',
            details: result.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { name, email, password, societyCode } = result.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // If society code provided, check society
    let targetSociety = null;
    if (societyCode) {
      targetSociety = await prisma.society.findUnique({
        where: { code: societyCode.toLowerCase().trim(), status: 'ACTIVE' },
      });
      if (!targetSociety) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SOCIETY_NOT_FOUND',
              message: `No active society found with code "${societyCode}"`,
            },
          },
          { status: 404 }
        );
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        ...(targetSociety
          ? {
              memberships: {
                create: {
                  societyId: targetSociety.id,
                  role: 'MEMBER',
                },
              },
            }
          : {}),
      },
    });

    await createAuditLog({
      societyId: targetSociety?.id || null,
      userId: user.id,
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: user.id,
      newData: { name: user.name, email: user.email },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    const token = await createSessionToken({ userId: user.id });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    if (targetSociety) {
      response.cookies.set({
        name: 'sftp_active_society',
        value: targetSociety.id,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create user account' },
      },
      { status: 500 }
    );
  }
}
