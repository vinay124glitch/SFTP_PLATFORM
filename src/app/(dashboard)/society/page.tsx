import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Building, Globe, Mail, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Society Profile – SFTP' };

export default async function SocietyPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!session.currentSocietyId) {
    return (
      <div className="p-8 text-center text-slate-500">Please select a society first.</div>
    );
  }

  const society = await prisma.society.findUnique({
    where: { id: session.currentSocietyId },
    include: {
      transparencySettings: true,
      financialYears: { orderBy: { startDate: 'desc' } },
      _count: { select: { members: true, transactions: true, events: true } },
    },
  });

  if (!society) redirect('/dashboard');

  const isAdmin = ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(session.currentSocietyRole || '');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building className="w-5 h-5 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Society Profile</h1>
          <p className="text-xs text-slate-500">Manage society information and settings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Members', value: society._count.members, color: 'text-sky-600 bg-sky-50 border-sky-100' },
          { label: 'Transactions', value: society._count.transactions, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Events', value: society._count.events, color: 'text-violet-600 bg-violet-50 border-violet-100' },
          { label: 'Financial Years', value: society.financialYears.length, color: 'text-amber-600 bg-amber-50 border-amber-100' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-4 border ${stat.color}`}>
            <p className="text-2xl font-extrabold">{stat.value}</p>
            <p className="text-xs font-semibold mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Society Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">Society Information</CardTitle>
          {isAdmin && (
            <button className="text-xs text-sky-600 hover:text-sky-800 font-medium">
              Edit Profile
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Society Name</p>
              <p className="font-semibold text-slate-900">{society.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Society Code</p>
              <p className="font-mono font-semibold text-slate-900">{society.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Contact Email</p>
                <p className="text-sm text-slate-900">{society.contactEmail}</p>
              </div>
            </div>
            {society.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Contact Phone</p>
                  <p className="text-sm text-slate-900">{society.contactPhone}</p>
                </div>
              </div>
            )}
          </div>
          {society.description && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700">{society.description}</p>
            </div>
          )}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs text-slate-500">Public URL:</p>
            <Link
              href={`/transparency/${society.code}`}
              target="_blank"
              className="text-xs text-sky-600 hover:text-sky-800 font-mono font-medium"
            >
              /transparency/{society.code}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Financial Years */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">Financial Years</CardTitle>
          {isAdmin && (
            <button className="text-xs text-sky-600 hover:text-sky-800 font-medium">
              + New FY
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {society.financialYears.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No financial years configured</div>
            ) : (
              society.financialYears.map((fy) => (
                <div key={fy.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{fy.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(fy.startDate).toLocaleDateString('en-IN')} – {new Date(fy.endDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  {fy.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                      Current
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transparency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">Transparency Settings</CardTitle>
          {isAdmin && (
            <Link href="/settings" className="text-xs text-sky-600 hover:text-sky-800 font-medium">
              Configure
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              { label: 'Show Total Income', value: society.transparencySettings?.showTotalIncome ?? true },
              { label: 'Show Total Expenses', value: society.transparencySettings?.showTotalExpenses ?? true },
              { label: 'Show Category Breakdown', value: society.transparencySettings?.showCategoryBreakdown ?? true },
              { label: 'Show Event Budgets', value: society.transparencySettings?.showEventBudgets ?? true },
              { label: 'Show Transaction Data', value: society.transparencySettings?.showTransactionLevelData ?? false },
              { label: 'Show Reports', value: society.transparencySettings?.showReports ?? true },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${
                  setting.value ? 'bg-emerald-500' : 'bg-slate-300'
                }`}>
                  {setting.value ? '✓' : '✗'}
                </span>
                <span className={setting.value ? 'text-slate-800' : 'text-slate-400'}>{setting.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
