import React from 'react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { formatINR, calculatePercentage } from '@/lib/currency';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { PlusCircle, Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';

export default async function EventsPage() {
  const session = await getSession();
  if (!session || !session.currentSocietyId) {
    return <div className="p-8 text-center text-slate-500">Please select a society.</div>;
  }

  const societyId = session.currentSocietyId;

  const events = await prisma.event.findMany({
    where: { societyId },
    include: {
      financialYear: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const enrichedEvents = await Promise.all(
    events.map(async (ev) => {
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { societyId, eventId: ev.id, type: 'INCOME', status: 'APPROVED' },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { societyId, eventId: ev.id, type: 'EXPENSE', status: 'APPROVED' },
          _sum: { amount: true },
        }),
      ]);

      const approvedIncome = incomeAgg._sum.amount || BigInt(0);
      const approvedExpenses = expenseAgg._sum.amount || BigInt(0);
      const remainingBudget = ev.allocatedBudget - approvedExpenses;
      const utilization = calculatePercentage(approvedExpenses, ev.allocatedBudget);

      return {
        ...ev,
        approvedIncome,
        approvedExpenses,
        remainingBudget,
        utilization,
      };
    })
  );

  const isCreator = ['TREASURER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Event Accounting</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated budgets, sponsorships, and expense ledgers per project/event
          </p>
        </div>

        {isCreator && (
          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add New Event
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enrichedEvents.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            No events registered yet.
          </div>
        ) : (
          enrichedEvents.map((ev) => (
            <Card key={ev.id} hover className="border border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/events/${ev.id}`}
                      className="text-base font-bold text-slate-900 hover:text-sky-600 transition-colors"
                    >
                      {ev.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ev.description}</p>
                  </div>
                  <Badge status={ev.status as any} />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {ev.organizer || 'Society Committee'}
                  </span>
                  <span>{ev._count.transactions} Ledger Transactions</span>
                </div>

                {/* Event Financial Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-center">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Budget
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatINR(ev.allocatedBudget)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Expenses
                    </span>
                    <span className="font-bold text-rose-600 tabular-nums">
                      {formatINR(ev.approvedExpenses)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Remaining
                    </span>
                    <span className="font-bold text-emerald-600 tabular-nums">
                      {formatINR(ev.remainingBudget)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Budget Consumption</span>
                    <span className="font-semibold text-slate-700">{ev.utilization}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(ev.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'Dates TBA'}
                  </span>
                  <Link
                    href={`/events/${ev.id}`}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                  >
                    View Accounting Details →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
