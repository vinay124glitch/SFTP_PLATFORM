import React from 'react';
import { getSession } from '@/lib/auth';
import { FinancialService } from '@/services/financial.service';
import prisma from '@/lib/db';
import { formatINR } from '@/lib/currency';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { PlusCircle, AlertCircle, CheckCircle2, PieChart } from 'lucide-react';

export default async function BudgetsPage() {
  const session = await getSession();
  if (!session || !session.currentSocietyId) {
    return <div className="p-8 text-center text-slate-500">Please select a society.</div>;
  }

  const societyId = session.currentSocietyId;
  const activeFy = await prisma.financialYear.findFirst({
    where: { societyId, isCurrent: true },
  });

  const budgets = activeFy
    ? await FinancialService.getBudgetUtilization(societyId, activeFy.id)
    : [];

  const isManager = ['TREASURER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  const getStatusBadge = (status: string, util: number) => {
    switch (status) {
      case 'OVER_BUDGET':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Over Budget ({util}%)
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Critical Threshold ({util}%)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Warning ({util}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Within Limits ({util}%)
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sky-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Budget Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            FY {activeFy?.name || '2026-27'} Allocations & Real-Time Expense Consumption
          </p>
        </div>

        {isManager && (
          <Link
            href="/budgets/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Budget Allocation
          </Link>
        )}
      </div>

      {/* Threshold Guide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-slate-600">0 - 69%: Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
          <span className="text-slate-600">70 - 89%: Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
          <span className="text-slate-600">90 - 100%: Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
          <span className="text-slate-600">&gt; 100%: Over Budget</span>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            No budget allocations configured for this financial year yet.
          </div>
        ) : (
          budgets.map((b) => (
            <Card key={b.id} hover className="border border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{b.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {b.eventName ? `Event: ${b.eventName}` : `Category: ${b.categoryName}`}
                    </p>
                  </div>
                  {getStatusBadge(b.warningStatus, b.utilization)}
                </div>

                {/* Meter */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                        b.warningStatus
                      )}`}
                      style={{ width: `${Math.min(b.utilization, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                    <span>{b.utilization}% Consumed</span>
                    <span>100% Target</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Allocated
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums mt-0.5 block">
                      {formatINR(b.allocatedAmount)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Actual Spent
                    </span>
                    <span className="font-bold text-rose-600 tabular-nums mt-0.5 block">
                      {formatINR(b.actualSpending)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Remaining
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums mt-0.5 block">
                      {formatINR(b.remaining)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
