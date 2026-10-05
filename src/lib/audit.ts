import prisma from './db';
import { AuditAction } from './types';

export interface CreateAuditLogParams {
  societyId?: string | null;
  userId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  oldData?: any;
  newData?: any;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Creates an immutable audit log entry in the database.
 * Never throws an uncaught error that disrupts the primary business mutation.
 */
export async function createAuditLog(params: CreateAuditLogParams, tx?: any) {
  const client = tx || prisma;
  try {
    return await client.auditLog.create({
      data: {
        societyId: params.societyId || null,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
    return null;
  }
}
