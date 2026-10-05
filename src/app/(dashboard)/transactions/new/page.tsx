'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Upload, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'INCOME' ? 'INCOME' : 'EXPENSE';

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialType);
  const [categories, setCategories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [societyId, setSocietyId] = useState('');
  const [financialYearId, setFinancialYearId] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [eventId, setEventId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load current session & categories
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.session) {
          const sid = res.data.session.currentSocietyId;
          setSocietyId(sid);
          const fyId = res.data.currentFinancialYear?.id || '';
          setFinancialYearId(fyId);

          if (sid) {
            // Load categories
            fetch(`/api/categories?societyId=${sid}`)
              .then((r) => r.json())
              .then((cJson) => {
                if (cJson.success) setCategories(cJson.data.categories || []);
              });
            // Load events
            fetch(`/api/events?societyId=${sid}`)
              .then((r) => r.json())
              .then((eJson) => {
                if (eJson.success) setEvents(eJson.data.events || []);
              });
          }
        }
      });
  }, []);

  const handleSubmit = async (submitForApproval: boolean) => {
    setError(null);
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societyId,
          financialYearId,
          type,
          amount: parseFloat(amount),
          categoryId,
          eventId: eventId || null,
          description,
          transactionDate,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          submitForApproval,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create transaction');
      }

      const createdTxn = json.data;

      // If document attached, upload it
      if (file && createdTxn?.id) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('transactionId', createdTxn.id);
        formData.append('societyId', societyId);
        await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      }

      router.push(`/transactions/${createdTxn.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === 'BOTH' || c.type === type
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/transactions"
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Record New Transaction</h1>
          <p className="text-xs text-slate-500">
            Create an audited income or expense record in the society ledger
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Transaction Type Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Transaction Flow
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  type === 'INCOME'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                + Income (Fund Inflow)
              </button>
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                - Expense (Expenditure)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Amount (INR ₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">Select Category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event / Project */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Associated Event / Project (Optional)
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">No specific event (General)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CASH">Cash Voucher</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other Method</option>
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reference / UTR / Cheque No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR-9821734"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description / Financial Purpose *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete business justification for audit compliance..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Document Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Receipt / Tax Invoice Attachment (PDF, PNG, JPG, max 5MB)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
              <input
                type="file"
                id="receipt-file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="receipt-file"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-sky-600 font-medium">
                  {file ? file.name : 'Click to select supporting invoice/receipt'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Auditors require proof of payment'}
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleSubmit(false)}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={() => handleSubmit(true)}
            >
              Submit for Approval
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
