import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { DashboardClientLayout } from './DashboardClientLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch available societies for this user
  let availableSocieties: { id: string; name: string; code: string }[] = [];
  if (session.systemRole === 'SUPER_ADMIN') {
    availableSocieties = await prisma.society.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  } else {
    availableSocieties = session.societyMemberships.map((m) => ({
      id: m.societyId,
      name: m.societyName,
      code: m.societyCode,
    }));
  }

  let currentFyName = '2026-27';
  if (session.currentSocietyId) {
    const fy = await prisma.financialYear.findFirst({
      where: { societyId: session.currentSocietyId, isCurrent: true },
      select: { name: true },
    });
    if (fy) currentFyName = fy.name;
  }

  return (
    <DashboardClientLayout
      session={session}
      availableSocieties={availableSocieties}
      currentFyName={currentFyName}
    >
      {children}
    </DashboardClientLayout>
  );
}
