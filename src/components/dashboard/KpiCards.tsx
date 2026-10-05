'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatINR } from '@/lib/currency';
import { Wallet, TrendingUp, TrendingDown, Clock, ShieldCheck, Layers } from 'lucide-react';

interface KpiCardsProps {
  summary: {
    openingBalance: string;
    totalIncome: string;
    totalExpenses: string;
    currentBalance: string;
    pendingCount: number;
    pendingIncome: string;
    pendingExpenses: string;
    activeBudgetsCount: number;
    totalTxnCount: number;
  };
}

export function KpiCards({ summary }: KpiCardsProps) {
  const currentBalNum = BigInt(summary.currentBalance || '0');
  const isHealthy = currentBalNum >= BigInt(0);

  const cards = [
    {
      title: 'Current Balance',
      amount: formatINR(summary.currentBalance),
      subtext: `Opening: ${formatINR(summary.openingBalance)}`,
      icon: Wallet,
      color: isHealthy ? 'text-sky-600 bg-sky-50 border-sky-100' : 'text-rose-600 bg-rose-50 border-rose-100',
      badge: 'Official Ledger',
    },
    {
      title: 'Approved Income',
      amount: formatINR(summary.totalIncome),
      subtext: 'Audited & credited funds',
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      badge: '+ Inflow',
    },
    {
      title: 'Approved Expenses',
      amount: formatINR(summary.totalExpenses),
      subtext: 'Disbursed society expenditures',
      icon: TrendingDown,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      badge: '- Outflow',
    },
    {
      title: 'Pending Approvals',
      amount: summary.pendingCount.toString(),
      subtext: `${formatINR(summary.pendingExpenses)} exp / ${formatINR(summary.pendingIncome)} inc`,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      badge: summary.pendingCount > 0 ? 'Requires Action' : 'All Clear',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} hover className="border border-slate-200 shadow-2xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {card.amount}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{card.subtext}</span>
                  <span className="font-medium text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {card.badge}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
