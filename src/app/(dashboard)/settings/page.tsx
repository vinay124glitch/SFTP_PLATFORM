'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Settings, Moon, Sun, Globe, Shield, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const settingsSections = [
    {
      icon: <Bell className="w-4 h-4 text-sky-500" />,
      title: 'Notification Preferences',
      description: 'Control which events trigger notifications for you',
      items: [
        { label: 'Approval Requests', description: 'Notified when a transaction needs your review' },
        { label: 'Approval Decisions', description: 'Notified when your transactions are approved or rejected' },
        { label: 'Budget Warnings', description: 'Alerted when budget utilization exceeds 80%' },
        { label: 'System Events', description: 'General platform announcements' },
      ],
    },
    {
      icon: <Shield className="w-4 h-4 text-emerald-500" />,
      title: 'Security',
      description: 'Manage your account security settings',
      items: [
        { label: 'Two-Factor Authentication', description: 'Add extra layer of security to your account', badge: 'Coming Soon' },
        { label: 'Session Management', description: 'Review active sessions on your account', badge: 'Coming Soon' },
      ],
    },
    {
      icon: <Globe className="w-4 h-4 text-violet-500" />,
      title: 'Localization',
      description: 'Language and regional settings',
      items: [
        { label: 'Currency', description: 'Currently set to Indian Rupee (₹ INR)' },
        { label: 'Date Format', description: 'Currently set to DD/MM/YYYY' },
        { label: 'Timezone', description: 'Currently set to IST (UTC+5:30)' },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500">Manage your account and platform preferences</p>
        </div>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Current Password</label>
              <input
                type="password"
                id="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">New Password</label>
              <input
                type="password"
                id="new-password"
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                id="confirm-password"
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              id="change-password-btn"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
            >
              Update Password
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Settings sections */}
      {settingsSections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {section.icon}
              <CardTitle className="text-sm font-semibold text-slate-800">{section.title}</CardTitle>
            </div>
            <p className="text-xs text-slate-500">{section.description}</p>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
                {(item as any).badge ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
                    {(item as any).badge}
                  </span>
                ) : (
                  <div className="w-10 h-5 rounded-full bg-sky-500 relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-rose-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100">
            <div>
              <p className="text-sm font-semibold text-rose-800">Sign Out</p>
              <p className="text-xs text-rose-600 mt-0.5">End your current session on all devices</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              id="logout-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
