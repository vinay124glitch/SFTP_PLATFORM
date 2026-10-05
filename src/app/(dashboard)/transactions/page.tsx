import React from 'react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import { PlusCircle, Download, Search, Filter } from 'lucide-react';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    type?: string;
    status?: string;
    search?: string;
    categoryId?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !session.currentSocietyId) {
    return <div className="p-8 text-center text-slate-500">Please select a society.</div>;
  }

  const societyId = session.currentSocietyId;
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = 15;
  const skip = (page - 1) * pageSize;

  const where: any = { societyId };
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.search) {
    where.OR = [
      { transactionNumber: { contains: params.search } },
      { description: { contains: params.search } },
      { referenceNumber: { contains: params.search } },
    ];
  }

  const [totalCount, transactions, categories] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        event: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.category.findMany({
      where: {
        active: true,
        OR: [{ societyId: null }, { societyId }],
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const isCreator = ['TREASURER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(
    session.currentSocietyRole || ''
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction record ({totalCount} entries)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export Button */}
          <a
            href={`/api/export/csv?societyId=${societyId}${params.type ? `&type=${params.type}` : ''}${params.status ? `&status=${params.status}` : ''}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </a>

          {isCreator && (
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Transaction
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <form className="flex-1 min-w-[200px] relative" method="GET">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Search by txn number, description, or reference..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </form>

        {/* Type Filter */}
        <div className="flex items-center gap-1">
          <Link
            href="/transactions"
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              !params.type ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </Link>
          <Link
            href={`/transactions?type=INCOME${params.status ? `&status=${params.status}` : ''}`}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              params.type === 'INCOME' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Income
          </Link>
          <Link
            href={`/transactions?type=EXPENSE${params.status ? `&status=${params.status}` : ''}`}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              params.type === 'EXPENSE' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Expense
          </Link>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          {['APPROVED', 'PENDING_APPROVAL', 'REJECTED', 'VOIDED'].map((st) => (
            <Link
              key={st}
              href={`/transactions?status=${st}${params.type ? `&type=${params.type}` : ''}`}
              className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                params.status === st ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </Link>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">TXN Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No transactions match the selected criteria
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <Link href={`/transactions/${t.id}`} className="hover:text-sky-600 underline-offset-2 hover:underline">
                        {t.transactionNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(t.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{t.category.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{t.event?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{t.description}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right tabular-nums">
                      {formatINR(t.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={t.status as any} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/transactions/${t.id}`}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {skip + 1} to {Math.min(skip + pageSize, totalCount)} of {totalCount} records
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/transactions?page=${p}${params.type ? `&type=${params.type}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                  className={`w-7 h-7 rounded flex items-center justify-center font-medium ${
                    p === page
                      ? 'bg-sky-600 text-white'
                      : 'hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
