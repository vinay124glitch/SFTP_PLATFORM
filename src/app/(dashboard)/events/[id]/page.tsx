import React from 'react';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Permissions } from '@/lib/permissions';
import { FinancialService } from '@/services/financial.service';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { ArrowLeft, Calendar, Users, PlusCircle } from 'lucide-react';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      financialYear: true,
      transactions: {
        include: {
          category: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
      },
    },
  });

  if (!event) return notFound();

  if (!Permissions.canAccessSociety(session, event.societyId)) {
    return <div className="p-8 text-center text-rose-600">Access Denied</div>;
  }

  const summary = await FinancialService.getEventFinancialSummary(event.societyId, event.id);
  const isCreator = ['TREASURER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{event.name}</h1>
              <Badge status={event.status as any} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Organized by {event.organizer || 'Society Committee'} • FY {event.financialYear.name}
            </p>
          </div>
        </div>

        {isCreator && (
          <div className="flex items-center gap-2">
            <Link
              href={`/transactions/new?type=INCOME&eventId=${event.id}`}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              + Event Income
            </Link>
            <Link
              href={`/transactions/new?type=EXPENSE&eventId=${event.id}`}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              + Event Expense
            </Link>
          </div>
        )}
      </div>

      {/* Financial KPIs for this Event */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Allocated Budget
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1 tabular-nums">
              {formatINR(summary?.allocatedBudget)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Approved Income
            </span>
            <span className="text-xl font-bold text-emerald-600 block mt-1 tabular-nums">
              {formatINR(summary?.totalIncome)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Approved Expenses
            </span>
            <span className="text-xl font-bold text-rose-600 block mt-1 tabular-nums">
              {formatINR(summary?.totalExpenses)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Remaining Budget
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1 tabular-nums">
              {formatINR(summary?.remainingBudget)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Description & Consumption */}
      {event.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-800">
              Project Description
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-xs text-slate-700 leading-relaxed">{event.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Event Ledger Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">
            Event Ledger Entries ({event.transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
              {event.transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions recorded for this event yet
                  </td>
                </tr>
              ) : (
                event.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <Link href={`/transactions/${t.id}`} className="hover:text-sky-600">
                        {t.transactionNumber}
                      </Link>
                    </td>
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
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
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
    </div>
  );
}
