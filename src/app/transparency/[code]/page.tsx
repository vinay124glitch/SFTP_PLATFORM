import React from 'react';
import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatINR } from '@/lib/currency';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const society = await prisma.society.findUnique({ where: { code } });
  return {
    title: society ? `${society.name} – Public Finance Report | SFTP` : 'Society Not Found',
    description: society?.description || `Public financial transparency report for ${code}`,
  };
}

export default async function SocietyTransparencyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const society = await prisma.society.findUnique({
    where: { code, status: 'ACTIVE' },
    include: {
      transparencySettings: true,
      reports: {
        where: { isPublic: true, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      },
      financialYears: {
        orderBy: { startDate: 'desc' },
        take: 3,
      },
    },
  });

  if (!society) return notFound();

  const settings = society.transparencySettings;

  // Get aggregated transaction data for public display
  const currentFy = await prisma.financialYear.findFirst({
    where: { societyId: society.id, isCurrent: true },
  });

  let publicStats: {
    totalIncome: bigint;
    totalExpenses: bigint;
    balance: bigint;
    categoryBreakdown: { name: string; total: bigint; type: string }[];
  } | null = null;

  if (currentFy && (settings?.showTotalIncome !== false || settings?.showTotalExpenses !== false)) {
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { societyId: society.id, financialYearId: currentFy.id, status: 'APPROVED', type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { societyId: society.id, financialYearId: currentFy.id, status: 'APPROVED', type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount ?? BigInt(0);
    const totalExpenses = expenseAgg._sum.amount ?? BigInt(0);

    let categoryBreakdown: { name: string; total: bigint; type: string }[] = [];
    if (settings?.showCategoryBreakdown !== false) {
      const catData = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where: { societyId: society.id, financialYearId: currentFy.id, status: 'APPROVED' },
        _sum: { amount: true },
      });
      const categories = await prisma.category.findMany({
        where: { id: { in: catData.map((c) => c.categoryId) } },
        select: { id: true, name: true },
      });
      const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
      categoryBreakdown = catData.map((c) => ({
        name: catMap[c.categoryId] || 'Unknown',
        total: c._sum.amount ?? BigInt(0),
        type: c.type,
      }));
    }

    publicStats = {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      categoryBreakdown,
    };
  }

  const isPositiveBalance = publicStats ? publicStats.balance >= BigInt(0) : true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/transparency" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">₹</span>
            </div>
            <div>
              <span className="font-bold text-white">SFTP</span>
              <span className="text-[10px] text-sky-400 block uppercase tracking-wider">← All Societies</span>
            </div>
          </Link>
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Society Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/transparency" className="hover:text-sky-400 transition-colors">Transparency Portal</Link>
            <span>/</span>
            <span className="text-sky-400">{society.code}</span>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-600/30 border border-sky-500/20 flex items-center justify-center text-3xl font-bold text-sky-400 shrink-0">
              {society.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">{society.name}</h1>
              {society.description && (
                <p className="text-slate-400 mt-2 max-w-2xl">{society.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                {currentFy && <span>FY {currentFy.name}</span>}
                <span className="text-emerald-400 font-semibold">● Publicly Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Disclaimer */}
        {settings?.customDisclaimer && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            📢 {settings.customDisclaimer}
          </div>
        )}

        {/* Financial Stats */}
        {publicStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {settings?.showTotalIncome !== false && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Income</p>
                <p className="text-3xl font-extrabold text-emerald-300 tabular-nums">
                  {formatINR(publicStats.totalIncome)}
                </p>
                <p className="text-emerald-500/70 text-xs mt-1">Approved transactions</p>
              </div>
            )}
            {settings?.showTotalExpenses !== false && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
                <p className="text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Expenses</p>
                <p className="text-3xl font-extrabold text-rose-300 tabular-nums">
                  {formatINR(publicStats.totalExpenses)}
                </p>
                <p className="text-rose-500/70 text-xs mt-1">Approved transactions</p>
              </div>
            )}
            <div className={`border rounded-2xl p-6 ${
              isPositiveBalance
                ? 'bg-sky-500/10 border-sky-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                isPositiveBalance ? 'text-sky-400' : 'text-amber-400'
              }`}>Net Balance</p>
              <p className={`text-3xl font-extrabold tabular-nums ${
                isPositiveBalance ? 'text-sky-300' : 'text-amber-300'
              }`}>
                {formatINR(publicStats.balance < BigInt(0) ? -publicStats.balance : publicStats.balance)}
              </p>
              <p className={`text-xs mt-1 ${isPositiveBalance ? 'text-sky-500/70' : 'text-amber-500/70'}`}>
                {isPositiveBalance ? 'Surplus' : 'Deficit'}
              </p>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {publicStats && settings?.showCategoryBreakdown !== false && publicStats.categoryBreakdown.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Category Breakdown</h2>
            <div className="divide-y divide-white/5">
              {publicStats.categoryBreakdown
                .sort((a, b) => Number(b.total - a.total))
                .map((cat) => (
                  <div key={`${cat.name}-${cat.type}`} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        cat.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`} />
                      <span className="text-slate-300 text-sm">{cat.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        cat.type === 'INCOME'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {cat.type}
                      </span>
                    </div>
                    <span className="text-white font-bold tabular-nums text-sm">{formatINR(cat.total)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Published Reports */}
        {settings?.showReports !== false && society.reports.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Published Reports</h2>
            <div className="space-y-3">
              {society.reports.map((report) => {
                const summary = (() => { try { return JSON.parse(report.summaryJson); } catch { return {}; } })();
                return (
                  <div
                    key={report.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white text-sm">{report.title}</h3>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {report.reportNumber} •{' '}
                          {report.publishedAt
                            ? new Date(report.publishedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : 'Date unknown'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {report.reportType}
                      </span>
                    </div>
                    {summary.totalIncome !== undefined && (
                      <div className="mt-3 flex gap-4 text-xs">
                        <span className="text-emerald-400">
                          Income: {formatINR(BigInt(summary.totalIncome || 0))}
                        </span>
                        <span className="text-rose-400">
                          Expenses: {formatINR(BigInt(summary.totalExpenses || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!publicStats && society.reports.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-xl font-semibold text-slate-400">No public data available yet</p>
            <p className="text-sm mt-2">This society has not published any financial reports yet.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-slate-500 text-sm mt-12">
        <p>
          Financial data is publicly published by {society.name} via{' '}
          <span className="text-sky-400">SFTP</span>
        </p>
        <p className="mt-1">Contact: {society.contactEmail}</p>
      </footer>
    </div>
  );
}
