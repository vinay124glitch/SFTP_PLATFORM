'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewBudgetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [societyId, setSocietyId] = useState('');
  const [financialYearId, setFinancialYearId] = useState('');

  const [allocationType, setAllocationType] = useState<'CATEGORY' | 'EVENT'>('CATEGORY');
  const [categoryId, setCategoryId] = useState('');
  const [eventId, setEventId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.session) {
          const sid = res.data.session.currentSocietyId;
          setSocietyId(sid);
          setFinancialYearId(res.data.currentFinancialYear?.id || '');

          if (sid) {
            fetch(`/api/categories?societyId=${sid}&type=EXPENSE`)
              .then((r) => r.json())
              .then((cJson) => {
                if (cJson.success) setCategories(cJson.data.categories || []);
              });
            fetch(`/api/events?societyId=${sid}`)
              .then((r) => r.json())
              .then((eJson) => {
                if (eJson.success) setEvents(eJson.data.events || []);
              });
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || parseFloat(amount) <= 0) {
      setError('Allocated amount must be greater than 0');
      return;
    }
    if (allocationType === 'CATEGORY' && !categoryId) {
      setError('Please select a category');
      return;
    }
    if (allocationType === 'EVENT' && !eventId) {
      setError('Please select an event');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societyId,
          financialYearId,
          categoryId: allocationType === 'CATEGORY' ? categoryId : null,
          eventId: allocationType === 'EVENT' ? eventId : null,
          allocatedAmount: parseFloat(amount),
          notes,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create budget');

      router.push('/budgets');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/budgets"
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create Budget Allocation</h1>
          <p className="text-xs text-slate-500">
            Set spending ceiling for a specific category or society event
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Allocation Target
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAllocationType('CATEGORY')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                    allocationType === 'CATEGORY'
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  By Expense Category
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationType('EVENT')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                    allocationType === 'EVENT'
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  By Event / Project
                </button>
              </div>
            </div>

            {allocationType === 'CATEGORY' ? (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Expense Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Event / Project *
                </label>
                <select
                  required
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="">Select Event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Allocated Spending Ceiling (INR ₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Council Resolution / Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference executive committee meeting minutes, approval dates..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link href="/budgets">
                <Button variant="outline" size="sm" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
                Create Budget
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
