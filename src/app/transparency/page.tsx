import React from 'react';
import prisma from '@/lib/db';
import Link from 'next/link';
import { formatINR } from '@/lib/currency';

export const metadata = {
  title: 'Public Transparency Portal – SFTP',
  description: 'View published financial reports from student and community societies.',
};

export default async function TransparencyIndexPage() {
  // Get all societies with transparency enabled and at least 1 published report
  const societies = await prisma.society.findMany({
    where: { status: 'ACTIVE' },
    include: {
      transparencySettings: true,
      _count: { select: { reports: true } },
      reports: {
        where: { isPublic: true, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">₹</span>
            </div>
            <div>
              <span className="font-bold text-white">SFTP</span>
              <span className="text-[10px] text-sky-400 block uppercase tracking-wider">Transparency Portal</span>
            </div>
          </Link>
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wider uppercase mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Public Financial Transparency
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Society Finance,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
              Open to All
            </span>
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto">
            Browse publicly published financial summaries from registered societies. 
            Accountability through transparency.
          </p>
        </div>

        {/* Societies Grid */}
        {societies.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <div className="text-5xl mb-4">🏛️</div>
            <p className="text-xl font-semibold text-slate-400">No societies registered yet</p>
            <p className="text-sm mt-2">Societies will appear here once they publish their financial reports.</p>
            <Link
              href="/register"
              className="mt-6 inline-block px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors"
            >
              Register Your Society
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {societies.map((society) => (
              <Link
                key={society.id}
                href={`/transparency/${society.code}`}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-sky-500/30 hover:bg-white/8 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/20 border border-sky-500/20 flex items-center justify-center text-xl font-bold text-sky-400">
                    {society.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    society.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/15 text-slate-400'
                  }`}>
                    {society.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-sky-300 transition-colors">
                  {society.name}
                </h3>
                <p className="text-slate-500 text-xs font-mono mb-3">/{society.code}</p>

                {society.description && (
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{society.description}</p>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {society._count.reports} report{society._count.reports !== 1 ? 's' : ''}
                  </span>
                  {society.reports.length > 0 && (
                    <span className="text-sky-400 font-medium group-hover:text-sky-300">
                      View Reports →
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-slate-500 text-sm">
        <p>SFTP – Society Fund Transparency Platform &copy; 2026</p>
        <p className="mt-1">
          <Link href="/login" className="text-sky-400 hover:text-sky-300 transition-colors">
            Admin Login
          </Link>
        </p>
      </footer>
    </div>
  );
}
