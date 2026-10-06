import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';

// Force dynamic rendering — page reads cookies for session detection
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SFTP – Society Fund Transparency Platform',
  description: 'A secure, transparent platform for managing society funds with multi-role approvals, real-time ledger, and public financial reporting.',
};

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <span className="text-white text-xl font-bold">₹</span>
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">SFTP</span>
              <span className="text-[10px] text-sky-400 font-semibold block uppercase tracking-wider leading-none">
                Transparency Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/transparency"
              className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
            >
              Public Portal
            </Link>
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors shadow-lg shadow-sky-500/20"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-sky-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-semibold tracking-wider uppercase mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Production-Ready Financial Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Society Finance,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
              Made Transparent
            </span>
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            A complete fund management platform with multi-role approvals, real-time ledger tracking,
            budget monitoring, and public financial transparency reporting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              id="hero-signin"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-lg shadow-2xl shadow-sky-500/30 transition-all hover:scale-105"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/transparency"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-lg transition-all"
            >
              View Public Portal
            </Link>
          </div>
        </div>
      </main>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {[
          {
            icon: '🔐',
            title: 'Multi-Role Security',
            description: 'Members, Treasurers, Faculty Coordinators, Society Admins with granular permission control.',
          },
          {
            icon: '📊',
            title: 'Real-Time Ledger',
            description: 'Track every income and expense with full audit trail, approval workflows, and status tracking.',
          },
          {
            icon: '🌐',
            title: 'Public Transparency',
            description: 'Configurable public portal showing aggregate financial data to build community trust.',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-sky-500/30 hover:bg-white/8 transition-all"
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-slate-500 text-sm">
        <p>SFTP – Society Fund Transparency Platform &copy; 2026. Built for production use.</p>
      </footer>
    </div>
  );
}
