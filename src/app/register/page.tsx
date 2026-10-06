'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'society'>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [societyCode, setSocietyCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'account') {
      setStep('society');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Register user
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok || !regData.success) {
        setError(regData.error?.message || 'Registration failed');
        setStep('account');
        setLoading(false);
        return;
      }

      // Create society
      const socRes = await fetch('/api/society', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: societyName, code: societyCode, contactEmail: contactEmail || email }),
      });
      const socData = await socRes.json();
      if (!socRes.ok || !socData.success) {
        setError(socData.error?.message || 'Society creation failed. Please log in and try from settings.');
      }

      // Log in
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (loginRes.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        router.push('/login');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 relative overflow-hidden py-12 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-2xl shadow-sky-500/30 mb-3">
            <span className="text-white text-2xl font-bold">₹</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Register Your Society</h1>
          <p className="text-sky-300 text-sm mt-1">Set up SFTP for your organization</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-6">
          {['Account', 'Society'].map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  (i === 0 && step === 'account') || (i === 1 && step === 'society')
                    ? 'bg-sky-500 text-white'
                    : i === 0 && step === 'society'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {i === 0 && step === 'society' ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium ${
                  (i === 0 && step === 'account') || (i === 1 && step === 'society') ? 'text-white' : 'text-slate-500'
                }`}>{label}</span>
              </div>
              {i === 0 && <div className="flex-1 h-px bg-white/10" />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {step === 'account' ? (
              <>
                <h2 className="text-lg font-bold text-white mb-4">Create Your Account</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Rajesh Kumar"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@college.edu"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold rounded-xl transition-all text-sm"
                >
                  Continue →
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-4">Create Your Society</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Society Name</label>
                  <input
                    type="text"
                    required
                    value={societyName}
                    onChange={(e) => setSocietyName(e.target.value)}
                    placeholder="Tech Society – BITS Pilani"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Society Code <span className="text-slate-500 font-normal">(URL-friendly)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={societyCode}
                    onChange={(e) => setSocietyCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="tech-soc-bits"
                    pattern="[a-z0-9-]+"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-mono"
                  />
                  {societyCode && (
                    <p className="text-xs text-slate-500 mt-1">
                      Public URL: /transparency/{societyCode}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={email || 'society@college.edu'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('account')}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold rounded-xl transition-all text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    id="register-submit"
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm"
                  >
                    {loading ? 'Creating...' : 'Launch Society'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-sky-400 hover:text-sky-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
