'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { Check, X, ShieldAlert, FileText, ArrowRight } from 'lucide-react';

interface ApprovalsQueueClientProps {
  initialTransactions: any[];
  currentUserId: string;
  isApprover: boolean;
}

export function ApprovalsQueueClient({
  initialTransactions,
  currentUserId,
  isApprover,
}: ApprovalsQueueClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setIsLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Approval failed');
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedTxnId(id);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedTxnId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setError('Rejection reason must be at least 5 characters');
      return;
    }

    setIsLoading(selectedTxnId);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${selectedTxnId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Rejection failed');
      setTransactions((prev) => prev.filter((t) => t.id !== selectedTxnId));
      setRejectModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
        <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
        <h3 className="text-sm font-semibold text-slate-700">Approvals Queue is Clear</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          All submitted financial transactions have been audited and processed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      {transactions.map((t) => {
        const isSelfCreated = t.createdBy.id === currentUserId;
        const canExecute = isApprover && !isSelfCreated;

        return (
          <Card key={t.id} className="border border-slate-200 shadow-2xs">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{t.transactionNumber}</span>
                  <Badge variant={t.type === 'INCOME' ? 'success' : 'danger'}>{t.type}</Badge>
                  <span className="text-xs text-slate-500">• {t.category.name}</span>
                  {t.event && <span className="text-xs text-sky-700 font-medium">({t.event.name})</span>}
                </div>

                <p className="text-xs text-slate-700 leading-snug">{t.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>
                    Submitted by: <b className="text-slate-600">{t.createdBy.name}</b>
                  </span>
                  <span>Method: {t.paymentMethod.replace('_', ' ')}</span>
                  <span>Date: {new Date(t.transactionDate).toLocaleDateString()}</span>
                  {t.documents.length > 0 && (
                    <span className="text-sky-600 flex items-center gap-0.5">
                      <FileText className="w-3 h-3" />
                      {t.documents.length} attachment(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatINR(t.amount)}
                </div>

                <div className="flex items-center gap-2">
                  {isSelfCreated ? (
                    <span
                      className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium"
                      title="Under financial governance rules, a user cannot approve their own submission."
                    >
                      Self-Approval Prohibited
                    </span>
                  ) : canExecute ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReject(t.id)}
                        disabled={isLoading === t.id}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApprove(t.id)}
                        isLoading={isLoading === t.id}
                        className="gap-1 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </Button>
                    </>
                  ) : (
                    <Link
                      href={`/transactions/${t.id}`}
                      className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                    >
                      View Details →
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Transaction"
        description="A clear and mandatory rejection reason is required for audit compliance."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State policy objection or document insufficiency..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReject}
              isLoading={!!isLoading}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
