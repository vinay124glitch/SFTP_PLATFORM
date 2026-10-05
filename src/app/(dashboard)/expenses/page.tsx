import React from 'react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { PlusCircle, TrendingDown } from 'lucide-react';

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session || !session.currentSocietyId) {
    return <div className="p-8 text-center text-slate-500">Please select a society.</div>;
  }

  const societyId = session.currentSocietyId;

  const [expenseTxns, totalApproved] = await Promise.all([
    prisma.transaction.findMany({
      where: { societyId, type: 'EXPENSE' },
      include: {
        category: true,
        event: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { transactionDate: 'desc' },
    }),
    prisma.transaction.aggregate({
      where: { societyId, type: 'EXPENSE', status: 'APPROVED' },
      _sum: { amount: true },
    }),
  ]);

  const approvedPaise = totalApproved._sum.amount || BigInt(0);
  const isCreator = ['TREASURER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Approved Expenses:{' '}
            <span className="font-bold text-rose-600 tabular-nums">
              {formatINR(approvedPaise)}
            </span>
          </p>
        </div>

        {isCreator && (
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Expense
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">TXN Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No expense transactions recorded yet
                  </td>
                </tr>
              ) : (
                expenseTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <Link href={`/transactions/${t.id}`} className="hover:text-sky-600">
                        {t.transactionNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(t.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{t.category.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{t.event?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{t.description}</td>
                    <td className="py-3.5 px-4 font-bold text-rose-600 text-right tabular-nums">
                      {formatINR(t.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={t.status as any} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/transactions/${t.id}`}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
