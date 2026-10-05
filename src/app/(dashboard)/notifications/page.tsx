import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Bell, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Notifications – SFTP' };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeColors: Record<string, string> = {
    APPROVAL_REQUEST: 'bg-amber-500/10 text-amber-600 border-amber-200',
    APPROVAL_GRANTED: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    APPROVAL_REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-200',
    BUDGET_WARNING: 'bg-orange-500/10 text-orange-600 border-orange-200',
    SYSTEM: 'bg-sky-500/10 text-sky-600 border-sky-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-xs text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <form action="/api/notifications" method="POST">
            <input type="hidden" name="action" value="markAllRead" />
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors border border-sky-200"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500">No notifications yet</p>
              <p className="text-xs mt-1">You'll receive notifications for approvals, rejections, and system events</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors ${
                  !notif.read ? 'bg-sky-50/40' : ''
                }`}
              >
                <div className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      typeColors[notif.type] || 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {notif.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="text-xs text-sky-600 hover:text-sky-800 font-medium mt-1 inline-block"
                    >
                      View →
                    </Link>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                  {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
