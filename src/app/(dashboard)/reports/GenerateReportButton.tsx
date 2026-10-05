'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PlusCircle } from 'lucide-react';

interface GenerateReportButtonProps {
  societyId: string;
  financialYearId: string;
}

export function GenerateReportButton({ societyId, financialYearId }: GenerateReportButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('ANNUAL');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a report title');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societyId,
          financialYearId,
          title,
          reportType,
          publishImmediately,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Report generation failed');

      setIsOpen(false);
      router.push(`/reports/${json.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          setTitle(`Financial Summary Report - ${new Date().toLocaleDateString()}`);
          setIsOpen(true);
        }}
        className="gap-1.5"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        Generate Report Snapshot
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Generate Certified Report Snapshot"
        description="Compiles live database ledger data, category breakdowns, and audit metrics into an immutable report snapshot."
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Report Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Report Classification *
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ANNUAL">Annual Comprehensive Audit Statement</option>
              <option value="MONTHLY">Monthly Cash-Flow Statement</option>
              <option value="INCOME">Income / Revenue Disclosures</option>
              <option value="EXPENSE">Expense Disbursement Audit</option>
              <option value="CATEGORY">Category Allocation & Spending</option>
              <option value="EVENT">Event Project Accounting</option>
              <option value="BUDGET">Budget Utilization Report</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="publish-check"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="publish-check" className="text-xs text-slate-700 cursor-pointer">
              Publish immediately to Public Transparency Portal
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
              Compile & Save
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
