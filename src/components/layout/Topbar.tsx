'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, Building2, Calendar, Shield } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { AuthSession } from '@/lib/types';

interface TopbarProps {
  session: AuthSession;
  currentFyName?: string;
  availableSocieties: { id: string; name: string; code: string }[];
  onMobileToggle: () => void;
}

export function Topbar({
  session,
  currentFyName = '2026-27',
  availableSocieties,
  onMobileToggle,
}: TopbarProps) {
  const router = useRouter();

  const handleSocietyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSocietyId = e.target.value;
    if (!newSocietyId) return;

    try {
      await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societyId: newSocietyId }),
      });
      router.refresh();
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Multi-Society Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <select
            value={session.currentSocietyId || ''}
            onChange={handleSocietyChange}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {availableSocieties.map((soc) => (
              <option key={soc.id} value={soc.id}>
                {soc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Financial Year Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>FY {currentFyName}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationDropdown />

        {/* User Profile Summary */}
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-800">{session.name}</span>
          <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
            <Shield className="w-3 h-3 text-sky-500" />
            {session.currentSocietyRole || session.systemRole}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
