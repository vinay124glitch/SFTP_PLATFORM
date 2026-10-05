import React from 'react';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Permissions } from '@/lib/permissions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { ArrowLeft, Globe, Lock, Download, Printer } from 'lucide-react';
import { ReportPublishToggle } from './ReportPublishToggle';
import { ReportExportButtons } from './ReportExportButtons';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      society: true,
      financialYear: true,
      generatedBy: { select: { name: true, email: true } },
    },
  });

  if (!report) return notFound();

  // If report is not public, require authenticated user of the same society
  if (!report.isPublic) {
    if (!session || !Permissions.canAccessSociety(session, report.societyId)) {
      return (
        <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl">
          Access Denied: Internal Report
        </div>
      );
    }
  }

  const summary = JSON.parse(report.summaryJson);
  const canManage = session && Permissions.canManageReports(session, report.societyId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{report.title}</h1>
              {report.isPublic ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Published
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Internal Draft
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ref: <span className="font-mono">{report.reportNumber}</span> • {report.society.name} • FY {report.financialYear.name}
            </p>
          </div>
        </div>

        {/* Export & Publish Controls */}
        <div className="flex items-center gap-2">
          {canManage && (
            <ReportPublishToggle reportId={report.id} initialIsPublic={report.isPublic} />
          )}
          <ReportExportButtons report={report} summary={summary} />
        </div>
      </div>

      {/* Main Report Document Sheet */}
      <div id="report-printable-area" className="bg-white rounded-xl border border-slate-200 shadow-2xs p-8 space-y-8">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{report.society.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{report.title}</p>
            <p className="text-xs text-slate-400 mt-1">
              Financial Period: FY {report.financialYear.name} ({new Date(report.financialYear.startDate).toLocaleDateString()} – {new Date(report.financialYear.endDate).toLocaleDateString()})
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-mono font-semibold text-slate-800">{report.reportNumber}</p>
            <p>Generated: {new Date(report.generatedAt).toLocaleDateString()}</p>
            <p>Audited By: {report.generatedBy.name}</p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            1. Certified Balance Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Opening Balance
              </span>
              <span className="text-base font-bold text-slate-900 tabular-nums mt-1 block">
                {formatINR(summary.openingBalance)}
              </span>
            </div>
            <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-100">
              <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                Total Approved Income
              </span>
              <span className="text-base font-bold text-emerald-700 tabular-nums mt-1 block">
                {formatINR(summary.totalIncome)}
              </span>
            </div>
            <div className="bg-rose-50/60 p-3.5 rounded-lg border border-rose-100">
              <span className="text-[10px] uppercase font-semibold text-rose-700 block">
                Total Approved Expenses
              </span>
              <span className="text-base font-bold text-rose-700 tabular-nums mt-1 block">
                {formatINR(summary.totalExpenses)}
              </span>
            </div>
            <div className="bg-sky-50/60 p-3.5 rounded-lg border border-sky-100">
              <span className="text-[10px] uppercase font-semibold text-sky-700 block">
                Closing Net Balance
              </span>
              <span className="text-base font-bold text-sky-900 tabular-nums mt-1 block">
                {formatINR(summary.currentBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              2. Expense Category Breakdown
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Expense Category</th>
                  <th className="py-2.5 px-3 text-right">Total Disbursed (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.categoryBreakdown.map((c: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-right tabular-nums">
                      {formatINR(c.paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Budget Utilization Breakdown */}
        {summary.budgetUtilization && summary.budgetUtilization.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              3. Budget Allocations & Performance
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Budget Title</th>
                  <th className="py-2.5 px-3 text-right">Allocated</th>
                  <th className="py-2.5 px-3 text-right">Actual Spent</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3 text-center">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.budgetUtilization.map((b: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{b.name}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatINR(b.allocatedAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-600 tabular-nums">
                      {formatINR(b.actualSpending)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums">
                      {formatINR(b.remaining)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                      {b.utilization}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sample Transaction Roster */}
        {summary.transactionSample && summary.transactionSample.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              4. Certified Transaction Ledger Roster
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">TXN Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.transactionSample.map((t: any) => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{t.number}</td>
                      <td className="py-2.5 px-3 text-slate-500">{t.date}</td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span className={t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{t.category}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{t.description}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 text-right tabular-nums">
                        {formatINR(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Auditor Sign-off Footer */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-800">Treasurer / Lead Sign-off</p>
            <div className="h-10 border-b border-slate-300 mt-4" />
            <p className="text-[11px] text-slate-400 mt-1">Authorized Society Representative</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-800">Faculty Coordinator / Auditor</p>
            <div className="h-10 border-b border-slate-300 mt-4" />
            <p className="text-[11px] text-slate-400 mt-1">Advisory Council Endorsement</p>
          </div>
        </div>
      </div>
    </div>
  );
}
