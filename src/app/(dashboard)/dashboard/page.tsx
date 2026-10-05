import React from 'react';
import { getSession } from '@/lib/auth';
import { FinancialService } from '@/services/financial.service';
import prisma from '@/lib/db';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { FinancialCharts } from '@/components/dashboard/FinancialCharts';
import { BudgetProgressList } from '@/components/dashboard/BudgetProgressList';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { PlusCircle, Clock, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const session = await getSession();
  if (!session || !session.currentSocietyId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please select a society to view dashboard.
      </div>
    );
  }

  const { fy } = await searchParams;
  const societyId = session.currentSocietyId;

  // Determine active financial year
  let financialYearId = fy;
  if (!financialYearId) {
    const activeFy = await prisma.financialYear.findFirst({
      where: { societyId, isCurrent: true },
    });
    financialYearId = activeFy?.id || '';
  }

  const [summary, recentTxns, pendingTxns, recentAudits, currentSociety] = await Promise.all([
    financialYearId
      ? FinancialService.getDashboardSummary(societyId, financialYearId)
      : null,
    prisma.transaction.findMany({
      where: { societyId, ...(financialYearId ? { financialYearId } : {}) },
      include: {
        category: true,
        event: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: 6,
    }),
    prisma.transaction.findMany({
      where: { societyId, status: 'PENDING_APPROVAL' },
      include: {
        category: true,
        event: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
      session.currentSocietyRole || ''
    )
      ? prisma.auditLog.findMany({
          where: { societyId },
          include: { user: { select: { name: true } } },
          orderBy: { timestamp: 'desc' },
          take: 5,
        })
      : null,
    prisma.society.findUnique({
      where: { id: societyId },
      include: { financialYears: true },
    }),
  ]);

  if (!summary) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <p className="text-base font-semibold text-slate-700">No Financial Year Initialized</p>
        <p className="text-xs text-slate-500 mt-1">
          Please configure a financial year in society settings.
        </p>
      </div>
    );
  }

  const isApprover = ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );
  const isCreator = ['TREASURER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time ledger overview for{' '}
            <span className="font-semibold text-slate-700">{currentSociety?.name}</span>
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          {isCreator && (
            <>
              <Link
                href="/income/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Income
              </Link>
              <Link
                href="/expenses/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Expense
              </Link>
            </>
          )}
          {isApprover && pendingTxns.length > 0 && (
            <Link
              href="/approvals"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Review Approvals ({pendingTxns.length})
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards summary={summary} />

      {/* Main Charts Area */}
      <FinancialCharts
        monthlyTrends={summary.monthlyTrends}
        categoryBreakdown={summary.categoryBreakdown}
      />

      {/* Split Grid: Budget Utilization & Approvals Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Progress */}
        <BudgetProgressList budgets={summary.budgetUtilization} />

        {/* Pending Approvals Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                Pending Approvals Queue
              </CardTitle>
            </div>
            {isApprover && (
              <Link href="/approvals" className="text-xs text-sky-600 hover:text-sky-800 font-medium">
                Manage all →
              </Link>
            )}
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {pendingTxns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No transactions waiting for approval
              </div>
            ) : (
              pendingTxns.map((t) => (
                <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">{t.transactionNumber}</span>
                      <Badge variant={t.type === 'INCOME' ? 'success' : 'danger'}>{t.type}</Badge>
                    </div>
                    <p className="text-xs text-slate-600">{t.description}</p>
                    <p className="text-[11px] text-slate-400">
                      By {t.createdBy.name} • {t.category.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatINR(t.amount)}
                    </div>
                    {isApprover ? (
                      <Link
                        href={`/transactions/${t.id}`}
                        className="text-xs text-sky-600 hover:text-sky-800 font-medium block mt-1"
                      >
                        Review →
                      </Link>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-medium">Pending Review</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Ledger Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">
            Recent Ledger Activity
          </CardTitle>
          <Link href="/transactions" className="text-xs text-sky-600 hover:text-sky-800 font-medium">
            View full ledger ({summary.totalTxnCount} records) →
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">TXN Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions found in this financial year
                  </td>
                </tr>
              ) : (
                recentTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{t.transactionNumber}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(t.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{t.category.name}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{t.description}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-right tabular-nums">
                      {formatINR(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={t.status as any} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/transactions/${t.id}`}
                        className="text-sky-600 hover:text-sky-800 font-medium"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Recent Audit Trail (If Authorized) */}
      {recentAudits && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-600" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                Recent Audit Trail (Immutable)
              </CardTitle>
            </div>
            <Link href="/audit-logs" className="text-xs text-sky-600 hover:text-sky-800 font-medium">
              View all audit logs →
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0 text-xs">
            {recentAudits.map((log) => (
              <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700 px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-slate-600">
                    {log.entityType} ({log.entityId || 'N/A'})
                  </span>
                  <span className="text-slate-400">by {log.user?.name || 'System'}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
