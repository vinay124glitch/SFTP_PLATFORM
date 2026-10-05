import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { StorageService } from '@/lib/storage';
import { createAuditLog } from '@/lib/audit';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const transactionId = formData.get('transactionId') as string | null;
    const societyId = (formData.get('societyId') as string) || session.currentSocietyId;

    if (!file || !societyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File and societyId are required' } },
        { status: 400 }
      );
    }

    // Validate file type & size
    try {
      StorageService.validate({ name: file.name, type: file.type, size: file.size });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE', message: err.message } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await StorageService.saveLocal({
      name: file.name,
      type: file.type,
      buffer,
    });

    const document = await prisma.document.create({
      data: {
        transactionId: transactionId || null,
        societyId,
        fileName: stored.fileName,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        size: stored.size,
        uploadedById: session.userId,
      },
    });

    await createAuditLog({
      societyId,
      userId: session.userId,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'DOCUMENT',
      entityId: document.id,
      metadata: { fileName: document.fileName, size: document.size, transactionId },
    });

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: error.message || 'File upload failed' } },
      { status: 500 }
    );
  }
}
