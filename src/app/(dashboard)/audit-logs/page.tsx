import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ShieldAlert } from 'lucide-react';

export const metadata = { title: 'Audit Logs – SFTP' };

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const allowedRoles = ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.currentSocietyRole || '')) {
    redirect('/dashboard');
  }

  const { page: pageStr, action: actionFilter } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || '1'));
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (session.currentSocietyId) where.societyId = session.currentSocietyId;
  if (actionFilter) where.action = actionFilter;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const actionColors: Record<string, string> = {
    LOGIN: 'bg-sky-500/10 text-sky-400',
    LOGOUT: 'bg-slate-500/10 text-slate-400',
    TRANSACTION_CREATE: 'bg-emerald-500/10 text-emerald-400',
    TRANSACTION_APPROVE: 'bg-emerald-500/10 text-emerald-400',
    TRANSACTION_REJECT: 'bg-rose-500/10 text-rose-400',
    TRANSACTION_VOID: 'bg-orange-500/10 text-orange-400',
    TRANSACTION_SUBMIT: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
          <p className="text-xs text-slate-500">Immutable security log of all system actions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        actionColors[log.action] || 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.entityType}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.user?.name || 'System'}</div>
                      <div className="text-slate-400 text-[11px]">{log.user?.email || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-[120px] truncate">
                      {log.entityId || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} entries
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs"
              >
                ← Prev
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
