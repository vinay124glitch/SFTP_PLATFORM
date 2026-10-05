import React from 'react';
import { getSession } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { ApprovalsQueueClient } from './ApprovalsQueueClient';

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session || !session.currentSocietyId) {
    return <div className="p-8 text-center text-slate-500">Please select a society.</div>;
  }

  const societyId = session.currentSocietyId;
  const isApprover = ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  const pendingTransactions = await prisma.transaction.findMany({
    where: { societyId, status: 'PENDING_APPROVAL' },
    include: {
      category: true,
      event: true,
      createdBy: { select: { id: true, name: true, email: true } },
      documents: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Approvals & Review Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculty Coordinator & Executive Council review interface ({pendingTransactions.length} pending)
          </p>
        </div>
      </div>

      {!isApprover && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            You are logged in with role <b>{session.currentSocietyRole}</b>. You can view pending
            items, but only Faculty Coordinators and Society Administrators have authorization to
            execute approvals and rejections.
          </span>
        </div>
      )}

      {/* Approvals Client Component with Interactive Action Buttons & Modal Dialogs */}
      <ApprovalsQueueClient
        initialTransactions={pendingTransactions}
        currentUserId={session.userId}
        isApprover={isApprover}
      />
    </div>
  );
}
