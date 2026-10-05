import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Users, UserPlus } from 'lucide-react';

export const metadata = { title: 'Members Management – SFTP' };

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const allowedRoles = ['SOCIETY_ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.currentSocietyRole || '')) {
    redirect('/dashboard');
  }

  if (!session.currentSocietyId) {
    return (
      <div className="p-8 text-center text-slate-500">Please select a society first.</div>
    );
  }

  const members = await prisma.societyMember.findMany({
    where: { societyId: session.currentSocietyId },
    include: {
      user: {
        select: { id: true, name: true, email: true, status: true, lastLoginAt: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'danger',
    SOCIETY_ADMIN: 'warning',
    FACULTY_COORDINATOR: 'info',
    TREASURER: 'success',
    MEMBER: 'default',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Society Members</h1>
            <p className="text-xs text-slate-500">{members.length} member{members.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>
        <button
          id="invite-member-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Admins', roles: ['SOCIETY_ADMIN', 'SUPER_ADMIN'], color: 'bg-rose-50 border-rose-100 text-rose-700' },
          { label: 'Coordinators', roles: ['FACULTY_COORDINATOR'], color: 'bg-sky-50 border-sky-100 text-sky-700' },
          { label: 'Treasurers', roles: ['TREASURER'], color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { label: 'Members', roles: ['MEMBER'], color: 'bg-slate-50 border-slate-100 text-slate-700' },
        ].map((group) => {
          const count = members.filter((m) => group.roles.includes(m.role)).length;
          return (
            <div key={group.label} className={`rounded-2xl p-4 border ${group.color}`}>
              <p className="text-2xl font-extrabold">{count}</p>
              <p className="text-xs font-semibold mt-0.5">{group.label}</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">All Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Society Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Membership</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-slate-900">{member.user.name}</p>
                      <p className="text-slate-400 text-[11px]">{member.user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={(roleColors[member.role] as any) || 'default'}>
                      {member.role.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      member.user.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {member.user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {member.user.lastLoginAt
                      ? new Date(member.user.lastLoginAt).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(member.user.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      member.active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
