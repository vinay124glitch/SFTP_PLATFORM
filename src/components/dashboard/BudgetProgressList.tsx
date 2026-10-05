'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatINR } from '@/lib/currency';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface BudgetItem {
  id: string;
  name: string;
  categoryName: string | null;
  eventName: string | null;
  allocatedAmount: string;
  actualSpending: string;
  remaining: string;
  utilization: number;
  warningStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVER_BUDGET';
}

interface BudgetProgressListProps {
  budgets: BudgetItem[];
}

export function BudgetProgressList({ budgets }: BudgetProgressListProps) {
  const getBadge = (status: string, util: number) => {
    switch (status) {
      case 'OVER_BUDGET':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            Over Budget ({util}%)
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            <AlertCircle className="w-3 h-3" />
            Critical ({util}%)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Warning ({util}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Healthy ({util}%)
          </span>
        );
    }
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'OVER_BUDGET':
        return 'bg-rose-500';
      case 'CRITICAL':
        return 'bg-orange-500';
      case 'WARNING':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-800">
          Budget Utilization & Thresholds
        </CardTitle>
        <Link href="/budgets" className="text-xs text-sky-600 hover:text-sky-800 font-medium">
          View all budgets →
        </Link>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100">
        {budgets.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active budget allocations configured
          </div>
        ) : (
          budgets.slice(0, 5).map((b) => (
            <div key={b.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{b.name}</span>
                {getBadge(b.warningStatus, b.utilization)}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                    b.warningStatus
                  )}`}
                  style={{ width: `${Math.min(b.utilization, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Spent: {formatINR(b.actualSpending)}</span>
                <span>Limit: {formatINR(b.allocatedAmount)}</span>
                <span className="font-medium text-slate-700">Rem: {formatINR(b.remaining)}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
