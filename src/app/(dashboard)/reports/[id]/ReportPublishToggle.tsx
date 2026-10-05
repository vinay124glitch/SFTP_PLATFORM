'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Globe, Lock } from 'lucide-react';

interface ReportPublishToggleProps {
  reportId: string;
  initialIsPublic: boolean;
}

export function ReportPublishToggle({ reportId, initialIsPublic }: ReportPublishToggleProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isLoading, setIsLoading] = useState(false);

  const togglePublish = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPublic(!isPublic);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={togglePublish}
      isLoading={isLoading}
      className={`gap-1.5 text-xs ${
        isPublic
          ? 'text-amber-700 hover:bg-amber-50 border-amber-300'
          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-300'
      }`}
    >
      {isPublic ? (
        <>
          <Lock className="w-3.5 h-3.5" />
          Unpublish
        </>
      ) : (
        <>
          <Globe className="w-3.5 h-3.5" />
          Publish to Public
        </>
      )}
    </Button>
  );
}
