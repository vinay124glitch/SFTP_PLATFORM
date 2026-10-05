import React from 'react';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, XCircle, Ban, ShieldCheck, Clock, User, Calendar, CreditCard } from 'lucide-react';
import { TransactionDetailActions } from './TransactionDetailActions';

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      category: true,
      event: true,
      financialYear: true,
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      voidedBy: { select: { id: true, name: true, email: true } },
      documents: true,
    },
  });

  if (!transaction) return notFound();

  // IDOR protection
  if (!Permissions.canAccessSociety(session, transaction.societyId)) {
    return (
      <div className="p-8 text-center text-rose-600 font-semibold bg-rose-50 rounded-xl border border-rose-200">
        Access Denied: You do not have permissions to view records of this society.
      </div>
    );
  }

  // Audit history for this transaction
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'TRANSACTION',
      entityId: transaction.id,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { timestamp: 'desc' },
  });

  const canApprove = Permissions.canApproveTransaction(
    session,
    transaction.societyId,
    transaction.createdById
  );
  const canVoid = Permissions.canVoidTransaction(session, transaction.societyId);
  const isCreator = session.userId === transaction.createdById;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{transaction.transactionNumber}</h1>
              <Badge status={transaction.status as any} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ledger Entry ID: <span className="font-mono">{transaction.id}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons (Client Component for modals & API triggers) */}
        <TransactionDetailActions
          transactionId={transaction.id}
          status={transaction.status}
          canApprove={canApprove}
          canVoid={canVoid}
          isCreator={isCreator}
        />
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Transaction Data */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Transaction Particulars
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Certified Amount
                  </span>
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    {formatINR(transaction.amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Flow Type
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      transaction.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {transaction.type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Category</span>
                  <span className="font-semibold text-slate-800">{transaction.category.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Event / Project</span>
                  <span className="font-semibold text-slate-800">
                    {transaction.event?.name || 'General Operations'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Transaction Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(transaction.transactionDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Payment Method</span>
                  <span className="font-semibold text-slate-800">
                    {transaction.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Reference / Voucher No.</span>
                  <span className="font-mono text-slate-700">
                    {transaction.referenceNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Financial Year</span>
                  <span className="font-semibold text-slate-800">
                    {transaction.financialYear.name}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Description / Purpose</span>
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {transaction.description}
                </p>
              </div>

              {/* Rejection / Void Notices */}
              {transaction.rejectionReason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-rose-900">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Rejection Notice:
                  </span>
                  <p>{transaction.rejectionReason}</p>
                </div>
              )}

              {transaction.voidReason && (
                <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900">
                    <Ban className="w-4 h-4 text-slate-600" />
                    Void Reason:
                  </span>
                  <p>{transaction.voidReason}</p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Voided by {transaction.voidedBy?.name || 'Administrator'} on{' '}
                    {transaction.voidedAt ? new Date(transaction.voidedAt).toLocaleString() : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attached Invoices & Receipts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Attached Documents ({transaction.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {transaction.documents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No receipts or supporting vouchers attached to this transaction
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transaction.documents.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            {doc.fileName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {(doc.size / 1024).toFixed(1)} KB • {doc.mimeType}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Workflow & Audit Trail */}
        <div className="space-y-6">
          {/* Signatures & Approvals Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Authority & Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Created By</span>
                <span className="font-semibold text-slate-800 block">
                  {transaction.createdBy.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(transaction.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">Approval Status</span>
                {transaction.approvedBy ? (
                  <div>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Approved by {transaction.approvedBy.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {transaction.approvedAt
                        ? new Date(transaction.approvedAt).toLocaleString()
                        : ''}
                    </span>
                  </div>
                ) : transaction.status === 'PENDING_APPROVAL' ? (
                  <span className="font-semibold text-amber-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Approval by Faculty/Admin
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Not approved</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Immutable Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Audit Trail (Immutable)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {auditLogs.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-4">No audit logs</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{log.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      by {log.user?.name || 'System User'}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
