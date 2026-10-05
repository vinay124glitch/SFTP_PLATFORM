'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryItem {
  name: string;
  amount: number;
  paise: string;
}

interface FinancialChartsProps {
  monthlyTrends: MonthlyTrendItem[];
  categoryBreakdown: CategoryItem[];
}

const CATEGORY_COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export function FinancialCharts({ monthlyTrends, categoryBreakdown }: FinancialChartsProps) {
  // Format currency tick in thousands
  const formatYAxis = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
  };

  const tooltipFormatter = (value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, ''];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly Inflow vs Outflow */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">
            Monthly Inflow vs Outflow
          </CardTitle>
          <span className="text-xs text-slate-400">Approved Transactions Only</span>
        </CardHeader>
        <CardContent className="h-72 pt-2">
          {monthlyTrends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No transactions recorded in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Approved Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Approved Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Expense Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">
            Expense Allocation
          </CardTitle>
          <span className="text-xs text-slate-400">By Category</span>
        </CardHeader>
        <CardContent className="h-72 pt-2">
          {categoryBreakdown.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No categorized expenses yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
