'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Check, X, Ban, Send } from 'lucide-react';

interface TransactionDetailActionsProps {
  transactionId: string;
  status: string;
  canApprove: boolean;
  canVoid: boolean;
  isCreator: boolean;
}

export function TransactionDetailActions({
  transactionId,
  status,
  canApprove,
  canVoid,
  isCreator,
}: TransactionDetailActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Submit Draft
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/submit`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to submit');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve
  const handleApprove = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/approve`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to approve');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reject
  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setError('Rejection reason must be at least 5 characters');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to reject');
      setRejectModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Void
  const handleVoid = async () => {
    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setError('Void reason must be at least 5 characters');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to void');
      setVoidModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
            {error}
          </span>
        )}

        {/* Submit draft */}
        {status === 'DRAFT' && isCreator && (
          <Button
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit for Review
          </Button>
        )}

        {/* Approver Actions */}
        {status === 'PENDING_APPROVAL' && canApprove && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectModalOpen(true)}
              disabled={isLoading}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={handleApprove}
              isLoading={isLoading}
              className="gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Approve Transaction
            </Button>
          </>
        )}

        {/* Void Action */}
        {status === 'APPROVED' && canVoid && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVoidModalOpen(true)}
            disabled={isLoading}
            className="text-slate-600 border-slate-300 hover:bg-slate-100 gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" />
            Void Transaction
          </Button>
        )}
      </div>

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
              placeholder="Explain policy non-compliance, invoice defect, or unauthorized expense..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleReject} isLoading={isLoading}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Void Modal */}
      <Modal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title="Void Approved Transaction"
        description="Voiding removes this transaction from official balances while preserving its permanent audit trail."
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Warning: This action will permanently reverse the ledger impact. It will be recorded
            under your name with timestamp.
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reason for Voiding *
            </label>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate voucher, vendor refund processed, administrative reversal..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setVoidModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleVoid} isLoading={isLoading}>
              Confirm Void
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
