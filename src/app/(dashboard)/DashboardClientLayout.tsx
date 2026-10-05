'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AuthSession } from '@/lib/types';

interface DashboardClientLayoutProps {
  session: AuthSession;
  availableSocieties: { id: string; name: string; code: string }[];
  currentFyName: string;
  children: React.ReactNode;
}

export function DashboardClientLayout({
  session,
  availableSocieties,
  currentFyName,
  children,
}: DashboardClientLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        userRole={session.currentSocietyRole}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          session={session}
          availableSocieties={availableSocieties}
          currentFyName={currentFyName}
          onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
