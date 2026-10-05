'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  CheckSquare,
  FileText,
  Bell,
  ShieldAlert,
  Users,
  Building,
  Settings,
  Globe,
  X,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface SidebarProps {
  userRole?: UserRole;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ userRole, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
    { name: 'Income', href: '/income', icon: TrendingUp },
    { name: 'Expenses', href: '/expenses', icon: TrendingDown },
    { name: 'Budgets', href: '/budgets', icon: PieChart },
    { name: 'Events', href: '/events', icon: Calendar },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: CheckSquare,
      allowedRoles: ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN', 'SUPER_ADMIN', 'TREASURER'],
    },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    {
      name: 'Audit Logs',
      href: '/audit-logs',
      icon: ShieldAlert,
      allowedRoles: ['FACULTY_COORDINATOR', 'SOCIETY_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: 'Members',
      href: '/users',
      icon: Users,
      allowedRoles: ['SOCIETY_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: 'Society Profile',
      href: '/society',
      icon: Building,
      allowedRoles: ['SOCIETY_ADMIN', 'SUPER_ADMIN'],
    },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNav = navigation.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!userRole) return false;
    return userRole === 'SUPER_ADMIN' || item.allowedRoles.includes(userRole);
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
              ₹
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">SFTP</span>
              <span className="text-[10px] text-sky-400 font-semibold block uppercase tracking-wider">
                Transparency Hub
              </span>
            </div>
          </Link>
          {isMobileOpen && (
            <button
              onClick={onMobileClose}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Finance & Ledger
          </div>
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Public Portals
            </div>
            <Link
              href="/transparency"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Public Transparency</span>
            </Link>
          </div>
        </div>

        {/* User Role Badge in Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="text-xs text-slate-400">Current Role</div>
          <div className="text-xs font-semibold text-sky-400 truncate mt-0.5">
            {userRole ? userRole.replace('_', ' ') : 'MEMBER'}
          </div>
        </div>
      </aside>
    </>
  );
}
